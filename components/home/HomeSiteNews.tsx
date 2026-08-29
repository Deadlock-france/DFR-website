import Link from "next/link";

import type { SiteNewsArticle } from "@/lib/admin/types";

export default function HomeSiteNews({
  items,
}: {
  items: SiteNewsArticle[];
}) {
  if (items.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-1500px px-4 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-colus text-2xl tracking-wide sm:text-3xl">
            Actus communauté
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Annonces et articles publiés par l’équipe.
          </p>
        </div>
        <Link
          href="/news"
          className="text-sm text-[#58a484] underline-offset-2 hover:underline"
        >
          Toutes les news
        </Link>
      </div>

      <ul className="mt-6 grid gap-4 sm:grid-cols-3">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={`/news/${item.slug}`}
              className="block border border-[#2a3538] bg-[#0c1214] px-4 py-4 transition-colors hover:border-[#58a484]/45"
            >
              <h3 className="font-colus text-lg uppercase tracking-wide">
                {item.title}
              </h3>
              {item.excerpt ? (
                <p className="mt-2 line-clamp-3 text-sm text-foreground/80">
                  {item.excerpt}
                </p>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
