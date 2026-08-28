import { afterEach, describe, expect, it, vi } from "vitest";

import {
  extractRankBadgeFromMmr,
  fetchDeadlockRankBadge,
  normalizeRankedBadge,
  RANK_REFRESH_COOLDOWN_MS,
  rankRefreshState,
} from "./player-rank";

describe("normalizeRankedBadge", () => {
  it("arrondit et borne 0–116", () => {
    expect(normalizeRankedBadge(86)).toBe(86);
    expect(normalizeRankedBadge(86.4)).toBe(86);
    expect(normalizeRankedBadge(0)).toBe(0);
    expect(normalizeRankedBadge(116)).toBe(116);
    expect(normalizeRankedBadge(117)).toBeNull();
    expect(normalizeRankedBadge(-1)).toBeNull();
    expect(normalizeRankedBadge("86")).toBeNull();
  });
});

describe("extractRankBadgeFromMmr", () => {
  it("prend l’entrée la plus récente", () => {
    expect(
      extractRankBadgeFromMmr([
        { rank: 44, start_time: 10, match_id: 1 },
        { rank: 86, start_time: 40, match_id: 3 },
        { rank: 71, start_time: 20, match_id: 2 },
      ]),
    ).toBe(86);
  });

  it("ignore un lot vide ou sans rank", () => {
    expect(extractRankBadgeFromMmr([])).toBeNull();
    expect(extractRankBadgeFromMmr([{ match_id: 1 }])).toBeNull();
    expect(extractRankBadgeFromMmr(null)).toBeNull();
  });
});

describe("rankRefreshState", () => {
  it("autorise un premier fetch", () => {
    expect(rankRefreshState(null, 1_000)).toEqual({
      canRefresh: true,
      nextRefreshAt: null,
    });
  });

  it("bloque pendant le cooldown", () => {
    const fetchedAt = new Date(1_000).toISOString();
    const during = 1_000 + RANK_REFRESH_COOLDOWN_MS - 1;
    const state = rankRefreshState(fetchedAt, during);
    expect(state.canRefresh).toBe(false);
    expect(state.nextRefreshAt).toBe(
      new Date(1_000 + RANK_REFRESH_COOLDOWN_MS).toISOString(),
    );
  });

  it("réautorise après le cooldown", () => {
    const fetchedAt = new Date(1_000).toISOString();
    expect(
      rankRefreshState(fetchedAt, 1_000 + RANK_REFRESH_COOLDOWN_MS),
    ).toEqual({ canRefresh: true, nextRefreshAt: null });
  });
});

describe("fetchDeadlockRankBadge", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("utilise le lot MMR s’il contient un rank", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify([
          { account_id: 1, rank: 86, start_time: 99, match_id: 7 },
        ]),
    }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchDeadlockRankBadge(1125697502)).resolves.toBe(86);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("retombe sur l’historique si le lot est vide", async () => {
    const fetchMock = vi.fn(async (input: string) => {
      const url = String(input);
      if (url.includes("/mmr?")) {
        return { ok: true, status: 200, text: async () => "[]" };
      }
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify([{ rank: 55, start_time: 2, match_id: 9 }]),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchDeadlockRankBadge(1125697502)).resolves.toBe(55);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
