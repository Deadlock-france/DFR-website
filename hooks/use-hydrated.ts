import { useSyncExternalStore } from "react";

// La valeur ne change qu'une fois, à la fin de l'hydratation : rien à écouter.
const noopSubscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

/**
 * Indique si le composant a fini de s'hydrater côté client. Sert à ne pas
 * rejouer les transitions du châssis au chargement de chaque page.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(noopSubscribe, clientSnapshot, serverSnapshot);
}
