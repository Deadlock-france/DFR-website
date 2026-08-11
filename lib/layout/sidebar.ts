export const SIDEBAR_STORAGE_KEY = "deadlock-actus-sidebar-open";
export const SOCIAL_MINIFIED_STORAGE_KEY = "deadlock-actus-social-minified";

export const SIDEBAR_WIDTH_OPEN = 252;
export const SIDEBAR_WIDTH_COLLAPSED = 76;

export const RIGHT_PANEL_WIDTH = 88;

const SIDEBAR_CHANGE_EVENT = "deadlock-actus-sidebar-change";
const SOCIAL_MINIFIED_CHANGE_EVENT = "deadlock-actus-social-minified-change";

/**
 * Cache module : survit aux remounts Suspense / navigation App Router.
 * Évite le flash open→closed / réseaux→minify en attendant localStorage.
 */
let sidebarOpenMemory: boolean | undefined;
let socialMinifiedMemory: boolean | undefined;

function readStoredFlag(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStoredFlag(key: string, value: boolean): void {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // Ignore : la mémoire module reste la source de vérité pour la session.
  }
}

export function readSidebarOpen(): boolean {
  if (typeof window === "undefined") return true;
  if (sidebarOpenMemory !== undefined) return sidebarOpenMemory;
  const stored = readStoredFlag(SIDEBAR_STORAGE_KEY);
  const open = stored === null ? true : stored === "true";
  sidebarOpenMemory = open;
  return open;
}

export function writeSidebarOpen(open: boolean): void {
  if (typeof window === "undefined") return;
  sidebarOpenMemory = open;
  writeStoredFlag(SIDEBAR_STORAGE_KEY, open);
}

/**
 * localStorage n'émet rien pour l'onglet qui écrit : cet évènement permet à
 * useSyncExternalStore de relire l'état après un basculement.
 */
export function subscribeSidebarOpen(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(SIDEBAR_CHANGE_EVENT, onChange);
  return () => window.removeEventListener(SIDEBAR_CHANGE_EVENT, onChange);
}

export function setSidebarOpen(open: boolean): void {
  if (typeof window === "undefined") return;
  writeSidebarOpen(open);
  window.dispatchEvent(new Event(SIDEBAR_CHANGE_EVENT));
}

/** Valeur servie pendant le rendu serveur et l'hydratation. */
export function getSidebarOpenServerSnapshot(): boolean {
  return true;
}

/** Carte réseaux repliée : seuls les boutons icônes restent visibles. */
export function readSocialMinified(): boolean {
  if (typeof window === "undefined") return false;
  if (socialMinifiedMemory !== undefined) return socialMinifiedMemory;
  const minified = readStoredFlag(SOCIAL_MINIFIED_STORAGE_KEY) === "true";
  socialMinifiedMemory = minified;
  return minified;
}

export function writeSocialMinified(minified: boolean): void {
  if (typeof window === "undefined") return;
  socialMinifiedMemory = minified;
  writeStoredFlag(SOCIAL_MINIFIED_STORAGE_KEY, minified);
}

export function subscribeSocialMinified(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(SOCIAL_MINIFIED_CHANGE_EVENT, onChange);
  return () => window.removeEventListener(SOCIAL_MINIFIED_CHANGE_EVENT, onChange);
}

export function setSocialMinified(minified: boolean): void {
  if (typeof window === "undefined") return;
  writeSocialMinified(minified);
  window.dispatchEvent(new Event(SOCIAL_MINIFIED_CHANGE_EVENT));
}

export function getSocialMinifiedServerSnapshot(): boolean {
  return false;
}

/**
 * Détermine l'entrée de navigation active. L'accueil exige une correspondance
 * exacte, sinon son préfixe "/" marquerait toutes les pages comme actives.
 */
export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

/** Reset test-only — ne pas utiliser en prod. */
export function __resetSidebarMemoryForTests(): void {
  sidebarOpenMemory = undefined;
  socialMinifiedMemory = undefined;
}
