const SAFE_PATH_BASE = "https://dfr.invalid";
const MAX_PATH_LENGTH = 2048;
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

/**
 * Autorise uniquement un chemin relatif interne (`/profil`, `/a?b=1`).
 * Rejette les redirections ouvertes : `//evil.com`, `/\evil.com`, `https://…`.
 */
export function isSafeInternalPath(path: string): boolean {
  if (typeof path !== "string") return false;
  if (path.length === 0 || path.length > MAX_PATH_LENGTH) return false;
  if (!path.startsWith("/")) return false;
  if (path.startsWith("//") || path.startsWith("/\\")) return false;
  if (path.includes("\\") || path.includes("://")) return false;
  if (CONTROL_CHARS.test(path)) return false;

  let decoded = path;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    return false;
  }

  if (
    decoded.startsWith("//") ||
    decoded.includes("\\") ||
    decoded.includes("://") ||
    CONTROL_CHARS.test(decoded)
  ) {
    return false;
  }

  try {
    const resolved = new URL(path, SAFE_PATH_BASE);
    if (resolved.origin !== SAFE_PATH_BASE) return false;
    if (resolved.username || resolved.password) return false;
  } catch {
    return false;
  }

  return true;
}

export function safeInternalPath(
  path: string | null | undefined,
  fallback: string,
): string {
  if (path && isSafeInternalPath(path)) return path;
  return fallback;
}
