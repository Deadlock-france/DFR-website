import Link from "next/link";
import { notFound } from "next/navigation";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminRoleBadge from "@/components/admin/AdminRoleBadge";
import AdminRoleDetail from "@/components/admin/AdminRoleDetail";
import { getSiteRole, listRoleMembers } from "@/lib/admin/roles";

export default async function AdminRolePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const role = await getSiteRole(id);
  if (!role) notFound();

  const members = await listRoleMembers(role.id);

  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeader
        title={role.name}
        description="Coche les scopes que ce rôle donne. Les membres reçoivent l’union de tous leurs rôles."
        actions={
          <div className="flex items-center gap-3">
            <AdminRoleBadge name={role.name} color={role.color} />
            <Link
              href="/admin/roles"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Tous les rôles
            </Link>
          </div>
        }
      />
      <AdminRoleDetail role={role} members={members} />
    </div>
  );
}
