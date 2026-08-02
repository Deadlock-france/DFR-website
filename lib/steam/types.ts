export type TranslationSource = "steam" | "deepl" | "en";

export interface SteamNewsItem {
  gid: string;
  title: string;
  url: string;
  is_external_url: boolean;
  author: string;
  contents: string;
  feedlabel: string;
  date: number;
  feedname: string;
  feed_type: number;
  appid: number;
  tags?: string[];
  /** Origine de la traduction appliquée au titre et au contenu. */
  translation_source?: TranslationSource;
  /** Texte anglais d'origine (ISteamNews) avant localisation FR. */
  original?: {
    title: string;
    contents: string;
  };
}

export const STEAM_NEWS_API =
  "https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/";

export const STEAM_EVENTS_PAGEABLE_API =
  "https://store.steampowered.com/events/ajaxgetpartnereventspageable/";

export const STEAM_EVENT_DETAIL_API =
  "https://store.steampowered.com/events/ajaxgetpartnerevent/";

/** Code langue Steam pour le français. */
export const STEAM_LANG_FRENCH = 2;

export interface SteamNewsResponse {
  appnews: {
    appid: number;
    newsitems: SteamNewsItem[];
    count: number;
  };
}

export interface SteamPartnerEventBody {
  gid: string;
  headline: string;
  body: string;
  posttime: number;
  language: number;
  tags?: string[];
}

export interface SteamPartnerEvent {
  gid: string;
  clan_steamid: string;
  event_type: number;
  announcement_body?: SteamPartnerEventBody;
}

export interface SteamPartnerEventsPageableResponse {
  success: number;
  events: SteamPartnerEvent[];
}

export interface SteamPartnerEventDetailResponse {
  success: number;
  event?: SteamPartnerEvent;
  err_msg?: string;
}