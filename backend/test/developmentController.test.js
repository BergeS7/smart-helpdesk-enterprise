const test = require("node:test");
const assert = require("node:assert/strict");

function loadController(fakePool) {
  const databasePath = require.resolve("../src/config/database");
  const controllerPath = require.resolve("../src/controllers/developmentController");
  const diagnosticsPath = require.resolve("../src/services/systemDiagnosticsService");
  require.cache[databasePath] = { id: databasePath, filename: databasePath, loaded: true, exports: fakePool };
  delete require.cache[controllerPath];
  delete require.cache[diagnosticsPath];
  return require(controllerPath);
}

function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test("avanço da demanda é preservado mesmo se o histórico auxiliar falhar", async () => {
  const commands = [];
  const client = {
    async query(sql, values) {
      commands.push(String(sql));
      if (String(sql).startsWith("SELECT d.*")) return { rows: [{ id: 6, code: "DEV-2026-000006", status: "nova", requester_id: 7 }] };
      if (String(sql).startsWith("UPDATE development_requests SET status")) return { rows: [{ id: 6, status: values[0] }] };
      if (String(sql).startsWith("INSERT INTO development_history")) throw new Error("histórico legado incompatível");
      return { rows: [], rowCount: 1 };
    },
    release() { commands.push("RELEASE_CLIENT"); },
  };
  const pool = { connect: async () => client, query: async () => ({ rows: [], rowCount: 1 }) };
  const controller = loadController(pool);
  const req = { params: { id: "6" }, body: { status: "em_analise" }, user: { id: 1, perfil: "admin" }, id: "test-request", originalUrl: "/api/development/6/status" };
  const res = response();

  await controller.changeStatus(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, "em_analise");
  assert.ok(commands.includes("ROLLBACK TO SAVEPOINT development_audit"));
  assert.ok(commands.includes("COMMIT"));
  assert.equal(commands.includes("ROLLBACK"), false);
});

test("etapa desconhecida é rejeitada sem alterar a demanda", async () => {
  const commands = [];
  const client = {
    async query(sql) {
      commands.push(String(sql));
      if (String(sql).startsWith("SELECT d.*")) return { rows: [{ id: 6, code: "DEV-2026-000006", status: "nova", requester_id: 7 }] };
      return { rows: [], rowCount: 1 };
    },
    release() {},
  };
  const controller = loadController({ connect: async () => client, query: async () => ({ rows: [] }) });
  const req = { params: { id: "6" }, body: { status: "status_inexistente" }, user: { id: 1, perfil: "admin" }, id: "test-request", originalUrl: "/api/development/6/status" };
  const res = response();

  await controller.changeStatus(req, res);

  assert.equal(res.statusCode, 400);
  assert.match(res.body.erro, /Status inválido/);
  assert.equal(commands.some((sql) => sql.startsWith("UPDATE development_requests")), false);
});

test("carregamento da página retorna demandas, indicadores e projetos", async () => {
  const pool = {
    async query(sql) {
      const query = String(sql);
      if (query.includes("FROM development_requests d JOIN chamados")) return { rows: [{ id: 6, code: "DEV-2026-000006", status: "nova", current_time_minutes: 30, automated_time_minutes: 5, executions_per_month: 10, people_involved: 2 }] };
      if (query.includes("COUNT(*) FILTER")) return { rows: [{ novas: 1, backlog: 0, em_desenvolvimento: 0, homologacao: 0, concluidas_mes: 0, horas_economizadas_mes: 0 }] };
      if (query.includes("COUNT(*)::int ativos")) return { rows: [{ ativos: 1 }] };
      if (query.includes("FROM development_projects p")) return { rows: [{ id: 2, code: "PRJ-2026-000002", status: "planejamento" }] };
      return { rows: [] };
    },
  };
  const controller = loadController(pool);
  const req = { query: {}, user: { id: 1, perfil: "admin" }, id: "load-test", originalUrl: "/api/development" };
  const demands = response();
  const dashboard = response();
  const projects = response();

  await controller.listRequests(req, demands);
  await controller.dashboard(req, dashboard);
  await controller.listProjects(req, projects);

  assert.equal(demands.statusCode, 200);
  assert.equal(demands.body.length, 1);
  assert.deepEqual(demands.body[0].savings, { horas_mes: 8.33, horas_ano: 100 });
  assert.equal(dashboard.body.novas, 1);
  assert.equal(dashboard.body.projetos_ativos, 1);
  assert.equal(projects.body[0].code, "PRJ-2026-000002");
});

test("avaliação técnica calcula pontuação e prioridade", async () => {
  const client = {
    async query(sql, values) {
      const query = String(sql);
      if (query.startsWith("SELECT d.*")) return { rows: [{ id: 6, code: "DEV-2026-000006", status: "em_analise", requester_id: 7 }] };
      if (query.startsWith("UPDATE development_requests SET")) return { rows: [{ id: 6, score: values[4], calculated_priority: values[5] }] };
      return { rows: [], rowCount: 1 };
    },
    release() {},
  };
  const controller = loadController({ connect: async () => client, query: async () => ({ rows: [] }) });
  const req = { params: { id: "6" }, body: { impact: 5, reach: 5, gain: 5, urgency: 5 }, user: { id: 1, perfil: "admin" }, id: "score-test", originalUrl: "/api/development/6" };
  const res = response();

  await controller.updateRequest(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.score, 20);
  assert.equal(res.body.calculated_priority, "critica");
});
