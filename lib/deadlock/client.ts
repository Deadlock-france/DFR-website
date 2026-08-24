import { cacheLife, cacheTag } from "next/cache";

import { readResponseJson } from "@/lib/http/json";

import { attachReferenceUrls, getDeadlockIoSlugs } from "./deadlock-io";
import { DEADLOCK_REFERENCE_LANGUAGE } from "./config";
import { buildDeadlockReferenceIndex, finalizeReferenceIndex } from "./references";
import {
  DEADLOCK_ASSETS_API,
  DEADLOCK_LANG_ENGLISH,
  DEADLOCK_LANG_FRENCH,
  type DeadlockHero,
  type DeadlockItem,
  type DeadlockLanguage,
  type DeadlockReference,
  type DeadlockReferenceIndex,
} from "./types";

export const DEADLOCK_HEROES_CACHE_TAG = "deadlock-heroes";
export const DEADLOCK_ITEMS_CACHE_TAG = "deadlock-items";
export const DEADLOCK_REFERENCES_CACHE_TAG = "deadlock-references";

const FETCH_TIMEOUT_MS = 15_000;

type DeadlockFetchOptions = {
  language?: DeadlockLanguage;
  searchParams?: Record<string, string | undefined>;
};

async function fetchDeadlockAssets<T>(
  path: string,
  { language = DEADLOCK_LANG_FRENCH, searchParams = {} }: DeadlockFetchOptions = {},
): Promise<T> {
  const url = new URL(`${DEADLOCK_ASSETS_API}${path}`);

  url.searchParams.set("language", language);

  for (const [key, value] of Object.entries(searchParams)) {
    if (value !== undefined) {
      url.searchParams.set(key, value);
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), {
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Deadlock API error: ${response.status} ${path}`);
    }

    return await readResponseJson<T>(response);
  } finally {
    clearTimeout(timeout);
  }
}

export async function getDeadlockHeroes(options?: {
  onlyActive?: boolean;
  language?: DeadlockLanguage;
}): Promise<DeadlockHero[]> {
  "use cache";
  // 6 heures de cache, invalidé tout les jours à minuit
  cacheLife({ stale: 6 * 60, revalidate: 60 * 60 * 24 });
  cacheTag(DEADLOCK_HEROES_CACHE_TAG);

  const heroes = await fetchDeadlockAssets<DeadlockHero[]>("/heroes", {
    language: options?.language,
    searchParams:
      options?.onlyActive === true ? { only_active: "true" } : undefined,
  });

  if (options?.onlyActive) {
    return heroes.filter((hero) => hero.player_selectable && !hero.disabled);
  }

  return heroes;
}

export async function getDeadlockHeroById(
  heroId: number,
  language?: DeadlockLanguage,
): Promise<DeadlockHero | undefined> {
  const heroes = await getDeadlockHeroes({ language });

  return heroes.find((hero) => hero.id === heroId);
}

export async function getDeadlockHeroByName(
  name: string,
  language?: DeadlockLanguage,
): Promise<DeadlockHero | undefined> {
  try {
    return await fetchDeadlockAssets<DeadlockHero>(
      `/heroes/by-name/${encodeURIComponent(name)}`,
      { language },
    );
  } catch {
    // L'endpoint by-name peut échouer : on retombe sur la liste en cache.
  }

  const heroes = await getDeadlockHeroes({ language });
  const normalized = name.trim().toLocaleLowerCase("fr-FR");

  return heroes.find(
    (hero) => hero.name.trim().toLocaleLowerCase("fr-FR") === normalized,
  );
}

export async function getDeadlockItems(
  language?: DeadlockLanguage,
): Promise<DeadlockItem[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(DEADLOCK_ITEMS_CACHE_TAG);

  return fetchDeadlockAssets<DeadlockItem[]>("/items", { language });
}

export async function getDeadlockShopItems(
  language?: DeadlockLanguage,
): Promise<DeadlockItem[]> {
  const items = await getDeadlockItems(language);

  return items.filter((item) => item.type === "upgrade" && item.shopable === true);
}

export async function getDeadlockItemByIdOrClassName(
  idOrClassName: string | number,
  language?: DeadlockLanguage,
): Promise<DeadlockItem | undefined> {
  try {
    return await fetchDeadlockAssets<DeadlockItem>(
      `/items/${encodeURIComponent(String(idOrClassName))}`,
      { language },
    );
  } catch {
    // L'endpoint direct peut échouer : on retombe sur la liste en cache.
  }

  const items = await getDeadlockItems(language);
  const needle = String(idOrClassName);

  return items.find(
    (item) =>
      String(item.id) === needle ||
      item.class_name === needle ||
      item.name.trim().toLocaleLowerCase("fr-FR") ===
        needle.trim().toLocaleLowerCase("fr-FR"),
  );
}

export async function getDeadlockHeroAbilities(
  heroId: number,
  language?: DeadlockLanguage,
): Promise<DeadlockItem[]> {
  return fetchDeadlockAssets<DeadlockItem[]>(
    `/items/by-hero-id/${heroId}`,
    { language },
  );
}

/** Liste sérialisable (pas de Map) pour `"use cache"`. */
async function loadDeadlockReferenceList(
  language: DeadlockLanguage,
): Promise<DeadlockReference[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(
    DEADLOCK_REFERENCES_CACHE_TAG,
    DEADLOCK_HEROES_CACHE_TAG,
    DEADLOCK_ITEMS_CACHE_TAG,
  );

  const [heroes, items, slugs] = await Promise.all([
    getDeadlockHeroes({ onlyActive: true, language }),
    getDeadlockItems(language),
    getDeadlockIoSlugs(),
  ]);

  const index = buildDeadlockReferenceIndex(heroes, items);
  return attachReferenceUrls(index.references, slugs, language);
}

/** Index héros + items boutique + capacités, prêt pour le survol dans les patch notes. */
export async function getDeadlockReferences(
  language: DeadlockLanguage = DEADLOCK_REFERENCE_LANGUAGE,
): Promise<DeadlockReferenceIndex> {
  const references = await loadDeadlockReferenceList(language);
  return finalizeReferenceIndex(references);
}

export type DeadlockReferencesByLanguage = Record<
  DeadlockLanguage,
  DeadlockReference[]
>;

/** Charge les index FR et EN pour le switch de la page patch note. */
export async function getDeadlockReferencesByLanguage(): Promise<DeadlockReferencesByLanguage> {
  const [french, english] = await Promise.all([
    getDeadlockReferences(DEADLOCK_LANG_FRENCH),
    getDeadlockReferences(DEADLOCK_LANG_ENGLISH),
  ]);

  const englishByKey = new Map(
    english.references.map((reference) => [
      `${reference.kind}:${reference.id}`,
      reference,
    ]),
  );

  // En VF les patch notes écrivent souvent `Nébula (Haze)` : on indexe aussi le nom EN.
  const frenchWithEnglishAliases = french.references.map((reference) => {
    const englishReference = englishByKey.get(
      `${reference.kind}:${reference.id}`,
    );
    if (!englishReference || englishReference.name === reference.name) {
      return reference;
    }

    return {
      ...reference,
      aliases: [...new Set([...(reference.aliases ?? []), englishReference.name])],
    };
  });

  return {
    [DEADLOCK_LANG_FRENCH]: frenchWithEnglishAliases,
    [DEADLOCK_LANG_ENGLISH]: english.references,
  };
}
