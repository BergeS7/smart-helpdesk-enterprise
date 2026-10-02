/**
 * Responsabilidade: gestão das empresas pela API interna do Console (cadastro com link de liberação,
 * alteração, novo link), com o banco simulado.
 */
const test = require("node:test");
const assert = require("node:assert/strict");

process.env.PLATFORM_OWNER_EMAIL = "dono@plataforma.com";

const consultas = [];
let empresaNoBanco = null;
let emailJaUsado = false;
const cliente = {
  async query(sql, params = []) {
    consultas.push({ sql, params });
    if (/^(BEGIN|COMMIT|ROLLBACK)/.test(sql)) return { rows: [] };
    if (sql.includes("SELECT slug FROM empresas")) return { rows: [{ slug: "acme" }] };
    if (sql.includes("INSERT INTO empresas")) return { rows: [{ id: 7, nome: params[0], slug: params[1], cnpj: params[2], plano: params[3], status: "ativa", email_responsavel: params[4] }] };
    if (sql.includes("SELECT 1 FROM usuarios")) return { rows: emailJaUsado ? [{}] : [] };
    if (sql.includes("INSERT INTO empresa_convites")) return { rows: [{ expira_em: "2026-10-09T12:00:00.000Z" }] };
    if (sql.includes("UPDATE empresas SET")) return { rows: empresaNoBanco ? [{ ...empresaNoBanco, plano: params[0] }] : [] };
    if (sql.includes("FROM empresas WHERE id = $1 FOR UPDATE")) return { rows: empresaNoBanco ? [empresaNoBanco] : [] };
    return { rows: [] };
  },
  release() {},
};
const databasePath = require.resolve("../src/config/database");
require.cache[databasePath] = { id: databasePath, filename: databasePath, loaded: true, exports: { connect: async () => cliente, query: cliente.query } };

const empresas = require("../src/services/empresasPlataformaService");
const AUTOR = "Console BergeS7";

test.beforeEach(() => { consultas.length = 0; empresaNoBanco = null; emailJaUsado = false; });

test("cadastro gera slug livre, devolve o link de liberação e audita em nome do console", async () => {
  const { empresa, convite } = await empresas.criarEmpresa({ nome: "Acme", email_responsavel: "TI@acme.com", plano: "plus" }, AUTOR);
  assert.equal(empresa.slug, "acme-2", "acme já existia");
  assert.equal(empresa.plano, "plus");
  assert.match(convite.token, /^[A-Za-z0-9_-]{40,}$/);
  assert.equal(convite.email, "ti@acme.com");
  const auditoria = consultas.find((c) => c.sql.includes("INSERT INTO auditoria_sistema"));
  assert.deepEqual(auditoria.params.slice(0, 3), [AUTOR, 7, "criada"]);
  assert.ok(consultas.some((c) => c.sql === "COMMIT"));
});

test("cadastro inválido ou com e-mail já usado não grava nada", async () => {
  await assert.rejects(empresas.criarEmpresa({ nome: "A" }, AUTOR), (e) => e.status === 400);
  emailJaUsado = true;
  await assert.rejects(empresas.criarEmpresa({ nome: "Acme", email_responsavel: "ti@acme.com" }, AUTOR), (e) => e.status === 409 && /já tem uma conta/.test(e.message));
  assert.ok(consultas.some((c) => c.sql === "ROLLBACK"));
  await assert.rejects(empresas.criarEmpresa({ nome: "Acme", email_responsavel: "dono@plataforma.com" }, AUTOR), /reservado/);
});

test("alteração de plano e situação; a empresa principal não pode ser suspensa", async () => {
  empresaNoBanco = { id: 7, nome: "Acme", status: "ativa" };
  const alterada = await empresas.atualizarEmpresa("7", { plano: "pro" }, AUTOR);
  assert.equal(alterada.plano, "pro");
  await assert.rejects(empresas.atualizarEmpresa("1", { status: "suspensa" }, AUTOR), (e) => e.status === 409);
  await assert.rejects(empresas.atualizarEmpresa("7", {}, AUTOR), (e) => e.status === 400);
  await assert.rejects(empresas.atualizarEmpresa("7", { plano: "enterprise" }, AUTOR), (e) => e.status === 400);
  empresaNoBanco = null;
  await assert.rejects(empresas.atualizarEmpresa("99", { plano: "pro" }, AUTOR), (e) => e.status === 404);
});

test("novo link só para empresa ativa com e-mail do responsável", async () => {
  empresaNoBanco = { id: 7, nome: "Acme", status: "ativa", email_responsavel: "ti@acme.com" };
  const { convite } = await empresas.gerarNovoConvite("7", AUTOR);
  assert.equal(convite.email, "ti@acme.com");
  assert.ok(consultas.some((c) => c.sql.includes("SET revogado_em = NOW()")), "o link anterior é revogado");
  empresaNoBanco = { ...empresaNoBanco, status: "suspensa" };
  await assert.rejects(empresas.gerarNovoConvite("7", AUTOR), (e) => e.status === 409);
});
