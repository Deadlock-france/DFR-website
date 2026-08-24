import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  DEADLOCK_HEROES_CACHE_TAG,
  DEADLOCK_ITEMS_CACHE_TAG,
  DEADLOCK_REFERENCES_CACHE_TAG,
  getDeadlockHeroAbilities,
  getDeadlockHeroById,
  getDeadlockHeroByName,
  getDeadlockHeroes,
  getDeadlockItemByIdOrClassName,
  getDeadlockItems,
  getDeadlockReferences,
  getDeadlockReferencesByLanguage,
  getDeadlockShopItems,
} from "./client";
import type { DeadlockHero, DeadlockItem } from "./types";

const { cacheLife, cacheTag } = vi.hoisted(() => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}));

vi.mock("next/cache", () => ({ cacheLife, cacheTag }));

function hero(overrides: Partial<DeadlockHero> = {}): DeadlockHero {
  return {
    id: 1,
    class_name: "hero_inferno",
    name: "Infernus",
    description: { role: "Enflamme ses adversaires" },
    player_selectable: true,
    disabled: false,
    in_development: false,
    images: {},
    ...overrides,
  };
}

function item(overrides: Partial<DeadlockItem> = {}): DeadlockItem {
  return {
    id: 1548066885,
    class_name: "upgrade_clip_size",
    name: "Chargeur\u00a0XL",
    type: "upgrade",
    heroes: [],
    shopable: true,
    cost: 800,
    ...overrides,
  };
}

let fetchMock: ReturnType<typeof vi.fn>;

function stubNetwork(scenario: {
  heroes?: DeadlockHero[];
  items?: DeadlockItem[];
  heroAbilities?: DeadlockItem[];
  heroByNameStatus?: number;
}) {
  fetchMock.mockImplementation(async (input: string) => {
    const url = String(input);
    const json = (body: unknown, ok = true, status = 200) =>
      ({
        ok,
        status,
        json: async () => body,
        text: async () => JSON.stringify(body),
      }) as Response;

    if (url.includes("deadlock.io/api/v1/heroes.json")) {
      return json({
        heroes: [{ heroId: 1, slug: "infernus" }],
      });
    }

    if (url.includes("deadlock.io/api/v1/items.json")) {
      return json({
        items: [{ id: "upgrade_clip_size", slug: "extended-magazine" }],
      });
    }

    if (url.includes("/heroes/by-name/")) {
      if ((scenario.heroByNameStatus ?? 200) === 404) {
        return json({}, false, 404);
      }

      return json(hero());
    }

    if (url.includes("/items/by-hero-id/")) {
      return json(scenario.heroAbilities ?? []);
    }

    if (url.includes("/items/upgrade_clip_size")) {
      return json(item());
    }

    if (url.includes("/heroes")) {
      return json(scenario.heroes ?? [hero()]);
    }

    if (url.includes("/items")) {
      return json(scenario.items ?? [item()]);
    }

    throw new Error(`Appel réseau inattendu : ${url}`);
  });
}

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  cacheLife.mockReset();
  cacheTag.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getDeadlockHeroes", () => {
  it("récupère les héros en français avec cache", async () => {
    stubNetwork({ heroes: [hero(), hero({ id: 2, name: "Seven", disabled: true })] });

    const heroes = await getDeadlockHeroes();

    expect(heroes).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/v1/assets/heroes?language=french"),
      expect.any(Object),
    );
    expect(cacheLife).toHaveBeenCalledWith({ stale: 6 * 60, revalidate: 60 * 60 * 24 });
    expect(cacheTag).toHaveBeenCalledWith(DEADLOCK_HEROES_CACHE_TAG);
  });

  it("filtre les héros actifs jouables", async () => {
    stubNetwork({
      heroes: [
        hero(),
        hero({ id: 2, name: "Seven", disabled: true }),
        hero({ id: 3, name: "WIP", player_selectable: false }),
      ],
    });

    const heroes = await getDeadlockHeroes({ onlyActive: true });

    expect(heroes).toEqual([hero()]);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("only_active=true"),
      expect.any(Object),
    );
  });
});

