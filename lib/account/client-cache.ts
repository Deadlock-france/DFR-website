/**
 * Invalidation + persistance session des caches client account (dock / profil).
 * - Mémoire module : survit aux navigations client
 * - sessionStorage : survit au refresh hard dans l'onglet
 */

import type { AccountDockUser } from "@/lib/account/types";

type Listener = () => void;

const listeners = new Set<Listener>();

export const ACCOUNT_ME_STORAGE_KEY = "dfr-account-me-v2";
export const ACCOUNT_PROFIL_STORAGE_KEY = "dfr-account-profil-v2";

export function subscribeAccountInvalidation(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function readSessionJson<T>(key: string): T | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = sessionStorage.getItem(key);
    if (raw == null) return undefined;
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

function writeSessionJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    if (value === undefined) {
      sessionStorage.removeItem(key);
      return;
    }
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota / mode privé : on garde uniquement le cache mémoire.
  }
}

export function clearAccountSessionCaches(): void {
  writeSessionJson(ACCOUNT_ME_STORAGE_KEY, undefined);
  writeSessionJson(ACCOUNT_PROFIL_STORAGE_KEY, undefined);
}

export function invalidateAccountClientCaches(): void {
  clearAccountSessionCaches();
  listeners.forEach((listener) => listener());
}

export function readStoredAccountUser(): AccountDockUser | null | undefined {
  return readSessionJson<AccountDockUser | null>(ACCOUNT_ME_STORAGE_KEY);
}

export function writeStoredAccountUser(user: AccountDockUser | null): void {
  writeSessionJson(ACCOUNT_ME_STORAGE_KEY, user);
}

export function readStoredProfilPayload<T>(): T | null | undefined {
  return readSessionJson<T | null>(ACCOUNT_PROFIL_STORAGE_KEY);
}

export function writeStoredProfilPayload(payload: unknown): void {
  if (payload === undefined) {
    writeSessionJson(ACCOUNT_PROFIL_STORAGE_KEY, undefined);
    return;
  }
  writeSessionJson(ACCOUNT_PROFIL_STORAGE_KEY, payload);
}
