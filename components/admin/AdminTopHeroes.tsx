import type { HeroPick } from "@/lib/admin/stats";
import { getShowmatchHeroMap, resolveShowmatchHero } from "@/lib/showmatch/heroes";

/** Héros les plus joués en showmatch (noms/images depuis l’API Deadlock). */
export default async function AdminTopHeroes({ picks }: { picks: HeroPick[] }) {
  if (picks.length === 0) {
    return (
      <p className="mt-3 text-sm text-muted-foreground">
        Aucune game enregistrée pour le moment.
      </p>
    );
  }

  const heroes = await getShowmatchHeroMap();
  const peak = picks[0]?.picks ?? 0;

  return (
    <ul className="mt-4 flex flex-col gap-3">
      {picks.map((pick) => {
        const hero = resolveShowmatchHero(heroes, pick.heroId);
        const ratio = peak > 0 ? Math.max(pick.picks / peak, 0.08) : 0;

        return (
          <li key={pick.heroId} className="flex items-center gap-3">
            <span className="size-8 shrink-0 overflow-hidden rounded-md bg-muted">
              {hero.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={hero.imageUrl}
                  alt=""
                  width={32}
                  height={32}
                  className="size-8 object-cover"
                  loading="lazy"
                  decoding="async"
                />
              ) : null}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm text-foreground">
                  {hero.name}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {pick.picks} pick{pick.picks === 1 ? "" : "s"}
                </span>
              </span>
              <span className="mt-1.5 block h-1.5 w-full overflow-hidden rounded-full bg-border">
                <span
                  className="block h-full rounded-full bg-primary/70"
                  style={{ width: `${ratio * 100}%` }}
                />
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
