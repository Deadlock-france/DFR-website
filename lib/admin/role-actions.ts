"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requirePermission } from "@/lib/admin/access";
import {
  assignRoleToProfileId,
  createSiteRole,
  deleteSiteRole,
  removeRoleMember,
  updateSiteRole,
  type RoleMutationError,
} from "@/lib/admin/roles";

function revalidateRoles(roleId?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/admins");
  revalidatePath("/admin/roles");
  if (roleId) revalidatePath(`/admin/roles/${roleId}`);
}

export async function createSiteRoleAction(formData: FormData) {
  await requirePermission("admin.roles");
  const name = String(formData.get("name") ?? "");
  const result = await createSiteRole({ name });
  if (!result.ok) {
    redirect(`/admin/roles?error=${result.error}`);
  }
  revalidateRoles(result.id);
  redirect(`/admin/roles/${result.id}`);
}

export async function saveSiteRoleAction(formData: FormData): Promise<{
  ok: boolean;
  error?: RoleMutationError;
}> {
  await requirePermission("admin.roles");
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "");
  const color = String(formData.get("color") ?? "");
  const permissions = formData
    .getAll("permissions")
    .map((value) => String(value));

  try {
    const result = await updateSiteRole({ id, name, color, permissions });
    if (result.ok) revalidateRoles(id);
    return result;
  } catch (error) {
    console.error("saveSiteRoleAction failed:", error);
    return { ok: false, error: "not_found" };
  }
}

export async function deleteSiteRoleAction(formData: FormData) {
  await requirePermission("admin.roles");
  const id = String(formData.get("id") ?? "").trim();
  const result = await deleteSiteRole(id);
  if (!result.ok) {
    redirect(`/admin/roles/${id}?error=${result.error}`);
  }
  revalidateRoles();
  redirect("/admin/roles");
}

export async function assignRoleMemberAction(input: {
  roleId: string;
  profileId: string;
}): Promise<{ ok: boolean; error?: RoleMutationError }> {
  await requirePermission("admin.roles");
  try {
    const result = await assignRoleToProfileId(input);
    if (result.ok) revalidateRoles(input.roleId);
    return result;
  } catch (error) {
    console.error("assignRoleMemberAction failed:", error);
    return { ok: false, error: "not_found" };
  }
}

export async function removeRoleMemberAction(input: {
  roleId: string;
  discordId: string;
}): Promise<{ ok: boolean; error?: RoleMutationError }> {
  await requirePermission("admin.roles");
  try {
    const result = await removeRoleMember(input);
    if (result.ok) revalidateRoles(input.roleId);
    return result;
  } catch (error) {
    console.error("removeRoleMemberAction failed:", error);
    return { ok: false, error: "not_found" };
  }
}
