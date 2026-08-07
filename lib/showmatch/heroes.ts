import { getDeadlockHeroes } from "@/lib/deadlock/client";
import type { DeadlockHero } from "@/lib/deadlock/types";

export type ShowmatchHeroMeta = {
  name: string;
  imageUrl: string;
};

const FALLBACK: ShowmatchHeroMeta = {
  name: "Héros",
  imageUrl: "",
};

function heroImage(hero: DeadlockHero): string {
  return (
    hero.images.icon_hero_card_webp ??
    hero.images.icon_hero_card ??
    hero.images.icon_image_small_webp ??
    hero.images.icon_image_small ??
    ""
  );
}

/** Map hero_id → nom / image (API Deadlock, cache Next). */
export async function getShowmatchHeroMap(): Promise<
  ReadonlyMap<number, ShowmatchHeroMeta>
> {
  try {
    const heroes = await getDeadlockHeroes();
    const map = new Map<number, ShowmatchHeroMeta>();
    for (const hero of heroes) {
      map.set(hero.id, {
        name: hero.name,
        imageUrl: heroImage(hero),
      });
    }
    return map;
  } catch {
    return new Map();
  }
}

export function resolveShowmatchHero(
  map: ReadonlyMap<number, ShowmatchHeroMeta>,
  heroId: number,
): ShowmatchHeroMeta {
  return map.get(heroId) ?? { ...FALLBACK, name: `Héros #${heroId}` };
}
