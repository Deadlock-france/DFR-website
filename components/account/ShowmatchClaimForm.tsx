"use client";

import { useState } from "react";

import { claimShowmatchNicknameAction } from "@/app/profil/actions";
import { buttonVariants } from "@/components/shadcn/button";
import { cn } from "@/lib/utils";

export default function ShowmatchClaimForm({
  currentNickname = "",
}: {
  currentNickname?: string;
}) {
  const [pending, setPending] = useState(false);

  return (
    <form
      action={claimShowmatchNicknameAction}
      onSubmit={() => setPending(true)}
      className="mt-3 flex flex-col gap-2"
    >
      <label htmlFor="showmatch_nickname" className="text-sm font-medium">
        Pseudo showmatch (bot)
      </label>
      <p className="text-xs text-muted-foreground">
        Le bot enregistre ton pseudo en jeu (ex.{" "}
        <span className="text-foreground">Mizara34)</span>), pas ton handle Discord.
      </p>
      <input
        id="showmatch_nickname"
        name="showmatch_nickname"
        defaultValue={currentNickname}
        maxLength={64}
        required
        minLength={2}
        placeholder="Mizara34"
        autoComplete="off"
        className="h-10 rounded-xl border border-border bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <button
        type="submit"
        disabled={pending}
        className={cn(
          buttonVariants({ size: "lg" }),
          "h-11 w-fit border-0 font-semibold disabled:opacity-60",
        )}
      >
        {pending ? "Rattachement…" : "Rattacher mon historique"}
      </button>
    </form>
  );
}
