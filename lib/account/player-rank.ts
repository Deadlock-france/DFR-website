import type { PlayerRankSnapshot } from "@/lib/account/types";
import { rankRefreshState } from "@/lib/deadlock/player-rank";

export function toPlayerRankSnapshot(input: {
  hasSteam: boolean;
  badge: number | null;
  fetchedAt: string | null;
  now?: number;
}): PlayerRankSnapshot {
  if (!input.hasSteam) {
    return {
      hasSteam: false,
      badge: null,
      fetchedAt: null,
      canRefresh: false,
      nextRefreshAt: null,
    };
  }

  const refresh = rankRefreshState(input.fetchedAt, input.now ?? Date.now());
  return {
    hasSteam: true,
    badge: input.badge,
    fetchedAt: input.fetchedAt,
    canRefresh: refresh.canRefresh,
    nextRefreshAt: refresh.nextRefreshAt,
  };
}
