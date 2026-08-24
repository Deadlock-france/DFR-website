import { describe, expect, it } from "vitest";

import { parseJsonLenient, repairJsonText } from "./json";

describe("repairJsonText", () => {
  it("échappe un saut de ligne brut dans une chaîne", () => {
    const repaired = repairJsonText('{"title":"Hello\nWorld"}');
    expect(JSON.parse(repaired)).toEqual({ title: "Hello\nWorld" });
  });

  it("double les backslashes invalides (ex. nom Steam + chemin)", () => {
    const repaired = repairJsonText('{"author":"TechRaZY\\Users"}');
    expect(JSON.parse(repaired)).toEqual({ author: "TechRaZY\\Users" });
  });
});

describe("parseJsonLenient", () => {
  it("laisse passer un JSON valide", () => {
    expect(parseJsonLenient('{"ok":true}')).toEqual({ ok: true });
  });

  it("accepte un JSON avec caractère de contrôle dans une chaîne", () => {
    expect(parseJsonLenient('{"title":"Hello\nWorld"}')).toEqual({
      title: "Hello\nWorld",
    });
  });
});
