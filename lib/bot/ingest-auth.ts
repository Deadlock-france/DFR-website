/** Auth Bearer partagée pour les routes bot → site (showmatch, bans, …). */

export function unauthorizedJson() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export function extractBearerToken(header: string | null): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(/\s+/, 2);
  if (!scheme || scheme.toLowerCase() !== "bearer" || !token) return null;
  return token.trim();
}

/**
 * Vérifie `Authorization: Bearer $SHOWMATCH_INGEST_SECRET`.
 * Retourne une Response d’erreur, ou null si OK.
 */
export function requireShowmatchIngestAuth(
  request: Request,
): Response | null {
  const ingestSecret = process.env.SHOWMATCH_INGEST_SECRET;
  if (!ingestSecret) {
    return Response.json(
      { error: "Ingest endpoint is not configured" },
      { status: 503 },
    );
  }

  const token = extractBearerToken(request.headers.get("authorization"));
  if (!token || !timingSafeEqual(token, ingestSecret)) {
    return unauthorizedJson();
  }
  return null;
}
