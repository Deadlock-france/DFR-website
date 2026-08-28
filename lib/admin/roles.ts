import { cache } from "react";

import { asDiscordSnowflake } from "@/lib/account/discord-profile-sync";
import { profileDisplayName } from "@/lib/account/types";
import {
  expandPermissions,
  hasPermission,
  normalizeRoleColor,
  normalizeRoleName,
  sanitizeStoredPermissions,
  slugifyRoleName,
  SYSTEM_ADMINISTRATOR_SLUG,
  type AdminPermission,
} from "@/lib/admin/permissions";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export type SiteRole = {
  id: string;
  slug: string;
  name: string;
  color: string;
  position: number;
  isSystem: boolean;
  permissions: AdminPermission[];
  memberCount: number;
  createdAt: string;
};

export type SiteRoleMember = {
  discordId: string;
  displayLabel: string;
  username: string | null;
  avatarUrl: string | null;
  assignedAt: string;
};

export type RoleMutationError =
  | "invalid_name"
  | "invalid_color"
  | "invalid_permissions"
  | "not_found"
  | "system_role"
  | "slug_taken"
  | "missing_discord"
  | "last_admin"
  | "already_member";

type RoleRow = {
  id: string;
  slug: string;
  name: string;
  color: string;
  position: number;
  is_system: boolean;
  permissions: string[] | null;
  created_at: string;
};

function mapRole(row: RoleRow, memberCount: number): SiteRole {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    color: row.color,
    position: row.position,
    isSystem: row.is_system,
    permissions: sanitizeStoredPermissions(row.permissions ?? []),
    memberCount,
    createdAt: row.created_at,
  };
}

export async function listSiteRoles(): Promise<SiteRole[]> {
  const supabase = createServiceRoleClient();
  const [{ data, error }, { data: members, error: memberError }] =
    await Promise.all([
      supabase
        .from("site_roles")
        .select("id, slug, name, color, position, is_system, permissions, created_at")
        .order("position", { ascending: false })
        .order("name", { ascending: true }),
      supabase.from("site_role_members").select("role_id"),
    ]);
  if (error) throw error;
  if (memberError) throw memberError;

  const countByRole = new Map<string, number>();
  for (const row of members ?? []) {
    const roleId = row.role_id as string;
    countByRole.set(roleId, (countByRole.get(roleId) ?? 0) + 1);
  }

  return (data ?? []).map((row) =>
    mapRole(row as RoleRow, countByRole.get(row.id as string) ?? 0),
  );
}

export async function getSiteRole(id: string): Promise<SiteRole | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("site_roles")
    .select("id, slug, name, color, position, is_system, permissions, created_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const { count, error: countError } = await supabase
    .from("site_role_members")
    .select("role_id", { count: "exact", head: true })
    .eq("role_id", id);
  if (countError) throw countError;

  return mapRole(data as RoleRow, count ?? 0);
}

export async function listRoleMembers(roleId: string): Promise<SiteRoleMember[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("site_role_members")
    .select("discord_id, assigned_at")
    .eq("role_id", roleId)
    .order("assigned_at", { ascending: true });
  if (error) throw error;

  const rows = data ?? [];
  const discordIds = rows.map((row) => row.discord_id as string);
  const profiles = new Map<
    string,
    { displayLabel: string; username: string | null; avatarUrl: string | null }
  >();

  if (discordIds.length > 0) {
    const { data: profileRows, error: profileError } = await supabase
      .from("profiles")
      .select("discord_id, display_name, global_name, username, avatar_url")
      .in("discord_id", discordIds);
    if (profileError) throw profileError;
    for (const row of profileRows ?? []) {
      const discordId = asDiscordSnowflake(
        typeof row.discord_id === "string" ? row.discord_id : null,
      );
      if (!discordId) continue;
      profiles.set(discordId, {
        displayLabel: profileDisplayName({
          display_name: (row.display_name as string | null) ?? null,
          global_name: (row.global_name as string | null) ?? null,
          username: (row.username as string | null) ?? null,
        }),
        username: (row.username as string | null) ?? null,
        avatarUrl: (row.avatar_url as string | null) ?? null,
      });
    }
  }

  const labels = new Map<string, string>();
  if (discordIds.length > 0) {
    const { data: admins } = await supabase
      .from("site_admins")
      .select("discord_id, display_label")
      .in("discord_id", discordIds);
    for (const row of admins ?? []) {
      labels.set(row.discord_id as string, row.display_label as string);
    }
  }

  return rows.map((row) => {
    const discordId = row.discord_id as string;
    const profile = profiles.get(discordId);
    return {
      discordId,
      displayLabel: profile?.displayLabel ?? labels.get(discordId) ?? discordId,
      username: profile?.username ?? null,
      avatarUrl: profile?.avatarUrl ?? null,
      assignedAt: row.assigned_at as string,
    };
  });
}

