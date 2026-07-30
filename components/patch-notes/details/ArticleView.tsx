"use client";

import AppLink from "@/components/AppLink";
import type { SteamNewsItem } from "@/lib/steam/types";
import { formatNewsDate, formatPatchNotesContent } from "@/hooks/news/format";


export default function ArticleView({
  item,
}: {
  item: SteamNewsItem;
}) {
  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="breadcrumb" className="flex items-center gap-2 text-sm">
        <AppLink href="/" className="text-muted-foreground hover:text-foreground">
          Accueil
        </AppLink>
        <span className="text-muted-foreground">/</span>
        <span className="max-w-[300px] truncate text-foreground">
          {item.title}
        </span>
      </nav>

      <div className="flex flex-col gap-2">
        <span className="text-sm text-muted-foreground">
          {formatNewsDate(item.date)} · {item.author || "Valve"}
        </span>

        <h1 className="text-3xl font-bold">{item.title}</h1>

        <div dangerouslySetInnerHTML={{ __html: formatPatchNotesContent(item.contents) }} />
      </div>    
    </div>
  );
}