describe("getDeadlockHeroById", () => {
  it("retrouve un héros par identifiant", async () => {
    stubNetwork({
      heroes: [hero(), hero({ id: 2, name: "Seven" })],
    });

    await expect(getDeadlockHeroById(2)).resolves.toMatchObject({ name: "Seven" });
  });
});

describe("getDeadlockHeroByName", () => {
  it("appelle l'endpoint by-name", async () => {
    stubNetwork({});

    await expect(getDeadlockHeroByName("Infernus")).resolves.toMatchObject({
      name: "Infernus",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/heroes/by-name/Infernus"),
      expect.any(Object),
    );
  });

  it("retombe sur la liste locale si by-name échoue", async () => {
    stubNetwork({
      heroes: [hero()],
      heroByNameStatus: 404,
    });

    await expect(getDeadlockHeroByName("infernus")).resolves.toMatchObject({
      name: "Infernus",
    });
  });
});

describe("getDeadlockItems", () => {
  it("récupère les items avec cache", async () => {
    stubNetwork({ items: [item()] });

    const items = await getDeadlockItems();

    expect(items).toHaveLength(1);
    expect(cacheTag).toHaveBeenCalledWith(DEADLOCK_ITEMS_CACHE_TAG);
  });
});

describe("getDeadlockShopItems", () => {
  it("ne garde que les upgrades achetables", async () => {
    stubNetwork({
      items: [
        item(),
        item({ id: 2, class_name: "ability_fire_bomb", type: "ability", shopable: false }),
        item({ id: 3, class_name: "upgrade_hidden", shopable: false }),
      ],
    });

    const shopItems = await getDeadlockShopItems();

    expect(shopItems).toHaveLength(1);
    expect(shopItems[0]?.class_name).toBe("upgrade_clip_size");
  });
});

describe("getDeadlockItemByIdOrClassName", () => {
  it("récupère un item par class_name", async () => {
    stubNetwork({});

    await expect(
      getDeadlockItemByIdOrClassName("upgrade_clip_size"),
    ).resolves.toMatchObject({ name: "Chargeur\u00a0XL" });
  });
});

describe("getDeadlockHeroAbilities", () => {
  it("appelle l'endpoint by-hero-id", async () => {
    stubNetwork({
      heroAbilities: [
        item({
          id: 10,
          class_name: "ability_fire_bomb",
          name: "Combustion explosive",
          type: "ability",
          heroes: [1],
        }),
      ],
    });

    const abilities = await getDeadlockHeroAbilities(1);

    expect(abilities).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/items/by-hero-id/1"),
      expect.any(Object),
    );
  });
});

describe("getDeadlockReferences", () => {
  it("construit l'index à partir des héros et items", async () => {
    stubNetwork({
      heroes: [hero()],
      items: [
        item(),
        item({
          id: 11,
          class_name: "ability_fire_bomb",
          name: "Combustion explosive",
          type: "ability",
          heroes: [1],
        }),
      ],
    });

    const index = await getDeadlockReferences();

    expect(index.references.length).toBeGreaterThanOrEqual(3);
    expect(index.byNormalizedName.get("infernus")?.kind).toBe("hero");
    expect(index.byNormalizedName.get("infernus")?.url).toBe(
      "https://deadlock.io/fr/heroes/infernus",
    );
    expect(cacheTag).toHaveBeenCalledWith(
      DEADLOCK_REFERENCES_CACHE_TAG,
      DEADLOCK_HEROES_CACHE_TAG,
      DEADLOCK_ITEMS_CACHE_TAG,
    );
  });
});

describe("getDeadlockReferencesByLanguage", () => {
  it("retourne les références FR et EN", async () => {
    stubNetwork({
      heroes: [hero()],
      items: [item()],
    });

    const referencesByLanguage = await getDeadlockReferencesByLanguage();

    expect(referencesByLanguage.french.length).toBeGreaterThan(0);
    expect(referencesByLanguage.english.length).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("language=french"),
      expect.any(Object),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("language=english"),
      expect.any(Object),
    );
  });
});
