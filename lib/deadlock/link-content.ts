import { isExcludedReferenceName } from "./exclusions";
import {
  getReferenceMatchTerms,
  normalizeReferenceName,
  sortReferencesByMatchTermLength,
} from "./references";
import type { DeadlockLanguage, DeadlockReference } from "./types";
import { DEADLOCK_LANG_ENGLISH, DEADLOCK_LANG_FRENCH } from "./types";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function isWordChar(char: string): boolean {
  return /[\p{L}\p{N}]/u.test(char);
}

export function referenceKey(reference: DeadlockReference): string {
  return `${reference.kind}:${reference.id}`;
}

function renderReferenceMarkup(
  reference: DeadlockReference,
  matchedText: string,
): string {
  const label = escapeHtml(matchedText);
  const key = referenceKey(reference);
  const sharedAttrs = `data-deadlock-ref="${key}" class="deadlock-ref" tabindex="0"`;

  if (reference.url) {
    const safeUrl = escapeHtml(reference.url);

    return `<a href="${safeUrl}" data-deadlock-url="${safeUrl}" target="_blank" rel="noopener noreferrer" ${sharedAttrs}>${label}</a>`;
  }

  return `<span ${sharedAttrs}>${label}</span>`;
}

function buildReferencesByKey(
  references: DeadlockReference[],
): Map<string, DeadlockReference> {
  const map = new Map<string, DeadlockReference>();

  for (const reference of references) {
    map.set(referenceKey(reference), reference);
  }

  return map;
}

/**
 * Index du `:` séparant le sujet du changelog (hors attributs HTML type hero:11).
 */
function findSubjectColonIndex(html: string): number {
  let tagDepth = 0;

  for (let index = 0; index < html.length; index += 1) {
    const char = html[index];

    if (char === "<") {
      tagDepth += 1;
      continue;
    }

    if (char === ">") {
      tagDepth = Math.max(0, tagDepth - 1);
      continue;
    }

    if (tagDepth === 0 && char === ":") {
      return index;
    }
  }

  return -1;
}

/**
 * Sujet de la ligne de changelog uniquement (tête de ligne), pas un nom
 * cité plus loin dans la description (ex. « Melee Lifesteal » dans un buff Apollo).
 */
function pickChangeLineSubjectKey(segment: string): string | undefined {
  const trimmed = stripLeadingBullet(segment).trim();
  if (!trimmed) {
    return undefined;
  }

  const firstRefIn = (html: string): string | undefined => {
    const match = html.match(
      /data-deadlock-ref="((?:hero|item|ability):\d+)"/i,
    );
    return match?.[1];
  };

  // VF : [Alphonse/Doorman] …
  const bracketMatch = trimmed.match(BRACKET_DUAL_NAME_PATTERN);
  if (bracketMatch) {
    return firstRefIn(bracketMatch[0]);
  }

  const colonIndex = findSubjectColonIndex(trimmed);
  if (colonIndex !== -1) {
    return firstRefIn(trimmed.slice(0, colonIndex));
  }

  // Ligne qui n'est que le nom (éventuellement linké).
  return firstRefIn(trimmed) &&
    plainText(trimmed).length <= 80 &&
    !/[.!?…]/.test(plainText(trimmed))
    ? firstRefIn(trimmed)
    : undefined;
}

function plainText(segment: string): string {
  return segment.replace(/<[^>]+>/g, "").replace(/\u00a0/g, " ").trim();
}

function isChangeLikeLine(segment: string): boolean {
  const text = plainText(segment);
  if (!text) {
    return false;
  }

  return (
    /^[-–•*·.]/.test(text) ||
    /^\[[^\]]+\]/.test(text) ||
    /^[^:]{1,80}:\s/.test(text)
  );
}

function extractNameMarkup(segment: string, subjectKey: string): string | undefined {
  const pattern = new RegExp(
    `<(?:a|span)\\b[^>]*\\bdata-deadlock-ref="${escapeRegExp(subjectKey)}"[^>]*>[\\s\\S]*?</(?:a|span)>`,
    "i",
  );

  return segment.match(pattern)?.[0];
}

/**
 * Bloc VF Steam/DeepL : `[Alphonse/Doorman]` (noms éventuellement déjà linkés).
 */
