"use client";

import { useState, useTransition } from "react";

import AppLink from "@/components/AppLink";
import { useAccountInvites } from "@/components/account/AccountInvitesProvider";
import { buttonVariants } from "@/components/shadcn/button";
import { teamRoleLabel } from "@/lib/account/types";
import { cn } from "@/lib/utils";

export default function PendingInvitesList() {
  const { invites, respond } = useAccountInvites();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (invites.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        {flash ? (
          <p
            className="rounded-xl border px-3 py-2 text-sm"
            style={{
              borderColor: "rgba(74, 155, 127, 0.35)",
              backgroundColor: "rgba(74, 155, 127, 0.1)",
              color: "#6BB89A",
            }}
          >
            {flash}
          </p>
        ) : null}
        <p className="text-sm text-muted-foreground">
          Aucune invitation en attente.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {error ? (
        <p
          className="rounded-xl border px-3 py-2 text-sm text-destructive"
          style={{ borderColor: "rgba(234, 60, 63, 0.35)" }}
        >
          {error}
        </p>
      ) : null}

      <ul className="flex flex-col gap-2">
        {invites.map((invite) => (
          <li
            key={invite.id}
            className="flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center"
            style={{ borderColor: "#1f2937" }}
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">
                <AppLink
                  href={`/equipes/${invite.team.id}`}
                  className="underline-offset-2 hover:underline"
                >
                  [{invite.team.tag}] {invite.team.name}
                </AppLink>
              </p>
              <p className="text-xs text-muted-foreground">
                Rôle proposé : {teamRoleLabel(invite.role)}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={isPending && pendingId === invite.id}
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "border-0 font-semibold text-white disabled:opacity-60",
                )}
                style={{ backgroundColor: "#4A9B7F" }}
                onClick={() => {
                  setPendingId(invite.id);
                  setError(null);
                  startTransition(async () => {
                    const result = await respond(invite.id, true);
                    setPendingId(null);
                    if (!result.ok) {
                      setError("Impossible d'accepter cette invitation.");
                      return;
                    }
                    setFlash("Invitation acceptée.");
                  });
                }}
              >
                Accepter
              </button>
              <button
                type="button"
                disabled={isPending && pendingId === invite.id}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "rounded-xl disabled:opacity-60",
                )}
                onClick={() => {
                  setPendingId(invite.id);
                  setError(null);
                  startTransition(async () => {
                    const result = await respond(invite.id, false);
                    setPendingId(null);
                    if (!result.ok) {
                      setError("Impossible de refuser cette invitation.");
                      return;
                    }
                    setFlash("Invitation refusée.");
                  });
                }}
              >
                Refuser
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
