/**
 * Responsabilidade: API interna do Console Berges7: chave de serviço e o resumo das empresas
 * (só cadastro e cobrança, sem nada da operação).
 */
const test = require("node:test");
const assert = require("node:assert/strict");

const databasePath = require.resolve("../src/config/database");
require.cache[databasePath] = { id: databasePath, filename: databasePath, loaded: true, exports: {
  query: async () => ({ rows: [
    { id: 1, nome: "Principal", slug: "principal", cnpj: "11222333000181", plano: "pro", status: "ativa", email_responsavel: "ti@principal.com", criado_em: "2026-08-21T10:00:00.000Z", usuarios_ativos: 40, tecnicos_cobrados: 10, ultimo_acesso_em: "2026-10-01T12:00:00.000Z" },
    { id: 2, nome: "Acme", slug: "acme", cnpj: null, plano: "base", status: "suspensa", email_responsavel: "ti@acme.com", criado_em: "2026-09-28T10:00:00.000Z", usuarios_ativos: 2, tecnicos_cobrados: 2, ultimo_acesso_em: null },
  ] }),
} };

const diagnosticoPath = require.resolve("../src/services/systemDiagnosticsService");
require.cache[diagnosticoPath] = { id: diagnosticoPath, filename: diagnosticoPath, loaded: true, exports: {
  recordError: () => {},
  diagnostics: async () => ({
    ok: true,
    api: { status: "operational", uptimeSeconds: 90, timestamp: "2026-10-08T17:00:00.000Z" },
    database: { status: "operational", latencyMs: 120 },
    redis: { status: "operational", latencyMs: 1 },
    agent: { status: "operational", total: 14, current: 13, stale: 1, lastHeartbeat: "2026-10-08T16:52:50.671Z" },
    process: { node: "v22.23.3", rssMb: 100.7, heapUsedMb: 36.4 },
    requests: { totalRequests: 50, errors5xx: 0, last5Minutes: { requests: 50, errors5xx: 0, latencyP50Ms: 200, latencyP95Ms: 900 } },
    recentErrors: [{ id: "e1", timestamp: "2026-10-08T16:55:00.000Z", source: "frontend", level: "error", message: "falhou", requestId: "r1", path: "/admin", context: { stack: "Error: falhou", userId: 7, userAgent: "Chrome" } }],
  }),
} };

const { exigirChaveDoConsole, listarEmpresas, diagnostico } = require("../src/routes/internoRoutes");

function resposta() {
  return { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}

function chamarMiddleware(authorization) {
  const res = resposta();
  let seguiu = false;
  exigirChaveDoConsole({ headers: authorization ? { authorization } : {}, id: "req-1" }, res, () => { seguiu = true; });
  return { seguiu, res };
}

test("sem CONSOLE_API_KEY a rota interna não existe", () => {
  delete process.env.CONSOLE_API_KEY;
  const { seguiu, res } = chamarMiddleware("Bearer qualquer");
  assert.equal(seguiu, false);
  assert.equal(res.statusCode, 404);
});

test("só a chave de serviço certa passa", () => {
  process.env.CONSOLE_API_KEY = "chave-de-servico-de-teste-com-tamanho-bom";
  assert.equal(chamarMiddleware("Bearer chave-de-servico-de-teste-com-tamanho-bom").seguiu, true);
  assert.equal(chamarMiddleware("Bearer chave-errada").res.statusCode, 401);
  assert.equal(chamarMiddleware(undefined).res.statusCode, 401);
  assert.equal(chamarMiddleware("chave-de-servico-de-teste-com-tamanho-bom").seguiu, true, "aceita sem o prefixo Bearer");
});

test("resumo traz plano, técnicos cobrados e mensalidade calculada, sem dados da operação", async () => {
  const res = resposta();
  await listarEmpresas({}, res);
  const [principal, acme] = res.body.empresas;
  assert.equal(principal.plano_nome, "Pro");
  assert.equal(principal.mensalidade.total, 749 + 2 * 89, "10 técnicos no Pro: 8 incluídos + 2 extras");
  assert.equal(acme.mensalidade.total, 399);
  assert.equal(acme.status, "suspensa");
  for (const campo of ["chamados_abertos", "ativos", "chamados", "usuarios"]) assert.equal(campo in principal, false, `${campo} não sai do HelpDesk`);
  assert.match(res.body.gerado_em, /^\d{4}-\d{2}-\d{2}T/);
});

test("diagnóstico completo para o console, com erros sem pilha, usuário ou navegador", async () => {
  const res = resposta();
  await diagnostico({}, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.agent.stale, 1);
  assert.equal(res.body.process.node, "v22.23.3");
  assert.equal(res.body.requests.last5Minutes.latencyP95Ms, 900);
  assert.deepEqual(res.body.recentErrors, [{ id: "e1", timestamp: "2026-10-08T16:55:00.000Z", source: "frontend", level: "error", message: "falhou", requestId: "r1", path: "/admin" }]);
});
