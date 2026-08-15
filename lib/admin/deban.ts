import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createClient, createReadonlyClient } from "@/lib/supabase/server";
import type {
  BanIngestPayload,
  DebanRequest,
  DebanRequestAdminRow,
  DiscordBan,
} from "@/lib/admin/deban-types";

function applicantLabel(row: {
  display_name: string | null;
  global_name: string | null;
  username: string | null;
}): string {
  return (
    row.display_name?.trim() ||
    row.global_name?.trim() ||
    row.username?.split("#")[0]?.trim() ||
    "Utilisateur"
  );
}

export async function getActiveBanForDiscordId(
  discordId: string,
): Promise<DiscordBan | null> {
  const supabase = await createReadonlyClient();
  const { data, error } = await supabase
    .from("discord_bans")
    .select("*")
    .eq("discord_id", discordId)
    .eq("active", true)
    .maybeSingle();
  if (error) throw error;
  return (data as DiscordBan | null) ?? null;
}

export async function getPendingDebanForUser(
  userId: string,
): Promise<DebanRequest | null> {
  const supabase = await createReadonlyClient();
  const { data, error } = await supabase
    .from("deban_requests")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "pending")
    .maybeSingle();
  if (error) throw error;
  return (data as DebanRequest | null) ?? null;
}

export async function listMyDebanRequests(
  userId: string,
): Promise<DebanRequest[]> {
  const supabase = await createReadonlyClient();
  const { data, error } = await supabase
    .from("deban_requests")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) throw error;
  return (data ?? []) as DebanRequest[];
}

export async function insertDebanRequest(input: {
  userId: string;
  discordId: string;
  banId: string;
  message: string;
}): Promise<DebanRequest> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("deban_requests")
    .insert({
      user_id: input.userId,
      discord_id: input.discordId,
      ban_id: input.banId,
      message: input.message,
      status: "pending",
      admin_note: "",
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") throw new Error("pending_exists");
    throw error;
  }
  return data as DebanRequest;
}

export async function ingestDiscordBan(
  payload: BanIngestPayload,
): Promise<DiscordBan> {
  const supabase = createServiceRoleClient();
  const now = new Date().toISOString();

  if (payload.action === "lift") {
    const { data: active, error: findError } = await supabase
      .from("discord_bans")
      .select("*")
      .eq("discord_id", payload.discord_id)
      .eq("active", true)
      .maybeSingle();
    if (findError) throw findError;
    if (!active) {
      throw new Error("no_active_ban");
    }
    const { data, error } = await supabase
      .from("discord_bans")
      .update({
        active: false,
        lifted_at: now,
        lift_source: "bot",
        updated_at: now,
      })
      .eq("id", active.id)
      .select("*")
      .single();
    if (error) throw error;
    return data as DiscordBan;
  }

  // ban : désactive un éventuel actif puis crée
  await supabase
    .from("discord_bans")
    .update({
      active: false,
      lifted_at: now,
      lift_source: "bot",
      updated_at: now,
    })
    .eq("discord_id", payload.discord_id)
    .eq("active", true);

  const { data, error } = await supabase
    .from("discord_bans")
    .insert({
      discord_id: payload.discord_id,
      reason: payload.reason ?? "",
      banned_at: payload.banned_at ?? now,
      banned_by_label: payload.banned_by_label ?? null,
      source: "bot",
      active: true,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as DiscordBan;
}

export async function listDebanRequestsAdmin(
  status?: DebanRequest["status"],
): Promise<DebanRequestAdminRow[]> {
  const supabase = createServiceRoleClient();
  let query = supabase
    .from("deban_requests")
    .select(
      "*, profiles!user_id(display_name, global_name, username), discord_bans!ban_id(reason)",
    )
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row) => {
    const profile = row.profiles as {
      display_name: string | null;
      global_name: string | null;
      username: string | null;
    } | null;
    const ban = row.discord_bans as { reason: string } | null;
    const { profiles: _p, discord_bans: _b, ...rest } = row as typeof row & {
      profiles?: unknown;
      discord_bans?: unknown;
    };
    return {
      ...(rest as DebanRequest),
      ban_reason: ban?.reason ?? "",
      applicant_label: profile ? applicantLabel(profile) : null,
    };
  });
}

export async function getDebanRequestAdmin(
  id: string,
): Promise<DebanRequestAdminRow | null> {
  const rows = await listDebanRequestsAdmin();
  return rows.find((r) => r.id === id) ?? null;
}

export async function rejectDebanRequest(input: {
  id: string;
  adminNote: string;
  reviewerId: string;
}): Promise<DebanRequest> {
  const supabase = createServiceRoleClient();
  const now = new Date().toISOString();

  const { data: current, error: readError } = await supabase
    .from("deban_requests")
    .select("status")
    .eq("id", input.id)
    .maybeSingle();
  if (readError) throw readError;
  if (!current) throw new Error("not_found");
  if (current.status !== "pending") throw new Error("not_pending");

  const { data, error } = await supabase
    .from("deban_requests")
    .update({
      status: "rejected",
      admin_note: input.adminNote,
      reviewed_by: input.reviewerId,
      reviewed_at: now,
      updated_at: now,
    })
    .eq("id", input.id)
    .eq("status", "pending")
    .select("*")
    .single();
  if (error) throw error;
  return data as DebanRequest;
}

/**
 * Accepte la demande : notifie le bot d’abord, puis lève le ban en DB.
 * Si le webhook échoue, rien n’est marqué accepté (retry possible).
 */
export async function acceptDebanRequest(input: {
  id: string;
  adminNote: string;
  reviewerId: string;
}): Promise<DebanRequest> {
  const supabase = createServiceRoleClient();
  const now = new Date().toISOString();

  const { data: current, error: readError } = await supabase
    .from("deban_requests")
    .select("*")
    .eq("id", input.id)
    .maybeSingle();
  if (readError) throw readError;
  if (!current) throw new Error("not_found");
  if (current.status !== "pending") throw new Error("not_pending");

  await notifyBotUnban({
    discordId: current.discord_id,
    requestId: current.id,
    adminNote: input.adminNote,
  });

  const { error: banError } = await supabase
    .from("discord_bans")
    .update({
      active: false,
      lifted_at: now,
      lift_source: "admin_accept",
      updated_at: now,
    })
    .eq("id", current.ban_id)
    .eq("active", true);
  if (banError) throw banError;

  const { data, error } = await supabase
    .from("deban_requests")
    .update({
      status: "accepted",
      admin_note: input.adminNote,
      reviewed_by: input.reviewerId,
      reviewed_at: now,
      updated_at: now,
    })
    .eq("id", input.id)
    .eq("status", "pending")
    .select("*")
    .single();
  if (error) throw error;
  return data as DebanRequest;
}

export async function notifyBotUnban(input: {
  discordId: string;
  requestId: string;
  adminNote: string;
}): Promise<void> {
  const url = process.env.DISCORD_UNBAN_WEBHOOK_URL?.trim();
  const secret = process.env.DISCORD_UNBAN_WEBHOOK_SECRET?.trim();
  if (!url || !secret) {
    throw new Error("webhook_not_configured");
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({
      discord_id: input.discordId,
      request_id: input.requestId,
      admin_note: input.adminNote,
    }),
  });

  if (!response.ok) {
    throw new Error(`webhook_failed_${response.status}`);
  }
}
