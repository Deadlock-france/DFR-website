import { isExcludedReferenceName } from "./exclusions";
import {
  getReferenceMatchTerms,
  normalizeReferenceName,
  sortReferencesByMatchTermLength,
} from "./references";
import { unescapeSteamBrackets } from "@/lib/steam/text";
import type { DeadlockReference } from "./types";
import { referenceKey } from "./link-content";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isWordChar(char: string): boolean {
  return /[\p{L}\p{N}]/u.test(char);
}

function buildSubjectLookup(
  references: DeadlockReference[],
): Map<string, DeadlockReference> {
  const lookup = new Map<string, DeadlockReference>();

  for (const reference of references) {
    if (reference.kind !== "hero" && reference.kind !== "item") {
      continue;
    }

    if (!reference.image) {
      continue;
    }

    for (const term of getReferenceMatchTerms(reference)) {
      const key = normalizeReferenceName(term);
      if (!key || lookup.has(key) || isExcludedReferenceName(term)) {
        continue;
      }

      lookup.set(key, reference);
    }
  }

  return lookup;
}

function buildSubjectPattern(references: DeadlockReference[]): RegExp | null {
  const terms = [
    ...new Set(
      sortReferencesByMatchTermLength(references)
        .filter((reference) => reference.kind === "hero" || reference.kind === "item")
        .filter((reference) => Boolean(reference.image))
        .flatMap(getReferenceMatchTerms)
        .map((term) => term.replace(/\u00a0/g, " "))
        .filter((term) => term && !isExcludedReferenceName(term)),
    ),
  ]
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp);

  if (terms.length === 0) {
    return null;
  }

  return new RegExp(terms.join("|"), "gi");
}

function splitPatchLines(content: string): string[] {
  return unescapeSteamBrackets(content)
    .replace(/\[\/?p\]/gi, "\n")
    .replace(/\[\/?(?:b|i|u|h[1-4]|list|\*)\]/gi, "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function resolveLineSubject(
  line: string,
  lookup: Map<string, DeadlockReference>,
  pattern: RegExp,
): DeadlockReference | undefined {
  const trimmed = line.replace(/^[-–•*·.]\s*/, "").trim();
  if (!trimmed) {
    return undefined;
  }

  // VF : [Alphonse/Doorman] …
  const bracket = trimmed.match(/^\[([^\]/]+)\/([^\]]+)\]/);
  if (bracket) {
    return (
      lookup.get(normalizeReferenceName(bracket[1])) ??
      lookup.get(normalizeReferenceName(bracket[2]))
    );
  }

  // VO / générique : Name: change…
  const colon = trimmed.match(/^([^:]{1,80}?)\s*:/);
  const head = colon?.[1]?.trim() ?? trimmed;
  if (!head || head.length > 80) {
    return undefined;
  }

  // Ne garder que les lignes qui ressemblent à un sujet de changelog.
  const looksLikeChange =
    Boolean(bracket) ||
    Boolean(colon) ||
    /^[-–•*·.]/.test(line);

  if (!looksLikeChange && !colon) {
    return undefined;
  }

  pattern.lastIndex = 0;
  for (const match of head.matchAll(pattern)) {
    const matchedText = match[0];
    const start = match.index ?? 0;
    const end = start + matchedText.length;
    const before = start > 0 ? head[start - 1] : "";
    const after = end < head.length ? head[end] : "";

    if (isWordChar(before) || isWordChar(after)) {
      continue;
    }

    // Le sujet doit être en tête de ligne (éventuellement après un tiret).
    if (start > 0) {
      continue;
    }

    return lookup.get(normalizeReferenceName(matchedText));
  }

  return undefined;
}

export const PATCH_SUBJECT_AVATAR_LIMIT = 5;

/**
 * Héros / objets cités comme sujets de changelog dans un patch note,
 * dans l'ordre d'apparition (sans doublon).
 */
export function extractChangedReferences(
  content: string,
  references: DeadlockReference[],
): DeadlockReference[] {
  if (!content || references.length === 0) {
    return [];
  }

  const lookup = buildSubjectLookup(references);
  const pattern = buildSubjectPattern(references);
  if (!pattern || lookup.size === 0) {
    return [];
  }

  const seen = new Set<string>();
  const found: DeadlockReference[] = [];

  for (const line of splitPatchLines(content)) {
    const subject = resolveLineSubject(line, lookup, pattern);
    if (!subject) {
      continue;
    }

    const key = referenceKey(subject);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    found.push(subject);
  }

  return found;
}

/**
 * Prefère la VO Steam (`original`) : les noms de héros y sont stables
 * (Apollo, Graves…), alors que la VF peut les traduire (Apollon, Morella)
 * ou les déformer via DeepL.
 */
export function extractChangedReferencesFromItem(
  item: {
    contents: string;
    original?: { contents?: string };
  },
  references: DeadlockReference[],
): DeadlockReference[] {
  const sources = [item.original?.contents, item.contents].filter(
    (value): value is string => Boolean(value?.trim()),
  );

  if (sources.length === 0) {
    return [];
  }

  const seen = new Set<string>();
  const found: DeadlockReference[] = [];

  for (const source of sources) {
    for (const reference of extractChangedReferences(source, references)) {
      const key = referenceKey(reference);
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      found.push(reference);
    }
  }

  return found;
}

export type PatchSubjectAvatarBorder = {
  borderColor: string;
};

export function getPatchSubjectBorderColor(
  reference: DeadlockReference,
): string {
  if (reference.kind === "hero") {
    return "#4A9B7F";
  }

  switch (reference.itemSlotType) {
    case "weapon":
      return "#C4A35A";
    case "vitality":
      return "#5A9E6F";
    case "spirit":
      return "#8B7AC7";
    default:
      return "#6B8CAE";
  }
}
