import Link from "next/link";

import type {
  ShowmatchEventView,
  ShowmatchGameView,
  ShowmatchParticipantView,
  ShowmatchSeriesView,
  ShowmatchSide,
  ShowmatchTeamView,
} from "@/lib/showmatch/types";
import {
  formatMatchDateTime,
  formatMatchDuration,
  formatSoulsCompact,
  teamTotalSouls,
} from "@/lib/showmatch/format";
import { cn } from "@/lib/utils";

const SCOREBOARD_GRID =
  "grid grid-cols-[minmax(11rem,1.4fr)_4.5rem_2.25rem_2.25rem_2.25rem_4.5rem_4.5rem] items-center gap-x-2 sm:grid-cols-[minmax(14rem,1.6fr)_5rem_2.5rem_2.5rem_2.5rem_5.5rem_5.5rem] sm:gap-x-3";

const SIDE_ORDER: Record<ShowmatchSide, number> = {
  amber: 0,
  sapphire: 1,
};

function teamSortKey(side: ShowmatchSide | null, teamKey: string): number {
  if (side) return SIDE_ORDER[side];
  return teamKey === "team1" ? 0 : 1;
}

type StatKey = "netWorth" | "kills" | "deaths" | "assists" | "damage" | "healing";

function bestByGame(game: ShowmatchGameView, key: StatKey): number {
  let best = -1;
  for (const team of game.teams) {
    for (const row of team.players) {
      best = Math.max(best, row[key]);
    }
  }
  return best;
}

function StatCell({
  value,
  best,
  format = "number",
  highlightBest = true,
}: {
  value: number;
  best: number;
  format?: "number" | "souls";
  highlightBest?: boolean;
}) {
  const isBest = highlightBest && value === best && value > 0;
  const label = format === "souls" ? formatSoulsCompact(value) : String(value);

  return (
    <span
      className={cn(
        "justify-self-center text-center text-sm tabular-nums text-foreground/90",
        isBest &&
          "rounded-sm px-1.5 py-0.5 font-semibold text-[#f5d08a] ring-1 ring-[#c8923a]/70",
      )}
    >
      {label}
    </span>
  );
}

