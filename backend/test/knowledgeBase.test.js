/**
 * Responsabilidade: Testes automatizados que verificam a base de conhecimento.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizarArtigo } = require("../src/domain/knowledgeBase");

function loadController(fakePool) {
  const databasePath = require.resolve("../src/config/database");
  require.cache[databasePath] = { id: databasePath, filename: databasePath, loaded: true, exports: fakePool };
  for (const modulo of ["../src/controllers/catalogController", "../src/services/permissionService", "../src/controllers/chamados/registro"]) {
    delete require.cache[require.resolve(modulo)];
  }
  return require("../src/controllers/catalogController");
}

function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

function fakePool() {
  const queries = [];
  return {
    queries,
    async query(sql, values) {
      queries.push({ sql: String(sql), values });
      if (String(sql).includes("FROM usuario_permissoes")) return { rows: [], rowCount: 0 };
      if (String(sql).startsWith("INSERT INTO base_conhecimento")) return { rows: [{ id: 1, titulo: values[0], status: "rascunho" }] };
      if (String(sql).includes("UPDATE base_conhecimento")) return { rows: [{ id: 1, titulo: "Impressora", status: "publicado" }] };
      return { rows: [] };
    },
  };
}

test("criação exige título e conteúdo e começa como rascunho", () => {
  assert.deepEqual(normalizarArtigo({ titulo: "Só título" }, { criacao: true }).erros, ["Título e conteúdo são obrigatórios"]);
  const { dados, erros } = normalizarArtigo({ titulo: " Impressora ", conteudo: "Passos", solucao: "" }, { criacao: true });
  assert.deepEqual(erros, []);
  assert.equal(dados.titulo, "Impressora");
  assert.equal(dados.solucao, null);
  assert.equal(dados.status, "rascunho");
  assert.equal(dados.ativo, false);
});

test("atualização parcial altera só os campos enviados e sincroniza ativo com o status", () => {
  assert.deepEqual(normalizarArtigo({ status: "publicado" }).dados, { status: "publicado", ativo: true });
  assert.deepEqual(normalizarArtigo({ status: "revisao" }).dados, { status: "revisao", ativo: false });
  assert.deepEqual(normalizarArtigo({ status: "apagado" }).erros, ["Status do artigo inválido"]);
  assert.deepEqual(normalizarArtigo({ titulo: "" }).erros, ["Título e conteúdo são obrigatórios"]);
});

test("cliente legado que envia apenas ativo continua funcionando", () => {
  assert.equal(normalizarArtigo({ ativo: false }).dados.status, "arquivado");
  assert.equal(normalizarArtigo({ ativo: true }).dados.status, "publicado");
});

test("usuário comum só lista artigos publicados, mesmo pedindo todos", async () => {
  const pool = fakePool();
  const { listarBase } = loadController(pool);
  const res = response();
  await listarBase({ query: { todos: "true" }, user: { id: 7, perfil: "usuario" } }, res);
  assert.equal(res.statusCode, 200);
  assert.match(pool.queries.at(-1).sql, /b\.status = 'publicado'/);
});

test("gestor da base lista todos os status quando pede", async () => {
  const pool = fakePool();
  const { listarBase } = loadController(pool);
  await listarBase({ query: { todos: "true" }, user: { id: 1, perfil: "admin" } }, response());
  assert.doesNotMatch(pool.queries.at(-1).sql, /status = 'publicado'/);
});

test("atualização registra autor da alteração e auditoria", async () => {
  const pool = fakePool();
  const { atualizarBase } = loadController(pool);
  const res = response();
  await atualizarBase({ params: { id: "1" }, body: { solucao: "Reiniciar spooler", status: "publicado" }, user: { id: 3, nome: "Ana", perfil: "admin" } }, res);
  assert.equal(res.statusCode, 200);
  const update = pool.queries.find((q) => q.sql.includes("UPDATE base_conhecimento"));
  assert.match(update.sql, /solucao = \$1, status = \$2, ativo = \$3,\s+atualizado_por = \$4/);
  assert.deepEqual(update.values, ["Reiniciar spooler", "publicado", true, 3, "1"]);
  assert.ok(pool.queries.some((q) => q.sql.includes("INSERT INTO auditoria_sistema")));
});
