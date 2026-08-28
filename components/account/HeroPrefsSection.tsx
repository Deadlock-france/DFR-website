"use client";

import { useEffect, useState } from "react";
import { Pencil, X } from "lucide-react";

import HeroPrefsForm from "@/components/account/HeroPrefsForm";
import { buttonVariants } from "@/components/shadcn/button";
import type { ProfileHeroPref } from "@/lib/account/types";
import type { DeadlockHero } from "@/lib/deadlock/types";
import { cn } from "@/lib/utils";

type HeroPreview = Pick<DeadlockHero, "id" | "name" | "images">;

function heroImage(hero: HeroPreview | undefined): string | null {
  if (!hero) return null;
  return (
    hero.images.icon_hero_card_webp ||
    hero.images.icon_hero_card ||
    hero.images.icon_image_small_webp ||
    hero.images.icon_image_small ||
    null
  );
}

function HeroLoadout({
  heroes,
  prefs,
}: {
  heroes: HeroPreview[];
  prefs: ProfileHeroPref[];
}) {
  const byId = new Map(heroes.map((h) => [h.id, h]));
  const slots = ([1, 2, 3] as const).map((priority) => {
    const pref = prefs.find((p) => p.priority === priority);
    const hero = pref ? byId.get(pref.hero_id) : undefined;
    return { priority, hero };
  });

  return (
    <ul className="flex flex-wrap justify-start gap-3">
      {slots.map(({ priority, hero }) => {
        const image = heroImage(hero);
        return (
          <li
            key={priority}
            className="flex w-17 shrink-0 flex-col items-start gap-1.5"
          >
            <div className="relative h-22 w-full overflow-hidden rounded-lg border border-border bg-muted">
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={image}
                  alt={hero?.name ?? ""}
                  className="size-full object-cover"
                />
              ) : null}
              <span className="absolute top-0.5 left-0.5 flex size-4 items-center justify-center rounded bg-primary text-[9px] font-bold text-primary-foreground">
                {priority}
              </span>
            </div>
            <p className="w-full text-left text-xs leading-tight font-medium">
              {hero?.name ?? (
                <span className="text-muted-foreground">Non choisi</span>
              )}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

export default function HeroPrefsSection({
  heroes,
  prefs,
}: {
  heroes: HeroPreview[];
  prefs: ProfileHeroPref[];
}) {
  const [editing, setEditing] = useState(false);
  const [catalog, setCatalog] = useState<DeadlockHero[] | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!editing || catalog) return;

    const controller = new AbortController();
    setCatalogLoading(true);
    setCatalogError(false);

    void fetch("/api/deadlock/heroes", {
      credentials: "same-origin",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("heroes_fetch_failed");
        const data = (await response.json()) as { heroes: DeadlockHero[] };
        setCatalog(data.heroes ?? []);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setCatalogError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setCatalogLoading(false);
      });

    return () => controller.abort();
  }, [editing, catalog, retryCount]);

  return (
    <section className="rounded-2xl border border-border bg-card px-4 py-4 sm:px-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">
          Choisir les héros
        </h2>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setEditing((value) => !value);
              setDirty(false);
            }}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "h-11 rounded-xl px-3",
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
          {editing && catalog && !catalogLoading && !catalogError ? (
            <button
              type="submit"
              form="hero-prefs-form"
              disabled={!dirty}
              className={cn(
                buttonVariants({ size: "sm" }),
                "h-11 rounded-xl px-3 font-semibold",
              )}
            >
              Enregistrer
            </button>
          ) : null}
        </div>
      </div>

      <HeroLoadout heroes={heroes} prefs={prefs} />

      {editing ? (
        <div className="mt-3 border-t border-border pt-3">
          {catalogLoading ? (
            <p className="text-sm text-muted-foreground">
              Chargement des héros…
            </p>
          ) : catalogError || !catalog ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-destructive">
                Impossible de charger le catalogue des héros.
              </p>
              <button
                type="button"
                onClick={() => {
                  setCatalogError(false);
                  setRetryCount((count) => count + 1);
                }}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "h-11 w-fit rounded-xl",
                )}
              >
                Réessayer
              </button>
            </div>
          ) : (
            <HeroPrefsForm
              heroes={catalog}
              prefs={prefs}
              onDirtyChange={setDirty}
            />
          )}
        </div>
      ) : null}
    </section>
  );
}
