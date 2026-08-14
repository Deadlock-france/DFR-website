/** Extrait le login Twitch (ou label générique) depuis une URL de stream. */

export type StreamChannelInfo = {
  url: string;
  label: string;
  platform: "twitch" | "youtube" | "other";
};

export function parseStreamChannel(url: string): StreamChannelInfo {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    const path = parsed.pathname.replace(/\/+$/, "");

    if (host === "twitch.tv" || host.endsWith(".twitch.tv")) {
      const login = path.split("/").filter(Boolean)[0];
      if (login) {
        return {
          url,
          label: login,
          platform: "twitch",
        };
      }
    }

    if (
      host === "youtube.com" ||
      host === "youtu.be" ||
      host.endsWith(".youtube.com")
    ) {
      return { url, label: "YouTube", platform: "youtube" };
    }
  } catch {
    // URL invalide — fallback générique
  }

  return { url, label: "Stream", platform: "other" };
}
