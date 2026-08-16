import { describe, expect, it } from "vitest";

import {
  debanStatusLabel,
  validateBanIngestPayload,
  validateDebanMessage,
} from "@/lib/admin/deban-types";
import {
  extractBearerToken,
  requireShowmatchIngestAuth,
  timingSafeEqual,
} from "@/lib/bot/ingest-auth";

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

describe("ingest-auth", () => {
  it("extrait le bearer et compare en timing-safe", () => {
    expect(extractBearerToken("Bearer abc")).toBe("abc");
    expect(extractBearerToken("basic abc")).toBeNull();
    expect(timingSafeEqual("same", "same")).toBe(true);
    expect(timingSafeEqual("a", "b")).toBe(false);
  });

  it("exige SHOWMATCH_INGEST_SECRET", () => {
    const prev = process.env.SHOWMATCH_INGEST_SECRET;
    delete process.env.SHOWMATCH_INGEST_SECRET;
    const res = requireShowmatchIngestAuth(
      new Request("http://localhost", {
        headers: { authorization: "Bearer x" },
      }),
    );
    expect(res?.status).toBe(503);
    process.env.SHOWMATCH_INGEST_SECRET = "bot-secret";
    expect(
      requireShowmatchIngestAuth(
        new Request("http://localhost", {
          headers: { authorization: "Bearer wrong" },
        }),
      )?.status,
    ).toBe(401);
    expect(
      requireShowmatchIngestAuth(
        new Request("http://localhost", {
          headers: { authorization: "Bearer bot-secret" },
        }),
      ),
    ).toBeNull();
    if (prev === undefined) delete process.env.SHOWMATCH_INGEST_SECRET;
    else process.env.SHOWMATCH_INGEST_SECRET = prev;
  });
});
