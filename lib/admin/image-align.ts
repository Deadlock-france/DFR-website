/** Alignement des images news (Milkdown n’a pas d’attr native). */

export type NewsImageAlign = "left" | "center" | "right";

const ALIGN_VALUES = new Set<NewsImageAlign>(["left", "center", "right"]);

function splitUrlHash(url: string): { base: string; params: URLSearchParams } {
  const hashIndex = url.indexOf("#");
  if (hashIndex < 0) {
    return { base: url, params: new URLSearchParams() };
  }
  return {
    base: url.slice(0, hashIndex),
    params: new URLSearchParams(url.slice(hashIndex + 1)),
  };
}

export function parseImageAlign(url: string): NewsImageAlign {
  const { params } = splitUrlHash(url);
  const raw = (params.get("align") ?? "").toLowerCase();
  if (ALIGN_VALUES.has(raw as NewsImageAlign)) {
    return raw as NewsImageAlign;
  }
  return "left";
}

/** Ajoute / retire `#align=` (left = pas de hash, URL propre). */
export function withImageAlign(url: string, align: NewsImageAlign): string {
  const { base, params } = splitUrlHash(url);
  if (align === "left") {
    params.delete("align");
  } else {
    params.set("align", align);
  }
  const hash = params.toString();
  return hash ? `${base}#${hash}` : base;
}

/** Src publique sans le paramètre d’alignement. */
export function publicImageSrc(url: string): string {
  const { base, params } = splitUrlHash(url);
  params.delete("align");
  const hash = params.toString();
  return hash ? `${base}#${hash}` : base;
}

/** Styles inline pour le rendu public. */
export function imageDisplayStyle(
  align: NewsImageAlign,
  widthPct?: number,
): string {
  const parts = ["height:auto", "display:block", "max-width:100%"];
  if (widthPct != null) {
    parts.push(`width:${widthPct}%`);
  }
  if (align === "center") {
    parts.push("margin-inline:auto");
  } else if (align === "right") {
    parts.push("margin-left:auto", "margin-right:0");
  } else {
    parts.push("margin-inline:0");
  }
  return parts.join(";");
}
