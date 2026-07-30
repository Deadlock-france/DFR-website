import { describe, expect, it } from "vitest";

import { cn } from "./utils";

describe("cn", () => {
  it("concatène plusieurs classes", () => {
    expect(cn("flex", "items-center")).toBe("flex items-center");
  });

  it("ignore les valeurs falsy issues des conditions", () => {
    expect(cn("flex", false && "hidden", undefined, null, "gap-2")).toBe(
      "flex gap-2",
    );
  });

  it("aplatit tableaux et objets conditionnels", () => {
    expect(cn(["flex", "gap-2"], { hidden: false, "p-4": true })).toBe(
      "flex gap-2 p-4",
    );
  });

  it("laisse la dernière classe gagner en cas de conflit Tailwind", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("ne fusionne pas des utilitaires d'axes différents", () => {
    expect(cn("px-2", "py-4")).toBe("px-2 py-4");
  });

  it("permet à une classe passée en prop de surcharger le défaut", () => {
    // C'est le contrat attendu par tous les composants qui exposent className.
    expect(cn("rounded-md bg-black", "bg-white")).toBe("rounded-md bg-white");
  });

  it("résout les conflits sur les variantes responsive séparément", () => {
    expect(cn("w-full md:w-1/2", "md:w-1/3")).toBe("w-full md:w-1/3");
  });

  it("renvoie une chaîne vide sans argument", () => {
    expect(cn()).toBe("");
  });
});
