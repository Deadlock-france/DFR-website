import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getSteamNews, getSteamNewsByGid, STEAM_NEWS_CACHE_TAG } from "./client";
import type { SteamNewsItem } from "./types";

// `getSteamNews` est une fonction "use cache" : hors runtime Next, ces helpers
// n'existent pas. On les remplace pour tester l'orchestration, pas le cache.
const { cacheLife, cacheTag } = vi.hoisted(() => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}));

const { getCachedDeeplTranslation, saveDeeplTranslation } = vi.hoisted(() => ({
  getCachedDeeplTranslation: vi.fn(),
  saveDeeplTranslation: vi.fn(),
}));

vi.mock("next/cache", () => ({ cacheLife, cacheTag }));
vi.mock("./translation-cache", async () => {
  const actual = await vi.importActual<typeof import("./translation-cache")>(
    "./translation-cache",
  );
  return {
    ...actual,
    getCachedDeeplTranslation,
    saveDeeplTranslation,
  };
});

const DEADLOCK_APP_ID = 1422450;
const CLAN_STEAMID = "103582791470414830";
const POSTTIME = 1_785_067_200;

function newsItem(overrides: Partial<SteamNewsItem> = {}): SteamNewsItem {
  return {
    gid: "news-1",
    title: "Update - July 26",
    url: "https://store.steampowered.com/news/app/1422450/view/news-1",
    is_external_url: true,
    author: "Valve",
    contents: "[b]Heroes[/b] rebalanced",
    feedlabel: "Community Announcements",
    date: POSTTIME,
    feedname: "steam_community_announcements",
    feed_type: 1,
    appid: DEADLOCK_APP_ID,
    ...overrides,
  };
}

type FetchScenario = {
  news?: unknown;
  newsOk?: boolean;
  newsStatus?: number;
  events?: unknown;
  eventsOk?: boolean;
  eventDetail?: unknown;
  eventDetailOk?: boolean;
  deepl?: (text: string) => string | null;
};

let fetchMock: ReturnType<typeof vi.fn>;

/** Route les appels réseau par endpoint : Steam news, events, détail, DeepL. */
function stubNetwork(scenario: FetchScenario) {
  fetchMock.mockImplementation(async (input: string, init?: RequestInit) => {
    const url = String(input);
    const json = (body: unknown, ok = true, status = 200) =>
      ({ ok, status, json: async () => body }) as Response;

    if (url.includes("ISteamNews")) {
      return json(
        scenario.news ?? { appnews: { appid: DEADLOCK_APP_ID, newsitems: [], count: 0 } },
        scenario.newsOk ?? true,
        scenario.newsStatus ?? 200,
      );
    }

    // À vérifier avant le détail : "ajaxgetpartnerevent" en est un préfixe.
    if (url.includes("ajaxgetpartnereventspageable")) {
      return json(scenario.events ?? { success: 1, events: [] }, scenario.eventsOk ?? true);
    }

    if (url.includes("ajaxgetpartnerevent")) {
      return json(scenario.eventDetail ?? { success: 0 }, scenario.eventDetailOk ?? true);
    }

    if (url.includes("api-free.deepl.com")) {
      const body = JSON.parse(init?.body as string) as { text: string[] };
      const translated = scenario.deepl?.(body.text[0]) ?? null;
      if (translated === null) return json({}, false, 456);
      return json({ translations: [{ detected_source_language: "EN", text: translated }] });
    }

    throw new Error(`Appel réseau inattendu : ${url}`);
  });
}

function frenchEvent(overrides: { language?: number; headline?: string; body?: string } = {}) {
  const announcement = {
    gid: "announcement-1",
    headline: overrides.headline ?? "  Mise à jour du 26 juillet  ",
    body: overrides.body ?? "[b]Héros[/b] rééquilibrés",
    posttime: POSTTIME,
    language: overrides.language ?? 2,
  };

  return {
    events: {
      success: 1,
      events: [
        {
          gid: "event-1",
          clan_steamid: CLAN_STEAMID,
          event_type: 12,
          announcement_body: announcement,
        },
      ],
    },
    eventDetail: { success: 1, event: { announcement_body: announcement } },
  };
}

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("DEEPL_API_KEY", "test-key");
  vi.spyOn(console, "error").mockImplementation(() => {});
  getCachedDeeplTranslation.mockResolvedValue(null);
  saveDeeplTranslation.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

function newsRequestUrl(): URL {
  const call = fetchMock.mock.calls.find((c) => String(c[0]).includes("ISteamNews"));
  return new URL(String(call![0]));
}

