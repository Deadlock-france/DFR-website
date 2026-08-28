import type { UserIdentity } from "@supabase/supabase-js";
import type { NextResponse } from "next/server";

import {
  asDiscordSnowflake,
  pickDiscordIdentity,
} from "@/lib/account/discord-profile-sync";
import { profileDisplayName } from "@/lib/account/types";
import { hasSiteAccessEntitlement, listRolesForDiscordIds } from "@/lib/admin/roles";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { attachSiteAccessCookie } from "@/lib/site-access";

export type ManagedSiteAdmin = {
  discordId: string;
  displayLabel: string;
  createdAt: string;
  revokedAt: string | null;
  profileId: string | null;
  username: string | null;
  avatarUrl: string | null;
  roles: Array<{ id: string; name: string; color: string }>;
};

export type AdminSearchHit = {
  profileId: string;
  discordId: string | null;
  displayLabel: string;
  username: string | null;
  avatarUrl: string | null;
  adminStatus: "active" | "revoked" | "none";
};

export type SiteAdminMutationError =
  | "missing_discord"
  | "invalid_discord"
  | "not_found"
  | "not_admin"
  | "last_admin";

type ProfileNameRow = {
  id: string;
  discord_id: string | null;
  display_name: string | null;
  global_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

/** Requête recherche admins (min. 2 caractères, sans métacaractères ilike). */
export function normalizeAdminUserSearchQuery(raw: string): string | null {
  const q = raw.trim().replace(/\s+/g, " ");
  if (q.length < 2 || q.length > 64) return null;
  const safe = q.replace(/[%_,.()\\]/g, "");
  if (safe.length < 2) return null;
  return safe;
}

export function resolveGrantTarget(profile: {
  discord_id: string | null;
}): { ok: true; discordId: string } | { ok: false; error: "missing_discord" } {
  const discordId = asDiscordSnowflake(profile.discord_id);
  if (!discordId) return { ok: false, error: "missing_discord" };
  return { ok: true, discordId };
}

export function resolveRevokeTarget(input: {
  targetDiscordId: string;
  activeCount: number;
  targetIsActive: boolean;
}): { ok: true } | { ok: false; error: SiteAdminMutationError } {
  if (!asDiscordSnowflake(input.targetDiscordId)) {
    return { ok: false, error: "invalid_discord" };
  }
  if (!input.targetIsActive) return { ok: false, error: "not_admin" };
  if (input.activeCount <= 1) return { ok: false, error: "last_admin" };
  return { ok: true };
}

export async function isActiveSiteAdmin(discordId: string): Promise<boolean> {
  const id = asDiscordSnowflake(discordId);
  if (!id) return false;
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("site_admins")
    .select("discord_id, revoked_at")
    .eq("discord_id", id)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data && !data.revoked_at);
}

export async function countActiveSiteAdmins(): Promise<number> {
  const supabase = createServiceRoleClient();
  const { count, error } = await supabase
    .from("site_admins")
    .select("discord_id", { count: "exact", head: true })
    .is("revoked_at", null);
  if (error) throw error;
  return count ?? 0;
}

export async function resolveUserDiscordSnowflake(
  userId: string,
  identities?: UserIdentity[] | null,
): Promise<string | null> {
  const fromIdentities = pickDiscordIdentity(identities);
  if (fromIdentities) return fromIdentities.providerId;

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("discord_id")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return asDiscordSnowflake(
    typeof data?.discord_id === "string" ? data.discord_id : null,
  );
}

export async function maybeAttachSiteAccessForUser(
  response: NextResponse,
  input: { userId: string; identities?: UserIdentity[] | null },
): Promise<boolean> {
  const discordId = await resolveUserDiscordSnowflake(
    input.userId,
    input.identities,
  );
  if (!discordId) return false;
  if (!(await hasSiteAccessEntitlement(discordId))) return false;
  attachSiteAccessCookie(response);
  return true;
}

function labelForProfile(row: Pick<
  ProfileNameRow,
  "display_name" | "global_name" | "username"
>): string {
  return profileDisplayName(row);
}

async function profilesByDiscordIds(
  discordIds: string[],
): Promise<Map<string, ProfileNameRow>> {
  const map = new Map<string, ProfileNameRow>();
  if (discordIds.length === 0) return map;

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, discord_id, display_name, global_name, username, avatar_url")
    .in("discord_id", discordIds);
  if (error) throw error;

  for (const row of data ?? []) {
    const discordId = asDiscordSnowflake(
      typeof row.discord_id === "string" ? row.discord_id : null,
    );
    if (!discordId) continue;
    map.set(discordId, {
      id: row.id as string,
      discord_id: discordId,
      display_name: (row.display_name as string | null) ?? null,
      global_name: (row.global_name as string | null) ?? null,
      username: (row.username as string | null) ?? null,
      avatar_url: (row.avatar_url as string | null) ?? null,
    });
  }
  return map;
}

