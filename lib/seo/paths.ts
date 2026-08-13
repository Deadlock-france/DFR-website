export const PUBLIC_SITEMAP_ROUTES = [
  { path: "/", changeFrequency: "daily" as const, priority: 1 },
  { path: "/patch-notes", changeFrequency: "daily" as const, priority: 0.9 },
  { path: "/showmatch", changeFrequency: "daily" as const, priority: 0.8 },
] as const;

/** Préfixes exclus de l'indexation (robots.txt + meta robots). */
export const ROBOTS_DISALLOW_PATHS = [
  "/acces",
  "/profil",
  "/amis",
  "/equipes",
  "/api/",
  "/auth/",
] as const;

export function isNoIndexPath(pathname: string): boolean {
  return ROBOTS_DISALLOW_PATHS.some((prefix) => {
    if (prefix.endsWith("/")) {
      return pathname === prefix.slice(0, -1) || pathname.startsWith(prefix);
    }
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  });
}