function PlayerRow({
  row,
  side,
  bests,
}: {
  row: ShowmatchParticipantView;
  side: ShowmatchSide | null;
  bests: Record<StatKey, number>;
}) {
  const tint =
    side === "sapphire"
      ? "bg-[linear-gradient(90deg,rgba(40,90,150,0.28),rgba(40,90,150,0.08))]"
      : "bg-[linear-gradient(90deg,rgba(180,96,28,0.22),rgba(180,96,28,0.06))]";

  return (
    <li
      className={cn(
        SCOREBOARD_GRID,
        "min-h-14 px-2 py-1.5 sm:min-h-16 sm:px-3",
        tint,
        row.isMvp && "ring-1 ring-inset ring-[#d4a24a]/45",
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={row.heroImageUrl}
          alt={row.heroName}
          width={40}
          height={52}
          className="h-[52px] w-10 shrink-0 object-cover"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium leading-tight">
            {row.player.displayName}
            {row.isMvp ? (
              <span
                className="ml-1.5 inline-block align-middle text-[10px] font-semibold uppercase tracking-wider text-[#f0c56a]"
                title="MVP — plus haut net worth"
              >
                ★ MVP
              </span>
            ) : null}
          </p>
          <p className="truncate text-xs text-muted-foreground">{row.heroName}</p>
        </div>
      </div>
      <StatCell value={row.netWorth} best={bests.netWorth} format="souls" />
      <StatCell value={row.kills} best={bests.kills} />
      <StatCell value={row.deaths} best={bests.deaths} highlightBest={false} />
      <StatCell value={row.assists} best={bests.assists} />
      <StatCell value={row.damage} best={bests.damage} format="souls" />
      <StatCell value={row.healing} best={bests.healing} format="souls" />
    </li>
  );
}

function TeamBoard({
  team,
  bests,
}: {
  team: ShowmatchTeamView;
  bests: Record<StatKey, number>;
}) {
  const isAmber = team.side !== "sapphire";
  const nameColor = isAmber ? "text-[#e8a14a]" : "text-[#6eb0e8]";
  const panelBorder = isAmber
    ? "border-[#8a5a28]/50"
    : "border-[#3a6a9a]/50";
  const headerBg = isAmber
    ? "bg-[rgba(120,70,25,0.35)]"
    : "bg-[rgba(30,70,120,0.4)]";

  return (
    <section className={cn("overflow-hidden border", panelBorder)}>
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-2 px-3 py-2.5",
          headerBg,
        )}
      >
        <div className="flex items-center gap-3">
          <h3
            className={cn(
              "font-[family-name:var(--font-colus)] text-xl tracking-wide uppercase sm:text-2xl",
              nameColor,
            )}
          >
            {team.name}
          </h3>
          {team.isWinner ? (
            <span className="rounded-sm bg-[#c9a24a]/20 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-[#f0d090]">
              Victoire
            </span>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground sm:text-sm">
          Rang moy. {team.avgRank.toFixed(1)}
          <span className="mx-1.5 opacity-40">·</span>
          Cap. {team.captain.displayName}
        </p>
      </div>

      <div
        className={cn(
          SCOREBOARD_GRID,
          "border-b border-white/10 bg-black/25 px-2 py-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:px-3 sm:text-xs",
          team.players.length === 0 && "hidden",
        )}
      >
        <span>Joueur</span>
        <span className="justify-self-center text-center">Âmes</span>
        <span className="justify-self-center text-center" title="Éliminations">
          V
        </span>
        <span className="justify-self-center text-center" title="Morts">
          M
        </span>
        <span className="justify-self-center text-center" title="Assists">
          C
        </span>
        <span className="justify-self-center text-center">Dégâts</span>
        <span className="justify-self-center text-center">Soins</span>
      </div>

      {team.players.length > 0 ? (
        <>
          <ul className="flex flex-col gap-px bg-black/20">
            {team.players.map((row) => (
              <PlayerRow
                key={row.player.id}
                row={row}
                side={team.side}
                bests={bests}
              />
            ))}
          </ul>
          <div className="flex justify-center border-t border-white/10 bg-black/30 py-2">
            <span className="rounded-sm bg-black/40 px-3 py-1 text-sm font-medium tabular-nums text-foreground/90">
              {formatSoulsCompact(teamTotalSouls(team.players))}
            </span>
          </div>
        </>
      ) : (
        <ul className="flex flex-col gap-px bg-black/20 px-3 py-3">
          {team.roster.length > 0 ? (
            team.roster.map((player) => (
              <li
                key={player.id}
                className="border-b border-white/5 py-1.5 text-sm text-foreground/85 last:border-0"
              >
                {player.displayName}
              </li>
            ))
          ) : (
            <li className="py-2 text-sm text-muted-foreground">
              Roster non disponible
            </li>
          )}
        </ul>
      )}
    </section>
  );
}

function GameScoreboard({ game }: { game: ShowmatchGameView }) {
  const hasStats = game.teams.some((team) => team.players.length > 0);
  const bests: Record<StatKey, number> = {
    netWorth: bestByGame(game, "netWorth"),
    kills: bestByGame(game, "kills"),
    deaths: bestByGame(game, "deaths"),
    assists: bestByGame(game, "assists"),
    damage: bestByGame(game, "damage"),
    healing: bestByGame(game, "healing"),
  };

  const orderedTeams = [...game.teams].sort(
    (a, b) =>
      teamSortKey(a.side, a.teamKey) - teamSortKey(b.side, b.teamKey),
  );

  return (
    <section className="flex flex-col gap-3">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2a3538] pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-colus text-lg uppercase tracking-wide">
            Game {game.gameNumber}
          </h2>
          {game.sideMappingSource === "assumed" ? (
            <span
              className="text-[10px] font-medium uppercase tracking-wider text-[#c9a24a]/90"
              title="Côtés amber/sapphire estimés — aucun joueur Steam lié"
            >
              Côtés estimés
            </span>
          ) : null}
        </div>
        <p className="text-sm tabular-nums text-muted-foreground">
          {game.startedAt ? formatMatchDateTime(game.startedAt) : "—"}
          {game.durationSeconds != null ? (
            <>
              <span className="mx-2 opacity-40">·</span>
              <span className="font-medium text-foreground/90">
                {formatMatchDuration(game.durationSeconds)}
              </span>
            </>
          ) : null}
        </p>
      </header>
      {!hasStats ? (
        <p className="text-sm text-muted-foreground">
          Vainqueur enregistré — stats Deadlock non disponibles pour cette game.
        </p>
      ) : null}
      <div className="flex flex-col gap-4">
        {orderedTeams.map((team) => (
          <TeamBoard key={team.id} team={team} bests={bests} />
        ))}
      </div>
    </section>
  );
}

export default function ShowmatchMatchDetail({
  series,
  event,
}: {
  series: ShowmatchSeriesView;
  event: ShowmatchEventView;
}) {
  const [teamA, teamB] = series.teams;
  const scoreA =
    teamA.teamKey === "team1" ? series.scoreTeam1 : series.scoreTeam2;
  const scoreB =
    teamB.teamKey === "team1" ? series.scoreTeam1 : series.scoreTeam2;
  const colorA = teamA.side === "sapphire" ? "text-[#7ec0f0]" : "text-[#f0b35a]";
  const colorB = teamB.side === "sapphire" ? "text-[#7ec0f0]" : "text-[#f0b35a]";

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-3 pb-20 pt-4 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/showmatch"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Tous les showmatchs
        </Link>
        <p className="text-sm tabular-nums text-muted-foreground">
          <span className="capitalize">{event.title}</span>
          <span className="mx-2 opacity-40">·</span>
          Lobby {series.lobbyNumber}
          <span className="mx-2 opacity-40">·</span>
          {formatMatchDateTime(event.scheduledAt)}
        </p>
      </div>

      <header className="flex flex-col items-center gap-2 border border-[#2a3538] bg-[#0c1214] px-4 py-6">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#8a9b9f]">
          Série BO3
        </p>
        <p className="font-colus text-center text-2xl uppercase tracking-wide sm:text-3xl">
          <span className={colorA}>{teamA.name}</span>
          <span className="mx-3 text-[#5a6a6e]">vs</span>
          <span className={colorB}>{teamB.name}</span>
        </p>
        <p className="font-colus text-4xl tabular-nums tracking-wide">
          <span className={colorA}>{scoreA}</span>
          <span className="mx-2 text-[#4a5a5e]">-</span>
          <span className={colorB}>{scoreB}</span>
        </p>
        {series.streamUrls[0] ? (
          <a
            href={series.streamUrls[0]}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 text-sm text-[#58a484] underline-offset-2 hover:underline"
          >
            Voir le stream
          </a>
        ) : null}
      </header>

      <div className="flex flex-col gap-12">
        {series.games.length === 0 ? (
          <section className="flex flex-col gap-4 border border-[#2a3538] bg-[#0c1214] px-4 py-5">
            <h2 className="font-colus text-lg uppercase tracking-wide">
              Rosters
            </h2>
            <p className="text-sm text-muted-foreground">
              Équipes formées — aucune game enregistrée pour l’instant.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {series.teams.map((team) => (
                <div key={team.id} className="border border-[#2a3538] px-3 py-3">
                  <p className="font-colus text-lg uppercase tracking-wide">
                    {team.name}
                  </p>
                  <ul className="mt-2 flex flex-col gap-1">
                    {team.roster.map((player) => (
                      <li key={player.id} className="text-sm text-foreground/85">
                        {player.displayName}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        ) : (
          series.games.map((game) => (
            <GameScoreboard key={game.id} game={game} />
          ))
        )}
      </div>
    </div>
  );
}
