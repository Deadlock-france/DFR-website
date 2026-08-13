import { createOgImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/seo/og-image";
import { DEFAULT_OG_ALT, SITE_TAGLINE } from "@/lib/seo/site";

export const alt = DEFAULT_OG_ALT;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return createOgImage({
    title: SITE_TAGLINE,
    footer: "Patch notes · Showmatchs · Discord",
  });
}
