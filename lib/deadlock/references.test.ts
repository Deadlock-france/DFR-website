import { describe, expect, it } from "vitest";

import {
  buildDeadlockReferenceIndex,
  getReferenceMatchTerms,
  isHeroAbility,
  isShopItem,
  normalizeReferenceName,
  sortReferencesByNameLength,
} from "./references";
import type { DeadlockHero, DeadlockItem } from "./types";

function hero(overrides: Partial<DeadlockHero> = {}): DeadlockHero {
  return {
    id: 1,
    class_name: "hero_inferno",
    name: "Infernus",
    description: { role: "Enflamme ses adversaires" },
    player_selectable: true,
    disabled: false,
    in_development: false,
    images: {
      icon_image_small_webp: "https://example.com/infernus.webp",
    },
    ...overrides,
  };
}

function item(overrides: Partial<DeadlockItem> = {}): DeadlockItem {
  return {
    id: 100,
    class_name: "upgrade_clip_size",
    name: "Chargeur\u00a0XL",
    type: "upgrade",
    heroes: [],
    shopable: true,
    cost: 800,
    item_tier: 1,
    item_slot_type: "weapon",
    shop_image_webp: "https://example.com/clip.webp",
    ...overrides,
  };
}

describe("normalizeReferenceName", () => {
  it("normalise espaces insécables et casse", () => {
    expect(normalizeReferenceName("Chargeur\u00a0XL")).toBe("chargeur xl");
    expect(normalizeReferenceName("  Infernus  ")).toBe("infernus");
  });
});

describe("getReferenceMatchTerms", () => {
  it("ajoute The Doorman / Doorman comme alias de Doorman", () => {
    expect(
      getReferenceMatchTerms({
        kind: "hero",
        id: 50,
        className: "hero_doorman",
        name: "Doorman",
      }),
    ).toEqual(["Doorman", "The Doorman"]);
  });

  it("ajoute les alias anglais pour Alphonse", () => {
    expect(
      getReferenceMatchTerms({
        kind: "hero",
        id: 69,
        className: "hero_doorman",
        name: "Alphonse",
      }),
    ).toEqual(["Alphonse", "The Doorman", "Doorman"]);
  });
});

describe("isShopItem", () => {
  it("accepte uniquement les upgrades achetables", () => {
    expect(isShopItem(item())).toBe(true);
    expect(isShopItem(item({ shopable: false }))).toBe(false);
    expect(isShopItem(item({ type: "ability" }))).toBe(false);
  });
});

describe("isHeroAbility", () => {
  it("exclut les capacités génériques de mouvement", () => {
    expect(
      isHeroAbility(
        item({
          type: "ability",
          class_name: "ability_fire_bomb",
          heroes: [1],
        }),
      ),
    ).toBe(true);

    expect(
      isHeroAbility(
        item({
          type: "ability",
          class_name: "citadel_ability_dash",
          heroes: [1],
        }),
      ),
    ).toBe(false);
  });
});

describe("buildDeadlockReferenceIndex", () => {
  it("indexe héros, items boutique et capacités", () => {
    const index = buildDeadlockReferenceIndex(
      [hero()],
      [
        item(),
        item({
          id: 200,
          class_name: "ability_fire_bomb",
          name: "Combustion explosive",
          type: "ability",
          heroes: [1],
        }),
        item({
          id: 201,
          class_name: "ability_wrecker_salvage",
          name: "Récupération",
          type: "ability",
          heroes: [48],
        }),
      ],
    );

    expect(index.references).toHaveLength(3);
    expect(index.byNormalizedName.get("infernus")?.kind).toBe("hero");
    expect(index.byNormalizedName.get("chargeur xl")?.kind).toBe("item");
    expect(index.byNormalizedName.get("combustion explosive")?.kind).toBe(
      "ability",
    );
    expect(index.byNormalizedName.has("récupération")).toBe(false);
  });

  it("conserve le rôle et le coût pour les tooltips", () => {
    const index = buildDeadlockReferenceIndex([hero()], [item()]);

    expect(index.byNormalizedName.get("infernus")?.role).toBe(
      "Enflamme ses adversaires",
    );
    expect(index.byNormalizedName.get("chargeur xl")?.cost).toBe(800);
  });
});

describe("sortReferencesByNameLength", () => {
  it("trie du nom le plus long au plus court", () => {
    const sorted = sortReferencesByNameLength([
      { kind: "hero", id: 1, className: "a", name: "Abe" },
      { kind: "hero", id: 2, className: "b", name: "Abraham" },
    ]);

    expect(sorted.map((ref) => ref.name)).toEqual(["Abraham", "Abe"]);
  });
});
