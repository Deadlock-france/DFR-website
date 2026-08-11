import Link from "next/link";

import RankBadge from "@/components/showmatch/RankBadge";
import type {
  ShowmatchHeroPreview,
  ShowmatchMvpPreview,
  ShowmatchSeriesSummary,
} from "@/lib/showmatch/summaries";
import {
  formatEventDate,
  formatMatchDuration,
  formatMatchTime,
  formatSoulsCompact,
} from "@/lib/showmatch/format";
import { groupSummariesByEventDate } from "@/lib/showmatch/summaries";
import type { ShowmatchSide } from "@/lib/showmatch/types";
import { cn } from "@/lib/utils";

function HeroStrip({
  heroes,
  side,
  align = "start",
}: {
  heroes: ShowmatchHeroPreview[];
  side: ShowmatchSide;
  align?: "start" | "end";
}) {
  const frame =
    side === "amber"
      ? "border-[#a66b2a] shadow-[0_0_0_1px_rgba(232,161,74,0.25)]"
      : "border-[#3d6f9e] shadow-[0_0_0_1px_rgba(110,176,232,0.25)]";

  if (heroes.length === 0) return null;

  return (
    <div
      className={cn(
        "flex gap-1 sm:gap-1.5",
        align === "end" ? "justify-end" : "justify-start",
      )}
    >
      {heroes.map((hero) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={`${hero.heroName}-${hero.heroImageUrl}`}
          src={hero.heroImageUrl}
          alt={hero.heroName}
          title={hero.heroName}
          width={52}
          height={68}
          className={cn(
            "h-[68px] w-[52px] border object-cover brightness-95 transition-[filter] group-hover:brightness-110",
            frame,
          )}
        />
      ))}
    </div>
  );
}

function mvpSideTone(side: ShowmatchSide | null | undefined) {
  if (side === "amber") return "text-[#f0b35a]";
  if (side === "sapphire") return "text-[#7ec0f0]";
  return "text-[#c9a24a]";
}

function MvpChip({
  mvp,
  showGame,
}: {
  mvp: ShowmatchMvpPreview;
  showGame: boolean;
}) {
  const sideClass = mvpSideTone(mvp.side);

  return (
    <div className="inline-flex min-w-0 items-center gap-2">
      {mvp.heroImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={mvp.heroImageUrl}
          alt=""
          width={24}
          height={32}
          className="h-8 w-6 border border-[#2a3538] object-cover"
        />
      ) : null}
      <div className="min-w-0 leading-tight">
        <p
          className={cn(
            "text-[10px] font-semibold uppercase tracking-[0.16em]",
            sideClass,
          )}
        >
          {showGame ? `MVP G${mvp.gameNumber}` : "MVP"}
        </p>
        <p className="truncate text-sm font-medium text-foreground/90">
          {mvp.name}
        </p>
      </div>
    </div>
  );
}

