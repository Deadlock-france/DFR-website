"use client";

import { LogOut, UserRound } from "lucide-react";

import AppLink from "@/components/AppLink";
import { invalidateAccountClientCaches } from "@/lib/account/client-cache";
import type { AccountDockUser } from "@/lib/account/types";

export default function AccountMenuPanel({
  user,
  onNavigate,
}: {
  user: AccountDockUser;
  onNavigate?: () => void;
}) {
  return (
    <>
      <div
        className="border-b px-3 py-2.5"
        style={{ borderColor: "var(--nav-border)" }}
      >
        <p className="truncate text-sm font-semibold text-foreground">
          {user.displayLabel}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">Compte</p>
      </div>

      <div className="flex flex-col p-1.5">
        <AppLink
          href="/profil"
          role="menuitem"
          className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-foreground no-underline transition-colors hover:bg-[color:var(--nav-hover)]"
          onClick={onNavigate}
        >
          <UserRound className="size-4 opacity-70" />
          Mon profil
        </AppLink>

        <a
          href="/auth/logout"
          role="menuitem"
          className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-muted-foreground no-underline transition-colors hover:bg-[color:var(--nav-hover)] hover:text-foreground"
          onClick={() => invalidateAccountClientCaches()}
        >
          <LogOut className="size-4 opacity-70" />
          Déconnexion
        </a>
      </div>
    </>
  );
}
