import type { Metadata } from "next";
import { Suspense } from "react";

import HomeCommunity from "@/components/home/HomeCommunity";
import HomeLatestNews from "@/components/home/HomeLatestNews";
import HomeLatestShowmatches from "@/components/home/HomeLatestShowmatches";
import HomeSiteNews from "@/components/home/HomeSiteNews";
import LandingHero from "@/components/home/LandingHero";
import SiteAnnouncementBanner from "@/components/home/SiteAnnouncementBanner";
import JsonLd from "@/components/seo/JsonLd";
import { listActiveAnnouncements, listPublishedNews } from "@/lib/admin/cms";
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

async function HomeAnnouncementBanner() {
  const announcements = await listActiveAnnouncements().catch(() => []);
  return <SiteAnnouncementBanner announcements={announcements} />;
}

async function HomeMainFeed() {
  const [articles, referencesByLanguage, events, siteNews] = await Promise.all([
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
    listPublishedNews(3).catch(() => []),
  ]);

  const latestArticles = articles.slice(0, 3);
  const latestShowmatches = listSeriesSummaries(events).slice(0, 2);

  return (
    <div className="flex flex-col gap-16 sm:gap-20">
      <HomeSiteNews items={siteNews} />
      <HomeLatestNews
        items={latestArticles}
        references={referencesByLanguage[DEADLOCK_LANG_FRENCH]}
      />
      <HomeLatestShowmatches summaries={latestShowmatches} />
      <HomeCommunity />
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="pb-16">
      <JsonLd data={homeJsonLd()} />
      <Suspense fallback={null}>
        <HomeAnnouncementBanner />
      </Suspense>
      <LandingHero />

      <Suspense
        fallback={
          <div className="px-4 py-10 text-sm text-muted-foreground sm:px-6">
            Chargement…
          </div>
        }
      >
        <HomeMainFeed />
      </Suspense>
    </div>
  );
}
