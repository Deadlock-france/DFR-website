import { readResponseJson } from "@/lib/http/json";

export const DEADLOCK_PLAYERS_API = "https://api.deadlock-api.com/v1/players";

export const RANK_REFRESH_COOLDOWN_MS = 15 * 60 * 1000;

const RANK_FETCH_TIMEOUT_MS = 8_000;

export function normalizeRankedBadge(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const badge = Math.round(value);
  if (badge < 0 || badge > 116) return null;
  return badge;
}

/**
 * Prend le badge `rank` le plus récent d’un historique / lot MMR Deadlock.
 */
export function extractRankBadgeFromMmr(records: unknown): number | null {
  if (!Array.isArray(records) || records.length === 0) return null;

  let best: { badge: number; key: number } | null = null;

  for (const row of records) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const badge = normalizeRankedBadge(rec.rank);
    if (badge == null) continue;

    const start = Number(rec.start_time);
    const matchId = Number(rec.match_id);
    const key = Number.isFinite(start)
      ? start
      : Number.isFinite(matchId)
        ? matchId
        : 0;

    if (!best || key >= best.key) {
      best = { badge, key };
    }
  }

  return best?.badge ?? null;
}

export function rankRefreshState(
  fetchedAt: string | null,
  now = Date.now(),
): { canRefresh: boolean; nextRefreshAt: string | null } {
  if (fetchedAt == null) {
    return { canRefresh: true, nextRefreshAt: null };
  }

  const then = Date.parse(fetchedAt);
  if (!Number.isFinite(then)) {
    return { canRefresh: true, nextRefreshAt: null };
  }

  const next = then + RANK_REFRESH_COOLDOWN_MS;
  if (now >= next) {
    return { canRefresh: true, nextRefreshAt: null };
  }

  return {
    canRefresh: false,
    nextRefreshAt: new Date(next).toISOString(),
  };
}

async function fetchPlayersJson(
  url: string,
  signal: AbortSignal,
): Promise<unknown> {
  const response = await fetch(url, { signal, cache: "no-store" });
  if (response.status === 403 || response.status === 404) return [];
  if (!response.ok) {
    throw new Error(`Deadlock players API ${response.status}`);
  }
  return readResponseJson(response);
}

/** Rang Deadlock public (MMR dérivé) — pas le Steam ID, pas `/card` Patreon. */
export async function fetchDeadlockRankBadge(
  accountId: number,
): Promise<number | null> {
  if (!Number.isInteger(accountId) || accountId <= 0) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RANK_FETCH_TIMEOUT_MS);

  try {
    const batch = await fetchPlayersJson(
      `${DEADLOCK_PLAYERS_API}/mmr?account_ids=${accountId}`,
      controller.signal,
    );
    const fromBatch = extractRankBadgeFromMmr(batch);
    if (fromBatch != null) return fromBatch;

    const history = await fetchPlayersJson(
      `${DEADLOCK_PLAYERS_API}/${accountId}/mmr-history`,
      controller.signal,
    );
    return extractRankBadgeFromMmr(history);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Deadlock rank timeout after ${RANK_FETCH_TIMEOUT_MS}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
