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
 * Accepte la demande côté site. Le ban reste actif jusqu’à ce que le bot
 * appelle POST /api/discord/bans/ingest avec action=lift après unban Discord.
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

/** Demandes acceptées dont le ban Discord est encore actif (à traiter par le bot). */
export async function listApprovedDebansAwaitingLift(): Promise<
  Array<{
    request_id: string;
    discord_id: string;
    ban_id: string;
    admin_note: string;
    reviewed_at: string | null;
  }>
> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("deban_requests")
    .select("id, discord_id, ban_id, admin_note, reviewed_at, discord_bans!ban_id(active)")
    .eq("status", "accepted")
    .order("reviewed_at", { ascending: true });

  if (error) throw error;

  return (data ?? [])
    .filter((row) => {
      const banRaw = row.discord_bans as
        | { active: boolean }
        | { active: boolean }[]
        | null;
      const ban = Array.isArray(banRaw) ? banRaw[0] : banRaw;
      return ban?.active === true;
    })
    .map((row) => ({
      request_id: row.id as string,
      discord_id: row.discord_id as string,
      ban_id: row.ban_id as string,
      admin_note: (row.admin_note as string) ?? "",
      reviewed_at: (row.reviewed_at as string | null) ?? null,
    }));
}
