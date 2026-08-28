import {
  Award,
  Crown,
  Flame,
  Medal,
  Sparkles,
  Star,
  Swords,
  Trophy,
  type LucideIcon,
} from "lucide-react";

import type { ShowmatchBadge, ShowmatchBadgeId } from "@/lib/account/types";
import { cn } from "@/lib/utils";

const BADGE_ICONS: Record<ShowmatchBadgeId, LucideIcon> = {
  first_game: Swords,
  first_win: Trophy,
  first_mvp: Star,
  games_10: Flame,
  wins_5: Medal,
  mvp_5: Crown,
  wins_10: Award,
  mvp_10: Sparkles,
};

export default function ShowmatchBadges({
  badges,
  className,
  layout = "wrap",
}: {
  badges: ShowmatchBadge[];
  className?: string;
  layout?: "wrap" | "stack";
}) {
  if (badges.length === 0) return null;

  return (
    <ul
      className={cn(
        layout === "stack" ? "flex flex-col gap-1" : "flex flex-wrap gap-1",
        className,
      )}
    >
      {badges.map((badge) => {
        const Icon = BADGE_ICONS[badge.id];
        return (
          <li key={badge.id}>
            <span
              title={badge.description}
              className={cn(
                "inline-flex items-center gap-1.5 text-foreground/90",
                layout === "stack"
                  ? "w-full rounded-md px-0 py-1 text-sm"
                  : "rounded-md border border-border bg-muted/30 px-1.5 py-0.5 text-[0.7rem] leading-none",
              )}
            >
              <Icon className="size-3.5 shrink-0 text-[#e8c07a]" aria-hidden />
              {badge.title}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
