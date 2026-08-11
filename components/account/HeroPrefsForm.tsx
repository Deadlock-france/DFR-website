"use client";

import { useState } from "react";

import { saveHeroPrefsAction } from "@/app/profil/player-actions";
import { buttonVariants } from "@/components/shadcn/button";
import type { DeadlockHero } from "@/lib/deadlock/types";
import type { ProfileHeroPref } from "@/lib/account/types";
import { cn } from "@/lib/utils";

type Priority = 1 | 2 | 3;

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

function initialSelection(prefs: ProfileHeroPref[]): Record<Priority, number | null> {
  return {
    1: prefs.find((p) => p.priority === 1)?.hero_id ?? null,
    2: prefs.find((p) => p.priority === 2)?.hero_id ?? null,
    3: prefs.find((p) => p.priority === 3)?.hero_id ?? null,
  };
}

export default function HeroPrefsForm({
  heroes,
  prefs,
}: {
  heroes: DeadlockHero[];
  prefs: ProfileHeroPref[];
}) {
  const selectable = heroes
    .filter((h) => h.player_selectable && !h.disabled)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));

  const byId = new Map(selectable.map((h) => [h.id, h]));

  const [selection, setSelection] = useState(initialSelection(prefs));
  const [activeSlot, setActiveSlot] = useState<Priority>(1);

  function assignHero(heroId: number) {
    setSelection((prev) => {
      const next = { ...prev };
      for (const p of [1, 2, 3] as const) {
        if (next[p] === heroId && p !== activeSlot) {
          next[p] = null;
        }
      }
      next[activeSlot] = prev[activeSlot] === heroId ? null : heroId;
      return next;
    });
  }

  function clearSlot(priority: Priority) {
    setSelection((prev) => ({ ...prev, [priority]: null }));
    setActiveSlot(priority);
  }

  return (
    <form action={saveHeroPrefsAction} className="flex flex-col gap-5">
      {([1, 2, 3] as const).map((priority) => (
        <input
          key={priority}
          type="hidden"
          name={`hero_${priority}`}
          value={selection[priority] ?? ""}
        />
      ))}

      <div className="grid gap-3 sm:grid-cols-3">
        {([1, 2, 3] as const).map((priority) => {
          const hero = selection[priority]
            ? byId.get(selection[priority] as number)
            : undefined;
          const image = heroImage(hero);
          const active = activeSlot === priority;

          return (
            <div
              key={priority}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-3 transition-[border-color,background-color]",
                active && "ring-2 ring-[#4A9B7F]/60",
              )}
              style={{
                borderColor: active ? "rgba(74, 155, 127, 0.55)" : "#1f2937",
                backgroundColor: active
                  ? "rgba(74, 155, 127, 0.08)"
                  : undefined,
              }}
            >
              <button
                type="button"
                onClick={() => setActiveSlot(priority)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
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
                  className="relative size-12 shrink-0 overflow-hidden rounded-lg"
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
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {hero?.name ?? (
                      <span className="text-muted-foreground">Choisir…</span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Priorité {priority}
                  </p>
                </div>
              </button>
              {hero ? (
                <button
                  type="button"
                  onClick={() => clearSlot(priority)}
                  className="shrink-0 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-white/5 hover:text-foreground"
                  aria-label={`Retirer priorité ${priority}`}
                >
                  ×
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      <div>
        <p className="mb-3 text-sm text-muted-foreground">
          Clique un héros pour l&apos;assigner à la{" "}
          <span className="text-foreground">priorité {activeSlot}</span>.
        </p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {selectable.map((hero) => {
            const image = heroImage(hero);
            const assignedPriority = ([1, 2, 3] as const).find(
              (p) => selection[p] === hero.id,
            );
            const isActivePick = selection[activeSlot] === hero.id;

            return (
              <button
                key={hero.id}
                type="button"
                onClick={() => assignHero(hero.id)}
                className={cn(
                  "group relative flex flex-col overflow-hidden rounded-xl border text-left transition-[border-color,transform,background-color]",
                  "hover:bg-white/3 hover:border-[rgba(74,155,127,0.45)]",
                  isActivePick && "ring-2 ring-[#4A9B7F]/70",
                )}
                style={{
                  borderColor: assignedPriority
                    ? "rgba(74, 155, 127, 0.5)"
                    : "#1f2937",
                  backgroundColor: assignedPriority
                    ? "rgba(74, 155, 127, 0.08)"
                    : undefined,
                }}
                title={hero.name}
              >
                <div
                  className="relative aspect-4/5 w-full overflow-hidden"
                  style={{ backgroundColor: "rgba(255,255,255,0.04)" }}
                >
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={image}
                      alt=""
                      className="size-full object-cover transition-transform group-hover:scale-[1.03]"
                    />
                  ) : null}
                  {assignedPriority ? (
                    <span
                      className="absolute left-1.5 top-1.5 flex size-6 items-center justify-center rounded-md text-xs font-bold text-white"
                      style={{ backgroundColor: "#4A9B7F" }}
                    >
                      {assignedPriority}
                    </span>
                  ) : null}
                </div>
                <p className="truncate px-2 py-1.5 text-center text-xs font-medium text-foreground">
                  {hero.name}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="submit"
        className={cn(
          buttonVariants({ size: "lg" }),
          "w-fit border-0 font-semibold text-white",
        )}
        style={{ backgroundColor: "#4A9B7F" }}
      >
        Enregistrer les héros
      </button>
    </form>
  );
}
