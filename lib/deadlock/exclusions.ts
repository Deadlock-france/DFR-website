import { DEADLOCK_REFERENCE_LANGUAGE } from "./config";
import { normalizeReferenceName } from "./references";
import type { DeadlockItem, DeadlockLanguage } from "./types";
import { DEADLOCK_LANG_ENGLISH, DEADLOCK_LANG_FRENCH } from "./types";

const EXCLUDED_REFERENCE_NAMES_BY_LANGUAGE: Record<
  DeadlockLanguage,
  readonly string[]
> = {
  [DEADLOCK_LANG_FRENCH]: [
    "Récupération",
    "Mêlée",
    "Attaque mêlée",
    "Attaque de mêlée",
    "Sauter",
    "Parade",
    "Envol",
    "S'élancer",
    "Tyrolienne",
  ],
  [DEADLOCK_LANG_ENGLISH]: [
    "Recovery",
    "Melee",
    "Melee Attack",
    "Jump",
    "Parry",
    "Leap",
    "Zip Line",
  ],
};

function getExcludedReferenceNames(
  language: DeadlockLanguage = DEADLOCK_REFERENCE_LANGUAGE,
): ReadonlySet<string> {
  return new Set(
    EXCLUDED_REFERENCE_NAMES_BY_LANGUAGE[language].map(normalizeReferenceName),
  );
}

export function isExcludedReferenceName(
  name: string,
  language: DeadlockLanguage = DEADLOCK_REFERENCE_LANGUAGE,
): boolean {
  const normalized = normalizeReferenceName(name);

  if (!normalized) {
    return true;
  }

  return getExcludedReferenceNames(language).has(normalized);
}

export function countAbilityNames(items: DeadlockItem[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const item of items) {
    if (item.type !== "ability" || item.heroes.length === 0) {
      continue;
    }

    const key = normalizeReferenceName(item.name);
    if (!key) {
      continue;
    }

    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return counts;
}

export function isLinkableAbilityName(
  name: string,
  abilityNameCounts: Map<string, number>,
  language: DeadlockLanguage = DEADLOCK_REFERENCE_LANGUAGE,
): boolean {
  const normalized = normalizeReferenceName(name);

  if (isExcludedReferenceName(name, language)) {
    return false;
  }

  if ((abilityNameCounts.get(normalized) ?? 0) > 1) {
    return false;
  }

  return true;
}
