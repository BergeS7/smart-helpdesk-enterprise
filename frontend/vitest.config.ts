/**
 * Responsabilidade: Módulo de vitest config; implementa esta responsabilidade dentro do Smart HelpDesk.
 */
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["e2e/**", "node_modules/**", "dist/**"],
  },
});
