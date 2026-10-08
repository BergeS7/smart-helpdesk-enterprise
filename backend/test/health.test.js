/**
 * Responsabilidade: garante que o health público não expõe detalhes internos.
 */
const test = require("node:test");
const assert = require("node:assert/strict");

const servicoPath = require.resolve("../src/services/systemDiagnosticsService");
let resultado;
require.cache[servicoPath] = { id: servicoPath, filename: servicoPath, loaded: true, exports: {
  diagnostics: async () => resultado,
  recordError: () => {},
} };
const { health } = require("../src/controllers/systemController");

function resposta() {
  return { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}

const completo = (ok) => ({
  ok,
  api: { status: "operational", uptimeSeconds: 90, timestamp: "2026-10-08T17:00:00.000Z" },
  database: { status: ok ? "operational" : "unavailable", latencyMs: 120 },
  redis: { status: "operational", latencyMs: 1 },
  agent: { total: 14, current: 13, stale: 1 },
  process: { node: "v22", rssMb: 100 },
  requests: { totalRequests: 50 },
  recentErrors: [{ message: "x" }],
});

test("health público responde só a situação, sem agentes, processo ou requisições", async () => {
  resultado = completo(true);
  const res = resposta();
  await health({}, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { ok: true, status: "operational", timestamp: "2026-10-08T17:00:00.000Z" });
});

test("banco fora do ar continua respondendo 503", async () => {
  resultado = completo(false);
  const res = resposta();
  await health({}, res);
  assert.equal(res.statusCode, 503);
  assert.equal(res.body.ok, false);
  assert.equal(res.body.status, "unavailable");
});