function TeamBlock({
  name,
  side,
  isWinner,
  heroes,
  avgRank,
  mirror,
}: {
  name: string;
  side: ShowmatchSide;
  isWinner: boolean;
  heroes: ShowmatchHeroPreview[];
  avgRank: number;
  mirror?: boolean;
}) {
  const isAmber = side === "amber";
  const nameColor = isAmber ? "text-[#f0b35a]" : "text-[#7ec0f0]";
  const wash = isAmber
    ? "bg-[linear-gradient(135deg,rgba(160,78,18,0.45)_0%,rgba(60,32,12,0.55)_55%,rgba(16,20,22,0.2)_100%)]"
    : "bg-[linear-gradient(225deg,rgba(28,78,140,0.5)_0%,rgba(18,40,72,0.55)_55%,rgba(16,20,22,0.2)_100%)]";
  const edge = isAmber
    ? "border-[#8a4e1e]/70"
    : "border-[#2f5f8f]/70";

  return (
    <div
      className={cn(
        "relative flex min-w-0 flex-col gap-4 overflow-hidden border-y px-4 py-5 sm:px-5 sm:py-6 lg:px-6",
        wash,
        edge,
        mirror ? "items-end text-right sm:border-l-0" : "items-start text-left",
      )}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 opacity-[0.12]",
          "bg-[repeating-linear-gradient(-45deg,transparent,transparent_6px,rgba(255,255,255,0.07)_6px,rgba(255,255,255,0.07)_7px)]",
        )}
      />

      <div
        className={cn(
          "relative z-1 flex w-full flex-wrap items-center gap-2",
          mirror && "flex-row-reverse",
        )}
      >
        <p
          className={cn(
            "font-colus text-xl uppercase leading-none tracking-wide sm:text-2xl",
            nameColor,
          )}
        >
          {name}
        </p>
        {isWinner ? (
          <span className="border border-[#d4a24a]/55 bg-[#c9a24a]/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#f6dba0]">
            Victoire
          </span>
        ) : null}
      </div>

      <div className="relative z-1 w-full">
        <HeroStrip
          heroes={heroes}
          side={side}
          align={mirror ? "end" : "start"}
        />
      </div>

      <dl
        className={cn(
          "relative z-1 flex w-full flex-wrap gap-x-4 gap-y-1 text-xs uppercase tracking-wide text-[#b7c4c8] sm:text-[13px]",
          mirror && "justify-end",
        )}
      >
        <div className="flex items-center gap-1.5">
          <dt className="text-[#7f9094]">Rang</dt>
          <dd>
            <RankBadge
              score={avgRank}
              size="sm"
              showScore
              mirror={mirror}
              className="normal-case tracking-normal"
            />
          </dd>
        </div>
      </dl>
    </div>
  );
}

