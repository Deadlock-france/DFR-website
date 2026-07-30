import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["{app,components,hooks,lib}/**/*.test.{ts,tsx}"],
    // Les dates sont formatées en fr-FR : sans fuseau fixe, les assertions
    // dépendraient de la machine qui lance les tests.
    env: { TZ: "Europe/Paris" },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
});
