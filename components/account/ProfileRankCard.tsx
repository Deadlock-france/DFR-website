"use client";

import { RefreshCw } from "lucide-react";

import { Button } from "@/components/shadcn/button";
import RankBadge from "@/components/showmatch/RankBadge";
import type { PlayerRankSnapshot } from "@/lib/account/types";
import { cn } from "@/lib/utils";

function formatFetchedAgo(iso: string, now = Date.now()): string {
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return "";
  const mins = Math.max(0, Math.round((now - then) / 60_000));
  if (mins < 1) return "à l’instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.round(hours / 24);
  return `il y a ${days} j`;
}

function formatRetryIn(iso: string, now = Date.now()): string {
  const ms = Date.parse(iso) - now;
  const mins = Math.max(1, Math.ceil(ms / 60_000));
  return `${mins} min`;
}

export default function ProfileRankCard({
  rank,
  loading,
  onRefresh,
  className,
}: {
  rank: PlayerRankSnapshot;
  loading: boolean;
  onRefresh: () => void;
  className?: string;
}) {
  if (!rank.hasSteam) return null;

  const awaitingFirst = rank.fetchedAt == null;
  const refreshTitle =
    !rank.canRefresh && rank.nextRefreshAt
      ? `Réessaie dans ${formatRetryIn(rank.nextRefreshAt)}`
      : rank.fetchedAt
        ? `Actualiser le rang (${formatFetchedAgo(rank.fetchedAt)})`
        : "Actualiser le rang";

  return (
    <div className={cn("flex min-w-0 items-center gap-1.5", className)}>
      {rank.badge != null ? (
        <RankBadge
          score={rank.badge}
          size="md"
          showLabel
          className="min-w-0 text-sm font-medium text-primary"
        />
      ) : (
        <p className="truncate text-sm font-medium text-muted-foreground">
          {loading || awaitingFirst ? "Chargement du rang…" : "Rang introuvable"}
        </p>
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={loading}
        onClick={onRefresh}
        title={refreshTitle}
        aria-label="Actualiser le rang"
        className="size-11 shrink-0 text-muted-foreground"
      >
        <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
      </Button>
    </div>
  );
}
