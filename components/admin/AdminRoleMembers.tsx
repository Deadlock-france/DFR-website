"use client";

import { useEffect, useEffectEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { searchAdminUsersAction } from "@/lib/admin/admin-member-actions";
import {
  assignRoleMemberAction,
  removeRoleMemberAction,
} from "@/lib/admin/role-actions";
import type { AdminSearchHit } from "@/lib/admin/admins";
import type { RoleMutationError } from "@/lib/admin/roles";
import type { SiteRoleMember } from "@/lib/admin/roles";
import {
  adminInputClassName,
  adminPanelClassName,
} from "@/components/admin/admin-styles";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/shadcn/avatar";
import { Button } from "@/components/shadcn/button";
import { cn } from "@/lib/utils";

function mutationMessage(error: RoleMutationError | undefined): string {
  switch (error) {
    case "missing_discord":
      return "Ce compte n’a pas d’identifiant Discord utilisable.";
    case "already_member":
      return "Cette personne a déjà ce rôle.";
    case "last_admin":
      return "Impossible de retirer le dernier administrateur.";
    case "not_found":
      return "Introuvable.";
    default:
      return "Action impossible pour le moment.";
  }
}

function initials(label: string): string {
  return label.slice(0, 2).toUpperCase();
}

export default function AdminRoleMembers({
  roleId,
  members,
}: {
  roleId: string;
  members: SiteRoleMember[];
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
    const timer = window.setTimeout(() => runSearch(trimmed), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  /** Sous 2 caractères, la liste précédente ne doit plus s’afficher. */
  const visibleResults = query.trim().length < 2 ? [] : results;
  const memberIds = new Set(members.map((row) => row.discordId));

  function assign(profileId: string) {
    setBusyId(profileId);
    setError(null);
    startTransition(async () => {
      const result = await assignRoleMemberAction({ roleId, profileId });
      setBusyId(null);
      if (!result.ok) {
        setError(mutationMessage(result.error));
        return;
      }
      setQuery("");
      setResults([]);
      router.refresh();
    });
  }

  function remove(discordId: string) {
    if (!window.confirm("Retirer ce rôle à cette personne ?")) return;
    setBusyId(discordId);
    setError(null);
    startTransition(async () => {
      const result = await removeRoleMemberAction({ roleId, discordId });
      setBusyId(null);
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
        <div>
          <h2 className="text-sm font-medium text-foreground">
            Ajouter un membre
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Si le rôle ouvre le dashboard, la personne est aussi ajoutée aux
            admins et pourra entrer via Discord.
          </p>
        </div>
        <input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setError(null);
          }}
          placeholder="Pseudo Discord ou nom d’affichage"
          className={adminInputClassName}
          autoComplete="off"
        />
        {pending && !busyId ? (
          <p className="text-xs text-muted-foreground">Recherche…</p>
        ) : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {visibleResults.length > 0 ? (
          <ul className="divide-y divide-border border-t border-border">
            {visibleResults.map((hit) => {
              const already =
                hit.discordId != null && memberIds.has(hit.discordId);
              return (
                <li
                  key={hit.profileId}
                  className="flex items-center gap-3 py-3"
                >
                  <Avatar>
                    {hit.avatarUrl ? (
                      <AvatarImage src={hit.avatarUrl} alt="" />
                    ) : null}
                    <AvatarFallback>
                      {initials(hit.displayLabel)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {hit.displayLabel}
                    </p>
                    {hit.username ? (
                      <p className="truncate text-xs text-muted-foreground">
                        @{hit.username}
                      </p>
                    ) : null}
                  </div>
                  {hit.discordId == null ? (
                    <span className="text-xs text-muted-foreground">
                      Discord requis
                    </span>
                  ) : already ? (
                    <span className="text-xs text-muted-foreground">
                      Déjà membre
                    </span>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      disabled={pending && busyId === hit.profileId}
                      onClick={() => assign(hit.profileId)}
                    >
                      Ajouter
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>

      <section className={cn(adminPanelClassName, "flex flex-col p-4 sm:p-5")}>
        <h2 className="text-sm font-medium text-foreground">
          Membres ({members.length})
        </h2>
        {members.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Personne n’a ce rôle pour le moment.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-border">
            {members.map((member) => (
              <li
                key={member.discordId}
                className="flex items-center gap-3 py-3"
              >
                <Avatar>
                  {member.avatarUrl ? (
                    <AvatarImage src={member.avatarUrl} alt="" />
                  ) : null}
                  <AvatarFallback>
                    {initials(member.displayLabel)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {member.displayLabel}
                  </p>
                  {member.username ? (
                    <p className="truncate text-xs text-muted-foreground">
                      @{member.username}
                    </p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={pending && busyId === member.discordId}
                  onClick={() => remove(member.discordId)}
                >
                  Retirer
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
