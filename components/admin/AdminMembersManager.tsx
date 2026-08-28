"use client";

import { useEffect, useEffectEvent, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import {
  grantSiteAdminAction,
  reactivateSiteAdminAction,
  revokeSiteAdminAction,
  searchAdminUsersAction,
} from "@/lib/admin/admin-member-actions";
import type {
  AdminSearchHit,
  ManagedSiteAdmin,
  SiteAdminMutationError,
} from "@/lib/admin/admins";
import AdminRoleBadge from "@/components/admin/AdminRoleBadge";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import {
  adminInputClassName,
  adminPanelClassName,
} from "@/components/admin/admin-styles";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/shadcn/avatar";
import { Button } from "@/components/shadcn/button";
import { cn } from "@/lib/utils";

function mutationMessage(error: SiteAdminMutationError | undefined): string {
  switch (error) {
    case "missing_discord":
      return "Ce compte n’a pas d’identifiant Discord utilisable.";
    case "invalid_discord":
      return "Identifiant Discord invalide.";
    case "not_found":
      return "Utilisateur introuvable.";
    case "not_admin":
      return "Cette personne n’est plus admin.";
    case "last_admin":
      return "Impossible de retirer le dernier admin actif.";
    default:
      return "Action impossible pour le moment.";
  }
}

function initials(label: string): string {
  return label.slice(0, 2).toUpperCase();
}

function PersonRow({
  label,
  username,
  avatarUrl,
  roles,
  children,
}: {
  label: string;
  username: string | null;
  avatarUrl: string | null;
  roles?: Array<{ id: string; name: string; color: string }>;
  children: ReactNode;
}) {
  return (
    <li className="flex items-center gap-3 py-3">
      <Avatar size="default">
        {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
        <AvatarFallback>{initials(label)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{label}</p>
        {username ? (
          <p className="truncate text-xs text-muted-foreground">@{username}</p>
        ) : null}
        {roles && roles.length > 0 ? (
          <div className="mt-1 flex flex-wrap gap-1">
            {roles.map((role) => (
              <AdminRoleBadge
                key={role.id}
                name={role.name}
                color={role.color}
              />
            ))}
          </div>
        ) : null}
      </div>
      {children}
    </li>
  );
}

export default function AdminMembersManager({
  currentDiscordId,
  initialAdmins,
}: {
  currentDiscordId: string;
  initialAdmins: ManagedSiteAdmin[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AdminSearchHit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const runSearch = useEffectEvent((value: string) => {
    startTransition(async () => {
      const { results: next, error: searchError } =
        await searchAdminUsersAction(value);
      setResults(next);
      setError(
        searchError === "search_failed" ? "Recherche indisponible." : null,
      );
    });
  });

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;

    const timer = window.setTimeout(() => {
      runSearch(trimmed);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [query]);

  /** Sous 2 caractères, la liste précédente ne doit plus s’afficher. */
  const visibleResults = query.trim().length < 2 ? [] : results;
  const activeAdmins = initialAdmins.filter((row) => row.revokedAt == null);
  const revokedAdmins = initialAdmins.filter((row) => row.revokedAt != null);
  const activeCount = activeAdmins.length;

  function refresh() {
    router.refresh();
  }

  function grant(profileId: string) {
    setBusyId(profileId);
    setError(null);
    startTransition(async () => {
      const result = await grantSiteAdminAction(profileId);
      setBusyId(null);
      if (!result.ok) {
        setError(mutationMessage(result.error));
        return;
      }
      setQuery("");
      setResults([]);
      refresh();
    });
  }

  function reactivate(discordId: string) {
    setBusyId(discordId);
    setError(null);
    startTransition(async () => {
      const result = await reactivateSiteAdminAction(discordId);
      setBusyId(null);
      if (!result.ok) {
        setError(mutationMessage(result.error));
        return;
      }
      refresh();
    });
  }

  function revoke(discordId: string) {
    if (
      !window.confirm(
        "Retirer l’accès admin ? La personne devra à nouveau être promue pour revenir.",
      )
    ) {
      return;
    }
    setBusyId(discordId);
    setError(null);
    startTransition(async () => {
      const result = await revokeSiteAdminAction(discordId);
      setBusyId(null);
      if (!result.ok) {
        setError(mutationMessage(result.error));
        return;
      }
      refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <section className={cn(adminPanelClassName, "flex flex-col gap-4 p-4 sm:p-5")}>
        <div>
          <h2 className="text-sm font-medium text-foreground">
            Ajouter un admin
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Recherche un compte déjà inscrit. Une fois promu, la personne
            devra se reconnecter avec Discord depuis la page d’accès pour
            entrer sur le site et le dashboard.
          </p>
        </div>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted-foreground">Utilisateur</span>
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setError(null);
            }}
            placeholder="Pseudo Discord ou nom d’affichage (min. 2 caractères)"
            className={adminInputClassName}
            autoComplete="off"
          />
        </label>

        {pending && !busyId ? (
          <p className="text-xs text-muted-foreground">Recherche…</p>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {visibleResults.length > 0 ? (
          <ul className="divide-y divide-border border-t border-border">
            {visibleResults.map((hit) => {
              const isSelf = hit.discordId === currentDiscordId;
              const canGrant =
                hit.discordId != null && hit.adminStatus !== "active";

              return (
                <PersonRow
                  key={hit.profileId}
                  label={hit.displayLabel}
                  username={hit.username}
                  avatarUrl={hit.avatarUrl}
                >
                  <div className="flex shrink-0 items-center gap-2">
                    {hit.adminStatus === "active" ? (
                      <AdminStatusBadge tone="live">Admin</AdminStatusBadge>
                    ) : null}
                    {hit.adminStatus === "revoked" ? (
                      <AdminStatusBadge tone="draft">Révoqué</AdminStatusBadge>
                    ) : null}
                    {isSelf ? (
                      <AdminStatusBadge tone="pending">Toi</AdminStatusBadge>
                    ) : null}
                    {canGrant ? (
                      <Button
                        type="button"
                        size="sm"
                        disabled={pending && busyId === hit.profileId}
                        onClick={() => grant(hit.profileId)}
                      >
                        {hit.adminStatus === "revoked"
                          ? "Réactiver"
                          : "Définir admin"}
                      </Button>
                    ) : hit.discordId == null ? (
                      <span className="text-xs text-muted-foreground">
                        Discord requis
                      </span>
                    ) : null}
                  </div>
                </PersonRow>
              );
            })}
          </ul>
        ) : query.trim().length >= 2 && !pending ? (
          <p className="text-sm text-muted-foreground">Aucun utilisateur.</p>
        ) : null}
      </section>

      <section className={cn(adminPanelClassName, "flex flex-col p-4 sm:p-5")}>
        <h2 className="text-sm font-medium text-foreground">Admins actifs</h2>
        {activeAdmins.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Aucun admin.</p>
        ) : (
          <ul className="mt-2 divide-y divide-border">
            {activeAdmins.map((admin) => {
              const isSelf = admin.discordId === currentDiscordId;
              const canRevoke = activeCount > 1;

              return (
                <PersonRow
                  key={admin.discordId}
                  label={admin.displayLabel}
                  username={admin.username}
                  avatarUrl={admin.avatarUrl}
                  roles={admin.roles}
                >
                  <div className="flex shrink-0 items-center gap-2">
                    {isSelf ? (
                      <AdminStatusBadge tone="pending">Toi</AdminStatusBadge>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={!canRevoke || (pending && busyId === admin.discordId)}
                      title={
                        canRevoke
                          ? undefined
                          : "Impossible de retirer le dernier admin"
                      }
                      onClick={() => revoke(admin.discordId)}
                    >
                      Retirer
                    </Button>
                  </div>
                </PersonRow>
              );
            })}
          </ul>
        )}
      </section>

      {revokedAdmins.length > 0 ? (
        <section className={cn(adminPanelClassName, "flex flex-col p-4 sm:p-5")}>
          <h2 className="text-sm font-medium text-foreground">
            Accès retirés
          </h2>
          <ul className="mt-2 divide-y divide-border">
            {revokedAdmins.map((admin) => (
              <PersonRow
                key={admin.discordId}
                label={admin.displayLabel}
                username={admin.username}
                avatarUrl={admin.avatarUrl}
                roles={admin.roles}
              >
                <div className="flex shrink-0 items-center gap-2">
                  <AdminStatusBadge tone="draft">Révoqué</AdminStatusBadge>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pending && busyId === admin.discordId}
                    onClick={() => reactivate(admin.discordId)}
                  >
                    Réactiver
                  </Button>
                </div>
              </PersonRow>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
