import { describe, expect, it } from "vitest";

import {
  earnedShowmatchBadges,
  tallyShowmatchBadgeStats,
} from "./showmatch-badges";

describe("tallyShowmatchBadgeStats", () => {
  it("compte games, victoires et MVP", () => {
    expect(
      tallyShowmatchBadgeStats([
        { won: true, is_mvp: true },
        { won: false, is_mvp: false },
        { won: null, is_mvp: true },
      ]),
    ).toEqual({ games: 3, wins: 1, mvps: 2 });
  });
});

describe("earnedShowmatchBadges", () => {
  it("n’attribue rien sans participation", () => {
    expect(earnedShowmatchBadges({ games: 0, wins: 0, mvps: 0 })).toEqual([]);
  });

  it("débloque première game, victoire et MVP", () => {
    const ids = earnedShowmatchBadges({
      games: 1,
      wins: 1,
      mvps: 1,
    }).map((badge) => badge.id);
    expect(ids).toEqual(["first_game", "first_win", "first_mvp"]);
  });

  it("débloque les paliers 5 et 10", () => {
    const ids = earnedShowmatchBadges({
      games: 12,
      wins: 10,
      mvps: 5,
    }).map((badge) => badge.id);
    expect(ids).toContain("games_10");
    expect(ids).toContain("wins_10");
    expect(ids).toContain("mvp_5");
    expect(ids).not.toContain("mvp_10");
  });
});
