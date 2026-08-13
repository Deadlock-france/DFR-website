import { afterEach, describe, expect, it } from "vitest";

import { MOCK_SHOWMATCH_EVENT } from "@/lib/showmatch/mock";
import type { SteamNewsItem } from "@/lib/steam/types";

import {
  homeJsonLd,
  newsArticleNode,
  patchNoteJsonLd,
  serializeJsonLd,
  showmatchDetailJsonLd,
} from "./json-ld";

const ORIGINAL_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;

afterEach(() => {
  process.env.NEXT_PUBLIC_SITE_URL = ORIGINAL_SITE_URL;
});

function newsItem(overrides: Partial<SteamNewsItem> = {}): SteamNewsItem {
  return {
    gid: "news-1",
    title: "Minor Update - Deadlock",
    url: "https://store.steampowered.com/news/app/1422450/view/news-1",
    is_external_url: false,
    author: "Valve",
    contents: "<p>Hero <b>nerf</b> &amp; buffs</p>",
    feedlabel: "Community Announcements",
    date: 1_786_608_000,
    feedname: "steam_community_announcements",
    feed_type: 1,
    appid: 1422450,
    ...overrides,
  };
}

describe("serializeJsonLd", () => {
  it("échappe les chevrons pour éviter de casser le script", () => {
    expect(serializeJsonLd({ html: "</script><p>x</p>" })).toContain("\\u003c");
    expect(serializeJsonLd({ html: "</script>" })).not.toContain("</script>");
  });
});

describe("homeJsonLd", () => {
  it("décrit le site et l'organisation", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://deadlock-france.fr";
    const graph = homeJsonLd()["@graph"] as Array<Record<string, unknown>>;
    const types = graph.map((node) => node["@type"]);

    expect(types).toContain("Organization");
    expect(types).toContain("WebSite");
    expect(graph[0]).toEqual(
      expect.objectContaining({
        name: "Deadlock France",
        url: "https://deadlock-france.fr",
      }),
    );
  });
});

describe("newsArticleNode", () => {
  it("utilise le titre court et une description texte", () => {
    const node = newsArticleNode(newsItem());
    expect(node["@type"]).toBe("NewsArticle");
    expect(node.headline).toBe("Minor Update");
    expect(node.description).toBe("Hero nerf & buffs");
    expect(node.url).toContain("/patch-notes/news-1");
  });
});

describe("patchNoteJsonLd", () => {
  it("ajoute le fil d'Ariane de l'article", () => {
    const graph = patchNoteJsonLd(newsItem())["@graph"] as Array<
      Record<string, unknown>
    >;
    const breadcrumb = graph.find((node) => node["@type"] === "BreadcrumbList");
    expect(breadcrumb).toBeDefined();
    const items = breadcrumb?.itemListElement as Array<{ name: string }>;
    expect(items.map((item) => item.name)).toEqual([
      "Accueil",
      "Patch notes",
      "Minor Update",
    ]);
  });
});

describe("showmatchDetailJsonLd", () => {
  it("décrit la série comme SportsEvent", () => {
    const series = MOCK_SHOWMATCH_EVENT.series[0];
    const graph = showmatchDetailJsonLd(series, MOCK_SHOWMATCH_EVENT)[
      "@graph"
    ] as Array<Record<string, unknown>>;
    const event = graph.find((node) => node["@type"] === "SportsEvent");

    expect(event?.name).toMatch(/ vs /);
    expect(event?.sport).toBe("Deadlock");
    expect(event?.homeTeam).toEqual(
      expect.objectContaining({ "@type": "SportsTeam" }),
    );
  });
});
