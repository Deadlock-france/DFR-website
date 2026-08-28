import { formatRankLabel, rankFromScore } from "@/lib/deadlock/ranks";
import { cn } from "@/lib/utils";

type RankBadgeProps = {
  score: number;
  /** Affiche le libellé à côté du badge */
  showLabel?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  /** Aligne le texte à droite (équipe Sapphire / miroir) */
  mirror?: boolean;
};

/** Nouveaux badges Ranked = portrait ~214×293 */
const SIZE = {
  sm: { w: 20, h: 28 },
  md: { w: 32, h: 44 },
  lg: { w: 40, h: 56 },
  xl: { w: 52, h: 72 },
} as const;

export default function RankBadge({
  score,
  showLabel = true,
  size = "sm",
  className,
  mirror = false,
}: RankBadgeProps) {
  const rank = rankFromScore(score);
  const { w, h } = SIZE[size];
  const label = formatRankLabel(score);

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5",
        mirror && "flex-row-reverse",
        className,
      )}
      title={label}
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
