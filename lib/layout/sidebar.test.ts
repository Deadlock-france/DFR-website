/**
 * readSidebarOpen/writeSidebarOpen touchent window et localStorage : ce fichier
 * a besoin d'un environnement navigateur, contrairement au reste de la suite.
 *
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getSidebarOpenServerSnapshot,
  isActivePath,
  readSidebarOpen,
  setSidebarOpen,
  SIDEBAR_STORAGE_KEY,
  SIDEBAR_WIDTH_COLLAPSED,
  SIDEBAR_WIDTH_OPEN,
  subscribeSidebarOpen,
  writeSidebarOpen,
} from "./sidebar";

/**
 * Storage en mémoire : le localStorage de jsdom n'est pas exposé comme global
 * par Vitest, et un double explicite garde chaque test isolé.
 */
function createMemoryStorage(): Storage {
  let entries = new Map<string, string>();

  return {
    get length() {
      return entries.size;
    },
    key: (index) => [...entries.keys()][index] ?? null,
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => void entries.set(key, String(value)),
    removeItem: (key) => void entries.delete(key),
    clear: () => {
      entries = new Map();
    },
  };
}

let unsubscribes: Array<() => void> = [];

/** S'abonne en garantissant le désabonnement : window survit à chaque test. */
function subscribeForTest(onChange: () => void): () => void {
  const unsubscribe = subscribeSidebarOpen(onChange);
  unsubscribes.push(unsubscribe);
  return unsubscribe;
}

beforeEach(() => {
  vi.stubGlobal("localStorage", createMemoryStorage());
});

afterEach(() => {
  unsubscribes.forEach((unsubscribe) => unsubscribe());
  unsubscribes = [];
  vi.unstubAllGlobals();
});

describe("readSidebarOpen", () => {
  it("ouvre la sidebar par défaut à la première visite", () => {
    expect(readSidebarOpen()).toBe(true);
  });

  it("relit un état ouvert persisté", () => {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, "true");

    expect(readSidebarOpen()).toBe(true);
  });

  it("relit un état replié persisté", () => {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, "false");

    expect(readSidebarOpen()).toBe(false);
  });

  it("retombe sur replié pour une valeur corrompue", () => {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, "peut-être");

    expect(readSidebarOpen()).toBe(false);
  });
});

describe("writeSidebarOpen", () => {
  it("persiste l'état ouvert sous forme de chaîne", () => {
    writeSidebarOpen(true);

    expect(localStorage.getItem(SIDEBAR_STORAGE_KEY)).toBe("true");
  });

  it("persiste l'état replié", () => {
    writeSidebarOpen(false);

    expect(localStorage.getItem(SIDEBAR_STORAGE_KEY)).toBe("false");
  });

  it("écrase la valeur précédente", () => {
    writeSidebarOpen(true);
    writeSidebarOpen(false);

    expect(localStorage.getItem(SIDEBAR_STORAGE_KEY)).toBe("false");
  });

  it("fait un aller-retour fidèle avec readSidebarOpen", () => {
    writeSidebarOpen(false);
    expect(readSidebarOpen()).toBe(false);

    writeSidebarOpen(true);
    expect(readSidebarOpen()).toBe(true);
  });
});

describe("setSidebarOpen", () => {
  it("persiste le nouvel état", () => {
    setSidebarOpen(false);

    expect(readSidebarOpen()).toBe(false);
  });

  it("notifie les abonnés pour déclencher un nouveau rendu", () => {
    const onChange = vi.fn();
    subscribeForTest(onChange);

    setSidebarOpen(false);

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("notifie à chaque basculement", () => {
    const onChange = vi.fn();
    subscribeForTest(onChange);

    setSidebarOpen(false);
    setSidebarOpen(true);

    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("écrit avant de notifier, pour que les abonnés lisent la bonne valeur", () => {
    const seen: boolean[] = [];
    subscribeForTest(() => seen.push(readSidebarOpen()));

    setSidebarOpen(false);

    expect(seen).toEqual([false]);
  });
});

describe("subscribeSidebarOpen", () => {
  it("renvoie une fonction de désabonnement qui coupe les notifications", () => {
    const onChange = vi.fn();
    const unsubscribe = subscribeForTest(onChange);

    unsubscribe();
    setSidebarOpen(false);

    expect(onChange).not.toHaveBeenCalled();
  });

  it("notifie plusieurs abonnés indépendants", () => {
    const first = vi.fn();
    const second = vi.fn();
    subscribeForTest(first);
    subscribeForTest(second);

    setSidebarOpen(false);

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });
});

describe("getSidebarOpenServerSnapshot", () => {
  it("rend la sidebar ouverte, ce qui évite d'animer un repli à l'hydratation", () => {
    expect(getSidebarOpenServerSnapshot()).toBe(true);
  });
});

describe("dimensions de la sidebar", () => {
  it("la sidebar ouverte est plus large que la version repliée", () => {
    expect(SIDEBAR_WIDTH_OPEN).toBeGreaterThan(SIDEBAR_WIDTH_COLLAPSED);
  });
});

describe("isActivePath", () => {
  it("marque l'accueil actif uniquement sur la racine exacte", () => {
    expect(isActivePath("/", "/")).toBe(true);
  });

  it("n'active pas l'accueil sur une autre page", () => {
    expect(isActivePath("/news", "/")).toBe(false);
    expect(isActivePath("/news/12345", "/")).toBe(false);
  });

  it("active une section sur sa page d'index", () => {
    expect(isActivePath("/news", "/news")).toBe(true);
  });

  it("garde la section active sur une page enfant", () => {
    expect(isActivePath("/news/1234567890", "/news")).toBe(true);
  });

  it("n'active pas une section pour un chemin différent", () => {
    expect(isActivePath("/team", "/news")).toBe(false);
  });
});
