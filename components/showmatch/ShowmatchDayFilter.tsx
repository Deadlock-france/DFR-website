import Link from "next/link";

import type { ShowmatchDayOption } from "@/lib/showmatch/summaries";
import { formatDayChipLabel } from "@/lib/showmatch/summaries";
import { cn } from "@/lib/utils";

export default function ShowmatchDayFilter({
  days,
  activeDay,
}: {
  days: ShowmatchDayOption[];
  activeDay: string;
}) {
  if (days.length <= 1) {
    return null;
  }

  return (
    <nav
      aria-label="Filtrer les showmatchs par jour"
      className="border border-[#2a3538] bg-[#0c1214]"
    >
      <div className="flex items-center justify-between gap-3 border-b border-[#2a3538] px-4 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8a9b9f]">
          Soirées
        </p>
        <Link
          href="/showmatch?jour=tous"
          className={cn(
            "text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors",
            activeDay === "tous"
              ? "text-[#58a484]"
              : "text-[#6d7e82] hover:text-foreground",
          )}
          aria-current={activeDay === "tous" ? "page" : undefined}
        >
          Toutes
        </Link>
      </div>

      <ul className="flex gap-2 overflow-x-auto px-3 py-3">
        {days.map((day) => {
          const label = formatDayChipLabel(day.eventDate);
          const selected = activeDay === day.eventDate;

          return (
            <li key={day.eventDate} className="shrink-0">
              <Link
                href={`/showmatch?jour=${day.eventDate}`}
                title={day.eventTitle}
                aria-current={selected ? "page" : undefined}
                className={cn(
                  "flex min-w-[4.75rem] flex-col items-center border px-3 py-2.5 transition-colors",
                  selected
                    ? "border-[#58a484] bg-[#58a484]/15 text-foreground"
                    : "border-[#2a3538] bg-[#10181a] text-[#9aabac] hover:border-[#3a4a4e] hover:text-foreground",
                )}
              >
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em]">
                  {label.weekday}
                </span>
                <span className="font-colus mt-1 text-lg leading-none uppercase tracking-wide">
                  {label.dayMonth}
                </span>
                <span className="mt-1.5 text-[10px] tabular-nums text-[#7f9094]">
                  {day.matchCount} match{day.matchCount > 1 ? "s" : ""}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
