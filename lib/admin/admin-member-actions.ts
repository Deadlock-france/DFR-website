"use server";

import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireAdmin, requirePermission } from "@/lib/admin/access";
import {
  grantSiteAdminByProfileId,
  reactivateSiteAdminByDiscordId,
  revokeSiteAdminByDiscordId,
  searchRegisteredUsersForAdmin,
  type AdminSearchHit,
  type SiteAdminMutationError,
} from "@/lib/admin/admins";
import { hasPermission } from "@/lib/admin/permissions";
import {
  assignSystemAdministratorRole,
  clearRoleMemberships,
} from "@/lib/admin/roles";

function revalidateAdmins() {
  revalidatePath("/admin");
  revalidatePath("/admin/admins");
  revalidatePath("/admin/roles");
}

export async function searchAdminUsersAction(query: string): Promise<{
  results: AdminSearchHit[];
  error?: "search_failed";
}> {
  const admin = await requireAdmin();
  if (
    !hasPermission(admin.permissions, "admin.members") &&
    !hasPermission(admin.permissions, "admin.roles")
  ) {
    notFound();
  }
  try {
    return { results: await searchRegisteredUsersForAdmin(query) };
  } catch (error) {
    console.error("searchAdminUsersAction failed:", error);
    return { results: [], error: "search_failed" };
  }
}

export async function grantSiteAdminAction(profileId: string): Promise<{
  ok: boolean;
  error?: SiteAdminMutationError;
}> {
  await requirePermission("admin.members");
  try {
    const result = await grantSiteAdminByProfileId(profileId);
    if (result.ok) {
      await assignSystemAdministratorRole(result.discordId);
      revalidateAdmins();
    }
    return result;
  } catch (error) {
    console.error("grantSiteAdminAction failed:", error);
    return { ok: false, error: "not_found" };
  }
}

export async function reactivateSiteAdminAction(discordId: string): Promise<{
  ok: boolean;
  error?: SiteAdminMutationError;
}> {
  await requirePermission("admin.members");
  try {
    const result = await reactivateSiteAdminByDiscordId(discordId);
    if (result.ok) {
      await assignSystemAdministratorRole(discordId);
      revalidateAdmins();
    }
    return result;
  } catch (error) {
    console.error("reactivateSiteAdminAction failed:", error);
    return { ok: false, error: "not_found" };
  }
}

export async function revokeSiteAdminAction(discordId: string): Promise<{
  ok: boolean;
  error?: SiteAdminMutationError;
}> {
  await requirePermission("admin.members");
  try {
    const result = await revokeSiteAdminByDiscordId(discordId);
    if (result.ok) {
      await clearRoleMemberships(discordId);
      revalidateAdmins();
    }
    return result;
  } catch (error) {
    console.error("revokeSiteAdminAction failed:", error);
    return { ok: false, error: "not_admin" };
  }
}
