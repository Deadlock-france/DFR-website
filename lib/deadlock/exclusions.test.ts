import { describe, expect, it } from "vitest";

import {
  countAbilityNames,
  isExcludedReferenceName,
  isLinkableAbilityName,
} from "./exclusions";
import { DEADLOCK_LANG_ENGLISH, DEADLOCK_LANG_FRENCH } from "./types";

describe("isExcludedReferenceName", () => {
  it("exclut les noms génériques français", () => {
    expect(isExcludedReferenceName("Récupération", DEADLOCK_LANG_FRENCH)).toBe(
      true,
    );
    expect(isExcludedReferenceName("Mêlée", DEADLOCK_LANG_FRENCH)).toBe(true);
  });

  it("exclut les noms génériques anglais", () => {
    expect(isExcludedReferenceName("Recovery", DEADLOCK_LANG_ENGLISH)).toBe(true);
    expect(isExcludedReferenceName("Melee", DEADLOCK_LANG_ENGLISH)).toBe(true);
  });

  it("conserve les noms spécifiques selon la langue active", () => {
    expect(
      isExcludedReferenceName("Récupération supérieure", DEADLOCK_LANG_FRENCH),
    ).toBe(false);
    expect(
      isExcludedReferenceName("Superior Recovery", DEADLOCK_LANG_ENGLISH),
    ).toBe(false);
    expect(isExcludedReferenceName("Recovery", DEADLOCK_LANG_FRENCH)).toBe(false);
    expect(isExcludedReferenceName("Récupération", DEADLOCK_LANG_ENGLISH)).toBe(
      false,
    );
  });
});

describe("isLinkableAbilityName", () => {
  it("exclut les capacités partagées par plusieurs héros", () => {
    const counts = countAbilityNames([
      {
        id: 1,
        class_name: "ability_melee_inferno",
        name: "Mêlée",
        type: "ability",
        heroes: [1],
      },
      {
        id: 2,
        class_name: "ability_melee_lash",
        name: "Mêlée",
        type: "ability",
        heroes: [2],
      },
      {
        id: 3,
        class_name: "ability_fire_bomb",
        name: "Combustion explosive",
        type: "ability",
        heroes: [1],
      },
    ]);

    expect(isLinkableAbilityName("Mêlée", counts, DEADLOCK_LANG_FRENCH)).toBe(
      false,
    );
    expect(
      isLinkableAbilityName("Combustion explosive", counts, DEADLOCK_LANG_FRENCH),
    ).toBe(true);
  });
});
