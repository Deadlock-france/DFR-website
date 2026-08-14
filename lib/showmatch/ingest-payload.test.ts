import { describe, expect, it } from "vitest";

import {
  applyIngestScheduledAtDefault,
  validateIngestPayload,
} from "./ingest-payload";

const NOW = "2026-08-14T15:00:00.000Z";

function basePayload(overrides: Record<string, unknown> = {}) {
  return {
    schema_version: 1,
    showmatch_id: "dfr-20260813",
    status: "completed",
    ...overrides,
  };
}

describe("applyIngestScheduledAtDefault", () => {
  it("remplit scheduled_at avec maintenant s’il est absent", () => {
    const result = applyIngestScheduledAtDefault(basePayload(), () => NOW);
    expect(result).toEqual({ ...basePayload(), scheduled_at: NOW });
  });

  it("remplit scheduled_at s’il est vide, null, ou d’un autre type", () => {
    expect(
      applyIngestScheduledAtDefault(basePayload({ scheduled_at: "" }), () => NOW),
    ).toMatchObject({ scheduled_at: NOW });
    expect(
      applyIngestScheduledAtDefault(basePayload({ scheduled_at: "  " }), () => NOW),
    ).toMatchObject({ scheduled_at: NOW });
    expect(
      applyIngestScheduledAtDefault(basePayload({ scheduled_at: null }), () => NOW),
    ).toMatchObject({ scheduled_at: NOW });
    expect(
      applyIngestScheduledAtDefault(basePayload({ scheduled_at: 1755183600 }), () => NOW),
    ).toMatchObject({ scheduled_at: NOW });
  });

  it("conserve une date ISO déjà fournie", () => {
    const scheduled_at = "2026-08-13T21:00:00+02:00";
    expect(
      applyIngestScheduledAtDefault(basePayload({ scheduled_at }), () => NOW),
    ).toEqual(basePayload({ scheduled_at }));
  });
});

describe("validateIngestPayload", () => {
  it("accepte un payload sans scheduled_at", () => {
    expect(validateIngestPayload(basePayload())).toBeNull();
  });

  it("exige showmatch_id, schema_version et status", () => {
    expect(validateIngestPayload({ ...basePayload(), showmatch_id: "" })).toBe(
      "showmatch_id is required",
    );
    expect(validateIngestPayload({ ...basePayload(), schema_version: 2 })).toBe(
      "schema_version must be 1",
    );
    expect(validateIngestPayload({ ...basePayload(), status: "done" })).toBe(
      "status must be scheduled, teams_formed, in_progress, completed, or cancelled",
    );
  });
});