describe("getSteamNews", () => {
  describe("requête Steam", () => {
    it("ne filtre pas par tag patchnotes (annonces Valve sans tag)", async () => {
      stubNetwork({});

      await getSteamNews();

      expect(newsRequestUrl().searchParams.get("tags")).toBeNull();
    });

    it("demande plus d'articles que le count pour compenser la presse externe", async () => {
      stubNetwork({});

      await getSteamNews(DEADLOCK_APP_ID, 50);

      expect(newsRequestUrl().searchParams.get("count")).toBe("150");
    });

    it("cible Deadlock par défaut", async () => {
      stubNetwork({});

      await getSteamNews();

      expect(newsRequestUrl().searchParams.get("appid")).toBe("1422450");
    });

    it("respecte l'appid fourni", async () => {
      stubNetwork({});

      await getSteamNews(570, 5);

      expect(newsRequestUrl().searchParams.get("appid")).toBe("570");
      expect(newsRequestUrl().searchParams.get("count")).toBe("15");
    });

    it("garde les annonces Steam même sans tag patchnotes et ignore la presse", async () => {
      stubNetwork({
        news: {
          appnews: {
            appid: DEADLOCK_APP_ID,
            newsitems: [
              newsItem({
                gid: "1839676055886206",
                title: "Matchmaking Update",
                tags: undefined,
              }),
              newsItem({
                gid: "press-1",
                title: "External article",
                feedname: "PC Gamer",
              }),
              newsItem({
                gid: "patch-1",
                title: "Minor Update",
                tags: ["patchnotes"],
              }),
            ],
            count: 3,
          },
        },
        events: { success: 1, events: [] },
        deepl: (text) => `FR:${text}`,
      });

      const items = await getSteamNews();

      expect(items.map((item) => item.gid)).toEqual([
        "1839676055886206",
        "patch-1",
      ]);
    });

    it("marque l'entrée de cache avec le tag de revalidation", async () => {
      stubNetwork({});

      await getSteamNews();

      expect(cacheTag).toHaveBeenCalledWith(STEAM_NEWS_CACHE_TAG);
      expect(cacheLife).toHaveBeenCalledWith("hours");
    });

    it("renvoie une liste vide quand Steam ne renvoie aucun article", async () => {
      stubNetwork({ news: { appnews: { appid: DEADLOCK_APP_ID, newsitems: [], count: 0 } } });

      await expect(getSteamNews()).resolves.toEqual([]);
    });

    it("renvoie une liste vide quand la réponse est malformée", async () => {
      stubNetwork({ news: {} });

      await expect(getSteamNews()).resolves.toEqual([]);
    });

    it("remonte une erreur quand l'API Steam échoue", async () => {
      stubNetwork({ newsOk: false, newsStatus: 502 });

      await expect(getSteamNews()).rejects.toThrow("Steam API error: 502");
    });
  });

  describe("traduction officielle Valve", () => {
    it("préfère la version française publiée par Valve", async () => {
      const { events, eventDetail } = frenchEvent();
      stubNetwork({
        news: { appnews: { appid: DEADLOCK_APP_ID, newsitems: [newsItem()], count: 1 } },
        events,
        eventDetail,
      });

      const [item] = await getSteamNews();

      expect(item.translation_source).toBe("steam");
      expect(item.contents).toBe("[b]Héros[/b] rééquilibrés");
      expect(item.original).toEqual({
        title: "Update - July 26",
        contents: "[b]Heroes[/b] rebalanced",
      });
    });

    it("nettoie les espaces autour du titre fourni par Valve", async () => {
      const { events, eventDetail } = frenchEvent();
      stubNetwork({
        news: { appnews: { appid: DEADLOCK_APP_ID, newsitems: [newsItem()], count: 1 } },
        events,
        eventDetail,
      });

      const [item] = await getSteamNews();

      expect(item.title).toBe("Mise à jour du 26 juillet");
    });

    it("n'appelle pas DeepL quand la version Valve existe", async () => {
      const { events, eventDetail } = frenchEvent();
      stubNetwork({
        news: { appnews: { appid: DEADLOCK_APP_ID, newsitems: [newsItem()], count: 1 } },
        events,
        eventDetail,
      });

      await getSteamNews();

      expect(
        fetchMock.mock.calls.some((c) => String(c[0]).includes("deepl")),
      ).toBe(false);
      expect(getCachedDeeplTranslation).not.toHaveBeenCalled();
      expect(saveDeeplTranslation).not.toHaveBeenCalled();
    });

    it("conserve les métadonnées de l'article ISteamNews", async () => {
      const { events, eventDetail } = frenchEvent();
      stubNetwork({
        news: { appnews: { appid: DEADLOCK_APP_ID, newsitems: [newsItem()], count: 1 } },
        events,
        eventDetail,
      });

      const [item] = await getSteamNews();

      expect(item.gid).toBe("news-1");
      expect(item.date).toBe(POSTTIME);
      expect(item.author).toBe("Valve");
    });
  });

  describe("repli sur DeepL", () => {
    it("traduit via DeepL quand Valve ne publie pas de version française", async () => {
      const { events, eventDetail } = frenchEvent({ language: 0 });
      stubNetwork({
        news: { appnews: { appid: DEADLOCK_APP_ID, newsitems: [newsItem()], count: 1 } },
        events,
        eventDetail,
        deepl: (text) => (text.includes("Heroes") ? "Héros rééquilibrés" : "Mise à jour"),
      });

      const [item] = await getSteamNews();

      expect(item.translation_source).toBe("deepl");
      expect(item.contents).toContain("Héros");
    });

    it("traduit via DeepL quand aucun événement ne correspond à la date", async () => {
      stubNetwork({
        news: { appnews: { appid: DEADLOCK_APP_ID, newsitems: [newsItem()], count: 1 } },
        events: { success: 1, events: [] },
        deepl: () => "Traduit",
      });

      const [item] = await getSteamNews();

      expect(item.translation_source).toBe("deepl");
    });

    it("traduit via DeepL quand la liste d'événements Steam est indisponible", async () => {
      stubNetwork({
        news: { appnews: { appid: DEADLOCK_APP_ID, newsitems: [newsItem()], count: 1 } },
        eventsOk: false,
        deepl: () => "Traduit",
      });

      const [item] = await getSteamNews();

      expect(item.translation_source).toBe("deepl");
    });

    it("traduit via DeepL quand la récupération du détail Valve échoue", async () => {
      const { events } = frenchEvent();
      stubNetwork({
        news: { appnews: { appid: DEADLOCK_APP_ID, newsitems: [newsItem()], count: 1 } },
        events,
        eventDetailOk: false,
        deepl: () => "Traduit",
      });

      const [item] = await getSteamNews();

      expect(item.translation_source).toBe("deepl");
    });

    it("garde le texte original quand seule une des deux traductions aboutit", async () => {
      stubNetwork({
        news: { appnews: { appid: DEADLOCK_APP_ID, newsitems: [newsItem()], count: 1 } },
        deepl: (text) => (text.includes("Heroes") ? "Héros rééquilibrés" : null),
      });

      const [item] = await getSteamNews();

      expect(item.translation_source).toBe("deepl");
      expect(item.title).toBe("Update - July 26");
      expect(item.contents).toContain("Héros");
    });

    it("réutilise une traduction DeepL déjà en base sans rappeler l'API", async () => {
      getCachedDeeplTranslation.mockResolvedValue({
        gid: "news-1",
        appid: DEADLOCK_APP_ID,
        source_title: "Update - July 26",
        source_contents: "[b]Heroes[/b] rebalanced",
        title_fr: "Mise à jour (cache)",
        contents_fr: "[b]Héros[/b] depuis la BDD",
      });
      stubNetwork({
        news: { appnews: { appid: DEADLOCK_APP_ID, newsitems: [newsItem()], count: 1 } },
        events: { success: 1, events: [] },
        deepl: () => {
          throw new Error("DeepL ne devrait pas être appelé");
        },
      });

      const [item] = await getSteamNews();

      expect(item.translation_source).toBe("deepl");
      expect(item.title).toBe("Mise à jour (cache)");
      expect(item.contents).toBe("[b]Héros[/b] depuis la BDD");
      expect(item.original).toEqual({
        title: "Update - July 26",
        contents: "[b]Heroes[/b] rebalanced",
      });
      expect(
        fetchMock.mock.calls.some((c) => String(c[0]).includes("deepl")),
      ).toBe(false);
      expect(saveDeeplTranslation).not.toHaveBeenCalled();
    });

    it("enregistre en base après une traduction DeepL réussie", async () => {
      stubNetwork({
        news: { appnews: { appid: DEADLOCK_APP_ID, newsitems: [newsItem()], count: 1 } },
        events: { success: 1, events: [] },
        deepl: (text) =>
          text.includes("Heroes") ? "Héros rééquilibrés" : "Mise à jour",
      });

      await getSteamNews();

      expect(saveDeeplTranslation).toHaveBeenCalledWith({
        gid: "news-1",
        appid: DEADLOCK_APP_ID,
        source_title: "Update - July 26",
        source_contents: "[b]Heroes[/b] rebalanced",
        title_fr: "Mise à jour",
        contents_fr: "Héros rééquilibrés",
      });
    });

    it("retraduit si le texte anglais Steam a changé depuis le cache", async () => {
      getCachedDeeplTranslation.mockResolvedValue({
        gid: "news-1",
        appid: DEADLOCK_APP_ID,
        source_title: "Old title",
        source_contents: "Old contents",
        title_fr: "Ancien titre",
        contents_fr: "Ancien contenu",
      });
      stubNetwork({
        news: { appnews: { appid: DEADLOCK_APP_ID, newsitems: [newsItem()], count: 1 } },
        events: { success: 1, events: [] },
        deepl: (text) => `FR:${text}`,
      });

      const [item] = await getSteamNews();

      expect(item.title).toBe("FR:Update - July 26");
      expect(saveDeeplTranslation).toHaveBeenCalled();
    });
  });

  describe("repli sur l'anglais", () => {
    it("marque l'article comme anglais quand aucune traduction n'aboutit", async () => {
      stubNetwork({
        news: { appnews: { appid: DEADLOCK_APP_ID, newsitems: [newsItem()], count: 1 } },
        deepl: () => null,
      });

      const [item] = await getSteamNews();

      expect(item.translation_source).toBe("en");
      expect(item.title).toBe("Update - July 26");
      expect(item.contents).toBe("[b]Heroes[/b] rebalanced");
    });

    it("sert quand même les articles sans clé DeepL configurée", async () => {
      vi.stubEnv("DEEPL_API_KEY", "");
      stubNetwork({
        news: { appnews: { appid: DEADLOCK_APP_ID, newsitems: [newsItem()], count: 1 } },
      });

      const [item] = await getSteamNews();

      expect(item.translation_source).toBe("en");
    });
  });

  describe("traitement par lot", () => {
    it("localise chaque article indépendamment", async () => {
      const { events, eventDetail } = frenchEvent();
      stubNetwork({
        news: {
          appnews: {
            appid: DEADLOCK_APP_ID,
            // Le second article n'a pas d'événement au même posttime.
            newsitems: [newsItem(), newsItem({ gid: "news-2", date: 1_700_000_000 })],
            count: 2,
          },
        },
        events,
        eventDetail,
        deepl: () => "Traduit",
      });

      const items = await getSteamNews();

      expect(items).toHaveLength(2);
      expect(items[0].translation_source).toBe("steam");
      expect(items[1].translation_source).toBe("deepl");
    });

    it("préserve l'ordre renvoyé par Steam", async () => {
      stubNetwork({
        news: {
          appnews: {
            appid: DEADLOCK_APP_ID,
            newsitems: [
              newsItem({ gid: "a" }),
              newsItem({ gid: "b", date: 1_700_000_000 }),
              newsItem({ gid: "c", date: 1_600_000_000 }),
            ],
            count: 3,
          },
        },
        deepl: () => null,
      });

      const items = await getSteamNews();

      expect(items.map((item) => item.gid)).toEqual(["a", "b", "c"]);
    });
  });
});

