/**
 * Responsabilidade: valida a sugestão e a criação de rascunho a partir de chamado resolvido (PostgreSQL real).
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const { ARTIGOS, CHAMADOS_RECORRENTES } = require("./fixtures/baseConhecimento");

// Exclusivamente um banco descartável com as migrations aplicadas; tudo roda numa transação desfeita no fim.
test("PostgreSQL: chamado resolvido vira rascunho quando o problema é recorrente", {
  skip: !process.env.KB_TEST_DATABASE_URL,
}, async () => {
  const { Client } = require("pg");
  const client = new Client({ connectionString: process.env.KB_TEST_DATABASE_URL });
  await client.connect();
  const databasePath = require.resolve("../src/config/database");
  require.cache[databasePath] = { id: databasePath, filename: databasePath, loaded: true, exports: client };
  for (const modulo of Object.keys(require.cache)) if (modulo.includes(`${require("path").sep}src${require("path").sep}`) && modulo !== databasePath) delete require.cache[modulo];
  const controller = require("../src/controllers/catalogController");

  try {
    await client.query("BEGIN");
    for (const tabela of ["base_conhecimento_recomendacoes", "base_conhecimento", "chamado_comentarios", "chamados"]) await client.query(`DELETE FROM ${tabela}`);
    const tecnico = (await client.query("INSERT INTO usuarios (nome, email, senha, perfil) VALUES ('Téc', 'tec-rascunho@teste.local', 'x', 'admin') RETURNING id, nome, perfil")).rows[0];
    for (const a of ARTIGOS) {
      await client.query(
        "INSERT INTO base_conhecimento (titulo, palavras_chave, resumo, problema, sintomas, solucao, conteudo, status, visibilidade) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
        [a.titulo, a.palavras_chave, a.resumo, a.problema || null, a.sintomas || null, a.solucao || null, a.conteudo, a.status, a.visibilidade]
      );
    }
    const ids = {};
    for (const [grupo, lista] of Object.entries(CHAMADOS_RECORRENTES)) {
      for (const [titulo, descricao] of lista) {
        ids[titulo] = (await client.query("INSERT INTO chamados (titulo, descricao, numero_chamado) VALUES ($1, $2, $3) RETURNING id", [titulo, descricao, `#${grupo}-${Object.keys(ids).length}`])).rows[0].id;
      }
    }
    const resolver = (titulo) => client.query("UPDATE chamados SET status = 'CLOSED' WHERE id = $1", [ids[titulo]]);
    const comentar = (titulo, perfil, mensagem) => client.query(
      "INSERT INTO chamado_comentarios (chamado_id, autor_perfil, mensagem) VALUES ($1, $2, $3)", [ids[titulo], perfil, mensagem]);

    const req = (titulo) => ({ params: { chamadoId: String(ids[titulo]) }, user: tecnico, query: {}, body: {} });
    const chamar = async (handler, titulo) => {
      const res = { statusCode: 200, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } };
      await controller[handler](req(titulo), res);
      return res;
    };

    assert.equal((await chamar("sugestaoArtigoDoChamado", "VPN caiu")).body.motivo, "chamado_em_aberto");
    assert.equal((await chamar("criarRascunhoDoChamado", "VPN caiu")).statusCode, 409, "chamado aberto não gera rascunho");

    await comentar("VPN caiu", "usuario", "Continua caindo, meu CPF é 123.456.789-00");
    await comentar("VPN caiu", "tecnico", "Verifiquei o FortiClient.");
    await comentar("VPN caiu", "tecnico", "Atualizei o FortiClient e refiz o perfil da VPN.");
    await resolver("VPN caiu");
    const sugestao = (await chamar("sugestaoArtigoDoChamado", "VPN caiu")).body;
    assert.equal(sugestao.sugerir, true, "problema recorrente sem artigo: sugere");
    assert.equal(sugestao.recorrencia.quantidade, 6);

    const criado = await chamar("criarRascunhoDoChamado", "VPN caiu");
    assert.equal(criado.statusCode, 201);
    assert.equal(criado.body.status, "rascunho", "nunca publica sozinho");
    assert.equal(criado.body.visibilidade, "interno");
    assert.equal(criado.body.solucao, "Atualizei o FortiClient e refiz o perfil da VPN.");
    assert.doesNotMatch(criado.body.conteudo, /CPF/, "mensagem do usuário não entra no rascunho");

    assert.equal((await chamar("sugestaoArtigoDoChamado", "VPN caiu")).body.motivo, "rascunho_existente");
    assert.equal((await chamar("criarRascunhoDoChamado", "VPN caiu")).statusCode, 409, "não duplica");

    await resolver("Impressora não imprime");
    assert.equal((await chamar("sugestaoArtigoDoChamado", "Impressora não imprime")).body.motivo, "artigo_existente");

    await resolver("Cadeira quebrada");
    assert.equal((await chamar("sugestaoArtigoDoChamado", "Cadeira quebrada")).body.motivo, "sem_recorrencia", "chamado isolado não pede artigo");
  } finally {
    await client.query("ROLLBACK");
    await client.end();
  }
});
