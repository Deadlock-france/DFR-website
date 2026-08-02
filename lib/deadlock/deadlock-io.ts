import { cacheLife, cacheTag } from "next/cache";

import { getDeadlockIoBaseUrl } from "./config";
import type { DeadlockLanguage, DeadlockReference } from "./types";

export const DEADLOCK_IO_SLUGS_CACHE_TAG = "deadlock-io-slugs";

export interface DeadlockIoSlugs {
  heroesById: ReadonlyMap<number, string>;
  itemsByClassName: ReadonlyMap<string, string>;
}

type DeadlockIoHeroListItem = {
  heroId?: number;
  slug?: string;
};

type DeadlockIoItemListItem = {
  id?: string;
  slug?: string;
};

export async function getDeadlockIoSlugs(): Promise<DeadlockIoSlugs> {
  "use cache";
  cacheLife("hours");
  cacheTag(DEADLOCK_IO_SLUGS_CACHE_TAG);

  const [heroesResponse, itemsResponse] = await Promise.all([
    fetch("https://deadlock.io/api/v1/heroes.json"),
    fetch("https://deadlock.io/api/v1/items.json"),
  ]);

  if (!heroesResponse.ok || !itemsResponse.ok) {
    throw new Error("Deadlock.io slug lookup failed");
  }

  const heroesPayload = (await heroesResponse.json()) as {
    heroes?: DeadlockIoHeroListItem[];
  };
  const itemsPayload = (await itemsResponse.json()) as {
    items?: DeadlockIoItemListItem[];
  };

  const heroesById = new Map<number, string>();
  const itemsByClassName = new Map<string, string>();

  for (const hero of heroesPayload.heroes ?? []) {
    if (hero.heroId !== undefined && hero.slug) {
      heroesById.set(hero.heroId, hero.slug);
    }
  }

  for (const item of itemsPayload.items ?? []) {
    if (item.id && item.slug) {
      itemsByClassName.set(item.id, item.slug);
    }
  }

  return { heroesById, itemsByClassName };
}

export function getDeadlockReferenceUrl(
  reference: DeadlockReference,
  slugs: DeadlockIoSlugs,
  language?: DeadlockLanguage,
): string | undefined {
  const baseUrl = getDeadlockIoBaseUrl(language);

  if (reference.kind === "hero") {
    const slug = slugs.heroesById.get(reference.id);
    return slug ? `${baseUrl}/heroes/${slug}` : undefined;
  }

  if (reference.kind === "item") {
    const slug = slugs.itemsByClassName.get(reference.className);
    return slug ? `${baseUrl}/items/${slug}` : undefined;
  }

  if (reference.kind === "ability" && reference.heroId !== undefined) {
    const slug = slugs.heroesById.get(reference.heroId);
    return slug ? `${baseUrl}/heroes/${slug}` : undefined;
  }

  return undefined;
}

export function attachReferenceUrls(
  references: DeadlockReference[],
  slugs: DeadlockIoSlugs,
  language?: DeadlockLanguage,
): DeadlockReference[] {
  return references.map((reference) => {
    const url = getDeadlockReferenceUrl(reference, slugs, language);

    return url ? { ...reference, url } : reference;
  });
}
