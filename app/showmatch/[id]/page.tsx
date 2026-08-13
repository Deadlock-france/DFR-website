import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import JsonLd from "@/components/seo/JsonLd";
import ShowmatchMatchDetail from "@/components/showmatch/ShowmatchMatchDetail";
import { showmatchDetailJsonLd } from "@/lib/seo/json-ld";
import { buildPageMetadata } from "@/lib/seo/metadata";
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
  const [series, event] = await Promise.all([
    getShowmatchSeriesById(id),
    getShowmatchEventForSeries(id),
  ]);

  if (!series) {
    return buildPageMetadata({
      title: "Showmatch introuvable",
      description: "Cette série showmatch n’est plus disponible.",
      path: `/showmatch/${id}`,
      index: false,
    });
  }

  const [teamA, teamB] = series.teams;
  const scoreA =
    teamA.teamKey === "team1" ? series.scoreTeam1 : series.scoreTeam2;
  const scoreB =
    teamB.teamKey === "team1" ? series.scoreTeam1 : series.scoreTeam2;
  const eventLabel = event?.title ?? "Showmatch";

  return buildPageMetadata({
    title: `${teamA.name} vs ${teamB.name}`,
    description: `Showmatch Deadlock France : ${teamA.name} ${scoreA}–${scoreB} ${teamB.name} — ${eventLabel}, lobby ${series.lobbyNumber}. Scores, rosters et stats.`,
    path: `/showmatch/${id}`,
  });
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

  return (
    <>
      <JsonLd data={showmatchDetailJsonLd(series, event)} />
      <ShowmatchMatchDetail series={series} event={event} />
    </>
  );
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