describe("getSteamNewsByGid", () => {
  it("renvoie l'article correspondant au gid", async () => {
    stubNetwork({
      news: {
        appnews: {
          appid: DEADLOCK_APP_ID,
          newsitems: [newsItem({ gid: "a" }), newsItem({ gid: "b" })],
          count: 2,
        },
      },
      deepl: () => null,
    });

    const item = await getSteamNewsByGid(DEADLOCK_APP_ID, 50, "b");

    expect(item?.gid).toBe("b");
  });

  it("renvoie undefined pour un gid inconnu, ce qui déclenche la page 404", async () => {
    stubNetwork({
      news: {
        appnews: { appid: DEADLOCK_APP_ID, newsitems: [newsItem({ gid: "a" })], count: 1 },
      },
      deepl: () => null,
    });

    await expect(
      getSteamNewsByGid(DEADLOCK_APP_ID, 50, "inexistant"),
    ).resolves.toBeUndefined();
  });

  it("renvoie l'article déjà localisé", async () => {
    const { events, eventDetail } = frenchEvent();
    stubNetwork({
      news: {
        appnews: { appid: DEADLOCK_APP_ID, newsitems: [newsItem()], count: 1 },
      },
      events,
      eventDetail,
    });

    const item = await getSteamNewsByGid(DEADLOCK_APP_ID, 50, "news-1");

    expect(item?.translation_source).toBe("steam");
    expect(item?.title).toBe("Mise à jour du 26 juillet");
  });

  it("renvoie undefined quand aucun article n'est disponible", async () => {
    stubNetwork({});

    await expect(
      getSteamNewsByGid(DEADLOCK_APP_ID, 50, "news-1"),
    ).resolves.toBeUndefined();
  });
});
