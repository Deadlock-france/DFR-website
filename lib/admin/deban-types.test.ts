import { afterEach, describe, expect, it, vi } from "vitest";

import {
  debanStatusLabel,
  validateBanIngestPayload,
  validateDebanMessage,
} from "@/lib/admin/deban-types";

describe("deban-types", () => {
  it("valide l’ingest ban/lift", () => {
    expect(
      validateBanIngestPayload({
        action: "ban",
        discord_id: "123456789012345678",
        reason: "Toxicité",
      }),
    ).toMatchObject({
      ok: true,
      data: {
        action: "ban",
        discord_id: "123456789012345678",
        reason: "Toxicité",
      },
    });

    expect(
      validateBanIngestPayload({
        action: "ban",
        discord_id: "123",
        reason: "x",
      }),
    ).toEqual({ ok: false, error: "invalid discord_id" });

    expect(
      validateBanIngestPayload({
        action: "ban",
        discord_id: "123456789012345678",
      }),
    ).toEqual({ ok: false, error: "reason required for ban" });

    expect(
      validateBanIngestPayload({
        action: "lift",
        discord_id: "123456789012345678",
      }),
    ).toMatchObject({ ok: true, data: { action: "lift" } });
  });

  it("valide le message de demande", () => {
    expect(validateDebanMessage("trop court")).toEqual({
      ok: false,
      error: "invalid_message",
    });
    expect(
      validateDebanMessage(
        "Je souhaite être débanni car j’ai compris mon erreur.",
      ),
    ).toMatchObject({ ok: true });
    expect(debanStatusLabel("pending")).toBe("En attente");
  });
});

describe("notifyBotUnban", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
    delete process.env.DISCORD_UNBAN_WEBHOOK_URL;
    delete process.env.DISCORD_UNBAN_WEBHOOK_SECRET;
  });

  it("poste le payload Bearer vers le webhook", async () => {
    process.env.DISCORD_UNBAN_WEBHOOK_URL = "https://bot.example/unban";
    process.env.DISCORD_UNBAN_WEBHOOK_SECRET = "secret-unban";

    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);

    const { notifyBotUnban } = await import("@/lib/admin/deban");
    await notifyBotUnban({
      discordId: "123456789012345678",
      requestId: "req-1",
      adminNote: "OK après appel",
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://bot.example/unban");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      authorization: "Bearer secret-unban",
      "content-type": "application/json",
    });
    expect(JSON.parse(String(init.body))).toEqual({
      discord_id: "123456789012345678",
      request_id: "req-1",
      admin_note: "OK après appel",
    });
  });

  it("échoue si le webhook n’est pas configuré", async () => {
    const { notifyBotUnban } = await import("@/lib/admin/deban");
    await expect(
      notifyBotUnban({
        discordId: "1",
        requestId: "2",
        adminNote: "x",
      }),
    ).rejects.toThrow("webhook_not_configured");
  });
});
