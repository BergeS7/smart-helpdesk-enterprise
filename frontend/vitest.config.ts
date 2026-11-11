/**
 * Responsabilidade: Módulo de vitest config; implementa esta responsabilidade dentro do Smart HelpDesk.
 */
import { defineConfig } from "vitest/config";

// A partir do Node 25 o localStorage nativo do Node fica ligado por padrão e encobre o do jsdom
// (sem --localstorage-file ele vem indefinido). Desligado só nessas versões; o CI usa Node 22.
const nodeMajor = Number(process.versions.node.split(".")[0]);
const execArgv = nodeMajor >= 25 ? ["--no-experimental-webstorage"] : [];

export default defineConfig({
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["e2e/**", "node_modules/**", "dist/**"],
    execArgv,
  },
});