export const loadRawPermissionsForDiscordId = cache(
  async (discordId: string): Promise<string[]> => {
    const id = asDiscordSnowflake(discordId);
    if (!id) return [];
    const supabase = createServiceRoleClient();
    const { data: memberships, error } = await supabase
      .from("site_role_members")
      .select("role_id")
      .eq("discord_id", id);
    if (error) throw error;
    const roleIds = (memberships ?? []).map((row) => row.role_id as string);
    if (roleIds.length === 0) return [];

    const { data: roles, error: roleError } = await supabase
      .from("site_roles")
      .select("permissions")
      .in("id", roleIds);
    if (roleError) throw roleError;

    const merged: string[] = [];
    for (const row of roles ?? []) {
      merged.push(...((row.permissions as string[] | null) ?? []));
    }
    return merged;
  },
);

export async function loadExpandedPermissionsForDiscordId(
  discordId: string,
): Promise<Set<AdminPermission>> {
  const raw = await loadRawPermissionsForDiscordId(discordId);
  if (raw.length === 0) return new Set();
  return expandPermissions(raw);
}

export async function hasSiteAccessEntitlement(
  discordId: string,
): Promise<boolean> {
  const id = asDiscordSnowflake(discordId);
  if (!id) return false;

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("site_admins")
    .select("discord_id, revoked_at")
    .eq("discord_id", id)
    .maybeSingle();
  if (error) throw error;
  if (data && !data.revoked_at) return true;

  const perms = await loadExpandedPermissionsForDiscordId(id);
  return perms.has("site.access");
}

export async function listRolesForDiscordIds(
  discordIds: string[],
): Promise<Map<string, Array<Pick<SiteRole, "id" | "name" | "color">>>> {
  const map = new Map<string, Array<Pick<SiteRole, "id" | "name" | "color">>>();
  if (discordIds.length === 0) return map;

  const supabase = createServiceRoleClient();
  const { data: memberships, error } = await supabase
    .from("site_role_members")
    .select("role_id, discord_id")
    .in("discord_id", discordIds);
  if (error) throw error;
  if (!memberships?.length) return map;

  const roleIds = [...new Set(memberships.map((row) => row.role_id as string))];
  const { data: roles, error: roleError } = await supabase
    .from("site_roles")
    .select("id, name, color, position")
    .in("id", roleIds);
  if (roleError) throw roleError;

  const roleById = new Map(
    (roles ?? []).map((row) => [
      row.id as string,
      {
        id: row.id as string,
        name: row.name as string,
        color: row.color as string,
        position: row.position as number,
      },
    ]),
  );

  for (const row of memberships) {
    const role = roleById.get(row.role_id as string);
    if (!role) continue;
    const list = map.get(row.discord_id as string) ?? [];
    list.push({ id: role.id, name: role.name, color: role.color });
    map.set(row.discord_id as string, list);
  }

  for (const [discordId, list] of map) {
    list.sort((a, b) => {
      const posA = roleById.get(a.id)?.position ?? 0;
      const posB = roleById.get(b.id)?.position ?? 0;
      return posB - posA;
    });
    map.set(discordId, list);
  }

  return map;
}

async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  const supabase = createServiceRoleClient();
  const slug = slugifyRoleName(base);
  for (let i = 0; i < 12; i += 1) {
    const candidate = i === 0 ? slug : `${slug}-${i + 1}`;
    let query = supabase
      .from("site_roles")
      .select("id")
      .eq("slug", candidate);
    if (excludeId) query = query.neq("id", excludeId);
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    if (!data) return candidate;
  }
  return `${slug}-${Date.now().toString(36)}`;
}

