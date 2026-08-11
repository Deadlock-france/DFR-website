import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import ShowmatchMatchDetail from "@/components/showmatch/ShowmatchMatchDetail";
import {
  getAllShowmatchSeriesIds,
  getMockShowmatchSeries,
  getShowmatchEventForSeries,
  getShowmatchSeriesById,
} from "@/lib/showmatch/data";

interface ShowmatchDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  const ids = await getAllShowmatchSeriesIds();
  // Cache Components exige ≥1 param pour valider le build (BDD peut être vide).
  if (ids.length === 0) {
    const mockId = getMockShowmatchSeries()[0]?.id;
    return [{ id: mockId ?? "__build_placeholder__" }];
  }
  return ids.map((id) => ({ id }));
}

export async function generateMetadata({
  params,
}: ShowmatchDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const series = await getShowmatchSeriesById(id);

  if (!series) {
    return { title: "Showmatch" };
  }

  const [teamA, teamB] = series.teams;

  return {
    title: `${teamA.name} vs ${teamB.name}`,
    description: `Série showmatch ${teamA.name} contre ${teamB.name} — lobby ${series.lobbyNumber}.`,
  };
}

async function ShowmatchDetailContent({
  params,
}: ShowmatchDetailPageProps) {
  const { id } = await params;
  const series = await getShowmatchSeriesById(id);
  const event = await getShowmatchEventForSeries(id);

  if (!series || !event) {
    notFound();
  }

  return <ShowmatchMatchDetail series={series} event={event} />;
}

function ShowmatchDetailFallback() {
  return (
    <div className="flex w-full flex-col gap-6 px-4 pb-20 pt-10 sm:px-5 lg:px-8">
      <div className="border border-[#2a3538] bg-[#0c1214] px-4 py-10 text-center text-sm text-muted-foreground">
        Chargement de la série…
      </div>
    </div>
  );
}

export default function ShowmatchDetailPage({
  params,
}: ShowmatchDetailPageProps) {
  return (
    <Suspense fallback={<ShowmatchDetailFallback />}>
      <ShowmatchDetailContent params={params} />
    </Suspense>
  );
}
