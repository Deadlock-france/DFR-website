"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut, UserX } from "lucide-react";

import {
  kickTeamMemberAction,
  leaveTeamAction,
} from "@/app/profil/player-actions";
import PlayerSearchInvite from "@/components/account/PlayerSearchInvite";
import TeamChat from "@/components/account/TeamChat";
import FadeIn from "@/components/motion/FadeIn";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/shadcn/avatar";
import { buttonVariants } from "@/components/shadcn/button";
import { invalidateAccountClientCaches } from "@/lib/account/client-cache";
import { ensureBrowserSession } from "@/lib/account/session-bootstrap";
import type { TeamMessageWithAuthor, TeamWithMembers } from "@/lib/account/types";
import { profileDisplayName, teamRoleLabel } from "@/lib/account/types";
import { cn } from "@/lib/utils";

type EquipePayload = {
  userId: string;
  team: TeamWithMembers;
  messages: TeamMessageWithAuthor[];
  isMember: boolean;
  isCaptain: boolean;
};

export default function EquipePageClient({ teamId }: { teamId: string }) {
  const router = useRouter();
  const [payload, setPayload] = useState<EquipePayload | null | undefined>(
    undefined,
  );
  const [missing, setMissing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingProfileId, setPendingProfileId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has("invited") || url.searchParams.has("error")) {
      url.search = "";
      window.history.replaceState({}, "", url.pathname);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        await ensureBrowserSession();
        const response = await fetch(`/api/account/teams/${teamId}`, {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        });

        if (response.status === 404) {
          if (!cancelled) setMissing(true);
          return;
        }

        const data = (await response.json()) as {
          userId: string | null;
          team: TeamWithMembers | null;
          messages?: TeamMessageWithAuthor[];
          isMember?: boolean;
          isCaptain?: boolean;
        };

        if (cancelled) return;

        if (!data.userId) {
          setPayload(null);
          return;
        }

        if (!data.team) {
          setMissing(true);
          return;
        }

        setPayload({
          userId: data.userId,
          team: data.team,
          messages: data.messages ?? [],
          isMember: Boolean(data.isMember),
          isCaptain: Boolean(data.isCaptain),
        });
      } catch {
        if (!cancelled) setMissing(true);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [teamId]);

  function reloadTeam() {
    void (async () => {
      const response = await fetch(`/api/account/teams/${teamId}`, {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!response.ok) return;
      const data = (await response.json()) as {
        userId: string | null;
        team: TeamWithMembers | null;
        messages?: TeamMessageWithAuthor[];
        isMember?: boolean;
        isCaptain?: boolean;
      };
      if (!data.userId || !data.team) return;
      setPayload({
        userId: data.userId,
        team: data.team,
        messages: data.messages ?? [],
        isMember: Boolean(data.isMember),
        isCaptain: Boolean(data.isCaptain),
      });
    })();
  }

  if (missing) {
    return (
      <p className="text-sm text-muted-foreground">Équipe introuvable.</p>
    );
  }

  if (payload === null) {
    return (
      <div className="rounded-2xl border p-6" style={{ borderColor: "#1f2937" }}>
        <p className="text-sm text-muted-foreground">
          Connecte-toi pour voir cette équipe.
        </p>
        <a
          href={`/auth/login?next=${encodeURIComponent(`/equipes/${teamId}`)}`}
          className="mt-4 inline-flex rounded-xl px-4 py-2 text-sm font-semibold text-white no-underline"
          style={{ backgroundColor: "#5865F2" }}
        >
          Se connecter
        </a>
      </div>
    );
  }

  if (!payload) {
    return (
      <p className="text-sm text-muted-foreground">
        Chargement de l&apos;équipe…
      </p>
    );
  }

  const { team, userId, messages, isMember, isCaptain } = payload;

  if (!isMember) {
    return (
      <FadeIn>
        <h1 className="font-colus text-3xl tracking-[-0.02em]">
          [{team.tag}] {team.name}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Tu dois être membre de cette équipe pour voir le roster et le chat.
        </p>
      </FadeIn>
    );
  }

  return (
    <>
      <FadeIn>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p
              className="text-[0.7rem] font-semibold tracking-[0.16em] uppercase"
              style={{ color: "#4A9B7F" }}
            >
              Équipe
            </p>
            <h1 className="font-colus mt-2 text-3xl tracking-[-0.02em] text-foreground sm:text-4xl">
              <span className="text-muted-foreground">[{team.tag}]</span>{" "}
              {team.name}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {team.members.length} membre
              {team.members.length > 1 ? "s" : ""} — roster libre (titulaires et
              remplaçants).
            </p>
          </div>

          {!isCaptain ? (
            <button
              type="button"
              disabled={isPending}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "shrink-0 gap-1.5 rounded-xl disabled:opacity-60",
              )}
              onClick={() => {
                if (
                  !window.confirm(
                    `Quitter [${team.tag}] ${team.name} ? Tu pourras être réinvité plus tard.`,
                  )
                ) {
                  return;
                }
                setActionError(null);
                setPendingProfileId(userId);
                startTransition(async () => {
                  const result = await leaveTeamAction(teamId);
                  setPendingProfileId(null);
                  if (!result.ok) {
                    setActionError(
                      result.error === "captain"
                        ? "Le capitaine ne peut pas quitter l'équipe."
                        : "Impossible de quitter l'équipe.",
                    );
                    return;
                  }
                  invalidateAccountClientCaches();
                  router.push("/profil");
                });
              }}
            >
              <LogOut className="size-3.5" />
              Quitter l&apos;équipe
            </button>
          ) : null}
        </div>
      </FadeIn>

      {actionError ? (
        <p
          className="mt-6 rounded-xl border px-3 py-2 text-sm text-destructive"
          style={{ borderColor: "rgba(234, 60, 63, 0.35)" }}
        >
          {actionError}
        </p>
      ) : null}

      <FadeIn delay={0.08} className="mt-8">
        <h2 className="mb-3 text-base font-semibold">Roster</h2>
        <ul className="flex flex-col gap-2">
          {team.members.map((member) => {
            const label = profileDisplayName(member.profile);
            const initials = label.slice(0, 2).toUpperCase();
            const canKick =
              isCaptain &&
              member.profile_id !== userId &&
              member.role !== "captain";

            return (
              <li
                key={member.profile_id}
                className="flex items-center gap-3 rounded-2xl border px-4 py-3"
                style={{
                  borderColor: "#1f2937",
                  backgroundColor: "rgba(74, 155, 127, 0.04)",
                }}
              >
                <Avatar size="default" className="rounded-xl">
                  {member.profile.avatar_url ? (
                    <AvatarImage src={member.profile.avatar_url} alt="" />
                  ) : null}
                  <AvatarFallback className="rounded-xl text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {label}
                    {member.profile_id === userId ? (
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        (toi)
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    @{member.profile.username ?? "discord"}
                  </p>
                </div>

                <span
                  className="rounded-md px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-wide"
                  style={{
                    backgroundColor:
                      member.role === "captain"
                        ? "rgba(74, 155, 127, 0.18)"
                        : member.role === "substitute"
                          ? "rgba(255, 255, 255, 0.04)"
                          : "rgba(255, 255, 255, 0.06)",
                    color: member.role === "captain" ? "#6BB89A" : undefined,
                  }}
                >
                  {teamRoleLabel(member.role)}
                </span>

                {canKick ? (
                  <button
                    type="button"
                    disabled={
                      isPending && pendingProfileId === member.profile_id
                    }
                    aria-label={`Exclure ${label}`}
                    title="Exclure de l'équipe"
                    className={cn(
                      buttonVariants({ variant: "outline", size: "icon-sm" }),
                      "rounded-xl text-muted-foreground hover:text-destructive disabled:opacity-60",
                    )}
                    onClick={() => {
                      if (
                        !window.confirm(
                          `Exclure ${label} de [${team.tag}] ${team.name} ?`,
                        )
                      ) {
                        return;
                      }
                      setActionError(null);
                      setPendingProfileId(member.profile_id);
                      startTransition(async () => {
                        const result = await kickTeamMemberAction(
                          teamId,
                          member.profile_id,
                        );
                        setPendingProfileId(null);
                        if (!result.ok) {
                          setActionError("Impossible d'exclure ce joueur.");
                          return;
                        }
                        invalidateAccountClientCaches();
                        setPayload((prev) =>
                          prev
                            ? {
                                ...prev,
                                team: {
                                  ...prev.team,
                                  members: prev.team.members.filter(
                                    (m) =>
                                      m.profile_id !== member.profile_id,
                                  ),
                                },
                              }
                            : prev,
                        );
                        reloadTeam();
                      });
                    }}
                  >
                    <UserX className="size-3.5" />
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      </FadeIn>

      {isCaptain ? (
        <FadeIn delay={0.1} className="mt-10">
          <div
            className="rounded-2xl border p-6"
            style={{ borderColor: "#1f2937" }}
          >
            <h2 className="text-base font-semibold">Inviter un joueur</h2>
            <p className="mt-1 mb-4 text-sm text-muted-foreground">
              Recherche optimisée via Supabase. Le joueur devra accepter
              l&apos;invitation.
            </p>
            <PlayerSearchInvite teamId={team.id} canInvite />
          </div>
        </FadeIn>
      ) : null}

      <FadeIn delay={0.12} className="mt-10">
        <TeamChat
          teamId={team.id}
          userId={userId}
          initialMessages={messages}
        />
      </FadeIn>
    </>
  );
}
