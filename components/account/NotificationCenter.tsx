"use client";

import { useEffect, useTransition } from "react";
import { Bell, X } from "lucide-react";
import { createPortal } from "react-dom";

import AppLink from "@/components/AppLink";
import { useAccountInvites } from "@/components/account/AccountInvitesProvider";
import { buttonVariants } from "@/components/shadcn/button";
import { useHydrated } from "@/hooks/use-hydrated";
import { teamRoleLabel } from "@/lib/account/types";
import { cn } from "@/lib/utils";

export default function NotificationCenter() {
  const hydrated = useHydrated();
  const { invites, inviteCount, panelOpen, setPanelOpen, respond } =
    useAccountInvites();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!panelOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setPanelOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [panelOpen, setPanelOpen]);

  if (!hydrated || !panelOpen) return null;

  return createPortal(
    <>
      <button
        type="button"
        aria-label="Fermer les notifications"
        className="fixed inset-0 z-90 bg-black/40"
        onClick={() => setPanelOpen(false)}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Centre de notifications"
        className="fixed bottom-4 right-20 z-100 flex w-[min(22rem,calc(100vw-5.5rem))] max-h-[min(32rem,calc(100vh-2rem))] flex-col overflow-hidden rounded-2xl border backdrop-blur-[20px]"
        style={{
          borderColor: "var(--border-nav-glass)",
          backgroundColor: "var(--bg-nav-glass)",
          boxShadow: "var(--shadow-nav-dock)",
        }}
      >
        <div
          className="flex items-center justify-between gap-2 border-b px-4 py-3"
          style={{ borderColor: "var(--nav-border)" }}
        >
          <div className="flex items-center gap-2">
            <Bell className="size-4" style={{ color: "#6BB89A" }} />
            <h2 className="text-sm font-semibold text-foreground">
              Notifications
            </h2>
            {inviteCount > 0 ? (
              <span
                className="rounded-md px-1.5 py-0.5 text-[0.65rem] font-bold text-white"
                style={{ backgroundColor: "#4A9B7F" }}
              >
                {inviteCount}
              </span>
            ) : null}
          </div>
          <button
            type="button"
            aria-label="Fermer"
            className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-(--nav-hover) hover:text-foreground"
            onClick={() => setPanelOpen(false)}
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {invites.length === 0 ? (
            <p className="px-1 py-6 text-center text-sm text-muted-foreground">
              Aucune invitation en attente.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {invites.map((invite) => (
                <li
                  key={invite.id}
                  className="rounded-xl border px-3 py-3"
                  style={{ borderColor: "#1f2937" }}
                >
                  <p className="text-sm font-semibold text-foreground">
                    Invitation d&apos;équipe
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    <AppLink
                      href={`/equipes/${invite.team.id}`}
                      className="underline-offset-2 hover:underline"
                      onClick={() => setPanelOpen(false)}
                    >
                      [{invite.team.tag}] {invite.team.name}
                    </AppLink>
                    {" · "}
                    {teamRoleLabel(invite.role)}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      disabled={isPending}
                      className={cn(
                        buttonVariants({ size: "sm" }),
                        "flex-1 border-0 font-semibold text-white disabled:opacity-60",
                      )}
                      style={{ backgroundColor: "#4A9B7F" }}
                      onClick={() => {
                        startTransition(async () => {
                          await respond(invite.id, true);
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
                        "flex-1 rounded-xl disabled:opacity-60",
                      )}
                      onClick={() => {
                        startTransition(async () => {
                          await respond(invite.id, false);
                        });
                      }}
                    >
                      Refuser
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </>,
    document.body,
  );
}
