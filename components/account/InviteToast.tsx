"use client";

import { useTransition } from "react";
import { Bell, X } from "lucide-react";
import { createPortal } from "react-dom";

import { useAccountInvites } from "@/components/account/AccountInvitesProvider";
import { buttonVariants } from "@/components/shadcn/button";
import { useHydrated } from "@/hooks/use-hydrated";
import { teamRoleLabel } from "@/lib/account/types";
import { cn } from "@/lib/utils";

export default function InviteToast() {
  const hydrated = useHydrated();
  const { toast, dismissToast, respond, setPanelOpen } = useAccountInvites();
  const [isPending, startTransition] = useTransition();

  if (!hydrated || !toast) return null;

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className="fixed top-4 left-1/2 z-110 w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-2xl border backdrop-blur-[20px] sm:left-auto sm:right-24 sm:translate-x-0"
      style={{
        borderColor: "rgba(74, 155, 127, 0.45)",
        backgroundColor: "var(--bg-nav-glass)",
        boxShadow: "var(--shadow-nav-dock)",
      }}
    >
      <div className="flex items-start gap-3 p-4">
        <div
          className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl"
          style={{
            backgroundColor: "rgba(74, 155, 127, 0.15)",
            color: "#6BB89A",
          }}
        >
          <Bell className="size-4" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">
            Nouvelle invitation
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            [{toast.team.tag}] {toast.team.name} — {teamRoleLabel(toast.role)}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isPending}
              className={cn(
                buttonVariants({ size: "sm" }),
                "border-0 font-semibold text-white disabled:opacity-60",
              )}
              style={{ backgroundColor: "#4A9B7F" }}
              onClick={() => {
                startTransition(async () => {
                  await respond(toast.id, true);
                  dismissToast();
                });
              }}
            >
              Accepter
            </button>
            <button
              type="button"
              disabled={isPending}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "rounded-xl disabled:opacity-60",
              )}
              onClick={() => {
                startTransition(async () => {
                  await respond(toast.id, false);
                  dismissToast();
                });
              }}
            >
              Refuser
            </button>
            <button
              type="button"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "rounded-xl text-muted-foreground",
              )}
              onClick={() => {
                dismissToast();
                setPanelOpen(true);
              }}
            >
              Voir tout
            </button>
          </div>
        </div>

        <button
          type="button"
          aria-label="Fermer la notification"
          className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-(--nav-hover) hover:text-foreground"
          onClick={dismissToast}
        >
          <X className="size-4" />
        </button>
      </div>
    </div>,
    document.body,
  );
}
