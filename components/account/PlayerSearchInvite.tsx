"use client";

import { useEffect, useEffectEvent, useState, useTransition } from "react";

import { invitePlayerAction, searchPlayersAction } from "@/app/profil/player-actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/shadcn/avatar";
import { buttonVariants } from "@/components/shadcn/button";
import type { InviteRole, PlayerSearchResult } from "@/lib/account/types";
import { playerSearchDisplayName } from "@/lib/account/types";
import { cn } from "@/lib/utils";

export default function PlayerSearchInvite({
  teamId,
  canInvite,
}: {
  teamId?: string;
  canInvite: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlayerSearchResult[]>([]);
  const [role, setRole] = useState<InviteRole>("member");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const runSearch = useEffectEvent((value: string) => {
    startTransition(async () => {
      const { results: next, error: searchError } = await searchPlayersAction({
        query: value,
        teamId: canInvite ? teamId : undefined,
      });
      setResults(next);
      setError(searchError === "search_failed" ? "Recherche indisponible." : null);
    });
  });

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setError(null);
      return;
    }

    const timer = window.setTimeout(() => {
      runSearch(trimmed);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [query]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 flex flex-col gap-2">
          <label htmlFor="player-search" className="text-sm font-medium">
            Rechercher un joueur
          </label>
          <input
            id="player-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Pseudo Discord ou affichage (min. 2 caractères)"
            className="h-10 w-full rounded-xl border bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            style={{ borderColor: "#1f2937" }}
            autoComplete="off"
          />
        </div>

        {canInvite && teamId ? (
          <div className="flex flex-col gap-2">
            <label htmlFor="invite-role" className="text-sm font-medium">
              Rôle à l&apos;invitation
            </label>
            <select
              id="invite-role"
              value={role}
              onChange={(event) =>
                setRole(event.target.value as InviteRole)
              }
              className="h-10 rounded-xl border bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              style={{ borderColor: "#1f2937" }}
            >
              <option value="member">Membre</option>
              <option value="substitute">Remplaçant</option>
            </select>
          </div>
        ) : null}
      </div>

      {pending && !invitingId ? (
        <p className="text-xs text-muted-foreground">Recherche…</p>
      ) : null}
      {success ? (
        <p
          className="rounded-xl border px-3 py-2 text-sm"
          style={{
            borderColor: "rgba(74, 155, 127, 0.35)",
            backgroundColor: "rgba(74, 155, 127, 0.1)",
            color: "#6BB89A",
          }}
        >
          {success}
        </p>
      ) : null}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : null}

      {results.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {results.map((player) => {
            const label = playerSearchDisplayName(player);
            const initials = label.slice(0, 2).toUpperCase();

            return (
              <li
                key={player.id}
                className="flex flex-col gap-3 rounded-xl border px-3 py-3 sm:flex-row sm:items-center"
                style={{ borderColor: "#1f2937" }}
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar size="default" className="rounded-xl">
                    {player.avatar_url ? (
                      <AvatarImage src={player.avatar_url} alt="" />
                    ) : null}
                    <AvatarFallback className="rounded-xl text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{label}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      @{player.username ?? "discord"}
                      {player.team_tags.length > 0
                        ? ` · ${player.team_tags.map((t) => `[${t}]`).join(" ")}`
                        : ""}
                    </p>
                  </div>
                </div>

                {canInvite && teamId ? (
                  <button
                    type="button"
                    disabled={invitingId === player.id}
                    className={cn(
                      buttonVariants({ size: "sm" }),
                      "border-0 font-semibold text-white disabled:opacity-60",
                    )}
                    style={{ backgroundColor: "#4A9B7F" }}
                    onClick={() => {
                      setInvitingId(player.id);
                      setError(null);
                      setSuccess(null);
                      startTransition(async () => {
                        const formData = new FormData();
                        formData.set("team_id", teamId);
                        formData.set("invitee_id", player.id);
                        formData.set("role", role);
                        const result = await invitePlayerAction(formData);
                        setInvitingId(null);
                        if (!result.ok) {
                          setError(
                            result.error === "unauthenticated"
                              ? "Reconnecte-toi pour inviter."
                              : "Impossible d'envoyer l'invitation.",
                          );
                          return;
                        }
                        setSuccess(`Invitation envoyée à ${label}.`);
                        setResults((prev) =>
                          prev.filter((p) => p.id !== player.id),
                        );
                      });
                    }}
                  >
                    {invitingId === player.id ? "…" : "Inviter"}
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : query.trim().length >= 2 && !pending ? (
        <p className="text-xs text-muted-foreground">Aucun joueur trouvé.</p>
      ) : null}

      {!canInvite ? (
        <p className="text-xs text-muted-foreground">
          Pour inviter, ouvre une équipe dont tu es capitaine.
        </p>
      ) : null}
    </div>
  );
}
