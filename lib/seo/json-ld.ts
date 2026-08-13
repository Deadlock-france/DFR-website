import { STEAM_STORE_URL } from "@/lib/social/links";
import { unescapeSteamBrackets } from "@/lib/steam/text";
import type { SteamNewsItem } from "@/lib/steam/types";
import type { ShowmatchEventView, ShowmatchSeriesView } from "@/lib/showmatch/types";

import { plainTextExcerpt } from "./excerpt";
import {
  getSiteUrl,
  ORGANIZATION_SAME_AS,
  SITE_DESCRIPTION,
  SITE_LANGUAGE,
  SITE_NAME,
  sitePath,
} from "./site";

function articleHeadline(title: string): string {
  return unescapeSteamBrackets(title).split(" - ")[0];
}

export type JsonLdNode = Record<string, unknown>;

export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function jsonLdGraph(nodes: JsonLdNode[]): JsonLdNode {
  return {
    "@context": "https://schema.org",
    "@graph": nodes,
  };
}

export function organizationNode(): JsonLdNode {
  const url = getSiteUrl();
  return {
    "@type": "Organization",
    "@id": `${url}/#organization`,
    name: SITE_NAME,
    url,
    logo: {
      "@type": "ImageObject",
      url: `${url}/icon.png`,
    },
    sameAs: [...ORGANIZATION_SAME_AS],
    description: SITE_DESCRIPTION,
  };
}

export function websiteNode(): JsonLdNode {
  const url = getSiteUrl();
  return {
    "@type": "WebSite",
    "@id": `${url}/#website`,
    url,
    name: SITE_NAME,
    inLanguage: SITE_LANGUAGE,
    description: SITE_DESCRIPTION,
    publisher: { "@id": `${url}/#organization` },
    about: videoGameNode(),
  };
}

export function videoGameNode(): JsonLdNode {
  return {
    "@type": "VideoGame",
    name: "Deadlock",
    url: STEAM_STORE_URL,
    applicationCategory: "Game",
    operatingSystem: "Windows",
    publisher: {
      "@type": "Organization",
      name: "Valve",
    },
  };
}

export function breadcrumbNode(
  items: ReadonlyArray<{ name: string; path: string }>,
): JsonLdNode {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: sitePath(item.path),
    })),
  };
}

export function collectionPageNode(input: {
  name: string;
  description: string;
  path: string;
}): JsonLdNode {
  return {
    "@type": "CollectionPage",
    name: input.name,
    description: input.description,
    url: sitePath(input.path),
    inLanguage: SITE_LANGUAGE,
    isPartOf: { "@id": `${getSiteUrl()}/#website` },
  };
}

export function itemListNode(
  items: ReadonlyArray<{ name: string; path: string }>,
): JsonLdNode {
  return {
    "@type": "ItemList",
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: sitePath(item.path),
    })),
  };
}

export function newsArticleNode(item: SteamNewsItem): JsonLdNode {
  const published = new Date(item.date * 1000).toISOString();
  const headline = articleHeadline(item.title);
  const url = sitePath(`/patch-notes/${item.gid}`);

  return {
    "@type": "NewsArticle",
    headline,
    description: plainTextExcerpt(item.contents),
    datePublished: published,
    dateModified: published,
    inLanguage: SITE_LANGUAGE,
    mainEntityOfPage: url,
    url,
    isAccessibleForFree: true,
    author: {
      "@type": "Organization",
      name: item.author?.trim() || "Valve",
    },
    publisher: { "@id": `${getSiteUrl()}/#organization` },
    about: videoGameNode(),
  };
}

export function sportsEventNode(
  series: ShowmatchSeriesView,
  event: ShowmatchEventView,
): JsonLdNode {
  const [teamA, teamB] = series.teams;
  const url = sitePath(`/showmatch/${series.id}`);
  const scoreA =
    teamA.teamKey === "team1" ? series.scoreTeam1 : series.scoreTeam2;
  const scoreB =
    teamB.teamKey === "team1" ? series.scoreTeam1 : series.scoreTeam2;
  const matchup =
    event.status === "completed"
      ? `${teamA.name} ${scoreA}–${scoreB} ${teamB.name}`
      : `${teamA.name} contre ${teamB.name}`;

  return {
    "@type": "SportsEvent",
    name: `${teamA.name} vs ${teamB.name}`,
    description: `Showmatch Deadlock France : ${matchup} — ${event.title}, lobby ${series.lobbyNumber}.`,
    url,
    sport: "Deadlock",
    startDate: event.scheduledAt,
    eventStatus:
      event.status === "cancelled"
        ? "https://schema.org/EventCancelled"
        : "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
    location: {
      "@type": "VirtualLocation",
      url,
    },
    organizer: { "@id": `${getSiteUrl()}/#organization` },
    homeTeam: {
      "@type": "SportsTeam",
      name: teamA.name,
    },
    awayTeam: {
      "@type": "SportsTeam",
      name: teamB.name,
    },
  };
}

export function homeJsonLd(): JsonLdNode {
  return jsonLdGraph([organizationNode(), websiteNode()]);
}

export function patchNotesIndexJsonLd(
  items: ReadonlyArray<SteamNewsItem>,
): JsonLdNode {
  return jsonLdGraph([
    organizationNode(),
    collectionPageNode({
      name: "Patch notes Deadlock en français",
      description:
        "Toutes les mises à jour Deadlock traduites en français.",
      path: "/patch-notes",
    }),
    breadcrumbNode([
      { name: "Accueil", path: "/" },
      { name: "Patch notes", path: "/patch-notes" },
    ]),
    itemListNode(
      items.slice(0, 20).map((item) => ({
        name: articleHeadline(item.title),
        path: `/patch-notes/${item.gid}`,
      })),
    ),
  ]);
}

export function patchNoteJsonLd(item: SteamNewsItem): JsonLdNode {
  const headline = articleHeadline(item.title);
  return jsonLdGraph([
    organizationNode(),
    newsArticleNode(item),
    breadcrumbNode([
      { name: "Accueil", path: "/" },
      { name: "Patch notes", path: "/patch-notes" },
      { name: headline, path: `/patch-notes/${item.gid}` },
    ]),
  ]);
}

export function showmatchIndexJsonLd(
  series: ReadonlyArray<{ id: string; teamAName: string; teamBName: string }>,
): JsonLdNode {
  return jsonLdGraph([
    organizationNode(),
    collectionPageNode({
      name: "Showmatchs Deadlock France",
      description:
        "Résultats des showmatchs hebdomadaires de la communauté francophone.",
      path: "/showmatch",
    }),
    breadcrumbNode([
      { name: "Accueil", path: "/" },
      { name: "Showmatch", path: "/showmatch" },
    ]),
    itemListNode(
      series.slice(0, 30).map((item) => ({
        name: `${item.teamAName} vs ${item.teamBName}`,
        path: `/showmatch/${item.id}`,
      })),
    ),
  ]);
}

export function showmatchDetailJsonLd(
  series: ShowmatchSeriesView,
  event: ShowmatchEventView,
): JsonLdNode {
  const [teamA, teamB] = series.teams;
  return jsonLdGraph([
    organizationNode(),
    sportsEventNode(series, event),
    breadcrumbNode([
      { name: "Accueil", path: "/" },
      { name: "Showmatch", path: "/showmatch" },
      {
        name: `${teamA.name} vs ${teamB.name}`,
        path: `/showmatch/${series.id}`,
      },
    ]),
  ]);
}
