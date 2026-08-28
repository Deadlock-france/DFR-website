import type { WeeklyBucket } from "@/lib/admin/stats";

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

/** Histogramme sans dépendance : hauteurs relatives au pic de la période. */
export default function AdminSignupsChart({
  buckets,
}: {
  buckets: WeeklyBucket[];
}) {
  const peak = buckets.reduce((max, bucket) => Math.max(max, bucket.count), 0);

  return (
    <figure className="mt-5">
      <div className="flex h-36 items-end gap-1.5" aria-hidden>
        {buckets.map((bucket) => {
          const ratio = peak > 0 ? bucket.count / peak : 0;
          return (
            <div
              key={bucket.start}
              className="flex min-w-0 flex-1 flex-col items-center gap-2"
              title={`${weekRangeLabel(bucket)} · ${bucket.count}`}
            >
              <span className="text-[11px] tabular-nums text-muted-foreground">
                {bucket.count > 0 ? bucket.count : ""}
              </span>
              <div className="flex w-full flex-1 items-end">
                <div
                  className="w-full rounded-t-sm bg-primary/55 transition-colors hover:bg-primary"
                  style={{
                    height: `${Math.max(ratio * 100, bucket.count > 0 ? 6 : 2)}%`,
                    backgroundColor:
                      bucket.count === 0 ? "var(--border)" : undefined,
                  }}
                />
              </div>
              <span className="w-full truncate text-center text-[10px] tabular-nums text-muted-foreground">
                {bucket.label}
              </span>
            </div>
          );
        })}
      </div>

      <figcaption className="sr-only">
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