const BRACKET_DUAL_NAME_PATTERN =
  /^\[\s*((?:<(?:a|span)\b[\s\S]*?<\/(?:a|span)>|[^\]/\s][^\]/]*?))\s*\/\s*((?:<(?:a|span)\b[\s\S]*?<\/(?:a|span)>|[^\]/\s][^\]/]*?))\s*\]\s*/i;

function extractBracketDualNames(
  segment: string,
): { french: string; english: string } | undefined {
  const match = stripLeadingBullet(segment).match(BRACKET_DUAL_NAME_PATTERN);
  if (!match) {
    return undefined;
  }

  const french = plainText(match[1]);
  const english = plainText(match[2]);
  if (!french || !english) {
    return undefined;
  }

  return { french, english };
}

/** Nom anglais entre parenthèses (variante plus rare) : `Nébula (Haze)`. */
function extractParentheticalLabel(segment: string): string | undefined {
  const afterLinkedName = segment.match(
    /<\/(?:a|span)>\s*\(\s*([\s\S]*?)\s*\)/i,
  );
  if (afterLinkedName) {
    const label = plainText(afterLinkedName[1]);
    if (label) {
      return label;
    }
  }

  const plain = plainText(segment);
  const match = plain.match(
    /^[-–•*·.]?\s*[^:(]{1,80}?\s*\(\s*([^)]+?)\s*\)/,
  );

  return match?.[1]?.trim() || undefined;
}

function stripLeadingBullet(segment: string): string {
  return segment.replace(/^\s*[-–•*·.]\s*/, "");
}

function stripSubjectPrefix(segment: string, subjectKey: string): string {
  let rest = stripLeadingBullet(segment);

  // `[Alphonse/Doorman] texte` → retire tout le bloc, pas seulement le premier nom.
  if (BRACKET_DUAL_NAME_PATTERN.test(rest)) {
    rest = rest.replace(BRACKET_DUAL_NAME_PATTERN, "");
    return stripLeadingBullet(rest).trim();
  }

  const nameMarkup = extractNameMarkup(segment, subjectKey);

  if (nameMarkup) {
    rest = rest.replace(
      new RegExp(`^\\s*\\[?\\s*${escapeRegExp(nameMarkup)}\\s*\\]?\\s*`, "i"),
      "",
    );
  } else {
    rest = rest
      .replace(/^\s*\[[^\]]+\]\s*/, "")
      .replace(/^[^:(]{1,80}?(?=\s*[\(:])/, "");
  }

  rest = rest.replace(
    /^\s*\(\s*(?:<(?:a|span)\b[\s\S]*?<\/(?:a|span)>|[^)]+?)\s*\)\s*/i,
    "",
  );
  // Reliquat fréquent si seul le nom FR a été retiré : `/Doorman]`
  rest = rest.replace(/^\/\s*(?:<(?:a|span)\b[\s\S]*?<\/(?:a|span)>|[^\]\s]+)\s*\]\s*/i, "");
  rest = rest.replace(/^\s*:?\s*/, "");
  rest = stripLeadingBullet(rest);

  return rest.trim();
}

function resolveEntityTitleMarkup(
  segment: string,
  subjectKey: string,
  reference: DeadlockReference | undefined,
  language: DeadlockLanguage,
): string {
  if (language === DEADLOCK_LANG_FRENCH) {
    const dual = extractBracketDualNames(segment);
    if (dual) {
      const label = `${dual.french} / ${dual.english}`;
      return reference
        ? renderReferenceMarkup(reference, label)
        : escapeHtml(label);
    }

    const parenLabel = extractParentheticalLabel(segment);
    if (parenLabel) {
      return reference
        ? renderReferenceMarkup(reference, parenLabel)
        : escapeHtml(parenLabel);
    }
  }

  const linkedName = extractNameMarkup(segment, subjectKey);
  if (linkedName) {
    return linkedName;
  }

  return escapeHtml(reference?.name ?? subjectKey);
}

function isSubjectOnlyLine(segment: string, subjectKey: string): boolean {
  return stripSubjectPrefix(segment, subjectKey) === "";
}

function getLineSubjectKey(segment: string): string | undefined {
  const key = pickChangeLineSubjectKey(segment);
  if (!key) {
    return undefined;
  }

  if (isChangeLikeLine(segment) || isSubjectOnlyLine(segment, key)) {
    return key;
  }

  return undefined;
}

function isEmptyLine(segment: string): boolean {
  return plainText(segment) === "";
}

