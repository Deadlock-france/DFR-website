import { createOgImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/seo/og-image";
import { getShowmatchSeriesById } from "@/lib/showmatch/data";

export const alt = "Showmatch Deadlock France";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const series = await getShowmatchSeriesById(id);
  const [teamA, teamB] = series?.teams ?? [];
  const title =
    teamA && teamB
      ? `${teamA.name} vs ${teamB.name}`
      : "Showmatch Deadlock France";

  return createOgImage({
    title,
    eyebrow: "Showmatch",
    footer: series
      ? `Lobby ${series.lobbyNumber}`
      : "Communauté francophone",
  });
}
