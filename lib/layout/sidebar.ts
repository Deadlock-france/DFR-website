export const SIDEBAR_STORAGE_KEY = "deadlock-actus-sidebar-open";

export const SIDEBAR_WIDTH_OPEN = 252;
export const SIDEBAR_WIDTH_COLLAPSED = 76;

export const RIGHT_PANEL_WIDTH = 88;

export function readSidebarOpen(): boolean {
  if (typeof window === "undefined") return true;
  const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
  if (stored === null) return true;
  return stored === "true";
}

export function writeSidebarOpen(open: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SIDEBAR_STORAGE_KEY, String(open));
}

const SIDEBAR_CHANGE_EVENT = "deadlock-actus-sidebar-change";

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

/**
 * Détermine l'entrée de navigation active. L'accueil exige une correspondance
 * exacte, sinon son préfixe "/" marquerait toutes les pages comme actives.
 */
export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}
