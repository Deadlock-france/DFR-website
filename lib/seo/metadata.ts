import type { Metadata } from "next";

import {
  documentTitle,
  getSiteUrl,
  shouldIndexSite,
  SITE_LOCALE,
  SITE_NAME,
  TWITTER_HANDLE,
} from "./site";

const INDEXABLE_ROBOTS: NonNullable<Metadata["robots"]> = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    "max-image-preview": "large",
    "max-snippet": -1,
    "max-video-preview": -1,
  },
};

const NOINDEX_ROBOTS: NonNullable<Metadata["robots"]> = {
  index: false,
  follow: false,
  googleBot: {
    index: false,
    follow: false,
  },
};

export function indexingRobots(): NonNullable<Metadata["robots"]> {
  return shouldIndexSite() ? INDEXABLE_ROBOTS : NOINDEX_ROBOTS;
}

export function noIndexRobots(): NonNullable<Metadata["robots"]> {
  return NOINDEX_ROBOTS;
}

export type PageSeoInput = {
  title: string;
  description: string;
  path: string;
  /** Titre déjà complet (accueil) — pas de suffixe « | Deadlock France ». */
  absoluteTitle?: boolean;
  index?: boolean;
  ogType?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
  authors?: string[];
};

export function buildPageMetadata({
  title,
  description,
  path,
  absoluteTitle = false,
  index = true,
  ogType = "website",
  publishedTime,
  modifiedTime,
  authors,
}: PageSeoInput): Metadata {
  const canonical = path.startsWith("/") ? path : `/${path}`;
  const url = canonical === "/" ? getSiteUrl() : `${getSiteUrl()}${canonical}`;
  const fullTitle = absoluteTitle ? title : documentTitle(title);
  const robots = index ? indexingRobots() : noIndexRobots();

  const openGraph =
    ogType === "article"
      ? {
          type: "article" as const,
          locale: SITE_LOCALE,
          url,
          siteName: SITE_NAME,
          title: fullTitle,
          description,
          publishedTime,
          modifiedTime,
          authors,
        }
      : {
          type: "website" as const,
          locale: SITE_LOCALE,
          url,
          siteName: SITE_NAME,
          title: fullTitle,
          description,
        };

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: {
      canonical,
      languages: {
        fr: canonical,
        "x-default": canonical,
      },
    },
    robots,
    openGraph,
    twitter: {
      card: "summary_large_image",
      site: TWITTER_HANDLE,
      creator: TWITTER_HANDLE,
      title: fullTitle,
      description,
    },
  };
}

export function buildNoIndexMetadata(
  input: Pick<PageSeoInput, "title" | "description" | "path">,
): Metadata {
  return buildPageMetadata({ ...input, index: false });
}