type HtmlToken =
  | { kind: "line"; html: string; wrapper: "p" | "raw" }
  | { kind: "other"; html: string }
  | { kind: "break" };

function tokenizePatchHtml(html: string): HtmlToken[] {
  const tokens: HtmlToken[] = [];
  const splitter =
    /(<p>[\s\S]*?<\/p>|<br\s*\/?>|<h[1-4]\b[^>]*>[\s\S]*?<\/h[1-4]>|<figure\b[\s\S]*?<\/figure>|<ul\b[\s\S]*?<\/ul>|<ol\b[\s\S]*?<\/ol>)/gi;

  for (const part of html.split(splitter)) {
    if (!part) {
      continue;
    }

    if (/^<br\s*\/?>$/i.test(part)) {
      tokens.push({ kind: "break" });
      continue;
    }

    const paragraph = part.match(/^<p>([\s\S]*?)<\/p>$/i);
    if (paragraph) {
      // Défense si un <p> multi-lignes (<br>) n'a pas été re-découpé en amont.
      const lines = paragraph[1].split(/<br\s*\/?>/i);
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
        if (lineIndex > 0) {
          tokens.push({ kind: "break" });
        }
        tokens.push({ kind: "line", html: lines[lineIndex], wrapper: "p" });
      }
      continue;
    }

    if (/^<(?:h[1-4]|figure|ul|ol)\b/i.test(part)) {
      tokens.push({ kind: "other", html: part });
      continue;
    }

    tokens.push({ kind: "line", html: part, wrapper: "raw" });
  }

  return tokens;
}

function renderEntityGroup(
  subjectKey: string,
  nameMarkup: string,
  bodies: string[],
  reference: DeadlockReference | undefined,
): string {
  const image = reference?.image;
  const icon = image
    ? `<img class="patch-notes-entity-icon" src="${escapeHtml(image)}" alt="" loading="lazy" decoding="async" />`
    : "";

  const items = bodies
    .filter(Boolean)
    .map((body) => `<li>${body}</li>`)
    .join("");

  const list = items
    ? `<ul class="patch-notes-entity-list">${items}</ul>`
    : "";

  return `<section class="patch-notes-entity" data-deadlock-entity="${escapeHtml(subjectKey)}"><header class="patch-notes-entity-header">${icon}<div class="patch-notes-entity-title">${nameMarkup}</div></header>${list}</section>`;
}

function renderLineToken(token: Extract<HtmlToken, { kind: "line" }>): string {
  if (token.wrapper === "p") {
    if (isEmptyLine(token.html)) {
      return "";
    }

    return `<p>${token.html}</p>`;
  }

  return token.html;
}

/**
 * Regroupe les lignes consécutives d'un même héros/objet en sous-catégorie
 * visuelle (en-tête + liste), au lieu d'une simple liste à puces répétitive.
 */
export function decorateReferenceChangeLines(
  html: string,
  references: DeadlockReference[],
  language: DeadlockLanguage = DEADLOCK_LANG_FRENCH,
): string {
  if (!html || references.length === 0) {
    return html;
  }

  const referencesByKey = buildReferencesByKey(references);
  const tokens = tokenizePatchHtml(html);
  const output: string[] = [];

  for (let index = 0; index < tokens.length; ) {
    const token = tokens[index];

    if (token.kind !== "line") {
      if (token.kind === "break") {
        output.push("<br>");
      } else {
        output.push(token.html);
      }
      index += 1;
      continue;
    }

    if (isEmptyLine(token.html)) {
      index += 1;
      continue;
    }

    const subjectKey = getLineSubjectKey(token.html);
    if (!subjectKey) {
      output.push(renderLineToken(token));
      index += 1;
      continue;
    }

    const reference = referencesByKey.get(subjectKey);
    const nameMarkup = resolveEntityTitleMarkup(
      token.html,
      subjectKey,
      reference,
      language,
    );
    const bodies: string[] = [];

    while (index < tokens.length) {
      const current = tokens[index];

      if (current.kind === "break") {
        let lookAhead = index + 1;
        while (
          lookAhead < tokens.length &&
          tokens[lookAhead].kind === "line" &&
          isEmptyLine((tokens[lookAhead] as Extract<HtmlToken, { kind: "line" }>).html)
        ) {
          lookAhead += 1;
        }

        const next = tokens[lookAhead];
        if (
          next?.kind === "line" &&
          getLineSubjectKey(next.html) === subjectKey
        ) {
          index = lookAhead;
          continue;
        }

        break;
      }

      if (current.kind !== "line") {
        break;
      }

      if (isEmptyLine(current.html)) {
        let lookAhead = index + 1;
        while (
          lookAhead < tokens.length &&
          ((tokens[lookAhead].kind === "line" &&
            isEmptyLine(
              (tokens[lookAhead] as Extract<HtmlToken, { kind: "line" }>).html,
            )) ||
            tokens[lookAhead].kind === "break")
        ) {
          lookAhead += 1;
        }

        const next = tokens[lookAhead];
        if (
          next?.kind === "line" &&
          getLineSubjectKey(next.html) === subjectKey
        ) {
          index = lookAhead;
          continue;
        }

        break;
      }

      if (getLineSubjectKey(current.html) !== subjectKey) {
        break;
      }

      const body = stripSubjectPrefix(current.html, subjectKey);
      if (body) {
        bodies.push(body);
      }

      index += 1;
    }

    output.push(
      renderEntityGroup(subjectKey, nameMarkup, bodies, reference),
    );
  }

  return output.join("");
}