export async function listManagedSiteAdmins(): Promise<ManagedSiteAdmin[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("site_admins")
    .select("discord_id, display_label, created_at, revoked_at")
    .order("created_at", { ascending: true });
  if (error) throw error;

  const rows = [...(data ?? [])].sort((a, b) => {
    const aRevoked = a.revoked_at ? 1 : 0;
    const bRevoked = b.revoked_at ? 1 : 0;
    if (aRevoked !== bRevoked) return aRevoked - bRevoked;
    return String(a.created_at).localeCompare(String(b.created_at));
  });
  const discordIds = rows.map((row) => row.discord_id as string);
  const [profiles, rolesByDiscord] = await Promise.all([
    profilesByDiscordIds(discordIds),
    listRolesForDiscordIds(discordIds),
  ]);

  return rows.map((row) => {
    const discordId = row.discord_id as string;
    const profile = profiles.get(discordId) ?? null;
    return {
      discordId,
      displayLabel: profile
        ? labelForProfile(profile)
        : (row.display_label as string),
      createdAt: row.created_at as string,
      revokedAt: (row.revoked_at as string | null) ?? null,
      profileId: profile?.id ?? null,
      username: profile?.username ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      roles: rolesByDiscord.get(discordId) ?? [],
    };
  });
}

export async function searchRegisteredUsersForAdmin(
  rawQuery: string,
): Promise<AdminSearchHit[]> {
  const q = normalizeAdminUserSearchQuery(rawQuery);
  if (!q) return [];

  const supabase = createServiceRoleClient();
  const snowflake = asDiscordSnowflake(q);
  const orFilter = snowflake
    ? `username.ilike.%${q}%,display_name.ilike.%${q}%,global_name.ilike.%${q}%,discord_id.eq.${snowflake}`
    : `username.ilike.%${q}%,display_name.ilike.%${q}%,global_name.ilike.%${q}%`;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, discord_id, display_name, global_name, username, avatar_url")
    .or(orFilter)
    .limit(20);
  if (error) throw error;

  const profiles = (data ?? []) as ProfileNameRow[];
  const discordIds = profiles
    .map((row) => asDiscordSnowflake(row.discord_id))
    .filter((id): id is string => id != null);

  const adminByDiscord = new Map<
    string,
    { revoked_at: string | null }
  >();
  if (discordIds.length > 0) {
    const { data: admins, error: adminError } = await supabase
      .from("site_admins")
      .select("discord_id, revoked_at")
      .in("discord_id", discordIds);
    if (adminError) throw adminError;
    for (const row of admins ?? []) {
      adminByDiscord.set(row.discord_id as string, {
        revoked_at: (row.revoked_at as string | null) ?? null,
      });
    }
  }

  return profiles.map((row) => {
    const discordId = asDiscordSnowflake(row.discord_id);
    const admin = discordId ? adminByDiscord.get(discordId) : undefined;
    const adminStatus: AdminSearchHit["adminStatus"] = !admin
      ? "none"
      : admin.revoked_at
        ? "revoked"
        : "active";
    return {
      profileId: row.id,
      discordId,
      displayLabel: labelForProfile(row),
      username: row.username,
      avatarUrl: row.avatar_url,
      adminStatus,
    };
  });
}

export async function grantSiteAdminByProfileId(
  profileId: string,
): Promise<
  | { ok: true; discordId: string }
  | { ok: false; error: SiteAdminMutationError }
> {
  const id = profileId.trim();
  if (!id) return { ok: false, error: "not_found" };

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, discord_id, display_name, global_name, username")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { ok: false, error: "not_found" };

  const target = resolveGrantTarget({
    discord_id: (data.discord_id as string | null) ?? null,
  });
  if (!target.ok) return target;

  const { error: upsertError } = await supabase.from("site_admins").upsert(
    {
      discord_id: target.discordId,
      display_label: labelForProfile({
        display_name: (data.display_name as string | null) ?? null,
        global_name: (data.global_name as string | null) ?? null,
        username: (data.username as string | null) ?? null,
      }),
      revoked_at: null,
    },
    { onConflict: "discord_id" },
  );
  if (upsertError) throw upsertError;
  return { ok: true, discordId: target.discordId };
}

export async function reactivateSiteAdminByDiscordId(
  discordId: string,
): Promise<{ ok: true } | { ok: false; error: SiteAdminMutationError }> {
  const id = asDiscordSnowflake(discordId);
  if (!id) return { ok: false, error: "invalid_discord" };

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("site_admins")
    .select("discord_id, revoked_at")
    .eq("discord_id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { ok: false, error: "not_found" };
  if (!data.revoked_at) return { ok: true };

  const { error: updateError } = await supabase
    .from("site_admins")
    .update({ revoked_at: null })
    .eq("discord_id", id);
  if (updateError) throw updateError;
  return { ok: true };
}

export async function revokeSiteAdminByDiscordId(
  discordId: string,
): Promise<{ ok: true } | { ok: false; error: SiteAdminMutationError }> {
  const id = asDiscordSnowflake(discordId);
  if (!id) return { ok: false, error: "invalid_discord" };

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("site_admins")
    .select("discord_id, revoked_at")
    .eq("discord_id", id)
    .maybeSingle();
  if (error) throw error;

  const { count, error: countError } = await supabase
    .from("site_admins")
    .select("discord_id", { count: "exact", head: true })
    .is("revoked_at", null);
  if (countError) throw countError;

  const decided = resolveRevokeTarget({
    targetDiscordId: id,
    activeCount: count ?? 0,
    targetIsActive: Boolean(data && !data.revoked_at),
  });
  if (!decided.ok) return decided;

  const { error: updateError } = await supabase
    .from("site_admins")
    .update({ revoked_at: new Date().toISOString() })
    .eq("discord_id", id);
  if (updateError) throw updateError;
  return { ok: true };
}
