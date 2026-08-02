import { describe, expect, it } from "vitest";

import {
  attachReferenceUrls,
  getDeadlockReferenceUrl,
  type DeadlockIoSlugs,
} from "./deadlock-io";
import type { DeadlockReference } from "./types";

const slugs: DeadlockIoSlugs = {
  heroesById: new Map([[1, "infernus"]]),
  itemsByClassName: new Map([["upgrade_clip_size", "extended-magazine"]]),
};

describe("getDeadlockReferenceUrl", () => {
  it("construit l'URL héros", () => {
    const url = getDeadlockReferenceUrl(
      {
        kind: "hero",
        id: 1,
        className: "hero_inferno",
        name: "Infernus",
      },
      slugs,
    );

    expect(url).toBe("https://deadlock.io/fr/heroes/infernus");
  });

  it("construit l'URL item", () => {
    const url = getDeadlockReferenceUrl(
      {
        kind: "item",
        id: 10,
        className: "upgrade_clip_size",
        name: "Chargeur XL",
      },
      slugs,
    );

    expect(url).toBe("https://deadlock.io/fr/items/extended-magazine");
  });

  it("renvoie la page héros pour une capacité", () => {
    const url = getDeadlockReferenceUrl(
      {
        kind: "ability",
        id: 11,
        className: "ability_fire_bomb",
        name: "Combustion explosive",
        heroId: 1,
      },
      slugs,
    );

    expect(url).toBe("https://deadlock.io/fr/heroes/infernus");
  });
});

describe("attachReferenceUrls", () => {
  it("ajoute l'URL aux références", () => {
    const references: DeadlockReference[] = [
      {
        kind: "hero",
        id: 1,
        className: "hero_inferno",
        name: "Infernus",
      },
    ];

    const enriched = attachReferenceUrls(references, slugs);

    expect(enriched[0]?.url).toBe("https://deadlock.io/fr/heroes/infernus");
  });
});
