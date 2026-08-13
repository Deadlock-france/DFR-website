import type { MetadataRoute } from "next";

import { PUBLIC_SITEMAP_ROUTES, ROBOTS_DISALLOW_PATHS } from "./paths";
import { getSiteUrl, shouldIndexSite } from "./site";

export function buildRobots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  if (!shouldIndexSite()) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
      host: siteUrl,
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [...ROBOTS_DISALLOW_PATHS],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}

export function buildStaticSitemapEntries(
  lastModified: Date = new Date(),
): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();

  return PUBLIC_SITEMAP_ROUTES.map((route) => ({
    url: route.path === "/" ? siteUrl : `${siteUrl}${route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}

export function buildPatchNoteSitemapEntries(
  items: ReadonlyArray<{ gid: string; date: number }>,
): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();

  return items.map((item) => ({
    url: `${siteUrl}/patch-notes/${item.gid}`,
    lastModified: new Date(item.date * 1000),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));
}

export function buildShowmatchSitemapEntries(
  series: ReadonlyArray<{ id: string; lastModified?: string }>,
): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();

  return series.map((item) => ({
    url: `${siteUrl}/showmatch/${item.id}`,
    lastModified: item.lastModified ? new Date(item.lastModified) : new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));
}
