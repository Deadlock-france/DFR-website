"use client";

import { useEffect, useState } from "react";

import AppAccountDock, {
  type AccountDockUser,
} from "@/components/account/AppAccountDock";
import MobileBottomNav from "@/components/navigation/MobileBottomNav";
import { subscribeAccountInvalidation } from "@/lib/account/client-cache";
import { ensureBrowserSession } from "@/lib/account/session-bootstrap";

/**
 * Cache module : survit aux remounts soft-refresh Next.
 * Session d'abord (POST /api/auth/session), puis /api/account/me en readonly.
 */
let cachedUser: AccountDockUser | null | undefined;
let inflight: Promise<AccountDockUser | null> | null = null;

async function loadAccountUser(force = false): Promise<AccountDockUser | null> {
  if (!force && cachedUser !== undefined) return cachedUser;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      await ensureBrowserSession();
      const response = await fetch("/api/account/me", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!response.ok) {
        cachedUser = null;
        return null;
      }
      const data = (await response.json()) as { user: AccountDockUser | null };
      cachedUser = data.user;
      return cachedUser;
    } catch {
      cachedUser = null;
      return null;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

export default function AccountDockClient() {
  const [user, setUser] = useState<AccountDockUser | null>(
    () => cachedUser ?? null,
  );

  useEffect(() => {
    let cancelled = false;

    void loadAccountUser().then((next) => {
      if (!cancelled) setUser(next);
    });

    const unsubscribe = subscribeAccountInvalidation(() => {
      cachedUser = undefined;
      void loadAccountUser(true).then((next) => {
        if (!cancelled) setUser(next);
      });
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return (
    <>
      <AppAccountDock user={user} />
      <MobileBottomNav user={user} />
    </>
  );
}
