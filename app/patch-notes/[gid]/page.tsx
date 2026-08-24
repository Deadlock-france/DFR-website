import ArticleView from "@/components/patch-notes/details/ArticleView";
import JsonLd from "@/components/seo/JsonLd";
import {
  getDeadlockReferencesByLanguage,
  type DeadlockReferencesByLanguage,
} from "@/lib/deadlock/client";
import { DEADLOCK_LANG_ENGLISH, DEADLOCK_LANG_FRENCH } from "@/lib/deadlock/types";
import { formatPatchNotesTitle } from "@/hooks/news/format";
import { patchNoteJsonLd } from "@/lib/seo/json-ld";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { plainTextExcerpt } from "@/lib/seo/excerpt";
import { getSteamNews, getSteamNewsByGid } from "@/lib/steam/client";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

interface NewsPageProps {
  params: Promise<{ gid: string }>;
}

const EMPTY_REFERENCES: DeadlockReferencesByLanguage = {
  [DEADLOCK_LANG_FRENCH]: [],
  [DEADLOCK_LANG_ENGLISH]: [],
};

export async function generateStaticParams() {
  try {
    const items = await getSteamNews(1422450, 50);
    return items.map((item) => ({ gid: item.gid }));
  } catch (error) {
    console.error("generateStaticParams /patch-notes/[gid] failed:", error);
    return [];
  }
}

export async function generateMetadata({
  params,
}: NewsPageProps): Promise<Metadata> {
  const { gid } = await params;

  try {
    const item = await getSteamNewsByGid(1422450, 50, gid);

    if (!item) {
      return buildPageMetadata({
        title: "Patch note introuvable",
        description: "Cette mise à jour Deadlock n’est plus disponible.",
        path: `/patch-notes/${gid}`,
        index: false,
      });
    }

    const title = formatPatchNotesTitle(item.title);
    const published = new Date(item.date * 1000).toISOString();

    return buildPageMetadata({
      title,
      description:
        plainTextExcerpt(item.contents) ||
        `${title} — patch notes Deadlock en français.`,
      path: `/patch-notes/${gid}`,
      ogType: "article",
      publishedTime: published,
      modifiedTime: published,
      authors: [item.author?.trim() || "Valve"],
    });
  } catch (error) {
    console.error(`generateMetadata /patch-notes/${gid} failed:`, error);
    return buildPageMetadata({
      title: "Patch notes",
      description: "Mise à jour Deadlock.",
      path: `/patch-notes/${gid}`,
      index: false,
    });
  }
}

export default async function NewsPage({ params }: NewsPageProps) {
  const { gid } = await params;

  let item: Awaited<ReturnType<typeof getSteamNewsByGid>>;
  try {
    item = await getSteamNewsByGid(1422450, 50, gid);
  } catch (error) {
    console.error(`Steam news ${gid} failed:`, error);
    notFound();
  }

  if (!item) {
    notFound();
  }

  let referencesByLanguage = EMPTY_REFERENCES;
  try {
    referencesByLanguage = await getDeadlockReferencesByLanguage();
  } catch (error) {
    console.error("Deadlock references failed:", error);
  }

  return (
    <>
      <JsonLd data={patchNoteJsonLd(item)} />
      <ArticleView item={item} referencesByLanguage={referencesByLanguage} />
    </>
  );
}
