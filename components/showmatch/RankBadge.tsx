import {
  formatRankLabel,
  formatRankWithScore,
  rankFromScore,
} from "@/lib/deadlock/ranks";
import { cn } from "@/lib/utils";

type RankBadgeProps = {
  score: number;
  /** Affiche le libellé à côté du badge */
  showLabel?: boolean;
  /** Inclut la note numérique, ex. "Prosélyte IV (14.2)" */
  showScore?: boolean;
  size?: "sm" | "md";
  className?: string;
  /** Aligne le texte à droite (équipe Sapphire / miroir) */
  mirror?: boolean;
};

/** Nouveaux badges Ranked = portrait ~214×293 */
const SIZE = {
  sm: { w: 20, h: 28 },
  md: { w: 32, h: 44 },
} as const;

export default function RankBadge({
  score,
  showLabel = true,
  showScore = false,
  size = "sm",
  className,
  mirror = false,
}: RankBadgeProps) {
  const rank = rankFromScore(score);
  const { w, h } = SIZE[size];
  const label = showScore
    ? formatRankWithScore(score)
    : formatRankLabel(score);

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5",
        mirror && "flex-row-reverse",
        className,
      )}
      title={formatRankWithScore(score)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={rank.imageUrl}
        alt=""
        width={w}
        height={h}
        className="shrink-0 object-contain"
        style={{ width: w, height: h }}
        loading="lazy"
        decoding="async"
      />
      {showLabel ? (
        <span className="text-foreground/90">{label}</span>
      ) : (
        <span className="sr-only">{label}</span>
      )}
    </span>
  );
}
