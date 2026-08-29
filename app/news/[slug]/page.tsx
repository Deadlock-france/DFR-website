import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import PageHero from "@/components/patch-notes/PageHero";
import { getPublishedNewsBySlug } from "@/lib/admin/cms";
import { renderNewsMarkdown } from "@/lib/admin/markdown";
import { buildPageMetadata } from "@/lib/seo/metadata";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await getPublishedNewsBySlug(slug).catch(() => null);
  if (!article) {
    return buildPageMetadata({
      title: "Article introuvable",
      description: "Cette news n’existe pas.",
      path: `/news/${slug}`,
    });
  }
  return buildPageMetadata({
    title: article.title,
    description: article.excerpt || article.title,
    path: `/news/${article.slug}`,
  });
}

async function NewsArticleBody({ params }: Props) {
  const { slug } = await params;
  const article = await getPublishedNewsBySlug(slug).catch(() => null);
  if (!article) notFound();

  const html = renderNewsMarkdown(article.body_markdown);

  return (
    <div>
      <PageHero title={article.title} description={article.excerpt || undefined} />
      <div className="flex w-full flex-col gap-6 px-4 pb-20 pt-2 sm:px-5 lg:px-8">
        {article.published_at ? (
          <p className="text-sm text-muted-foreground">
            <time dateTime={article.published_at}>
              {new Intl.DateTimeFormat("fr-FR", {
                dateStyle: "long",
                timeZone: "Europe/Paris",
              }).format(new Date(article.published_at))}
            </time>
          </p>
        ) : null}
        <div
          className="prose-news max-w-3xl space-y-4 text-base leading-relaxed text-foreground/90 [&_a]:text-[#58a484] [&_a]:underline-offset-2 hover:[&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-[#2a3538] [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_code]:rounded-sm [&_code]:bg-[#12181a] [&_code]:px-1 [&_h2]:font-colus [&_h2]:text-2xl [&_h2]:tracking-wide [&_h3]:font-colus [&_h3]:text-xl [&_img]:my-4 [&_img]:h-auto [&_img]:max-w-full [&_img]:border [&_img]:border-[#2a3538] [&_li]:ml-5 [&_ol]:list-decimal [&_pre]:overflow-x-auto [&_pre]:border [&_pre]:border-[#2a3538] [&_pre]:bg-[#0c1214] [&_pre]:p-3 [&_ul]:list-disc"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
}

export default function NewsArticlePage({ params }: Props) {
  return (
    <Suspense
      fallback={
        <div className="px-4 py-10 text-sm text-muted-foreground sm:px-5">
          Chargement…
        </div>
      }
    >
      <NewsArticleBody params={params} />
    </Suspense>
  );
}
