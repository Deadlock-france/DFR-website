import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";

import PageHero from "@/components/patch-notes/PageHero";
import { listPublishedNews } from "@/lib/admin/cms";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { SITE_NAME } from "@/lib/seo/site";

export const metadata: Metadata = buildPageMetadata({
  title: "News",
  description: `Actualités de la communauté ${SITE_NAME}.`,
  path: "/news",
});

async function NewsIndexFeed() {
  const articles = await listPublishedNews(50).catch(() => []);

  if (articles.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucun article pour le moment.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-6">
      {articles.map((article) => (
        <li key={article.id} className="border-b border-[#2a3538] pb-6">
          <Link
            href={`/news/${article.slug}`}
            className="font-colus text-2xl tracking-wide text-foreground transition-colors hover:text-[#58a484]"
          >
            {article.title}
          </Link>
          {article.published_at ? (
            <time
              dateTime={article.published_at}
              className="mt-2 block text-xs text-muted-foreground"
            >
              {new Intl.DateTimeFormat("fr-FR", {
                dateStyle: "medium",
                timeZone: "Europe/Paris",
              }).format(new Date(article.published_at))}
            </time>
          ) : null}
          {article.excerpt ? (
            <p className="mt-2 text-sm text-foreground/85">{article.excerpt}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export default function NewsIndexPage() {
  return (
    <div>
      <PageHero
        title="News"
        description="Annonces et articles de la communauté francophone."
      />
      <div className="flex w-full flex-col gap-6 px-4 pb-20 pt-2 sm:px-5 lg:px-8">
        <Suspense
          fallback={
            <p className="text-sm text-muted-foreground">Chargement…</p>
          }
        >
          <NewsIndexFeed />
        </Suspense>
      </div>
    </div>
  );
}
