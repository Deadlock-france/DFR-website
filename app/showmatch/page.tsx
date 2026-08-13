import type { Metadata } from "next";
import { Suspense } from "react";

import PageHero from "@/components/patch-notes/PageHero";
import JsonLd from "@/components/seo/JsonLd";
import ShowmatchDayFilter from "@/components/showmatch/ShowmatchDayFilter";
import ShowmatchSummaryList from "@/components/showmatch/ShowmatchSummaryList";
import { showmatchIndexJsonLd } from "@/lib/seo/json-ld";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getShowmatchEvents } from "@/lib/showmatch/data";
import {
  filterSummariesByDay,
  listSeriesSummaries,
  listShowmatchDays,
  resolveShowmatchDayFilter,
} from "@/lib/showmatch/summaries";

const TITLE = "Showmatchs Deadlock France";
const DESCRIPTION =
  "Résultats des showmatchs hebdomadaires de la communauté francophone Deadlock : scores, rosters, héros, MVP et stats de chaque série.";

export const metadata: Metadata = buildPageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/showmatch",
});

interface ShowmatchFeedProps {
  searchParams: Promise<{ jour?: string }>;
}

async function ShowmatchFeed({ searchParams }: ShowmatchFeedProps) {
  const { jour } = await searchParams;
  const events = await getShowmatchEvents();
  const allSummaries = listSeriesSummaries(events);
  const days = listShowmatchDays(allSummaries);
  const activeDay = resolveShowmatchDayFilter(days, jour);
  const summaries = filterSummariesByDay(allSummaries, activeDay);

  return (
    <>
      <JsonLd
        data={showmatchIndexJsonLd(
          allSummaries.map((series) => ({
            id: series.id,
            teamAName: series.teamAName,
            teamBName: series.teamBName,
          })),
        )}
      />
      <ShowmatchDayFilter days={days} activeDay={activeDay} />
      <ShowmatchSummaryList
        summaries={summaries}
        showDayHeaders={activeDay === "tous"}
      />
    </>
  );
}

function ShowmatchFeedFallback() {
  return (
    <div className="border border-[#2a3538] bg-[#0c1214] px-4 py-10 text-center text-sm text-muted-foreground">
      Chargement des showmatchs…
    </div>
  );
}

export default function ShowmatchPage({
  searchParams,
}: ShowmatchFeedProps) {
  return (
    <div>
      <PageHero
        title="Showmatch"
        description="Showmatchs hebdomadaires de la communauté francophone."
      />

      <div className="flex w-full flex-col gap-6 px-4 pb-20 pt-2 sm:px-5 lg:px-8">
        <Suspense fallback={<ShowmatchFeedFallback />}>
          <ShowmatchFeed searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
