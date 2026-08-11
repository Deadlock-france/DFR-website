"use client";

import { useState } from "react";
import { Pencil, X } from "lucide-react";

import HeroPrefsForm from "@/components/account/HeroPrefsForm";
import { buttonVariants } from "@/components/shadcn/button";
import type { DeadlockHero } from "@/lib/deadlock/types";
import type { ProfileHeroPref } from "@/lib/account/types";
import { cn } from "@/lib/utils";

function heroImage(hero: DeadlockHero | undefined): string | null {
  if (!hero) return null;
  return (
    hero.images.icon_hero_card_webp ||
    hero.images.icon_hero_card ||
    hero.images.icon_image_small_webp ||
    hero.images.icon_image_small ||
    null
  );
}

export default function HeroPrefsSection({
  heroes,
  prefs,
}: {
  heroes: DeadlockHero[];
  prefs: ProfileHeroPref[];
}) {
  const [editing, setEditing] = useState(false);

  const byId = new Map(heroes.map((h) => [h.id, h]));
  const slots = ([1, 2, 3] as const).map((priority) => {
    const pref = prefs.find((p) => p.priority === priority);
    const hero = pref ? byId.get(pref.hero_id) : undefined;
    return { priority, hero };
  });
  const hasAny = slots.some((s) => s.hero);

  return (
    <div
      className="rounded-2xl border p-6"
      style={{ borderColor: "#1f2937" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Héros préférés
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Tes 3 personnages par ordre de priorité.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "rounded-xl",
          )}
        >
          {editing ? (
            <>
              <X className="size-3.5" />
              Fermer
            </>
          ) : (
            <>
              <Pencil className="size-3.5" />
              Modifier
            </>
          )}
        </button>
      </div>

      {editing ? (
        <div className="mt-4">
          <HeroPrefsForm heroes={heroes} prefs={prefs} />
        </div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {slots.map(({ priority, hero }) => {
            const image = heroImage(hero);
            return (
              <div
                key={priority}
                className="flex items-center gap-3 rounded-xl border p-3"
                style={{ borderColor: "#1f2937" }}
              >
                <span
                  className="flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-semibold"
                  style={{
                    backgroundColor: "rgba(74, 155, 127, 0.15)",
                    color: "#6BB89A",
                  }}
                >
                  {priority}
                </span>
                <div
                  className="relative size-11 overflow-hidden rounded-lg"
                  style={{ backgroundColor: "rgba(255,255,255,0.04)" }}
                >
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={image}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : null}
                </div>
                <p className="min-w-0 truncate text-sm font-medium">
                  {hero?.name ?? (
                    <span className="text-muted-foreground">Non choisi</span>
                  )}
                </p>
              </div>
            );
          })}
          {!hasAny ? (
            <p className="sm:col-span-3 text-sm text-muted-foreground">
              Aucun héros sélectionné pour le moment.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
