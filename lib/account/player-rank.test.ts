import { describe, expect, it } from "vitest";

import { toPlayerRankSnapshot } from "./player-rank";
import { RANK_REFRESH_COOLDOWN_MS } from "@/lib/deadlock/player-rank";

describe("toPlayerRankSnapshot", () => {
  it("masque le refresh sans Steam", () => {
    expect(
      toPlayerRankSnapshot({
        hasSteam: false,
        badge: 86,
        fetchedAt: "2026-08-28T10:00:00.000Z",
      }),
    ).toEqual({
      hasSteam: false,
      badge: null,
      fetchedAt: null,
      canRefresh: false,
      nextRefreshAt: null,
    });
  });

  it("expose le badge et le cooldown", () => {
    const fetchedAt = "2026-08-28T10:00:00.000Z";
    const now = Date.parse(fetchedAt) + 1_000;
    const snapshot = toPlayerRankSnapshot({
      hasSteam: true,
      badge: 86,
      fetchedAt,
      now,
    });
    expect(snapshot.hasSteam).toBe(true);
    expect(snapshot.badge).toBe(86);
    expect(snapshot.canRefresh).toBe(false);
    expect(Date.parse(snapshot.nextRefreshAt ?? "")).toBe(
      Date.parse(fetchedAt) + RANK_REFRESH_COOLDOWN_MS,
    );
  });
});
