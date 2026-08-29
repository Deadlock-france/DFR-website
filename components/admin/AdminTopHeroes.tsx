import AdminTopHeroesList from "@/components/admin/AdminTopHeroesList";
import { TOP_HEROES_PREVIEW, type HeroPick } from "@/lib/admin/stats";
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
  const items = picks.map((pick) => {
    const hero = resolveShowmatchHero(heroes, pick.heroId);
    return {
      heroId: pick.heroId,
      picks: pick.picks,
      name: hero.name,
      imageUrl: hero.imageUrl,
    };
  });

  return (
    <AdminTopHeroesList items={items} previewCount={TOP_HEROES_PREVIEW} />
  );
}
