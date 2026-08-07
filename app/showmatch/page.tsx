import type { Metadata } from "next";
import { Suspense } from "react";

import PageHero from "@/components/patch-notes/PageHero";
import ShowmatchDayFilter from "@/components/showmatch/ShowmatchDayFilter";
import ShowmatchSummaryList from "@/components/showmatch/ShowmatchSummaryList";
import { getShowmatchEvents } from "@/lib/showmatch/data";
import {
  filterSummariesByDay,
  listSeriesSummaries,
  listShowmatchDays,
  resolveShowmatchDayFilter,
} from "@/lib/showmatch/summaries";

export const metadata: Metadata = {
  title: "Showmatch",
  description:
    "Showmatchs hebdomadaires Deadlock France : résultats, rosters et stats de la communauté.",
};

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

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pb-20 pt-2 sm:px-6">
        <Suspense fallback={<ShowmatchFeedFallback />}>
          <ShowmatchFeed searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
