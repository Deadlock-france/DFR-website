import { cacheLife, cacheTag } from "next/cache";

import { translateToFrench } from "@/lib/deepl/client";
import { unescapeSteamBrackets } from "@/lib/steam/text";

import {
  fetchPartnerEventLocalized,
  fetchPartnerEvents,
  indexEventsByPosttime,
} from "./events";
import {
  getCachedDeeplTranslation,
  isCachedTranslationFresh,
  saveDeeplTranslation,
} from "./translation-cache";
import { STEAM_NEWS_API, type SteamNewsItem, type SteamNewsResponse } from "./types";

/** Annonces officielles Valve / communauté Steam (hors presse externe). */
export const STEAM_COMMUNITY_FEED = "steam_community_announcements";

export const STEAM_NEWS_CACHE_TAG = "steam-patch-notes";

/** Steam mélange presse + Valve : on demande plus large, puis on coupe. */
const STEAM_NEWS_FETCH_MULTIPLIER = 3;

export function isValveCommunityAnnouncement(item: SteamNewsItem): boolean {
  return item.feedname === STEAM_COMMUNITY_FEED;
}

function normalizeSteamItem(item: SteamNewsItem): SteamNewsItem {
  return {
    ...item,
    title: unescapeSteamBrackets(item.title),
    contents: unescapeSteamBrackets(item.contents),
  };
}

function captureOriginalItem(item: SteamNewsItem): NonNullable<SteamNewsItem["original"]> {
  return {
    title: unescapeSteamBrackets(item.title),
    contents: unescapeSteamBrackets(item.contents),
  };
}

async function trySteamFrenchTranslation(
  item: SteamNewsItem,
  original: NonNullable<SteamNewsItem["original"]>,
  event: Awaited<ReturnType<typeof fetchPartnerEvents>>[number] | undefined,
): Promise<SteamNewsItem | null> {
  const announcementGid = event?.announcement_body?.gid;
  if (!event || !announcementGid) {
    return null;
  }

  try {
    const french = await fetchPartnerEventLocalized(
      event.clan_steamid,
      announcementGid,
    );

    if (!french) {
      return null;
    }

    return normalizeSteamItem({
      ...item,
      title: french.headline.trim(),
      contents: french.body,
      translation_source: "steam",
      original,
    });
  } catch (error) {
    console.error(
      `Steam FR fetch failed for gid=${item.gid}, trying DB then DeepL:`,
      error,
    );
    return null;
  }
}

async function tryCachedFrenchTranslation(
  item: SteamNewsItem,
  original: NonNullable<SteamNewsItem["original"]>,
): Promise<SteamNewsItem | null> {
  const cached = await getCachedDeeplTranslation(item.gid);
  if (!cached || !isCachedTranslationFresh(cached, original)) {
    return null;
  }

  return normalizeSteamItem({
    ...item,
    title: cached.title_fr,
    contents: cached.contents_fr,
    translation_source: "deepl",
    original,
  });
}

async function translateViaDeeplAndPersist(
  item: SteamNewsItem,
  original: NonNullable<SteamNewsItem["original"]>,
): Promise<SteamNewsItem> {
  const [title, contents] = await Promise.all([
    translateToFrench(item.title),
    translateToFrench(item.contents),
  ]);

  if (!title && !contents) {
    return normalizeSteamItem({ ...item, translation_source: "en", original });
  }

  const localized = normalizeSteamItem({
    ...item,
    title: title ?? item.title,
    contents: contents ?? item.contents,
    translation_source: "deepl",
    original,
  });

  await saveDeeplTranslation({
    gid: item.gid,
    appid: item.appid,
    source_title: original.title,
    source_contents: original.contents,
    title_fr: localized.title,
    contents_fr: localized.contents,
  });

  return localized;
}

/**
 * Ordre de localisation FR :
 * 1. VF Valve (Steam Events) si dispo
 * 2. VF déjà en BDD (traduction DeepL précédente)
 * 3. DeepL → upsert BDD pour les prochains passages
 */
async function localizePatchNotes(
  items: SteamNewsItem[],
  appId: number,
): Promise<SteamNewsItem[]> {
  let eventsByPosttime = new Map<
    number,
    Awaited<ReturnType<typeof fetchPartnerEvents>>[number]
  >();

  try {
    const events = await fetchPartnerEvents(appId);
    eventsByPosttime = indexEventsByPosttime(events);
  } catch (error) {
    console.error(
      "Steam Events lookup failed, falling back to DB then DeepL:",
      error,
    );
  }

  return Promise.all(
    items.map(async (item) => {
      const original = captureOriginalItem(item);

      const fromSteam = await trySteamFrenchTranslation(
        item,
        original,
        eventsByPosttime.get(item.date),
      );
      if (fromSteam) {
        return fromSteam;
      }

      const fromDb = await tryCachedFrenchTranslation(item, original);
      if (fromDb) {
        return fromDb;
      }

      return translateViaDeeplAndPersist(item, original);
    }),
  );
}

export async function getSteamNews(
  appId: number = 1422450,
  count: number = 50,
): Promise<SteamNewsItem[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(STEAM_NEWS_CACHE_TAG);

  const url = new URL(STEAM_NEWS_API);
  url.searchParams.set("appid", String(appId));
  // Pas de filtre `tags=patchnotes` : Valve publie parfois des updates
  // (ex. Matchmaking) sans ce tag. On garde ensuite uniquement le feed Steam.
  url.searchParams.set(
    "count",
    String(Math.max(count * STEAM_NEWS_FETCH_MULTIPLIER, count)),
  );

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url.toString(), {
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Steam API error: ${response.status}`);
    }

    const data = (await response.json()) as SteamNewsResponse;
    const items = (data.appnews?.newsitems ?? [])
      .filter(isValveCommunityAnnouncement)
      .slice(0, count);

    return localizePatchNotes(items, appId);
  } finally {
    clearTimeout(timeout);
  }
}

// Réutilise l'entrée de cache de getSteamNews : aucune requête supplémentaire
// vers Steam pour afficher un article.
export async function getSteamNewsByGid(
  appId: number = 1422450,
  count: number = 50,
  gid: string,
): Promise<SteamNewsItem | undefined> {
  const items = await getSteamNews(appId, count);

  return items.find((item) => item.gid === gid);
}
