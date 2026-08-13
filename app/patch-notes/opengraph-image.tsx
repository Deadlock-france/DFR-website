import { createOgImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/seo/og-image";

export const alt = "Patch notes Deadlock en français";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return createOgImage({
    title: "Patch notes Deadlock en français",
    eyebrow: "Patch notes",
    footer: "Traduction officielle Steam · DeepL en secours",
  });
}
