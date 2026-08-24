import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  fetchPartnerEventLocalized,
  fetchPartnerEvents,
  indexEventsByPosttime,
} from "./events";
import { STEAM_LANG_FRENCH, type SteamPartnerEvent } from "./types";

function jsonResponse(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

function makeEvent(overrides: Partial<SteamPartnerEvent> = {}): SteamPartnerEvent {
  return {
    gid: "event-1",
    clan_steamid: "103582791470414830",
    event_type: 12,
    announcement_body: {
      gid: "announcement-1",
      headline: "Update",
      body: "[b]Notes[/b]",
      posttime: 1_785_067_200,
      language: 0,
    },
    ...overrides,
  };
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function requestedUrl(callIndex = 0): URL {
  return new URL(fetchMock.mock.calls[callIndex][0] as string);
}

describe("fetchPartnerEvents", () => {
  it("interroge l'API pageable avec l'appid et le nombre demandés", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: 1, events: [] }));

    await fetchPartnerEvents(1422450, 25);

    const url = requestedUrl();
    expect(url.origin + url.pathname).toBe(
      "https://store.steampowered.com/events/ajaxgetpartnereventspageable/",
    );
    expect(url.searchParams.get("appid")).toBe("1422450");
    expect(url.searchParams.get("count")).toBe("25");
    expect(url.searchParams.get("offset")).toBe("0");
    expect(url.searchParams.get("clan_accountid")).toBe("0");
  });

  it("demande 100 événements par défaut", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: 1, events: [] }));

    await fetchPartnerEvents(1422450);

    expect(requestedUrl().searchParams.get("count")).toBe("100");
  });

  it("renvoie les événements de la réponse", async () => {
    const event = makeEvent();
    fetchMock.mockResolvedValue(jsonResponse({ success: 1, events: [event] }));

    await expect(fetchPartnerEvents(1422450)).resolves.toEqual([event]);
  });

  it("renvoie un tableau vide quand Steam omet la clé events", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: 1 }));

    await expect(fetchPartnerEvents(1422450)).resolves.toEqual([]);
  });

  it("remonte une erreur explicite sur réponse HTTP en échec", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, { ok: false, status: 503 }));

    await expect(fetchPartnerEvents(1422450)).rejects.toThrow(
      "Steam Events API error: 503",
    );
  });

  it("passe un signal d'abandon pour ne pas bloquer le rendu indéfiniment", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: 1, events: [] }));

    await fetchPartnerEvents(1422450);

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });
});

describe("fetchPartnerEventLocalized", () => {
  const frenchBody = {
    gid: "announcement-1",
    headline: "  Mise à jour  ",
    body: "[b]Notes en français[/b]",
    posttime: 1_785_067_200,
    language: STEAM_LANG_FRENCH,
  };

  it("convertit le clan steamid 64 bits en clan_accountid", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ success: 1, event: { announcement_body: frenchBody } }),
    );

    await fetchPartnerEventLocalized("103582791470414830", "announcement-1");

    expect(requestedUrl().searchParams.get("clan_accountid")).toBe("40893422");
  });

  it("demande le français par défaut", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ success: 1, event: { announcement_body: frenchBody } }),
    );

    await fetchPartnerEventLocalized("103582791470414830", "announcement-1");

    const url = requestedUrl();
    expect(url.searchParams.get("lang_list")).toBe("2");
    expect(url.searchParams.get("announcement_gid")).toBe("announcement-1");
  });

  it("renvoie le corps quand Steam fournit bien la langue demandée", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ success: 1, event: { announcement_body: frenchBody } }),
    );

    await expect(
      fetchPartnerEventLocalized("103582791470414830", "announcement-1"),
    ).resolves.toEqual(frenchBody);
  });

  it("renvoie null quand Steam retombe sur une autre langue", async () => {
    // Sans traduction officielle, Steam renvoie l'anglais (language: 0) :
    // le détecter est ce qui déclenche le repli sur DeepL en amont.
    fetchMock.mockResolvedValue(
      jsonResponse({
        success: 1,
        event: { announcement_body: { ...frenchBody, language: 0 } },
      }),
    );

    await expect(
      fetchPartnerEventLocalized("103582791470414830", "announcement-1"),
    ).resolves.toBeNull();
  });

  it("renvoie null quand l'événement est absent de la réponse", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: 0, err_msg: "nope" }));

    await expect(
      fetchPartnerEventLocalized("103582791470414830", "announcement-1"),
    ).resolves.toBeNull();
  });

  it("accepte une langue explicite autre que le français", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        success: 1,
        event: { announcement_body: { ...frenchBody, language: 0 } },
      }),
    );

    const body = await fetchPartnerEventLocalized(
      "103582791470414830",
      "announcement-1",
      0,
    );

    expect(requestedUrl().searchParams.get("lang_list")).toBe("0");
    expect(body).not.toBeNull();
  });

  it("propage l'erreur HTTP au lieu de renvoyer un corps vide", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, { ok: false, status: 500 }));

    await expect(
      fetchPartnerEventLocalized("103582791470414830", "announcement-1"),
    ).rejects.toThrow("Steam Events API error: 500");
  });
});

describe("indexEventsByPosttime", () => {
  it("indexe les événements sur leur posttime", () => {
    const event = makeEvent();

    const index = indexEventsByPosttime([event]);

    expect(index.get(1_785_067_200)).toBe(event);
  });

  it("ignore les événements sans corps d'annonce", () => {
    const index = indexEventsByPosttime([
      makeEvent({ announcement_body: undefined }),
    ]);

    expect(index.size).toBe(0);
  });

  it("ignore les événements dont l'annonce n'a pas de gid", () => {
    const withoutGid = makeEvent();
    withoutGid.announcement_body!.gid = "";

    expect(indexEventsByPosttime([withoutGid]).size).toBe(0);
  });

  it("conserve le dernier événement en cas de posttime dupliqué", () => {
    const first = makeEvent({ gid: "a" });
    const second = makeEvent({ gid: "b" });

    const index = indexEventsByPosttime([first, second]);

    expect(index.size).toBe(1);
    expect(index.get(1_785_067_200)).toBe(second);
  });

  it("indexe plusieurs événements distincts", () => {
    const a = makeEvent({ gid: "a" });
    const b = makeEvent({ gid: "b" });
    b.announcement_body!.posttime = 1_700_000_000;

    const index = indexEventsByPosttime([a, b]);

    expect(index.size).toBe(2);
    expect(index.get(1_700_000_000)).toBe(b);
  });

  it("renvoie une Map vide pour une liste vide", () => {
    expect(indexEventsByPosttime([]).size).toBe(0);
  });
});
