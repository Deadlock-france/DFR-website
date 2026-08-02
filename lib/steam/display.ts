import {
  DEADLOCK_LANG_ENGLISH,
  DEADLOCK_LANG_FRENCH,
  type DeadlockLanguage,
} from "@/lib/deadlock/types";
import type { SteamNewsItem } from "@/lib/steam/types";

export function getPatchNoteDisplay(
  item: SteamNewsItem,
  language: DeadlockLanguage,
): { title: string; contents: string } {
  if (language === DEADLOCK_LANG_ENGLISH && item.original) {
    return {
      title: item.original.title,
      contents: item.original.contents,
    };
  }

  return {
    title: item.title,
    contents: item.contents,
  };
}

export function hasPatchNoteOriginal(item: SteamNewsItem): boolean {
  return Boolean(item.original?.title && item.original?.contents);
}

export function isPatchNoteEnglishAvailable(item: SteamNewsItem): boolean {
  if (!hasPatchNoteOriginal(item)) {
    return false;
  }

  const french = getPatchNoteDisplay(item, DEADLOCK_LANG_FRENCH);
  const english = getPatchNoteDisplay(item, DEADLOCK_LANG_ENGLISH);

  return (
    french.title !== english.title || french.contents !== english.contents
  );
}
