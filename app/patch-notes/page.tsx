import NewsListFeed from "@/components/patch-notes/NewsListFeed";
import PageHero from "@/components/patch-notes/PageHero";
import JsonLd from "@/components/seo/JsonLd";
import { getDeadlockReferencesByLanguage } from "@/lib/deadlock/client";
import { DEADLOCK_LANG_FRENCH } from "@/lib/deadlock/types";
import { patchNotesIndexJsonLd } from "@/lib/seo/json-ld";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getSteamNews } from "@/lib/steam/client";
import type { Metadata } from "next";

const TITLE = "Patch notes Deadlock en français";
const DESCRIPTION =
  "Toutes les mises à jour Deadlock en français. Notes Valve traduites (Steam officiel ou DeepL), équilibrage des héros, objets et correctifs.";

export const metadata: Metadata = buildPageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/patch-notes",
});

export default async function NewsPage() {
  const [articles, referencesByLanguage] = await Promise.all([
    getSteamNews(1422450, 50),
    getDeadlockReferencesByLanguage(),
  ]);

  return (
    <div>
      <JsonLd data={patchNotesIndexJsonLd(articles)} />
      <PageHero
        title="Patch notes"
        description="Dernières mises à jour de Deadlock, traduites en français."
      />

      <NewsListFeed
        items={articles}
        references={referencesByLanguage[DEADLOCK_LANG_FRENCH]}
      />
    </div>
  );
}
