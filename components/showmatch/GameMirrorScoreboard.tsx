import ShowmatchDemoMatchCode from "@/components/showmatch/ShowmatchDemoMatchCode";
import type {
  ShowmatchGameView,
  ShowmatchParticipantView,
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

const SIDE_ORDER: Record<ShowmatchSide, number> = {
  amber: 0,
  sapphire: 1,
};

function teamSortKey(side: ShowmatchSide | null, teamKey: string): number {
  if (side) return SIDE_ORDER[side];
  return teamKey === "team1" ? 0 : 1;
}

type StatKey = "netWorth" | "kills" | "deaths" | "assists" | "damage" | "healing";

const STAT_ROWS: ReadonlyArray<{
  key: StatKey;
  label: string;
  format: "number" | "souls";
  highlightBest: boolean;
  bestTone: string;
}> = [
  {
    key: "netWorth",
    label: "Âmes totales",
    format: "souls",
    highlightBest: true,
    bestTone: "bg-[#c8923a]/35 text-[#f5d08a] ring-1 ring-[#c8923a]/60",
  },
  {
    key: "kills",
    label: "Éliminations",
    format: "number",
    highlightBest: true,
    bestTone: "bg-[#a33a3a]/40 text-[#f0a0a0] ring-1 ring-[#c45a5a]/55",
  },
  {
    key: "deaths",
    label: "Morts",
    format: "number",
    highlightBest: false,
    bestTone: "",
  },
  {
    key: "assists",
    label: "Assists",
    format: "number",
    highlightBest: true,
    bestTone: "bg-[#3a7a9a]/40 text-[#9ad0f0] ring-1 ring-[#5a9aba]/55",
  },
  {
    key: "damage",
    label: "Dégâts",
    format: "souls",
    highlightBest: true,
    bestTone: "bg-[#7a3a9a]/40 text-[#d0a0f0] ring-1 ring-[#9a5aba]/55",
  },
  {
    key: "healing",
    label: "Soins",
    format: "souls",
    highlightBest: true,
    bestTone: "bg-[#3a8a5a]/40 text-[#a0e0b0] ring-1 ring-[#5aaa7a]/55",
  },
];

function bestByGame(game: ShowmatchGameView, key: StatKey): number {
  let best = -1;
  for (const team of game.teams) {
    for (const row of team.players) {
      best = Math.max(best, row[key]);
    }
  }
  return best;
}

function formatStat(value: number, format: "number" | "souls"): string {
  return format === "souls" ? formatSoulsCompact(value) : String(value);
}

function PlayerColumn({
  row,
  bests,
  side,
}: {
  row: ShowmatchParticipantView;
  bests: Record<StatKey, number>;
  side: ShowmatchSide | null;
}) {
  const isSapphire = side === "sapphire";

  return (
    <div
      className={cn(
        "flex min-w-[4.25rem] flex-1 flex-col items-center sm:min-w-[5rem]",
        row.isMvp && "relative",
      )}
    >
      <div className="flex h-[6.25rem] w-full flex-col items-center justify-start gap-1 px-0.5 pb-2 pt-1 sm:h-[7.25rem]">
        <div
          className={cn(
            "relative size-11 shrink-0 overflow-hidden rounded-full ring-2 sm:size-14",
            isSapphire ? "ring-[#3a6a9a]/70" : "ring-[#8a5a28]/70",
            row.isMvp && "ring-[#d4a24a]",
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={row.heroImageUrl}
            alt={row.heroName}
            width={56}
            height={56}
            className="size-full object-cover"
            title={row.heroName}
          />
        </div>
        <p
          className="line-clamp-2 w-full text-center text-[10px] font-medium leading-tight sm:text-xs"
          title={row.player.displayName}
        >
          {row.player.displayName}
        </p>
        {row.isMvp ? (
          <span
            className={cn(
              "text-[9px] font-semibold uppercase tracking-wider",
              row.side === "amber" && "text-[#f0b35a]",
              row.side === "sapphire" && "text-[#7ec0f0]",
              !row.side && "text-[#f0c56a]",
            )}
            title="MVP — plus haut net worth"
          >
            ★ MVP
          </span>
        ) : null}
      </div>

      {STAT_ROWS.map((stat) => {
        const value = row[stat.key];
        const isBest =
          stat.highlightBest && value === bests[stat.key] && value > 0;

        return (
          <div
            key={stat.key}
            className="flex h-9 w-full items-center justify-center border-t border-white/5 sm:h-10"
          >
            <span
              className={cn(
                "px-1 py-0.5 text-center text-xs tabular-nums text-foreground/90 sm:text-sm",
                isBest && cn("rounded-sm font-semibold", stat.bestTone),
              )}
            >
              {formatStat(value, stat.format)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function TeamRosterFallback({ team }: { team: ShowmatchTeamView }) {
  const isAmber = team.side !== "sapphire";
  const nameColor = isAmber ? "text-[#e8a14a]" : "text-[#6eb0e8]";

  return (
    <div className="flex flex-col gap-2 border border-[#2a3538] px-3 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <p
          className={cn(
            "font-colus text-lg uppercase tracking-wide",
            nameColor,
          )}
        >
          {team.name}
        </p>
        {team.isWinner ? (
          <span className="rounded-sm bg-[#c9a24a]/20 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-[#f0d090]">
            Victoire
          </span>
        ) : null}
      </div>
      <ul className="flex flex-col gap-1">
        {team.roster.length > 0 ? (
          team.roster.map((player) => (
            <li key={player.id} className="text-sm text-foreground/85">
              {player.displayName}
            </li>
          ))
        ) : (
          <li className="text-sm text-muted-foreground">Roster non disponible</li>
        )}
      </ul>
    </div>
  );
}

export default function GameMirrorScoreboard({
  game,
}: {
  game: ShowmatchGameView;
}) {
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
  const [amberTeam, sapphireTeam] = orderedTeams as [
    ShowmatchTeamView,
    ShowmatchTeamView,
  ];

  const amberSouls = teamTotalSouls(amberTeam.players);
  const sapphireSouls = teamTotalSouls(sapphireTeam.players);

  if (!hasStats) {
    return (
      <section className="flex flex-col gap-4">
        <GameHeader
          game={game}
          amberTeam={amberTeam}
          sapphireTeam={sapphireTeam}
          amberSouls={null}
          sapphireSouls={null}
        />
        <p className="text-sm text-muted-foreground">
          Vainqueur enregistré — stats Deadlock non disponibles pour cette game.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <TeamRosterFallback team={amberTeam} />
          <TeamRosterFallback team={sapphireTeam} />
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <GameHeader
        game={game}
        amberTeam={amberTeam}
        sapphireTeam={sapphireTeam}
        amberSouls={amberSouls}
        sapphireSouls={sapphireSouls}
      />

      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <div
          className="mx-auto grid min-w-[42rem] grid-cols-[1fr_auto_1fr] gap-x-1 sm:min-w-[52rem] sm:gap-x-2"
          role="table"
          aria-label={`Stats game ${game.gameNumber}`}
        >
          {/* Portraits / noms — ligne déjà dans PlayerColumn */}
          <div
            className={cn(
              "flex justify-end gap-px rounded-sm bg-[linear-gradient(90deg,rgba(180,96,28,0.12),rgba(180,96,28,0.04))]",
            )}
          >
            {amberTeam.players.map((row) => (
              <PlayerColumn
                key={row.player.id}
                row={row}
                bests={bests}
                side={amberTeam.side}
              />
            ))}
          </div>

          <div className="flex w-[5.5rem] shrink-0 flex-col items-center sm:w-28">
            <div className="flex h-[6.25rem] w-full flex-col items-center justify-end pb-2 sm:h-[7.25rem]">
              <p className="text-center text-[9px] font-medium uppercase tracking-[0.14em] text-muted-foreground sm:text-[10px]">
                Stats joueurs
              </p>
            </div>
            {STAT_ROWS.map((stat) => (
              <div
                key={stat.key}
                className="flex h-9 w-full items-center justify-center border-t border-white/10 sm:h-10"
              >
                <span className="text-center text-[9px] font-medium uppercase tracking-wide text-muted-foreground sm:text-[10px]">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>

          <div
            className={cn(
              "flex justify-start gap-px rounded-sm bg-[linear-gradient(90deg,rgba(40,90,150,0.04),rgba(40,90,150,0.16))]",
            )}
          >
            {sapphireTeam.players.map((row) => (
              <PlayerColumn
                key={row.player.id}
                row={row}
                bests={bests}
                side={sapphireTeam.side}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function GameHeader({
  game,
  amberTeam,
  sapphireTeam,
  amberSouls,
  sapphireSouls,
}: {
  game: ShowmatchGameView;
  amberTeam: ShowmatchTeamView;
  sapphireTeam: ShowmatchTeamView;
  amberSouls: number | null;
  sapphireSouls: number | null;
}) {
  return (
    <header className="grid grid-cols-1 items-start gap-4 border-b border-[#2a3538] pb-3 sm:grid-cols-3 sm:items-center">
      <div className="flex flex-col gap-1.5 sm:items-start">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-colus text-xl uppercase tracking-wide text-[#e8a14a] sm:text-2xl">
            {amberTeam.name}
          </h3>
          {amberTeam.isWinner ? (
            <span className="rounded-sm bg-[#c9a24a]/20 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-[#f0d090]">
              Victoire
            </span>
          ) : null}
        </div>
        {amberSouls != null ? (
          <p className="text-sm tabular-nums text-[#e8a14a]/90">
            {formatSoulsCompact(amberSouls)} âmes
          </p>
        ) : null}
        <p className="text-[11px] text-muted-foreground">
          Capitaine : {amberTeam.captain.displayName}
        </p>
      </div>

      <div className="flex flex-col items-center gap-1 text-center">
        {game.sideMappingSource === "assumed" ? (
          <span
            className="text-[10px] font-medium uppercase tracking-wider text-[#c9a24a]/90"
            title="Côtés amber/sapphire estimés — aucun joueur Steam lié"
          >
            Côtés estimés
          </span>
        ) : null}
        {game.durationSeconds != null ? (
          <p className="font-colus text-2xl tabular-nums tracking-wide text-foreground/95">
            {formatMatchDuration(game.durationSeconds)}
          </p>
        ) : null}
        <p className="text-xs tabular-nums text-muted-foreground">
          {game.startedAt ? formatMatchDateTime(game.startedAt) : "—"}
        </p>
        {game.deadlockMatchId ? (
          <ShowmatchDemoMatchCode matchId={game.deadlockMatchId} />
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5 sm:items-end">
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {sapphireTeam.isWinner ? (
            <span className="rounded-sm bg-[#c9a24a]/20 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-[#f0d090]">
              Victoire
            </span>
          ) : null}
          <h3 className="font-colus text-xl uppercase tracking-wide text-[#6eb0e8] sm:text-2xl">
            {sapphireTeam.name}
          </h3>
        </div>
        {sapphireSouls != null ? (
          <p className="text-sm tabular-nums text-[#6eb0e8]/90 sm:text-right">
            {formatSoulsCompact(sapphireSouls)} âmes
          </p>
        ) : null}
        <p className="text-[11px] text-muted-foreground sm:text-right">
          Capitaine : {sapphireTeam.captain.displayName}
        </p>
      </div>
    </header>
  );
}
