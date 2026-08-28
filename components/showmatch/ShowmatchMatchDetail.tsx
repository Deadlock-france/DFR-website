import RankBadge from "@/components/showmatch/RankBadge";
import ShowmatchGamesViewer from "@/components/showmatch/ShowmatchGamesViewer";
import ShowmatchStreamReplayLink from "@/components/showmatch/ShowmatchStreamReplayLink";
import type {
  ShowmatchEventView,
  ShowmatchSeriesView,
} from "@/lib/showmatch/types";
import { formatEventDate, formatMatchTime } from "@/lib/showmatch/format";

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
    <article className="flex w-full flex-col gap-8 px-4 pb-20 pt-2 sm:px-5 lg:px-8">
      <h1 className="sr-only">
        {teamA.name} vs {teamB.name} — {event.title}, lobby {series.lobbyNumber}
      </h1>

      <header className="border border-[#2a3538] bg-[#0c1214]">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-[#2a3538] px-4 py-3">
          <p className="min-w-0 text-sm text-muted-foreground">
            <span className="text-foreground/85">
              {formatEventDate(event.eventDate)}
            </span>
            <span className="mx-2 text-[#4a5a5e]" aria-hidden>
              ·
            </span>
            <span>Lobby {series.lobbyNumber}</span>
          </p>
          <p className="shrink-0 text-xs tabular-nums text-[#8a9b9f] md:pr-5">
            <time dateTime={event.scheduledAt}>
              {formatMatchTime(event.scheduledAt)}
            </time>
          </p>
        </div>

        <div className="px-4 py-6">
          <div className="relative mx-auto grid max-w-4xl grid-cols-3 items-center gap-2 sm:gap-4">
            {/* Équipe A */}
            <div className="flex min-w-0 flex-col items-end gap-2 pr-2 sm:pr-6">
              <p
                className={`font-colus text-right text-lg uppercase leading-tight tracking-wide sm:text-2xl ${colorA}`}
              >
                {teamA.name}
              </p>
              <RankBadge score={teamA.avgRank} size="md" className="text-sm" />
            </div>

            {/* Score centré */}
            <div className="flex flex-col items-center justify-center">
              <p className="font-colus text-4xl tabular-nums tracking-wide sm:text-5xl">
                <span className={colorA}>{scoreA}</span>
                <span className="mx-1.5 text-[#4a5a5e] sm:mx-2">-</span>
                <span className={colorB}>{scoreB}</span>
              </p>
            </div>

            {/* Équipe B */}
            <div className="flex min-w-0 flex-col items-start gap-2 pl-2 sm:pl-6">
              <p
                className={`font-colus text-left text-lg uppercase leading-tight tracking-wide sm:text-2xl ${colorB}`}
              >
                {teamB.name}
              </p>
              <RankBadge score={teamB.avgRank} size="md" className="text-sm" />
            </div>
          </div>

          {series.streamUrls[0] ? (
            <div className="flex justify-center">
              <ShowmatchStreamReplayLink href={series.streamUrls[0]} />
            </div>
          ) : null}
        </div>
      </header>

      {series.games.length === 0 ? (
        <section className="flex flex-col gap-4 border border-[#2a3538] bg-[#0c1214] px-4 py-5">
          <h2 className="font-colus text-lg uppercase tracking-wide">Rosters</h2>
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
        <ShowmatchGamesViewer games={series.games} />
      )}
    </article>
  );
}
