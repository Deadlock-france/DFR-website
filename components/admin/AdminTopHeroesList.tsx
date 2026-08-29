"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

export type TopHeroItem = {
  heroId: number;
  picks: number;
  name: string;
  imageUrl: string;
};

export default function AdminTopHeroesList({
  items,
  previewCount,
}: {
  items: TopHeroItem[];
  previewCount: number;
}) {
  const [expanded, setExpanded] = useState(false);

  const visible = expanded ? items : items.slice(0, previewCount);
  const hidden = items.length - previewCount;
  // Échelle figée sur le meilleur pick : déplier ne change pas les proportions.
  const peak = items[0]?.picks ?? 0;

  return (
    <>
      <ul className="mt-4 flex flex-col gap-3">
        {visible.map((item, index) => {
          const ratio = peak > 0 ? Math.max(item.picks / peak, 0.08) : 0;

          return (
            <li key={item.heroId} className="flex items-center gap-3">
              <span className="w-4 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                {index + 1}
              </span>
              <span className="size-8 shrink-0 overflow-hidden rounded-md bg-muted">
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.imageUrl}
                    alt=""
                    width={32}
                    height={32}
                    className="size-8 object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                ) : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm text-foreground">
                    {item.name}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {item.picks} pick{item.picks === 1 ? "" : "s"}
                  </span>
                </span>
                <span className="mt-1.5 block h-1.5 w-full overflow-hidden rounded-full bg-border">
                  <span
                    className="block h-full rounded-full bg-primary/70"
                    style={{ width: `${ratio * 100}%` }}
                  />
                </span>
              </span>
            </li>
          );
        })}
      </ul>

      {hidden > 0 ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-4 inline-flex items-center gap-1 self-start text-sm font-medium text-primary transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {expanded ? (
            <>
              Réduire
              <ChevronUp className="size-3.5" />
            </>
          ) : (
            <>
              Voir les {hidden} autres
              <ChevronDown className="size-3.5" />
            </>
          )}
        </button>
      ) : null}
    </>
  );
}