async function nextPosition(): Promise<number> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("site_roles")
    .select("position")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  const max = typeof data?.position === "number" ? data.position : 0;
  return Math.min(max + 1, 999);
}

async function countAdministratorHolders(
  exceptDiscordId?: string,
): Promise<number> {
  const supabase = createServiceRoleClient();
  const { data: roles, error } = await supabase
    .from("site_roles")
    .select("id, permissions");
  if (error) throw error;

  const adminRoleIds = (roles ?? [])
    .filter((row) =>
      hasPermission((row.permissions as string[] | null) ?? [], "admin.administrator"),
    )
    .map((row) => row.id as string);
  if (adminRoleIds.length === 0) return 0;

  const { data: members, error: memberError } = await supabase
    .from("site_role_members")
    .select("discord_id")
    .in("role_id", adminRoleIds);
  if (memberError) throw memberError;

  const ids = new Set(
    (members ?? [])
      .map((row) => row.discord_id as string)
      .filter((id) => id !== exceptDiscordId),
  );
  return ids.size;
}

async function profileLabelForDiscordId(discordId: string): Promise<string> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("profiles")
    .select("display_name, global_name, username")
    .eq("discord_id", discordId)
    .maybeSingle();
  if (data) {
    return profileDisplayName({
      display_name: (data.display_name as string | null) ?? null,
      global_name: (data.global_name as string | null) ?? null,
      username: (data.username as string | null) ?? null,
    });
  }
  const { data: admin } = await supabase
    .from("site_admins")
    .select("display_label")
    .eq("discord_id", discordId)
    .maybeSingle();
  return (admin?.display_label as string | null) ?? discordId;
}

async function syncSiteAdminFromRoles(discordId: string): Promise<{
  ok: true;
} | { ok: false; error: RoleMutationError }> {
  const perms = await loadExpandedPermissionsForDiscordId(discordId);
  const supabase = createServiceRoleClient();
  const needsAdmin = perms.has("admin.access");

  const { data: current, error } = await supabase
    .from("site_admins")
    .select("discord_id, revoked_at")
    .eq("discord_id", discordId)
    .maybeSingle();
  if (error) throw error;

  const isActive = Boolean(current && !current.revoked_at);

  if (needsAdmin && !isActive) {
    const { error: upsertError } = await supabase.from("site_admins").upsert(
      {
        discord_id: discordId,
        display_label: await profileLabelForDiscordId(discordId),
        revoked_at: null,
      },
      { onConflict: "discord_id" },
    );
    if (upsertError) throw upsertError;
    return { ok: true };
  }

  if (!needsAdmin && isActive) {
    const { count, error: countError } = await supabase
      .from("site_admins")
      .select("discord_id", { count: "exact", head: true })
      .is("revoked_at", null);
    if (countError) throw countError;
    if ((count ?? 0) <= 1) return { ok: false, error: "last_admin" };

    const { error: updateError } = await supabase
      .from("site_admins")
      .update({ revoked_at: new Date().toISOString() })
      .eq("discord_id", discordId);
    if (updateError) throw updateError;
  }

  return { ok: true };
}

