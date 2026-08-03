import { describe, expect, it } from "vitest";

import {
  extractChangedReferences,
  extractChangedReferencesFromItem,
  getPatchSubjectBorderColor,
  PATCH_SUBJECT_AVATAR_LIMIT,
} from "./changed-subjects";
import type { DeadlockReference } from "./types";

const references: DeadlockReference[] = [
  {
    kind: "hero",
    id: 1,
    className: "hero_inferno",
    name: "Infernus",
    image: "https://example.com/infernus.webp",
  },
  {
    kind: "hero",
    id: 69,
    className: "hero_doorman",
    name: "Alphonse",
    aliases: ["Doorman", "The Doorman"],
    image: "https://example.com/doorman.webp",
  },
  {
    kind: "item",
    id: 2,
    className: "upgrade_clip_size",
    name: "Chargeur XL",
    image: "https://example.com/clip.webp",
    itemSlotType: "weapon",
  },
  {
    kind: "ability",
    id: 9,
    className: "ability_fire",
    name: "Combustion",
    image: "https://example.com/ability.webp",
  },
];

describe("extractChangedReferences", () => {
  it("extrait les héros cités en tête de ligne VO", () => {
    const found = extractChangedReferences(
      "[p]- Infernus: dégâts +5[/p][p]- Infernus: CD -1s[/p][p]- Chargeur XL: charge +10[/p]",
      references,
    );

    expect(found.map((ref) => `${ref.kind}:${ref.id}`)).toEqual([
      "hero:1",
      "item:2",
    ]);
  });

  it("extrait le format VF [Alphonse/Doorman]", () => {
    const found = extractChangedReferences(
      "[Alphonse/Doorman] Sonnette : 7 s\n[Alphonse/Doorman] Dégâts : 24",
      references,
    );

    expect(found).toHaveLength(1);
    expect(found[0]?.id).toBe(69);
  });

  it("ignore les capacités et le texte prosaïque", () => {
    const found = extractChangedReferences(
      "Infernus a été légèrement ajusté. Combustion aussi.",
      references,
    );

    expect(found).toEqual([]);
  });

  it("ignore les références sans image", () => {
    const found = extractChangedReferences("- Fantôme: buff", [
      {
        kind: "hero",
        id: 99,
        className: "hero_ghost",
        name: "Fantôme",
      },
    ]);

    expect(found).toEqual([]);
  });
});

describe("getPatchSubjectBorderColor", () => {
  it("colore héros et slots d'objets", () => {
    expect(getPatchSubjectBorderColor(references[0])).toBe("#4A9B7F");
    expect(getPatchSubjectBorderColor(references[2])).toBe("#C4A35A");
  });
});

describe("extractChangedReferencesFromItem", () => {
  it("retrouve les héros via la VO même si la VF a des noms traduits", () => {
    const frenchRefs: DeadlockReference[] = [
      {
        kind: "hero",
        id: 77,
        className: "hero_apollo",
        name: "Apollon",
        aliases: ["Apollo"],
        image: "https://example.com/apollo.webp",
      },
      {
        kind: "hero",
        id: 76,
        className: "hero_graves",
        name: "Morella",
        aliases: ["Graves"],
        image: "https://example.com/graves.webp",
      },
      {
        kind: "hero",
        id: 27,
        className: "hero_yamato",
        name: "Yamato",
        image: "https://example.com/yamato.webp",
      },
    ];

    const found = extractChangedReferencesFromItem(
      {
        contents:
          "[p]- Apollon: buff[/p][p]- Morella: nerf[/p][p]- Yamato: tweak[/p]",
        original: {
          contents:
            "[p]- Apollo: Disengaging Sigil T2 increased[/p][p]- Graves: Jar of Dead damage reduced[/p][p]- Yamato: Power Slash spirit scaling reduced[/p][p]- Apollo: again[/p]",
        },
      },
      frenchRefs,
    );

    expect(found.map((ref) => ref.id)).toEqual([77, 76, 27]);
  });

  it("détecte les 7 héros de la Minor Update 05-31-2026 via la VO", () => {
    const refs: DeadlockReference[] = [
      ["Apollo", "Apollon", 77],
      ["Graves", "Morella", 76],
      ["McGinnis", "McGinnis", 8],
      ["Pocket", "Pocket", 50],
      ["Silver", "Silver", 80],
      ["Victor", "Victor", 66],
      ["Yamato", "Yamato", 27],
    ].map(([en, fr, id]) => ({
      kind: "hero" as const,
      id,
      className: `hero_${String(en).toLowerCase()}`,
      name: String(fr),
      aliases: en === fr ? undefined : [String(en)],
      image: `https://example.com/${id}.webp`,
    }));

    const english = `[p]- Apollo: a[/p][p]- Graves: a[/p][p]- McGinnis: a[/p][p]- Pocket: a[/p][p]- Silver: a[/p][p]- Victor: a[/p][p]- Yamato: a[/p]`;
    const found = extractChangedReferencesFromItem(
      {
        contents: "[p]- Apollon: a[/p][p]- Yamato: a[/p]",
        original: { contents: english },
      },
      refs,
    );

    expect(found.map((ref) => ref.name)).toEqual([
      "Apollon",
      "Morella",
      "McGinnis",
      "Pocket",
      "Silver",
      "Victor",
      "Yamato",
    ]);
  });
});
