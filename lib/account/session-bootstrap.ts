/**
 * Bootstrap session navigateur — une seule fois par chargement module.
 * Doit précéder les fetches /api/account/* pour que le JWT soit à jour
 * sans passer par le proxy (interdit avec cacheComponents).
 */
let sessionReady = false;
let inflight: Promise<void> | null = null;

export function ensureBrowserSession(): Promise<void> {
  if (sessionReady) return Promise.resolve();
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      await fetch("/api/auth/session", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
      });
    } catch {
      // Ignore : les lectures account géreront l'absence de session.
    } finally {
      sessionReady = true;
      inflight = null;
    }
  })();

  return inflight;
}
