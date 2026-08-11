import AppLink from "@/components/AppLink";
import ShowmatchClaimForm from "@/components/account/ShowmatchClaimForm";
import type { ShowmatchHistoryEntry } from "@/lib/account/types";
import { formatMatchDateTime, formatMatchDuration } from "@/lib/showmatch/format";
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
};

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

  return (
    <div>
      <h2 className="mb-1 font-colus text-2xl tracking-[-0.02em]">
        Historique showmatch
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Parties rattachées à ton compte. Handle Discord et pseudo bot peuvent
        différer.
      </p>

      {claimOk ? (
        <p
          className="mb-4 rounded-2xl border px-4 py-3 text-sm text-[#6BB89A]"
          style={{
            borderColor: "rgba(74, 155, 127, 0.45)",
            backgroundColor: "rgba(74, 155, 127, 0.08)",
          }}
        >
          Historique rattaché
          {showmatchNickname ? ` sous « ${showmatchNickname} »` : ""}.
        </p>
      ) : null}

      {errorMessage ? (
        <p
          className="mb-4 rounded-2xl border px-4 py-3 text-sm text-[#e8a14a]"
          style={{
            borderColor: "rgba(232, 161, 74, 0.4)",
            backgroundColor: "rgba(232, 161, 74, 0.08)",
          }}
        >
          {errorMessage}
        </p>
      ) : null}

      {entries.length === 0 ? (
        <div
          className="rounded-2xl border px-4 py-5"
          style={{ borderColor: "#1f2937" }}
        >
          <p className="text-sm text-muted-foreground">
            Aucun match rattaché. Si tu as joué sous un autre pseudo que ton
            handle Discord, indique le pseudo utilisé par le bot ci-dessous.
          </p>
          <ShowmatchClaimForm currentNickname={showmatchNickname} />
        </div>
      ) : (
        <>
          {showmatchNickname ? (
            <p className="mb-3 text-xs text-muted-foreground">
              Pseudo bot :{" "}
              <span className="text-foreground">{showmatchNickname}</span>
            </p>
          ) : null}
          <ul className="flex flex-col gap-2">
            {entries.map((entry) => {
              const when =
                entry.startedAt ?? entry.scheduledAt
                  ? formatMatchDateTime(
                      (entry.startedAt ?? entry.scheduledAt) as string,
                    )
                  : null;
              const sideColor =
                entry.teamSide === "sapphire"
                  ? "text-[#7ec0f0]"
                  : entry.teamSide === "amber"
                    ? "text-[#f0b35a]"
                    : "text-foreground";

              return (
                <li key={entry.participantId}>
                  <AppLink
                    href={`/showmatch/${entry.seriesId}`}
                    className={cn(
                      "flex flex-col gap-2 rounded-2xl border px-4 py-3 no-underline transition-[background-color,border-color]",
                      "hover:bg-white/3",
                    )}
                    style={{ borderColor: "#1f2937" }}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {entry.eventTitle ?? "Showmatch"}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {when ? `${when} · ` : ""}
                          {entry.lobbyNumber != null
                            ? `Lobby ${entry.lobbyNumber} · `
                            : ""}
                          Game {entry.gameNumber}
                          {entry.durationSeconds != null
                            ? ` · ${formatMatchDuration(entry.durationSeconds)}`
                            : ""}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-md px-2 py-1 text-xs font-semibold",
                          entry.won === true
                            ? "text-[#6BB89A]"
                            : entry.won === false
                              ? "text-muted-foreground"
                              : "text-muted-foreground",
                        )}
                        style={{
                          backgroundColor:
                            entry.won === true
                              ? "rgba(74, 155, 127, 0.15)"
                              : "rgba(255,255,255,0.04)",
                        }}
                      >
                        {entry.won === true
                          ? "Victoire"
                          : entry.won === false
                            ? "Défaite"
                            : "—"}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {entry.heroImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={entry.heroImageUrl}
                          alt=""
                          className="size-9 rounded-lg object-cover"
                        />
                      ) : (
                        <div
                          className="size-9 rounded-lg"
                          style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-foreground">
                          <span className={sideColor}>{entry.teamName}</span>
                          {" · "}
                          {entry.heroName ?? `Héros #${entry.heroId}`}
                          {entry.isMvp ? (
                            <span className="ml-2 text-xs font-semibold text-[#e8a14a]">
                              MVP
                            </span>
                          ) : null}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {entry.kills}/{entry.deaths}/{entry.assists}
                          {" · "}
                          {Math.round(entry.netWorth / 100) / 10}k âmes
                        </p>
                      </div>
                    </div>
                  </AppLink>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
