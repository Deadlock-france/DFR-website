"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { cn } from "@/lib/utils";

/** Affiche le code match Deadlock (démos / replay in-game) avec copie. */
export default function ShowmatchDemoMatchCode({
  matchId,
  className,
}: {
  matchId: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(matchId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard indisponible — le code reste visible
    }
  }

  return (
    <div
      className={cn(
        "mt-1.5 flex flex-wrap items-center justify-center gap-1.5",
        className,
      )}
    >
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        Code démo
      </span>
      <button
        type="button"
        onClick={handleCopy}
        title="Copier le code match"
        className={cn(
          "inline-flex items-center gap-1.5 border border-[#2a3538] bg-[#12181a] px-2 py-0.5",
          "font-mono text-[11px] tabular-nums text-[#c9a24a]",
          "transition-colors hover:border-[#c9a24a]/50 hover:bg-[#1a2428]",
        )}
      >
        {matchId}
        {copied ? (
          <Check size={12} className="text-[#58a484]" aria-hidden />
        ) : (
          <Copy size={12} className="opacity-70" aria-hidden />
        )}
        <span className="sr-only">
          {copied ? "Code copié" : "Copier le code match"}
        </span>
      </button>
    </div>
  );
}