export async function createSiteRole(input: {
  name: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: RoleMutationError }> {
  const name = normalizeRoleName(input.name);
  if (!name) return { ok: false, error: "invalid_name" };

  const slug = await uniqueSlug(name);
  if (slug === SYSTEM_ADMINISTRATOR_SLUG) {
    return { ok: false, error: "slug_taken" };
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("site_roles")
    .insert({
      slug,
      name,
      color: "#4A9B7F",
      position: await nextPosition(),
      is_system: false,
      permissions: [],
    })
    .select("id")
    .single();
  if (error) throw error;
  return { ok: true, id: data.id as string };
}

export async function updateSiteRole(input: {
  id: string;
  name: string;
  color: string;
  permissions: readonly string[];
}): Promise<{ ok: true } | { ok: false; error: RoleMutationError }> {
  const role = await getSiteRole(input.id);
  if (!role) return { ok: false, error: "not_found" };

  const name = normalizeRoleName(input.name);
  if (!name) return { ok: false, error: "invalid_name" };
  const color = normalizeRoleColor(input.color);
  if (!color) return { ok: false, error: "invalid_color" };

  let permissions = sanitizeStoredPermissions(input.permissions);
  if (role.isSystem) {
    if (!permissions.includes("admin.administrator")) {
      permissions = ["admin.administrator", ...permissions];
    }
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("site_roles")
    .update({
      name,
      color,
      permissions,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id);
  if (error) throw error;

  const { data: members, error: memberError } = await supabase
    .from("site_role_members")
    .select("discord_id")
    .eq("role_id", input.id);
  if (memberError) throw memberError;
  for (const row of members ?? []) {
    const sync = await syncSiteAdminFromRoles(row.discord_id as string);
    if (!sync.ok) return sync;
  }
  return { ok: true };
}

export async function deleteSiteRole(
  id: string,
): Promise<{ ok: true } | { ok: false; error: RoleMutationError }> {
  const role = await getSiteRole(id);
  if (!role) return { ok: false, error: "not_found" };
  if (role.isSystem) return { ok: false, error: "system_role" };

  const supabase = createServiceRoleClient();
  const { data: members, error: memberError } = await supabase
    .from("site_role_members")
    .select("discord_id")
    .eq("role_id", id);
  if (memberError) throw memberError;

  const { error } = await supabase.from("site_roles").delete().eq("id", id);
  if (error) throw error;

  for (const row of members ?? []) {
    const sync = await syncSiteAdminFromRoles(row.discord_id as string);
    if (!sync.ok) return sync;
  }
  return { ok: true };
}

export async function assignRoleToDiscordId(input: {
  roleId: string;
  discordId: string;
}): Promise<{ ok: true } | { ok: false; error: RoleMutationError }> {
  const discordId = asDiscordSnowflake(input.discordId);
  if (!discordId) return { ok: false, error: "missing_discord" };
  const role = await getSiteRole(input.roleId);
  if (!role) return { ok: false, error: "not_found" };

  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("site_role_members").insert({
    role_id: input.roleId,
    discord_id: discordId,
  });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "already_member" };
    throw error;
  }
  return syncSiteAdminFromRoles(discordId);
}

export async function assignRoleToProfileId(input: {
  roleId: string;
  profileId: string;
}): Promise<{ ok: true } | { ok: false; error: RoleMutationError }> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("discord_id")
    .eq("id", input.profileId)
    .maybeSingle();
  if (error) throw error;
  const discordId = asDiscordSnowflake(
    typeof data?.discord_id === "string" ? data.discord_id : null,
  );
  if (!discordId) return { ok: false, error: "missing_discord" };
  return assignRoleToDiscordId({ roleId: input.roleId, discordId });
}

export async function removeRoleMember(input: {
  roleId: string;
  discordId: string;
}): Promise<{ ok: true } | { ok: false; error: RoleMutationError }> {
  const discordId = asDiscordSnowflake(input.discordId);
  if (!discordId) return { ok: false, error: "missing_discord" };
  const role = await getSiteRole(input.roleId);
  if (!role) return { ok: false, error: "not_found" };

  if (
    role.isSystem &&
    hasPermission(role.permissions, "admin.administrator")
  ) {
    const remaining = await countAdministratorHolders(discordId);
    if (remaining <= 0) return { ok: false, error: "last_admin" };
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("site_role_members")
    .delete()
    .eq("role_id", input.roleId)
    .eq("discord_id", discordId);
  if (error) throw error;
  return syncSiteAdminFromRoles(discordId);
}

export async function assignSystemAdministratorRole(
  discordId: string,
): Promise<void> {
  const id = asDiscordSnowflake(discordId);
  if (!id) return;
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("site_roles")
    .select("id")
    .eq("slug", SYSTEM_ADMINISTRATOR_SLUG)
    .maybeSingle();
  if (error) throw error;
  if (!data) return;
  const { error: upsertError } = await supabase.from("site_role_members").upsert(
    { role_id: data.id as string, discord_id: id },
    { onConflict: "role_id,discord_id" },
  );
  if (upsertError) throw upsertError;
}

export async function clearRoleMemberships(discordId: string): Promise<void> {
  const id = asDiscordSnowflake(discordId);
  if (!id) return;
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("site_role_members")
    .delete()
    .eq("discord_id", id);
  if (error) throw error;
}
