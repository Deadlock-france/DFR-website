"use client";

import { useState } from "react";

import { adminFilterChipClassName } from "@/components/admin/admin-styles";
import type {
  SignupRange,
  SignupRangeId,
  WeeklyBucket,
} from "@/lib/admin/stats";

/** Hauteur max d’une barre : laisse la place à l’étiquette de valeur. */
const MAX_BAR_PERCENT = 88;
/** Une barre non nulle reste lisible même face à un pic très haut. */
const MIN_BAR_PERCENT = 8;
/** Au-delà, on n’étiquette plus chaque barre. */
const MAX_LABELLED_BARS = 14;

function weekRangeLabel(bucket: WeeklyBucket): string {
  const start = new Date(bucket.start);
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
  const format = new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Paris",
  });
  return `${format.format(start)} – ${format.format(end)}`;
}

function barPercent(count: number, peak: number): number {
  if (count <= 0 || peak <= 0) return 0;
  return Math.max((count / peak) * MAX_BAR_PERCENT, MIN_BAR_PERCENT);
}

/**
 * Histogramme sans dépendance : l’échelle suit toujours la semaine la plus
 * forte de la période, pour qu’une seule inscription reste visible.
 */
export default function AdminSignupsChart({
  ranges,
  defaultRangeId,
}: {
  ranges: SignupRange[];
  defaultRangeId: SignupRangeId;
}) {
  const [rangeId, setRangeId] = useState<SignupRangeId>(defaultRangeId);
  const range =
    ranges.find((item) => item.id === rangeId) ?? ranges[ranges.length - 1];

  if (!range) return null;

  const { buckets, peak, total } = range;
  const showValues = buckets.length <= MAX_LABELLED_BARS;
  const labelStep = Math.ceil(buckets.length / 6);

  return (
    <figure className="mt-4">
      <div
        className="flex flex-wrap gap-1.5"
        role="group"
        aria-label="Période affichée"
      >
        {ranges.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setRangeId(item.id)}
            aria-pressed={item.id === range.id}
            className={adminFilterChipClassName(item.id === range.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-baseline justify-between gap-3 text-xs text-muted-foreground">
        <span className="tabular-nums">
          {total} inscription{total === 1 ? "" : "s"} sur la période
        </span>
        {peak > 0 ? (
          <span className="tabular-nums">
            pic : {peak}/semaine
          </span>
        ) : null}
      </div>

      <div className="relative mt-1.5 h-40" aria-hidden>
        {peak > 0 ? (
          <div
            className="absolute inset-x-0 border-t border-dashed border-border"
            style={{ top: `${100 - MAX_BAR_PERCENT}%` }}
          />
        ) : null}

        <div className="flex h-full items-stretch gap-[3px]">
          {buckets.map((bucket) => {
            const percent = barPercent(bucket.count, peak);
            return (
              <div
                key={bucket.start}
                className="group relative min-w-0 flex-1"
                title={`${weekRangeLabel(bucket)} · ${bucket.count} inscription${bucket.count === 1 ? "" : "s"}`}
              >
                {bucket.count > 0 ? (
                  <>
                    <div
                      className="absolute inset-x-0 bottom-0 rounded-t-[3px] bg-primary/60 transition-colors group-hover:bg-primary"
                      style={{ height: `${percent}%` }}
                    />
                    {showValues ? (
                      <span
                        className="absolute inset-x-0 text-center text-[11px] font-medium tabular-nums text-foreground"
                        style={{ bottom: `calc(${percent}% + 3px)` }}
                      >
                        {bucket.count}
                      </span>
                    ) : null}
                  </>
                ) : (
                  <div className="absolute inset-x-0 bottom-0 h-px bg-border" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-2 flex gap-[3px]" aria-hidden>
        {buckets.map((bucket, index) => {
          const fromEnd = buckets.length - 1 - index;
          return (
            <span
              key={bucket.start}
              className="min-w-0 flex-1 truncate text-center text-[10px] tabular-nums text-muted-foreground"
            >
              {fromEnd % labelStep === 0 ? bucket.label : ""}
            </span>
          );
        })}
      </div>

      <figcaption className="sr-only">
        Inscriptions par semaine sur {range.label.toLowerCase()}.
        <ul>
          {buckets.map((bucket) => (
            <li key={bucket.start}>
              Semaine du {weekRangeLabel(bucket)} : {bucket.count} inscription
              {bucket.count === 1 ? "" : "s"}.
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}
