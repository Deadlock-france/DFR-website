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

function pickChangeLineSubjectKey(segment: string): string | undefined {
  const keys = [
    ...segment.matchAll(/data-deadlock-ref="((?:hero|item|ability):\d+)"/g),
  ].map((match) => match[1]);

  if (keys.length === 0) {
    return undefined;
  }

  return (
    keys.find((key) => key.startsWith("item:")) ??
    keys.find((key) => key.startsWith("hero:")) ??
    keys[0]
  );
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
      tokens.push({ kind: "line", html: paragraph[1], wrapper: "p" });
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

function buildReferenceLookup(
  references: DeadlockReference[],
): Map<string, DeadlockReference> {
  const lookup = new Map<string, DeadlockReference>();

  for (const reference of references) {
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
  lookup: Map<string, DeadlockReference>,
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

    const reference = lookup.get(normalizeReferenceName(matchedText));
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

/** Insère des liens survolables autour des noms d'héros, items et capacités. */
export function linkReferencesInHtml(
  html: string,
  references: DeadlockReference[],
): string {
  if (!html || references.length === 0) {
    return html;
  }

  const lookup = buildReferenceLookup(references);
  const pattern = buildReferencePattern(references);

  if (!pattern) {
    return html;
  }

  return html
    .split(/(<[^>]+>)/g)
    .map((part) => {
      if (!part || part.startsWith("<")) {
        return part;
      }

      return linkTextSegment(part, pattern, lookup);
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
