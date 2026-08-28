import { cacheLife, cacheTag } from "next/cache";

import { readResponseJson } from "@/lib/http/json";

import { getDeadlockIoBaseUrl } from "./config";
import type { DeadlockLanguage, DeadlockReference } from "./types";

export const DEADLOCK_IO_SLUGS_CACHE_TAG = "deadlock-io-slugs";

export interface DeadlockIoSlugs {
  heroesById: ReadonlyMap<number, string>;
  itemsByClassName: ReadonlyMap<string, string>;
}

/** JSON-safe : `"use cache"` ne sérialise pas les `Map`. */
export type DeadlockIoSlugsPayload = {
  heroesById: Record<string, string>;
  itemsByClassName: Record<string, string>;
};

export function deadlockIoSlugsFromPayload(
  payload: DeadlockIoSlugsPayload,
): DeadlockIoSlugs {
  return {
    heroesById: new Map(
      Object.entries(payload.heroesById).map(([id, slug]) => [Number(id), slug]),
    ),
    itemsByClassName: new Map(Object.entries(payload.itemsByClassName)),
  };
}

export function deadlockIoSlugsToPayload(
  slugs: DeadlockIoSlugs,
): DeadlockIoSlugsPayload {
  return {
    heroesById: Object.fromEntries(
      [...slugs.heroesById].map(([id, slug]) => [String(id), slug]),
    ),
    itemsByClassName: Object.fromEntries(slugs.itemsByClassName),
  };
}

function emptyDeadlockIoSlugs(): DeadlockIoSlugs {
  return {
    heroesById: new Map(),
    itemsByClassName: new Map(),
  };
}

type DeadlockIoHeroListItem = {
  heroId?: number;
  slug?: string;
};

type DeadlockIoItemListItem = {
  id?: string;
  slug?: string;
};

async function loadDeadlockIoSlugsPayload(): Promise<DeadlockIoSlugsPayload> {
  "use cache";
  cacheLife("hours");
  cacheTag(DEADLOCK_IO_SLUGS_CACHE_TAG);

  try {
    const [heroesResponse, itemsResponse] = await Promise.all([
      fetch("https://deadlock.io/api/v1/heroes.json"),
      fetch("https://deadlock.io/api/v1/items.json"),
    ]);

    if (!heroesResponse.ok || !itemsResponse.ok) {
      throw new Error(
        `Deadlock.io slug lookup failed: heroes=${heroesResponse.status} items=${itemsResponse.status}`,
      );
    }

    const heroesPayload = await readResponseJson<{
      heroes?: DeadlockIoHeroListItem[];
    }>(heroesResponse);
    const itemsPayload = await readResponseJson<{
      items?: DeadlockIoItemListItem[];
    }>(itemsResponse);

    const heroesById: Record<string, string> = {};
    const itemsByClassName: Record<string, string> = {};

    for (const hero of heroesPayload.heroes ?? []) {
      if (hero.heroId !== undefined && hero.slug) {
        heroesById[String(hero.heroId)] = hero.slug;
      }
    }

    for (const item of itemsPayload.items ?? []) {
      if (item.id && item.slug) {
        itemsByClassName[item.id] = item.slug;
      }
    }

    return { heroesById, itemsByClassName };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Deadlock.io slug lookup failed:", message);
    return { heroesById: {}, itemsByClassName: {} };
  }
}

export async function getDeadlockIoSlugs(): Promise<DeadlockIoSlugs> {
  try {
    return deadlockIoSlugsFromPayload(await loadDeadlockIoSlugsPayload());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Deadlock.io slug lookup failed:", message);
    return emptyDeadlockIoSlugs();
  }
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