function buildReferenceCandidates(
  references: DeadlockReference[],
): Map<string, DeadlockReference[]> {
  const lookup = new Map<string, DeadlockReference[]>();

  for (const reference of references) {
    for (const term of getReferenceMatchTerms(reference)) {
      const key = normalizeReferenceName(term);

      if (!key || isExcludedReferenceName(term)) {
        continue;
      }

      const current = lookup.get(key) ?? [];
      if (
        !current.some(
          (entry) => referenceKey(entry) === referenceKey(reference),
        )
      ) {
        current.push(reference);
      }
      lookup.set(key, current);
    }
  }

  return lookup;
}

/**
 * Dans une ligne `Pocket: … Fléau …`, la compétence de Pocket prime sur l'item
 * homonyme. Hors contexte héros, l'item boutique reste prioritaire.
 */
function resolveReferenceCandidate(
  candidates: DeadlockReference[],
  preferredHeroId?: number,
): DeadlockReference | undefined {
  if (candidates.length === 0) {
    return undefined;
  }

  if (preferredHeroId != null) {
    const ownedAbility = candidates.find(
      (candidate) =>
        candidate.kind === "ability" && candidate.heroId === preferredHeroId,
    );
    if (ownedAbility) {
      return ownedAbility;
    }
  }

  return (
    candidates.find((candidate) => candidate.kind === "item") ??
    candidates.find((candidate) => candidate.kind === "hero") ??
    candidates.find((candidate) => candidate.kind === "ability") ??
    candidates[0]
  );
}

function detectPreferredHeroId(
  plainLine: string,
  candidates: Map<string, DeadlockReference[]>,
): number | undefined {
  const trimmed = plainLine.replace(/^[-–•*·.]\s*/, "").trim();
  if (!trimmed) {
    return undefined;
  }

  const names: string[] = [];

  // VF Steam : `[Pocket] …` ou `[Alphonse/Doorman] …`
  const bracket = trimmed.match(/^\[([^\]]+)\]/);
  if (bracket) {
    names.push(
      ...bracket[1]
        .split("/")
        .map((part) => part.trim())
        .filter(Boolean),
    );
  } else {
    const colonIndex = trimmed.indexOf(":");
    if (colonIndex > 0 && colonIndex <= 80) {
      names.push(
        trimmed
          .slice(0, colonIndex)
          .replace(/\([^)]*\)/g, "")
          .trim(),
      );
    }
  }

  for (const name of names) {
    if (!name) {
      continue;
    }

    const hero = candidates
      .get(normalizeReferenceName(name))
      ?.find((candidate) => candidate.kind === "hero");
    if (hero) {
      return hero.id;
    }
  }

  return undefined;
}

