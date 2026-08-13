import { createOgImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/seo/og-image";
import { getSteamNewsByGid } from "@/lib/steam/client";
import { formatPatchNotesTitle } from "@/hooks/news/format";

export const alt = "Patch note Deadlock France";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({
  params,
}: {
  params: Promise<{ gid: string }>;
}) {
  const { gid } = await params;
  const item = await getSteamNewsByGid(1422450, 50, gid);

  return createOgImage({
    title: item ? formatPatchNotesTitle(item.title) : "Patch notes Deadlock",
    eyebrow: "Patch notes",
    footer: "Deadlock France · Traduction francophone",
  });
}
