import { cacheLife, cacheTag } from "next/cache";

import { translateToFrench } from "@/lib/deepl/client";
import { unescapeSteamBrackets } from "@/lib/steam/text";

import {
  fetchPartnerEventLocalized,
  fetchPartnerEvents,
  indexEventsByPosttime,
} from "./events";
import { STEAM_NEWS_API, type SteamNewsItem, type SteamNewsResponse } from "./types";

// Filtre appliqué par Steam : plus fiable que le tag "patchnotes" de chaque
// article, que Valve retire parfois lors d'une re-modération.
const PATCH_NOTES_TAG = "patchnotes";

export const STEAM_NEWS_CACHE_TAG = "steam-patch-notes";

function normalizeSteamItem(item: SteamNewsItem): SteamNewsItem {
  return {
    ...item,
    title: unescapeSteamBrackets(item.title),
    contents: unescapeSteamBrackets(item.contents),
  };
}

async function translateItemWithDeepl(
  item: SteamNewsItem,
): Promise<SteamNewsItem> {
  const [title, contents] = await Promise.all([
    translateToFrench(item.title),
    translateToFrench(item.contents),
  ]);

  if (!title && !contents) {
    return normalizeSteamItem({ ...item, translation_source: "en" });
  }

  return normalizeSteamItem({
    ...item,
    title: title ?? item.title,
    contents: contents ?? item.contents,
    translation_source: "deepl",
  });
}

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
    console.error("Steam Events lookup failed, falling back to DeepL:", error);
  }

  return Promise.all(
    items.map(async (item) => {
      const event = eventsByPosttime.get(item.date);
      const announcementGid = event?.announcement_body?.gid;

      if (event && announcementGid) {
        try {
          const french = await fetchPartnerEventLocalized(
            event.clan_steamid,
            announcementGid,
          );

          if (french) {
            return normalizeSteamItem({
              ...item,
              title: french.headline.trim(),
              contents: french.body,
              translation_source: "steam" as const,
            });
          }
        } catch (error) {
          console.error(
            `Steam FR fetch failed for gid=${item.gid}, trying DeepL:`,
            error,
          );
        }
      }

      return translateItemWithDeepl(item);
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
  url.searchParams.set("count", String(count));
  url.searchParams.set("tags", PATCH_NOTES_TAG);

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
    const items = data.appnews?.newsitems ?? [];

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
