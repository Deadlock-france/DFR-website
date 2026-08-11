/**
 * Invalidation des caches client account (dock / profil).
 * Évite de servir des invitations périmées après accept/refus/realtime.
 */

type Listener = () => void;

const listeners = new Set<Listener>();

export function subscribeAccountInvalidation(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function invalidateAccountClientCaches(): void {
  listeners.forEach((listener) => listener());
}