function SeriesSummaryCard({ series }: { series: ShowmatchSeriesSummary }) {
  const aWon = series.winnerTeamKey === series.teamAKey;
  const bWon = series.winnerTeamKey === series.teamBKey;
  const scoreA =
    series.teamAKey === "team1" ? series.scoreTeam1 : series.scoreTeam2;
  const scoreB =
    series.teamBKey === "team1" ? series.scoreTeam1 : series.scoreTeam2;
  const timeIso = series.lastGameStartedAt ?? series.scheduledAt;
  const sideA = series.teamASide ?? "amber";
  const sideB = series.teamBSide ?? "sapphire";
  const mvps =
    series.mvps.length > 0
      ? series.mvps
      : series.mvpName
        ? [
            {
              gameNumber: 1,
              name: series.mvpName,
              heroImageUrl: series.mvpHeroImageUrl,
              side: null,
            } satisfies ShowmatchMvpPreview,
          ]
        : [];
  const showGameLabel = series.gameCount > 1 || mvps.length > 1;

  return (
    <li>
      <Link
        href={`/showmatch/${series.id}`}
        className="group block overflow-hidden border border-[#2a3538] bg-[#0c1214] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-[border-color,box-shadow] hover:border-[#4a5c62] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_0_1px_rgba(88,164,132,0.15)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2a3538] bg-[linear-gradient(90deg,rgba(180,96,28,0.12),transparent_35%,transparent_65%,rgba(40,90,150,0.14))] px-4 py-2.5 sm:px-5">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#9aabac] sm:text-[13px]">
            <span className="text-foreground/85">Lobby {series.lobbyNumber}</span>
            <span className="mx-2 text-[#5a6a6e]">/</span>
            <span className="text-foreground/85">{formatMatchTime(timeIso)}</span>
            {series.lastGameDurationSeconds != null ? (
              <>
                <span className="mx-2 text-[#5a6a6e]">/</span>
                <span className="tabular-nums text-[#e8c07a]">
                  {formatMatchDuration(series.lastGameDurationSeconds)}
                </span>
              </>
            ) : null}
          </p>
          <p className="text-xs uppercase tracking-[0.14em] text-[#9aabac] sm:text-[13px]">
            <span className="tabular-nums text-foreground/85">{series.gameCount}</span>{" "}
            game{series.gameCount > 1 ? "s" : ""}
            {series.totalSouls != null ? (
              <>
                <span className="mx-2 text-[#5a6a6e]">/</span>
                <span className="tabular-nums text-foreground/85">
                  {formatSoulsCompact(series.totalSouls)}
                </span>{" "}
                âmes
              </>
            ) : null}
            {series.eventStatus === "cancelled" ? (
              <>
                <span className="mx-2 text-[#5a6a6e]">/</span>
                <span className="font-semibold text-[#e08a6a]">Annulé</span>
              </>
            ) : null}
          </p>
        </div>

        <div className="grid sm:grid-cols-[1fr_6.5rem_1fr] lg:grid-cols-[1fr_7.5rem_1fr]">
          <TeamBlock
            name={series.teamAName}
            side={sideA}
            isWinner={aWon}
            heroes={series.teamAHeroes}
            avgRank={series.teamAAvgRank}
            mirror
          />

          <div className="relative flex flex-col items-center justify-center gap-1.5 border-y border-[#2a3538] bg-[linear-gradient(180deg,#141c1e,#0e1517)] px-2 py-5 sm:py-6">
            <span className="font-colus text-sm uppercase tracking-[0.28em] text-[#6d7e82] sm:text-base">
              BO3
            </span>
            <p className="font-colus text-3xl leading-none tracking-wide sm:text-4xl">
              <span
                className={cn(
                  "tabular-nums",
                  aWon ? "text-[#f0b35a]" : "text-[#8a9a9e]",
                )}
              >
                {scoreA}
              </span>
              <span className="mx-1 text-[#4a5a5e]">-</span>
              <span
                className={cn(
                  "tabular-nums",
                  bWon ? "text-[#7ec0f0]" : "text-[#8a9a9e]",
                )}
              >
                {scoreB}
              </span>
            </p>
          </div>

          <TeamBlock
            name={series.teamBName}
            side={sideB}
            isWinner={bWon}
            heroes={series.teamBHeroes}
            avgRank={series.teamBAvgRank}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#2a3538] bg-[#0a1012] px-4 py-3 sm:px-5">
          {mvps.length > 0 ? (
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {mvps.map((mvp) => (
                <MvpChip
                  key={`${mvp.gameNumber}-${mvp.name}`}
                  mvp={mvp}
                  showGame={showGameLabel}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#7f9094]">MVP -</p>
          )}
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#58a484] transition-transform group-hover:translate-x-0.5">
            Détail →
          </span>
        </div>
      </Link>
    </li>
  );
}

export default function ShowmatchSummaryList({
  summaries,
  showDayHeaders = true,
}: {
  summaries: ShowmatchSeriesSummary[];
  showDayHeaders?: boolean;
}) {
  if (summaries.length === 0) {
    return (
      <p className="py-12 text-center text-muted-foreground">
        Aucun showmatch pour ce filtre.
      </p>
    );
  }

  const groups = groupSummariesByEventDate(summaries);

  return (
    <div className="flex flex-col gap-14">
      {groups.map((group) => (
        <section key={group.eventDate} className="flex flex-col gap-5">
          {showDayHeaders ? (
            <header className="relative border-l-2 border-[#58a484] pl-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#8a9b9f]">
                {formatEventDate(group.eventDate)}
              </p>
              <h2 className="font-colus mt-1 text-3xl uppercase tracking-wide text-foreground">
                {group.eventTitle}
              </h2>
              <p className="mt-1 text-sm text-[#8a9b9f]">
                {group.matches.length} série
                {group.matches.length > 1 ? "s" : ""} ce soir
              </p>
            </header>
          ) : (
            <header className="flex items-end justify-between gap-3 border-b border-[#2a3538] pb-3">
              <h2 className="font-colus text-2xl uppercase tracking-wide text-foreground">
                {group.eventTitle}
              </h2>
              <p className="text-sm text-[#8a9b9f]">
                {group.matches.length} série
                {group.matches.length > 1 ? "s" : ""}
              </p>
            </header>
          )}
          <ul className="flex flex-col gap-4">
            {group.matches.map((series) => (
              <SeriesSummaryCard key={series.id} series={series} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
