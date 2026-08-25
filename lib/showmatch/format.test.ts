import { describe, expect, it } from "vitest";

import { formatSeriesBestOf } from "./format";

describe("formatSeriesBestOf", () => {
  it("affiche BO1 pour une série 1-0", () => {
    expect(formatSeriesBestOf(1, 0)).toBe("BO1");
    expect(formatSeriesBestOf(0, 1)).toBe("BO1");
  });

  it("affiche BO3 dès qu’une équipe a 2 victoires", () => {
    expect(formatSeriesBestOf(2, 0)).toBe("BO3");
    expect(formatSeriesBestOf(2, 1)).toBe("BO3");
    expect(formatSeriesBestOf(0, 2)).toBe("BO3");
  });
});
