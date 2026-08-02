import {
  countAbilityNames,
  isExcludedReferenceName,
  isLinkableAbilityName,
} from "./exclusions";
import type {
  DeadlockHero,
  DeadlockItem,
  DeadlockReference,
  DeadlockReferenceIndex,
} from "./types";

/** Capacités génériques exclues de l'index (même filtre que l'API by-hero-id). */
export const GENERIC_ABILITY_CLASS_NAMES = new Set([
  "citadel_ability_climb_rope",
  "citadel_ability_dash",
  "citadel_ability_sprint",
  "citadel_ability_melee_parry",
  "citadel_ability_jump",
  "citadel_ability_mantle",
  "citadel_ability_slide",
  "citadel_ability_zip_line",
  "citadel_ability_zipline_boost",
]);

export function normalizeReferenceName(name: string): string {
  return name
    .normalize("NFC")
    .replace(/\u00a0/g, " ")
    .trim()
    .toLocaleLowerCase("fr-FR");
}

/**
 * Variantes de nom rencontrées dans les patch notes / traductions.
 * Clé = nom normalisé OU class_name Deadlock.
 */
const REFERENCE_MATCH_ALIASES: Readonly<Record<string, readonly string[]>> = {
  doorman: ["The Doorman", "Doorman"],
  hero_doorman: ["The Doorman", "Doorman"],
  alphonse: ["The Doorman", "Doorman"],
};

export function getReferenceMatchTerms(reference: DeadlockReference): string[] {
  const aliases = [
    ...(reference.aliases ?? []),
    ...(REFERENCE_MATCH_ALIASES[normalizeReferenceName(reference.name)] ?? []),
    ...(REFERENCE_MATCH_ALIASES[reference.className] ?? []),
  ];

  return [...new Set([reference.name, ...aliases])];
}

function heroToReference(hero: DeadlockHero): DeadlockReference {
  return {
    kind: "hero",
    id: hero.id,
    className: hero.class_name,
    name: hero.name,
    image:
      hero.images.icon_image_small_webp ??
      hero.images.icon_image_small ??
      hero.images.icon_hero_card_webp ??
      hero.images.icon_hero_card,
    role: hero.description.role,
  };
}

function shopItemToReference(item: DeadlockItem): DeadlockReference {
  return {
    kind: "item",
    id: item.id,
    className: item.class_name,
    name: item.name,
    image: item.shop_image_webp ?? item.shop_image ?? item.image_webp ?? item.image,
    cost: item.cost,
    itemTier: item.item_tier,
    itemSlotType: item.item_slot_type,
  };
}

function abilityToReference(item: DeadlockItem): DeadlockReference {
  return {
    kind: "ability",
    id: item.id,
    className: item.class_name,
    name: item.name,
    image: item.image_webp ?? item.image,
    heroId: item.heroes[0],
  };
}

export function isShopItem(item: DeadlockItem): boolean {
  return item.type === "upgrade" && item.shopable === true;
}

export function isHeroAbility(item: DeadlockItem): boolean {
  return (
    item.type === "ability" &&
    item.heroes.length > 0 &&
    !GENERIC_ABILITY_CLASS_NAMES.has(item.class_name) &&
    item.name !== item.class_name &&
    !isExcludedReferenceName(item.name)
  );
}

function isLinkableShopItem(item: DeadlockItem): boolean {
  return isShopItem(item) && !isExcludedReferenceName(item.name);
}

function isLinkableHero(hero: DeadlockHero): boolean {
  return !isExcludedReferenceName(hero.name);
}

/** Trie du nom le plus long au plus court pour éviter les correspondances partielles. */
export function sortReferencesByNameLength(
  references: DeadlockReference[],
): DeadlockReference[] {
  return [...references].sort((a, b) => b.name.length - a.name.length);
}

export function sortReferencesByMatchTermLength(
  references: DeadlockReference[],
): DeadlockReference[] {
  return sortReferencesByNameLength(references);
}

export function finalizeReferenceIndex(
  references: DeadlockReference[],
): DeadlockReferenceIndex {
  const byNormalizedName = new Map<string, DeadlockReference>();

  for (const reference of references) {
    const key = normalizeReferenceName(reference.name);
    if (!key || byNormalizedName.has(key)) continue;
    byNormalizedName.set(key, reference);
  }

  return {
    references: sortReferencesByNameLength(references),
    byNormalizedName,
  };
}

export function buildDeadlockReferenceIndex(
  heroes: DeadlockHero[],
  items: DeadlockItem[],
): DeadlockReferenceIndex {
  const abilityNameCounts = countAbilityNames(items);

  const references: DeadlockReference[] = [
    ...heroes.filter(isLinkableHero).map(heroToReference),
    ...items.filter(isLinkableShopItem).map(shopItemToReference),
    ...items
      .filter(isHeroAbility)
      .filter((item) => isLinkableAbilityName(item.name, abilityNameCounts))
      .map(abilityToReference),
  ];

  return finalizeReferenceIndex(references);
}
