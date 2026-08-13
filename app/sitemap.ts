import type { MetadataRoute } from "next";

import {
  buildPatchNoteSitemapEntries,
  buildShowmatchSitemapEntries,
  buildStaticSitemapEntries,
} from "@/lib/seo/crawlers";
import { getShowmatchEvents } from "@/lib/showmatch/data";
import { getSteamNews } from "@/lib/steam/client";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [articles, events] = await Promise.all([
    getSteamNews().catch(() => []),
    getShowmatchEvents().catch(() => []),
  ]);

  const series = events.flatMap((event) =>
    event.series.map((item) => ({
      id: item.id,
      lastModified: event.completedAt ?? event.scheduledAt,
    })),
  );

  return [
    ...buildStaticSitemapEntries(),
    ...buildPatchNoteSitemapEntries(articles),
    ...buildShowmatchSitemapEntries(series),
  ];
}
