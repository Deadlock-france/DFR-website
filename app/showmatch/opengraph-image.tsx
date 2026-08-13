import { createOgImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/seo/og-image";

export const alt = "Showmatchs Deadlock France";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return createOgImage({
    title: "Showmatchs de la communauté francophone",
    eyebrow: "Showmatch",
    footer: "Scores · Rosters · Stats",
  });
}
