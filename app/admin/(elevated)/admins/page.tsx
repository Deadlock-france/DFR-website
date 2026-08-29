import AdminMembersManager from "@/components/admin/AdminMembersManager";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { requireAdmin } from "@/lib/admin/access";
import { listManagedSiteAdmins } from "@/lib/admin/admins";

export default async function AdminMembersPage() {
  const [identity, admins] = await Promise.all([
    requireAdmin(),
    listManagedSiteAdmins(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeader
        title="Admins"
        description="Qui peut ouvrir le dashboard. Les scopes précis se règlent dans Rôles."
      />
      <AdminMembersManager
        currentDiscordId={identity.discordId}
        initialAdmins={admins}
      />
    </div>
  );
}
