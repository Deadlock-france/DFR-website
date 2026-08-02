import {
  DEADLOCK_LANG_ENGLISH,
  DEADLOCK_LANG_FRENCH,
  type DeadlockLanguage,
} from "./types";

/**
 * Langue des noms à reconnaître dans les patch notes.
 * - `french` : patch notes traduites (défaut pour Deadlock France)
 * - `english` : patch notes en VO Steam
 */
export const DEADLOCK_REFERENCE_LANGUAGE: DeadlockLanguage = DEADLOCK_LANG_FRENCH;

export function getDeadlockIoLocale(
  language: DeadlockLanguage = DEADLOCK_REFERENCE_LANGUAGE,
): "fr" | "en" {
  return language === DEADLOCK_LANG_ENGLISH ? "en" : "fr";
}

export function getDeadlockIoBaseUrl(
  language: DeadlockLanguage = DEADLOCK_REFERENCE_LANGUAGE,
): string {
  return `https://deadlock.io/${getDeadlockIoLocale(language)}`;
}
