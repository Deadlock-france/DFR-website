import AppLink from "@/components/AppLink";
import ShowmatchClaimForm from "@/components/account/ShowmatchClaimForm";
import { ACCOUNT_SHOWMATCH_NICKNAME_CLAIM_ENABLED } from "@/lib/account/features";
import type { ShowmatchHistoryEntry } from "@/lib/account/types";
import {
  formatMatchDateTime,
  formatMatchDuration,
  formatSoulsCompact,
} from "@/lib/showmatch/format";
import { cn } from "@/lib/utils";

const CLAIM_ERROR_MESSAGES: Record<string, string> = {
  nickname_not_found:
    "Aucun joueur showmatch non rattaché ne correspond à ce pseudo.",
  ambiguous_nickname:
    "Plusieurs joueurs correspondent — précise le pseudo exact (casse incluse).",
  nickname_already_claimed: "Ce pseudo showmatch est déjà rattaché à un autre compte.",
  missing_discord: "Connecte-toi avec Discord pour rattacher ton historique.",
  invalid_nickname: "Pseudo invalide (2 à 64 caractères).",
  claim_failed: "Le rattachement a échoué. Réessaie dans un instant.",
  claim_disabled:
    "Le rattachement par pseudo n’est plus disponible. Connecte-toi avec Discord.",
};

function sideClass(side: ShowmatchHistoryEntry["teamSide"]) {
  if (side === "sapphire") return "text-[#7ec0f0]";
  if (side === "amber") return "text-[#f0b35a]";
  return "text-foreground";
}

export default function ShowmatchHistorySection({
  entries,
  showmatchNickname = "",
  claimError,
  claimOk,
}: {
  entries: ShowmatchHistoryEntry[];
  showmatchNickname?: string;
  claimError?: string | null;
  claimOk?: boolean;
}) {
  const errorMessage = claimError
    ? (CLAIM_ERROR_MESSAGES[claimError] ?? "Impossible de rattacher ce pseudo.")
    : null;

  const wins = entries.filter((entry) => entry.won === true).length;
  const losses = entries.filter((entry) => entry.won === false).length;
  const hasRecord = wins + losses > 0;

  return (
    <section className="min-w-0">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-sm font-semibold text-foreground">
          Historique showmatch
        </h2>
        {entries.length > 0 ? (
          <p className="text-xs tabular-nums text-muted-foreground">
            {entries.length} game{entries.length > 1 ? "s" : ""}
            {hasRecord ? ` · ${wins}V ${losses}D` : ""}
            {showmatchNickname ? ` · ${showmatchNickname}` : ""}
          </p>
        ) : null}
      </div>

      {claimOk ? (
        <p className="mb-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-primary">
          Historique rattaché
          {showmatchNickname ? ` sous « ${showmatchNickname} »` : ""}.
        </p>
      ) : null}

      {errorMessage ? (
        <p className="mb-2 rounded-lg border border-[#e8a14a]/40 bg-[#e8a14a]/10 px-3 py-2 text-sm text-[#e8a14a]">
          {errorMessage}
        </p>
      ) : null}

      {entries.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card px-4 py-4">
          <p className="text-sm text-muted-foreground">
            Aucun match rattaché à ton Discord pour l’instant.
          </p>
          {ACCOUNT_SHOWMATCH_NICKNAME_CLAIM_ENABLED ? (
            <ShowmatchClaimForm currentNickname={showmatchNickname} />
          ) : null}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div
            className="hidden grid-cols-[2.75rem_minmax(0,1fr)_5.5rem_3.5rem_5rem] gap-3 border-b border-border px-4 py-2 text-[0.7rem] font-medium tracking-wide text-muted-foreground uppercase lg:grid"
            aria-hidden
          >
            <span />
            <span>Match</span>
            <span className="text-right">KDA</span>
            <span className="text-right">Âmes</span>
            <span className="text-right">Résultat</span>
          </div>
          <ul className="divide-y divide-border">
            {entries.map((entry) => {
              const when =
                entry.startedAt ?? entry.scheduledAt
                  ? formatMatchDateTime(
                      (entry.startedAt ?? entry.scheduledAt) as string,
                    )
                  : null;
              const meta = [
                when,
                entry.lobbyNumber != null ? `Lobby ${entry.lobbyNumber}` : null,
                `Game ${entry.gameNumber}`,
                entry.durationSeconds != null
                  ? formatMatchDuration(entry.durationSeconds)
                  : null,
              ]
                .filter(Boolean)
                .join(" · ");

              return (
                <li key={entry.participantId}>
                  <AppLink
                    href={`/showmatch/${entry.seriesId}`}
                    className={cn(
                      "grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 no-underline",
                      "lg:grid-cols-[2.75rem_minmax(0,1fr)_5.5rem_3.5rem_5rem]",
                      "transition-colors hover:bg-muted/50",
                    )}
                  >
                    {entry.heroImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={entry.heroImageUrl}
                        alt={entry.heroName ?? ""}
                        className="size-11 rounded-md object-cover"
                      />
                    ) : (
                      <div className="size-11 rounded-md bg-muted" />
                    )}

                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {entry.eventTitle ?? "Showmatch"}
                        {entry.isMvp ? (
                          <span className="ml-1.5 text-[0.65rem] font-semibold tracking-wide text-[#e8a14a] uppercase">
                            MVP
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        <span className={sideClass(entry.teamSide)}>
                          {entry.teamName}
                        </span>
                        {" · "}
                        {entry.heroName ?? `Héros #${entry.heroId}`}
                        <span className="lg:hidden">
                          {" · "}
                          {entry.kills}/{entry.deaths}/{entry.assists}
                          {" · "}
                          {formatSoulsCompact(entry.netWorth)}
                        </span>
                      </p>
                      {meta ? (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {meta}
                        </p>
                      ) : null}
                    </div>

                    <p className="hidden text-right text-sm tabular-nums text-foreground lg:block">
                      {entry.kills}/{entry.deaths}/{entry.assists}
                    </p>
                    <p className="hidden text-right text-sm tabular-nums text-muted-foreground lg:block">
                      {formatSoulsCompact(entry.netWorth)}
                    </p>

                    <span
                      className={cn(
                        "justify-self-end rounded-md px-2 py-1 text-xs font-semibold",
                        entry.won === true
                          ? "bg-primary/15 text-primary"
                          : entry.won === false
                            ? "bg-destructive/10 text-destructive"
                            : "bg-muted text-muted-foreground",
                      )}
                    >
                      {entry.won === true
                        ? "Victoire"
                        : entry.won === false
                          ? "Défaite"
                          : "—"}
                    </span>
                  </AppLink>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
