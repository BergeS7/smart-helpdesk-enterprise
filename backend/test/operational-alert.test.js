const test = require("node:test");
const assert = require("node:assert/strict");
const { activeProblems } = require("../src/services/operationalAlertService");

function snapshot(overrides = {}) {
  return {
    database: { status: "operational" },
    redis: { status: "operational" },
    agent: { status: "operational", total: 1, stale: 0 },
    requests: { last5Minutes: { errors5xx: 0 } },
    ...overrides,
  };
}

test("não alerta quando todos os serviços estão operacionais", () => {
  assert.deepEqual(activeProblems(snapshot()), []);
});

test("consolida falhas de infraestrutura, agentes e API", () => {
  const problems = activeProblems(snapshot({
    database: { status: "unavailable" },
    redis: { status: "unavailable" },
    agent: { status: "degraded", total: 3, stale: 2 },
    requests: { last5Minutes: { errors5xx: 4 } },
  }));
  assert.equal(problems.length, 4);
  assert.ok(problems.some((item) => item.includes("4 erro(s) 5xx")));
});
