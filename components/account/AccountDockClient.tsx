"use client";

import { useEffect, useState } from "react";

import AppAccountDock, {
  type AccountDockUser,
} from "@/components/account/AppAccountDock";
import MobileBottomNav from "@/components/navigation/MobileBottomNav";
import {
  readStoredAccountUser,
  subscribeAccountInvalidation,
  writeStoredAccountUser,
} from "@/lib/account/client-cache";
import { ensureBrowserSession } from "@/lib/account/session-bootstrap";

/**
 * Cache module : survit aux navigations client.
 * + sessionStorage : survit au refresh hard (même onglet).
 */
let cachedUser: AccountDockUser | null | undefined;
let inflight: Promise<AccountDockUser | null> | null = null;

function hydrateFromSession(): AccountDockUser | null | undefined {
  if (cachedUser !== undefined) return cachedUser;
  const stored = readStoredAccountUser();
  if (stored !== undefined) cachedUser = stored;
  return cachedUser;
}

async function revalidateAccountUser(): Promise<AccountDockUser | null> {
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
        writeStoredAccountUser(null);
        return null;
      }
      const data = (await response.json()) as { user: AccountDockUser | null };
      cachedUser = data.user;
      writeStoredAccountUser(cachedUser);
      return cachedUser;
    } catch {
      // Garde le cache existant si le réseau tombe.
      return cachedUser ?? null;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

async function loadAccountUser(force = false): Promise<AccountDockUser | null> {
  if (!force) {
    const hydrated = hydrateFromSession();
    if (hydrated !== undefined) {
      // Stale-while-revalidate : UI immédiate, refresh en fond.
      void revalidateAccountUser();
      return hydrated;
    }
  }

  return revalidateAccountUser();
}

export default function AccountDockClient() {
  const [user, setUser] = useState<AccountDockUser | null>(
    () => cachedUser ?? null,
  );

  useEffect(() => {
    let cancelled = false;

    const hydrated = hydrateFromSession();
    if (hydrated !== undefined) setUser(hydrated);

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
