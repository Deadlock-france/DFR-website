"use client";

import { useEffect, useState } from "react";

import { saveHeroPrefsAction } from "@/app/profil/player-actions";
import type { DeadlockHero } from "@/lib/deadlock/types";
import type { ProfileHeroPref } from "@/lib/account/types";
import { cn } from "@/lib/utils";

type Priority = 1 | 2 | 3;

function heroCardImage(hero: DeadlockHero | undefined): string | null {
  if (!hero) return null;
  return (
    hero.images.icon_hero_card_webp ||
    hero.images.icon_hero_card ||
    hero.images.icon_image_small_webp ||
    hero.images.icon_image_small ||
    null
  );
}

function heroIcon(hero: DeadlockHero): string | null {
  return (
    hero.images.icon_image_small_webp ||
    hero.images.icon_image_small ||
    hero.images.icon_hero_card_webp ||
    hero.images.icon_hero_card ||
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

function isSelectionDirty(
  selection: Record<Priority, number | null>,
  prefs: ProfileHeroPref[],
): boolean {
  const initial = initialSelection(prefs);
  return ([1, 2, 3] as const).some((priority) => selection[priority] !== initial[priority]);
}

export default function HeroPrefsForm({
  heroes,
  prefs,
  onDirtyChange,
}: {
  heroes: DeadlockHero[];
  prefs: ProfileHeroPref[];
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const selectable = heroes
    .filter((h) => h.player_selectable && !h.disabled)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));

  const byId = new Map(selectable.map((h) => [h.id, h]));

  const [selection, setSelection] = useState(initialSelection(prefs));
  const [activeSlot, setActiveSlot] = useState<Priority>(1);

  useEffect(() => {
    onDirtyChange?.(isSelectionDirty(selection, prefs));
  }, [selection, prefs, onDirtyChange]);

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
    <form
      id="hero-prefs-form"
      action={saveHeroPrefsAction}
      className="flex flex-col gap-4"
    >
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
          const image = heroCardImage(hero);
          const active = activeSlot === priority;

          return (
            <div
              key={priority}
              className={cn(
                "flex items-center gap-3 rounded-xl border border-border p-3 transition-[border-color,background-color]",
                active && "border-primary/55 bg-primary/10 ring-2 ring-primary/50",
              )}
            >
              <button
                type="button"
                onClick={() => setActiveSlot(priority)}
                className="flex min-h-11 min-w-0 flex-1 items-center gap-3 text-left"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-xs font-semibold text-primary">
                  {priority}
                </span>
                <div className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-muted">
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
                  className="flex size-11 shrink-0 items-center justify-center rounded-md text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
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
        <p className="mb-2 text-sm text-muted-foreground">
          Clique un héros pour l&apos;assigner à la{" "}
          <span className="text-foreground">priorité {activeSlot}</span>.
        </p>
        <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-7 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12">
          {selectable.map((hero) => {
            const image = heroIcon(hero);
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
                  "group relative flex flex-col items-center gap-1 rounded-lg border border-border p-1.5 transition-[border-color,background-color]",
                  "hover:border-primary/45 hover:bg-muted/40",
                  assignedPriority && "border-primary/50 bg-primary/10",
                  isActivePick && "ring-2 ring-primary/70",
                )}
                title={hero.name}
              >
                <div className="relative size-10 overflow-hidden rounded-md bg-muted sm:size-11">
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={image}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : null}
                  {assignedPriority ? (
                    <span className="absolute top-0.5 left-0.5 flex size-4 items-center justify-center rounded bg-primary text-[9px] font-bold text-primary-foreground">
                      {assignedPriority}
                    </span>
                  ) : null}
                </div>
                <p className="w-full truncate text-center text-[10px] leading-tight text-foreground">
                  {hero.name}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </form>
  );
}
