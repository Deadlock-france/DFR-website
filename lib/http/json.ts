/**
 * Parse JSON tolérant : les APIs Steam / Deadlock (et le cache Next)
 * renvoient parfois des chaînes avec des caractères de contrôle bruts
 * ou des backslashes non échappés — `JSON.parse` explose alors au build.
 */

const VALID_JSON_ESCAPES = new Set(['"', "\\", "/", "b", "f", "n", "r", "t", "u"]);

/** Échappe les caractères illégaux à l’intérieur des chaînes JSON. */
export function repairJsonText(source: string): string {
  let result = "";
  let inString = false;
  let escaped = false;

  for (let i = 0; i < source.length; i++) {
    const char = source[i]!;
    const code = char.charCodeAt(0);

    if (!inString) {
      if (char === '"') inString = true;
      result += char;
      continue;
    }

    if (escaped) {
      result += char;
      escaped = false;
      continue;
    }

    if (char === "\\") {
      const next = source[i + 1];
      if (next && VALID_JSON_ESCAPES.has(next)) {
        result += char;
        escaped = true;
        continue;
      }
      result += "\\\\";
      continue;
    }

    if (char === '"') {
      inString = false;
      result += char;
      continue;
    }

    if (code <= 0x1f) {
      result += `\\u${code.toString(16).padStart(4, "0")}`;
      continue;
    }

    result += char;
  }

  return result;
}

export function parseJsonLenient<T>(text: string): T {
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    try {
      return JSON.parse(repairJsonText(text)) as T;
    } catch {
      throw error;
    }
  }
}

export async function readResponseJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  return parseJsonLenient<T>(text);
}
