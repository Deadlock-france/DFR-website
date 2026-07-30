import {
  STEAM_EVENT_DETAIL_API,
  STEAM_EVENTS_PAGEABLE_API,
  STEAM_LANG_FRENCH,
  type SteamPartnerEvent,
  type SteamPartnerEventBody,
  type SteamPartnerEventDetailResponse,
  type SteamPartnerEventsPageableResponse,
} from "./types";

function clanAccountIdFromSteamId(clanSteamid: string): number {
  return Number(BigInt(clanSteamid) & BigInt(0xffffffff));
}

async function fetchJson<T>(url: string, timeoutMs = 10000): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Steam Events API error: ${response.status}`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Liste les événements partenaires d'une app. Sert de pont entre les gid
 * ISteamNews et les announcement_gid du système d'événements (via posttime).
 */
export async function fetchPartnerEvents(
  appId: number,
  count = 100,
): Promise<SteamPartnerEvent[]> {
  const url = new URL(STEAM_EVENTS_PAGEABLE_API);
  url.searchParams.set("clan_accountid", "0");
  url.searchParams.set("appid", String(appId));
  url.searchParams.set("offset", "0");
  url.searchParams.set("count", String(count));
  url.searchParams.set("origin", "https://store.steampowered.com");

  const data = await fetchJson<SteamPartnerEventsPageableResponse>(url.toString());
  return data.events ?? [];
}

/**
 * Récupère le corps d'un événement dans une langue donnée.
 * lang_list=2 → français officiel Valve quand il existe.
 */
export async function fetchPartnerEventLocalized(
  clanSteamid: string,
  announcementGid: string,
  lang = STEAM_LANG_FRENCH,
): Promise<SteamPartnerEventBody | null> {
  const url = new URL(STEAM_EVENT_DETAIL_API);
  url.searchParams.set(
    "clan_accountid",
    String(clanAccountIdFromSteamId(clanSteamid)),
  );
  url.searchParams.set("announcement_gid", announcementGid);
  url.searchParams.set("lang_list", String(lang));
  url.searchParams.set("origin", "https://store.steampowered.com");

  const data = await fetchJson<SteamPartnerEventDetailResponse>(url.toString());
  const body = data.event?.announcement_body;

  if (!body || body.language !== lang) {
    return null;
  }

  return body;
}

/**
 * Indexe les événements par posttime (= date ISteamNews) pour joindre les
 * deux espaces d'identifiants Steam, qui n'ont aucun pont officiel.
 */
export function indexEventsByPosttime(
  events: SteamPartnerEvent[],
): Map<number, SteamPartnerEvent> {
  const map = new Map<number, SteamPartnerEvent>();

  for (const event of events) {
    const posttime = event.announcement_body?.posttime;
    if (posttime != null && event.announcement_body?.gid) {
      map.set(posttime, event);
    }
  }

  return map;
}