function buildReferencePattern(references: DeadlockReference[]): RegExp | null {
  const terms = [
    ...new Set(
      sortReferencesByMatchTermLength(references)
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

function linkTextSegment(
  text: string,
  pattern: RegExp,
  candidates: Map<string, DeadlockReference[]>,
  preferredHeroId?: number,
): string {
  if (!text) {
    return text;
  }

  let result = "";
  let lastIndex = 0;
  let hasMatch = false;

  for (const match of text.matchAll(pattern)) {
    const matchedText = match[0];
    const start = match.index ?? 0;
    const end = start + matchedText.length;
    const before = start > 0 ? text[start - 1] : "";
    const after = end < text.length ? text[end] : "";

    if (isWordChar(before) || isWordChar(after)) {
      continue;
    }

    const reference = resolveReferenceCandidate(
      candidates.get(normalizeReferenceName(matchedText)) ?? [],
      preferredHeroId,
    );
    if (!reference) {
      continue;
    }

    hasMatch = true;
    result += text.slice(lastIndex, start);
    result += renderReferenceMarkup(reference, matchedText);
    lastIndex = end;
  }

  if (!hasMatch) {
    return text;
  }

  result += text.slice(lastIndex);

  return result;
}

function linkHtmlFragment(
  html: string,
  pattern: RegExp,
  candidates: Map<string, DeadlockReference[]>,
  preferredHeroId?: number,
): string {
  return html
    .split(/(<[^>]+>)/g)
    .map((part) => {
      if (!part || part.startsWith("<")) {
        return part;
      }

      return linkTextSegment(part, pattern, candidates, preferredHeroId);
    })
    .join("");
}

/** Insère des liens survolables autour des noms d'héros, items et capacités. */
export function linkReferencesInHtml(
  html: string,
  references: DeadlockReference[],
): string {
  if (!html || references.length === 0) {
    return html;
  }

  const candidates = buildReferenceCandidates(references);
  const pattern = buildReferencePattern(references);

  if (!pattern) {
    return html;
  }

  return html
    .split(/(<p>[\s\S]*?<\/p>|<br\s*\/?>)/gi)
    .map((part) => {
      if (!part) {
        return part;
      }

      if (/^<br\s*\/?>$/i.test(part)) {
        return part;
      }

      const paragraph = part.match(/^<p>([\s\S]*?)<\/p>$/i);
      if (paragraph) {
        // Même logique que polish / tokenize : chaque ligne <br> a son propre
        // héros préféré (sinon Apollo « vole » les abilities des lignes suivantes).
        const linkedInner = paragraph[1]
          .split(/(<br\s*\/?>)/i)
          .map((segment) => {
            if (!segment || /^<br\s*\/?>$/i.test(segment)) {
              return segment;
            }

            const preferredHeroId = detectPreferredHeroId(
              plainText(segment),
              candidates,
            );
            return linkHtmlFragment(
              segment,
              pattern,
              candidates,
              preferredHeroId,
            );
          })
          .join("");

        return `<p>${linkedInner}</p>`;
      }

      const preferredHeroId = detectPreferredHeroId(plainText(part), candidates);
      return linkHtmlFragment(part, pattern, candidates, preferredHeroId);
    })
    .join("");
}

export function getReferenceUrlFromElement(
  element: HTMLElement,
  referencesByKey: ReadonlyMap<string, DeadlockReference>,
): string | undefined {
  const directUrl = element.getAttribute("data-deadlock-url");
  if (directUrl) {
    return directUrl;
  }

  const key = element.getAttribute("data-deadlock-ref");
  if (!key) {
    return undefined;
  }

  return referencesByKey.get(key)?.url;
}

export type ReferenceLocaleUrls = {
  french?: string;
  english?: string;
};

export function buildReferenceUrlsIndex(
  referencesByLanguage: Record<DeadlockLanguage, DeadlockReference[]>,
): ReadonlyMap<string, ReferenceLocaleUrls> {
  const index = new Map<string, ReferenceLocaleUrls>();

  const assignUrls = (
    language: DeadlockLanguage,
    references: DeadlockReference[],
  ) => {
    for (const reference of references) {
      if (!reference.url) {
        continue;
      }

      const key = referenceKey(reference);
      const current = index.get(key) ?? {};

      if (language === DEADLOCK_LANG_FRENCH) {
        current.french = reference.url;
      } else if (language === DEADLOCK_LANG_ENGLISH) {
        current.english = reference.url;
      }

      index.set(key, current);
    }
  };

  assignUrls(DEADLOCK_LANG_FRENCH, referencesByLanguage[DEADLOCK_LANG_FRENCH]);
  assignUrls(DEADLOCK_LANG_ENGLISH, referencesByLanguage[DEADLOCK_LANG_ENGLISH]);

  return index;
}
