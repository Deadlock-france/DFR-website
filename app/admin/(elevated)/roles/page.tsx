import Link from "next/link";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminRoleBadge from "@/components/admin/AdminRoleBadge";
import {
  adminInputClassName,
  adminPanelClassName,
} from "@/components/admin/admin-styles";
import { Button } from "@/components/shadcn/button";
import { createSiteRoleAction } from "@/lib/admin/role-actions";
import { listSiteRoles } from "@/lib/admin/roles";
import { expandPermissions } from "@/lib/admin/permissions";
import { cn } from "@/lib/utils";

const CREATE_ERRORS: Record<string, string> = {
  invalid_name: "Le nom doit faire entre 2 et 40 caractères.",
  slug_taken: "Ce nom de rôle est déjà pris.",
};

export default async function AdminRolesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ error }, roles] = await Promise.all([
    searchParams,
    listSiteRoles(),
  ]);
  const createError = error ? CREATE_ERRORS[error] : null;

  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeader
        title="Rôles"
        description="Définis des rôles et leurs scopes, comme sur Discord. Un membre peut avoir plusieurs rôles : les permissions s’additionnent."
      />

      <section className={cn(adminPanelClassName, "flex flex-col gap-3 p-4 sm:p-5")}>
        <h2 className="text-sm font-medium text-foreground">Nouveau rôle</h2>
        <form action={createSiteRoleAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm">
            <span className="text-muted-foreground">Nom</span>
            <input
              name="name"
              required
              minLength={2}
              maxLength={40}
              placeholder="Modération, Staff, Accès site…"
              className={adminInputClassName}
            />
          </label>
          <Button type="submit">Créer</Button>
        </form>
        {createError ? (
          <p className="text-sm text-destructive">{createError}</p>
        ) : null}
      </section>

      <section className={cn(adminPanelClassName, "flex flex-col p-4 sm:p-5")}>
        <h2 className="text-sm font-medium text-foreground">Rôles</h2>
        {roles.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Aucun rôle.</p>
        ) : (
          <ul className="mt-2 divide-y divide-border">
            {roles.map((role) => {
              const count = expandPermissions(role.permissions).size;
              return (
                <li key={role.id}>
                  <Link
                    href={`/admin/roles/${role.id}`}
                    className="flex items-center gap-3 py-3 transition-colors hover:text-primary"
                  >
                    <AdminRoleBadge name={role.name} color={role.color} />
                    <span className="min-w-0 flex-1 text-sm text-muted-foreground">
                      {role.memberCount} membre{role.memberCount === 1 ? "" : "s"}
                      {" · "}
                      {count} scope{count === 1 ? "" : "s"}
                      {role.isSystem ? " · système" : ""}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
