import ArticleView from "@/components/patch-notes/details/ArticleView";
import JsonLd from "@/components/seo/JsonLd";
import { getDeadlockReferencesByLanguage } from "@/lib/deadlock/client";
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

export async function generateStaticParams() {
  const items = await getSteamNews(1422450, 50);

  return items.map((item) => ({ gid: item.gid }));
}

export async function generateMetadata({
  params,
}: NewsPageProps): Promise<Metadata> {
  const { gid } = await params;
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
    description: plainTextExcerpt(item.contents) || `${title} — patch notes Deadlock en français.`,
    path: `/patch-notes/${gid}`,
    ogType: "article",
    publishedTime: published,
    modifiedTime: published,
    authors: [item.author?.trim() || "Valve"],
  });
}

export default async function NewsPage({ params }: NewsPageProps) {
  const { gid } = await params;
  const [item, referencesByLanguage] = await Promise.all([
    getSteamNewsByGid(1422450, 50, gid),
    getDeadlockReferencesByLanguage(),
  ]);

  if (!item) {
    notFound();
  }

  return (
    <>
      <JsonLd data={patchNoteJsonLd(item)} />
      <ArticleView item={item} referencesByLanguage={referencesByLanguage} />
    </>
  );
}
