import { describe, expect, it } from "vitest";

import {
  SIGNUP_RANGE_OPTIONS,
  buildSignupRanges,
  countBetween,
  countSince,
  formatDurationLabel,
  topHeroPicks,
  trendPercent,
  weeklyBuckets,
} from "@/lib/admin/stats";

const NOW = new Date("2026-08-28T12:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;

function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * DAY_MS).toISOString();
}

describe("weeklyBuckets", () => {
  it("produit une fenêtre par semaine, la plus récente en dernier", () => {
    const buckets = weeklyBuckets([], NOW, 4);
    expect(buckets.every((bucket) => bucket.count === 0)).toBe(true);
    expect(buckets).toHaveLength(4);
    expect(new Date(buckets[0].start).getTime()).toBe(
      NOW.getTime() - 4 * 7 * DAY_MS,
    );
    expect(new Date(buckets[3].start).getTime()).toBe(
      NOW.getTime() - 7 * DAY_MS,
    );
  });

  it("range chaque date dans sa semaine glissante", () => {
    const buckets = weeklyBuckets(
      [daysAgo(1), daysAgo(3), daysAgo(9), daysAgo(20)],
      NOW,
      4,
    );
    expect(buckets.map((bucket) => bucket.count)).toEqual([0, 1, 1, 2]);
  });

  it("ignore les dates hors fenêtre, futures ou invalides", () => {
    const future = new Date(NOW.getTime() + DAY_MS).toISOString();
    const buckets = weeklyBuckets(
      [daysAgo(90), future, "pas-une-date", daysAgo(2)],
      NOW,
      4,
    );
    expect(buckets.reduce((total, bucket) => total + bucket.count, 0)).toBe(1);
  });
});

describe("buildSignupRanges", () => {
  it("construit une série par période proposée", () => {
    const ranges = buildSignupRanges([daysAgo(2)], NOW);
    expect(ranges.map((range) => range.id)).toEqual(
      SIGNUP_RANGE_OPTIONS.map((option) => option.id),
    );
    for (const range of ranges) {
      expect(range.buckets).toHaveLength(range.weeks);
    }
  });

  it("expose le pic qui sert d’échelle au graphe", () => {
    const ranges = buildSignupRanges(
      [daysAgo(1), daysAgo(2), daysAgo(3), daysAgo(30)],
      NOW,
    );
    const short = ranges.find((range) => range.id === "4w");
    expect(short?.peak).toBe(3);
    // 4 semaines = 28 jours : la date à J-30 tombe hors fenêtre.
    expect(short?.total).toBe(3);
    expect(ranges.find((range) => range.id === "12w")?.total).toBe(4);
  });

  it("ne compte que la fenêtre de chaque période", () => {
    const ranges = buildSignupRanges([daysAgo(200)], NOW);
    expect(ranges.find((range) => range.id === "12w")?.total).toBe(0);
    expect(ranges.find((range) => range.id === "52w")?.total).toBe(1);
  });
});

describe("countSince / countBetween", () => {
  const dates = [daysAgo(1), daysAgo(6), daysAgo(15), daysAgo(45), daysAgo(80)];

  it("compte la fenêtre glissante récente", () => {
    expect(countSince(dates, NOW, 7)).toBe(2);
    expect(countSince(dates, NOW, 30)).toBe(3);
  });

  it("compte la période de comparaison sans doublon", () => {
    expect(countBetween(dates, NOW, 60, 30)).toBe(1);
    expect(countBetween(dates, NOW, 30, 0)).toBe(3);
  });
});

describe("trendPercent", () => {
  it("calcule la variation arrondie", () => {
    expect(trendPercent(12, 10)).toBe(20);
    expect(trendPercent(5, 10)).toBe(-50);
  });

  it("renvoie null sans base de comparaison", () => {
    expect(trendPercent(4, 0)).toBeNull();
  });
});

describe("topHeroPicks", () => {
  it("classe par nombre de picks puis par id", () => {
    expect(topHeroPicks([1, 2, 2, 3, 3, 4], 2)).toEqual([
      { heroId: 2, picks: 2 },
      { heroId: 3, picks: 2 },
    ]);
  });

  it("ignore les identifiants non entiers", () => {
    expect(topHeroPicks([Number.NaN, 7], 5)).toEqual([{ heroId: 7, picks: 1 }]);
  });

  it("renvoie tout le classement sans limite", () => {
    expect(topHeroPicks([1, 2, 3, 4, 4])).toEqual([
      { heroId: 4, picks: 2 },
      { heroId: 1, picks: 1 },
      { heroId: 2, picks: 1 },
      { heroId: 3, picks: 1 },
    ]);
  });
});

describe("formatDurationLabel", () => {
  it("formate heures et minutes", () => {
    expect(formatDurationLabel(3600)).toBe("1 h");
    expect(formatDurationLabel(5400)).toBe("1 h 30");
    expect(formatDurationLabel(1920)).toBe("32 min");
  });

  it("neutralise les durées absentes", () => {
    expect(formatDurationLabel(0)).toBe("—");
  });
});
