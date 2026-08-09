import { describe, expect, it } from "vitest";

import {
  formatRankLabel,
  formatRankWithScore,
  rankBadgeImageUrl,
  rankFromBadge,
  rankFromScore,
} from "./ranks";

describe("rankFromBadge", () => {
  it("mappe Prosélyte I (11) avec le nouvel endpoint image", () => {
    const rank = rankFromBadge(11);
    expect(rank).toMatchObject({
      tier: 1,
      name: "Prosélyte",
      nameEn: "Initiate",
      subrank: 1,
      label: "Prosélyte I",
    });
    expect(rank.imageUrl).toBe(
      "https://api.deadlock-api.com/v1/assets/ranks/1/1/image?format=webp",
    );
  });

  it("mappe les nouveaux grades post-30/07/2026 (noms FR)", () => {
    expect(rankFromBadge(31).name).toBe("Acolyte");
    expect(rankFromBadge(44).label).toBe("Sentinelle IV");
    expect(rankFromBadge(55).name).toBe("Mystique");
    expect(rankFromBadge(66).name).toBe("Ritualiste");
    expect(rankFromBadge(71).name).toBe("Émissaire"); // ex-Archon
    expect(rankFromBadge(91).name).toBe("Augure"); // ex-Phantom
    expect(rankFromBadge(101).name).toBe("Thaumaturge"); // ex-Ascendant
    expect(rankFromBadge(116).label).toBe("Éternus VI");
  });

  it("retourne Obscurus pour 0 / négatif", () => {
    expect(rankFromBadge(0).label).toBe("Obscurus");
    expect(rankFromBadge(0).imageUrl).toContain("rank00_lg.webp");
    expect(rankFromBadge(-3).label).toBe("Obscurus");
  });
});

describe("rankFromScore", () => {
  it("interprète une moyenne de badges (format Valve)", () => {
    expect(rankFromScore(14.2).label).toBe("Prosélyte IV");
    expect(rankFromScore(73.5).label).toBe("Émissaire IV");
  });

  it("accepte un tier seul (< 11)", () => {
    expect(rankFromScore(7).label).toBe("Émissaire I");
    expect(rankFromScore(4.5).name).toBe("Sentinelle");
  });
});

describe("rankBadgeImageUrl", () => {
  it("pointe vers le nouvel asset Ranked Mode", () => {
    expect(rankBadgeImageUrl(4, 1)).toBe(
      "https://api.deadlock-api.com/v1/assets/ranks/4/1/image?format=webp",
    );
  });
});

describe("formatRank*", () => {
  it("formatRankLabel", () => {
    expect(formatRankLabel(91)).toBe("Augure I");
  });

  it("formatRankWithScore combine grade et note", () => {
    expect(formatRankWithScore(14.2)).toBe("Prosélyte IV (14.2)");
    expect(formatRankWithScore(0)).toBe("Obscurus");
  });
});
