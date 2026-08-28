import type { Metadata } from "next";

import HomeCommunity from "@/components/home/HomeCommunity";
import HomeLatestNews from "@/components/home/HomeLatestNews";
import HomeLatestShowmatches from "@/components/home/HomeLatestShowmatches";
import LandingHero from "@/components/home/LandingHero";
import JsonLd from "@/components/seo/JsonLd";
import { getDeadlockReferencesByLanguage } from "@/lib/deadlock/client";
import { DEADLOCK_LANG_ENGLISH, DEADLOCK_LANG_FRENCH } from "@/lib/deadlock/types";
import { homeJsonLd } from "@/lib/seo/json-ld";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo/site";
import { getShowmatchEvents } from "@/lib/showmatch/data";
import { listSeriesSummaries } from "@/lib/showmatch/summaries";
import { getSteamNews } from "@/lib/steam/client";

export const metadata: Metadata = buildPageMetadata({
  title: `${SITE_NAME} — Patch notes, showmatchs et communauté`,
  description: SITE_DESCRIPTION,
  path: "/",
  absoluteTitle: true,
});

export default async function HomePage() {
  const [articles, referencesByLanguage, events] = await Promise.all([
    getSteamNews(1422450, 50).catch((error) => {
      console.error("Home Steam news failed:", error);
      return [] as Awaited<ReturnType<typeof getSteamNews>>;
    }),
    getDeadlockReferencesByLanguage().catch((error) => {
      console.error("Home Deadlock references failed:", error);
      return {
        [DEADLOCK_LANG_FRENCH]: [],
        [DEADLOCK_LANG_ENGLISH]: [],
      } as Awaited<ReturnType<typeof getDeadlockReferencesByLanguage>>;
    }),
    getShowmatchEvents().catch((error) => {
      console.error("Home showmatch events failed:", error);
      return [] as Awaited<ReturnType<typeof getShowmatchEvents>>;
    }),
  ]);

  const latestArticles = articles.slice(0, 3);
  const latestShowmatches = listSeriesSummaries(events).slice(0, 2);

  return (
    <div className="pb-16">
      <JsonLd data={homeJsonLd()} />
      <LandingHero />

      <div className="flex flex-col gap-16 sm:gap-20">
        <HomeLatestNews
          items={latestArticles}
          references={referencesByLanguage[DEADLOCK_LANG_FRENCH]}
        />
        <HomeLatestShowmatches summaries={latestShowmatches} />
        <HomeCommunity />
      </div>
    </div>
  );
}
