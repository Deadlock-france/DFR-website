"use client";

import { useEffect, useState } from "react";

import FadeIn from "@/components/motion/FadeIn";
import { buttonVariants } from "@/components/shadcn/button";
import { createTeamAction } from "@/app/equipes/nouvelle/actions";
import { cn } from "@/lib/utils";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_input: "Nom (2–40 caractères) ou tag (2–5 lettres/chiffres) invalide.",
  "invalid team name": "Nom d'équipe invalide.",
  "invalid team tag": "Tag invalide (2 à 5 lettres ou chiffres).",
  "profile missing": "Profil introuvable — reconnecte-toi via Discord.",
};

export default function NouvelleEquipeForm() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const error = new URLSearchParams(window.location.search).get("error");
    if (!error) return;
    setErrorMessage(ERROR_MESSAGES[error] ?? "Impossible de créer l'équipe.");
  }, []);

  return (
    <>
      {errorMessage ? (
        <p
          className="mt-6 rounded-xl border px-3 py-2 text-sm text-destructive"
          style={{ borderColor: "rgba(234, 60, 63, 0.35)" }}
        >
          {errorMessage}
        </p>
      ) : null}

      <FadeIn delay={0.08} className="mt-8">
        <form action={createTeamAction} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label htmlFor="name" className="text-sm font-medium">
              Nom de l&apos;équipe
            </label>
            <input
              id="name"
              name="name"
              required
              minLength={2}
              maxLength={40}
              placeholder="Les Ombres de New York"
              className="h-11 rounded-xl border bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              style={{ borderColor: "#1f2937" }}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="tag" className="text-sm font-medium">
              Tag d&apos;équipe (2–5 caractères)
            </label>
            <input
              id="tag"
              name="tag"
              required
              minLength={2}
              maxLength={5}
              placeholder="OMBR"
              className="h-11 rounded-xl border bg-transparent px-3 text-sm uppercase outline-none focus-visible:ring-2 focus-visible:ring-ring"
              style={{ borderColor: "#1f2937" }}
            />
            <p className="text-xs text-muted-foreground">
              Affiché entre crochets, ex. [OMBR]. Lettres et chiffres uniquement.
            </p>
          </div>

          <button
            type="submit"
            className={cn(
              buttonVariants({ size: "lg" }),
              "mt-2 border-0 font-semibold text-white",
            )}
            style={{ backgroundColor: "#4A9B7F" }}
          >
            Créer l&apos;équipe
          </button>
        </form>
      </FadeIn>
    </>
  );
}
