"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  deleteSiteRoleAction,
  saveSiteRoleAction,
} from "@/lib/admin/role-actions";
import type { RoleMutationError } from "@/lib/admin/roles";
import type { SiteRole } from "@/lib/admin/roles";
import {
  PERMISSION_GROUPS,
  ROLE_COLOR_PRESETS,
  canDeleteRole,
  expandPermissions,
  permissionDescription,
  permissionLabel,
  type AdminPermission,
} from "@/lib/admin/permissions";
import {
  adminInputClassName,
  adminLabelClassName,
  adminPanelClassName,
} from "@/components/admin/admin-styles";
import { Button } from "@/components/shadcn/button";
import { cn } from "@/lib/utils";

function mutationMessage(error: RoleMutationError | undefined): string {
  switch (error) {
    case "invalid_name":
      return "Le nom doit faire entre 2 et 40 caractères.";
    case "invalid_color":
      return "Couleur invalide.";
    case "system_role":
      return "Ce rôle système ne peut pas être modifié ainsi.";
    case "last_admin":
      return "Impossible : ce serait le dernier administrateur.";
    case "not_found":
      return "Rôle introuvable.";
    default:
      return "Enregistrement impossible pour le moment.";
  }
}

export default function AdminRoleEditor({ role }: { role: SiteRole }) {
  const router = useRouter();
  const [name, setName] = useState(role.name);
  const [color, setColor] = useState(role.color);
  const [selected, setSelected] = useState<Set<AdminPermission>>(
    () => new Set(role.permissions),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const expanded = expandPermissions([...selected]);
  const administratorOn = selected.has("admin.administrator");

  function toggle(permission: AdminPermission) {
    if (permission === "admin.administrator" && role.isSystem) return;
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(permission)) next.delete(permission);
      else next.add(permission);
      return next;
    });
  }

  function save() {
    setError(null);
    const form = new FormData();
    form.set("id", role.id);
    form.set("name", name);
    form.set("color", color);
    for (const permission of selected) {
      form.append("permissions", permission);
    }
    startTransition(async () => {
      const result = await saveSiteRoleAction(form);
      if (!result.ok) {
        setError(mutationMessage(result.error));
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <section className={cn(adminPanelClassName, "flex flex-col gap-4 p-4 sm:p-5")}>
        <h2 className="text-sm font-medium text-foreground">Apparence</h2>
        <label className={adminLabelClassName}>
          <span className="text-muted-foreground">Nom du rôle</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={40}
            className={adminInputClassName}
          />
        </label>
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">Couleur</p>
          <div className="flex flex-wrap items-center gap-2">
            {ROLE_COLOR_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                aria-label={`Couleur ${preset}`}
                aria-pressed={color.toUpperCase() === preset}
                onClick={() => setColor(preset)}
                className={cn(
                  "size-7 rounded-full border border-border transition-transform",
                  color.toUpperCase() === preset &&
                    "ring-2 ring-ring ring-offset-2 ring-offset-background",
                )}
                style={{ backgroundColor: preset }}
              />
            ))}
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="color"
                value={color}
                onChange={(event) => setColor(event.target.value.toUpperCase())}
                className="size-7 cursor-pointer rounded-full border border-border bg-transparent p-0"
              />
              {color}
            </label>
          </div>
        </div>
      </section>

      <section className={cn(adminPanelClassName, "flex flex-col p-4 sm:p-5")}>
        <div className="mb-2">
          <h2 className="text-sm font-medium text-foreground">
            Scopes du rôle
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Comme sur Discord : les cases cochées s’additionnent. Un scope
            métier ouvre aussi le dashboard et l’accès au site.
          </p>
        </div>

        {PERMISSION_GROUPS.map((group) => (
          <div key={group.id} className="mt-4">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {group.label}
            </p>
            <ul className="mt-1 divide-y divide-border">
              {group.permissions.map((permission) => {
                const lockedAdmin =
                  permission === "admin.administrator" && role.isSystem;
                const implied =
                  permission !== "admin.administrator" &&
                  administratorOn &&
                  expanded.has(permission) &&
                  !selected.has(permission);
                const checked =
                  selected.has(permission) ||
                  (administratorOn && permission !== "admin.administrator");
                const disabled =
                  lockedAdmin ||
                  (administratorOn && permission !== "admin.administrator");

                return (
                  <li key={permission}>
                    <label
                      className={cn(
                        "flex cursor-pointer items-start gap-3 py-3",
                        disabled && "cursor-not-allowed opacity-80",
                      )}
                    >
                      <input
                        type="checkbox"
                        className="mt-1 size-4 accent-primary"
                        checked={checked}
                        disabled={disabled}
                        onChange={() => toggle(permission)}
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-foreground">
                          {permissionLabel(permission)}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {permissionDescription(permission)}
                          {implied ? " (inclus via Administrateur)" : null}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </section>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" disabled={pending} onClick={save}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
        {canDeleteRole(role) ? (
          <form
            action={deleteSiteRoleAction}
            onSubmit={(event) => {
              if (
                !window.confirm(
                  "Supprimer ce rôle ? Les membres perdent uniquement ce rôle.",
                )
              ) {
                event.preventDefault();
              }
            }}
          >
            <input type="hidden" name="id" value={role.id} />
            <Button type="submit" variant="destructive" disabled={pending}>
              Supprimer
            </Button>
          </form>
        ) : (
          <p className="text-xs text-muted-foreground">
            Rôle système : il ne peut pas être supprimé.
          </p>
        )}
      </div>
    </div>
  );
}
