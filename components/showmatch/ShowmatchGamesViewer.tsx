"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import GameMirrorScoreboard from "@/components/showmatch/GameMirrorScoreboard";
import type { ShowmatchGameView } from "@/lib/showmatch/types";
import { cn } from "@/lib/utils";

export default function ShowmatchGamesViewer({
  games,
}: {
  games: ShowmatchGameView[];
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeGame = games[activeIndex];
  const hasMultiple = games.length > 1;

  if (!activeGame) return null;

  return (
    <div className="flex flex-col gap-5">
      <nav
        className="flex flex-wrap items-center justify-center gap-2"
        aria-label="Navigation entre les games"
      >
        {hasMultiple ? (
          <button
            type="button"
            onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
            disabled={activeIndex === 0}
            className={cn(
              "inline-flex size-9 items-center justify-center border border-[#2a3538] text-muted-foreground transition-colors",
              "hover:border-[#3a4a4e] hover:text-foreground",
              "disabled:pointer-events-none disabled:opacity-30",
            )}
            aria-label="Game précédente"
          >
            <ChevronLeft size={18} />
          </button>
        ) : null}

        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {games.map((game, index) => {
            const isActive = index === activeIndex;
            return (
              <button
                key={game.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={cn(
                  "min-w-[4.5rem] px-3 py-1.5 font-colus text-sm uppercase tracking-wide transition-colors",
                  isActive
                    ? "bg-[#1a2428] text-foreground ring-1 ring-[#c9a24a]/55"
                    : "text-muted-foreground hover:bg-[#12181a] hover:text-foreground/90",
                )}
                aria-current={isActive ? "true" : undefined}
              >
                Game {game.gameNumber}
              </button>
            );
          })}
        </div>

        {hasMultiple ? (
          <button
            type="button"
            onClick={() =>
              setActiveIndex((i) => Math.min(games.length - 1, i + 1))
            }
            disabled={activeIndex === games.length - 1}
            className={cn(
              "inline-flex size-9 items-center justify-center border border-[#2a3538] text-muted-foreground transition-colors",
              "hover:border-[#3a4a4e] hover:text-foreground",
              "disabled:pointer-events-none disabled:opacity-30",
            )}
            aria-label="Game suivante"
          >
            <ChevronRight size={18} />
          </button>
        ) : null}
      </nav>

      <GameMirrorScoreboard key={activeGame.id} game={activeGame} />
    </div>
  );
}
