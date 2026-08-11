"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { respondInviteAction } from "@/app/profil/player-actions";
import { invalidateAccountClientCaches } from "@/lib/account/client-cache";
import { ensureBrowserSession } from "@/lib/account/session-bootstrap";
import type { TeamInviteWithTeam } from "@/lib/account/types";
import { createClient } from "@/lib/supabase/client";

type InviteRow = {
  id: string;
  team_id: string;
  inviter_id: string;
  invitee_id: string;
  role: TeamInviteWithTeam["role"];
  status: TeamInviteWithTeam["status"];
  created_at: string;
};

type AccountInvitesContextValue = {
  userId: string | null;
  invites: TeamInviteWithTeam[];
  inviteCount: number;
  ready: boolean;
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  toast: TeamInviteWithTeam | null;
  dismissToast: () => void;
  respond: (
    inviteId: string,
    accept: boolean,
  ) => Promise<{ ok: boolean; error?: string }>;
  refresh: () => Promise<void>;
};

const AccountInvitesContext = createContext<AccountInvitesContextValue | null>(
  null,
);

const POLL_MS = 3_000;

async function fetchPendingInvites(): Promise<{
  userId: string | null;
  invites: TeamInviteWithTeam[];
}> {
  await ensureBrowserSession();
  const response = await fetch("/api/account/invites", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });
  if (!response.ok) return { userId: null, invites: [] };
  const data = (await response.json()) as {
    userId: string | null;
    invites: TeamInviteWithTeam[];
  };
  return {
    userId: data.userId,
    invites: data.invites ?? [],
  };
}

async function hydrateInvite(row: InviteRow): Promise<TeamInviteWithTeam | null> {
  if (row.status !== "pending") return null;
  const supabase = createClient();
  const { data: team } = await supabase
    .from("teams")
    .select("id, name, tag")
    .eq("id", row.team_id)
    .maybeSingle();
  if (!team) return null;
  return {
    id: row.id,
    team_id: row.team_id,
    inviter_id: row.inviter_id,
    invitee_id: row.invitee_id,
    role: row.role,
    status: row.status,
    created_at: row.created_at,
    team: {
      id: team.id as string,
      name: team.name as string,
      tag: team.tag as string,
    },
  };
}

export function AccountInvitesProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [invites, setInvites] = useState<TeamInviteWithTeam[]>([]);
  const [ready, setReady] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [toast, setToast] = useState<TeamInviteWithTeam | null>(null);
  const knownIdsRef = useRef<Set<string>>(new Set());
  const readyRef = useRef(false);

  const applyInvites = useCallback(
    (nextUserId: string | null, nextInvites: TeamInviteWithTeam[]) => {
      setUserId(nextUserId);

      if (!readyRef.current) {
        knownIdsRef.current = new Set(nextInvites.map((i) => i.id));
        setInvites(nextInvites);
        readyRef.current = true;
        setReady(true);
        return;
      }

      const newcomers = nextInvites.filter(
        (i) => !knownIdsRef.current.has(i.id),
      );
      knownIdsRef.current = new Set(nextInvites.map((i) => i.id));
      setInvites(nextInvites);

      if (newcomers[0]) {
        setToast(newcomers[0]);
      }
    },
    [],
  );

  const refresh = useCallback(async () => {
    const next = await fetchPendingInvites();
    applyInvites(next.userId, next.invites);
  }, [applyInvites]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Polling de secours + refresh au focus / visibilité
  useEffect(() => {
    if (!userId) return;

    const tick = () => {
      if (document.visibilityState !== "visible") return;
      void refresh();
    };

    const interval = window.setInterval(tick, POLL_MS);
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", tick);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", tick);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [userId, refresh]);

  // Realtime — nécessite une session auth côté client
  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function subscribe() {
      await ensureBrowserSession();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token || cancelled) {
        // Sans JWT navigateur, le polling API couvre les mises à jour.
        return;
      }

      await supabase.realtime.setAuth(session.access_token);

      channel = supabase
        .channel(`team-invites:${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "team_invites",
            filter: `invitee_id=eq.${userId}`,
          },
          (payload) => {
            void (async () => {
              if (payload.eventType === "DELETE") {
                const oldRow = payload.old as { id?: string };
                if (oldRow.id) {
                  knownIdsRef.current.delete(oldRow.id);
                  setInvites((prev) =>
                    prev.filter((i) => i.id !== oldRow.id),
                  );
                }
                return;
              }

              const row = payload.new as InviteRow;
              if (!row?.id) return;

              if (row.status !== "pending") {
                knownIdsRef.current.delete(row.id);
                setInvites((prev) => prev.filter((i) => i.id !== row.id));
                invalidateAccountClientCaches();
                return;
              }

              const invite = await hydrateInvite(row);
              if (!invite) {
                void refresh();
                return;
              }

              const isNew = !knownIdsRef.current.has(invite.id);
              knownIdsRef.current.add(invite.id);
              setInvites((prev) => {
                const without = prev.filter((i) => i.id !== invite.id);
                return [invite, ...without];
              });
              invalidateAccountClientCaches();
              if (isNew) setToast(invite);
            })();
          },
        )
        .subscribe((status) => {
          // Si le canal realtime échoue, un refresh immédiat rattrape l'état.
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            void refresh();
          }
        });
    }

    void subscribe();

    const { data: authSub } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.access_token) {
          await supabase.realtime.setAuth(session.access_token);
        }
      },
    );

    return () => {
      cancelled = true;
      authSub.subscription.unsubscribe();
      if (channel) void supabase.removeChannel(channel);
    };
  }, [userId, refresh]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 8000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const respond = useCallback(
    async (inviteId: string, accept: boolean) => {
      const previous = invites;
      knownIdsRef.current.delete(inviteId);
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
      if (toast?.id === inviteId) setToast(null);

      const result = await respondInviteAction(inviteId, accept);
      if (!result.ok) {
        knownIdsRef.current = new Set(previous.map((i) => i.id));
        setInvites(previous);
        return result;
      }

      invalidateAccountClientCaches();
      return result;
    },
    [invites, toast],
  );

  const dismissToast = useCallback(() => setToast(null), []);

  const value = useMemo(
    () => ({
      userId,
      invites,
      inviteCount: invites.length,
      ready,
      panelOpen,
      setPanelOpen,
      toast,
      dismissToast,
      respond,
      refresh,
    }),
    [
      userId,
      invites,
      ready,
      panelOpen,
      toast,
      dismissToast,
      respond,
      refresh,
    ],
  );

  return (
    <AccountInvitesContext.Provider value={value}>
      {children}
    </AccountInvitesContext.Provider>
  );
}

export function useAccountInvites(): AccountInvitesContextValue {
  const ctx = useContext(AccountInvitesContext);
  if (!ctx) {
    throw new Error("useAccountInvites must be used within AccountInvitesProvider");
  }
  return ctx;
}
