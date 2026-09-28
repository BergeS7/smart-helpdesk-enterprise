/**
 * Responsabilidade: valida os indicadores de efetividade da base contra um PostgreSQL real.
 */
const test = require("node:test");
const assert = require("node:assert/strict");

// Exclusivamente um banco descartável com as migrations aplicadas; tudo roda numa transação desfeita no fim.
test("PostgreSQL: efetividade por artigo e resumo do dashboard", {
  skip: !process.env.KB_TEST_DATABASE_URL,
}, async () => {
  const { Client } = require("pg");
  const client = new Client({ connectionString: process.env.KB_TEST_DATABASE_URL });
  await client.connect();
  // Conexão direta (sem o contexto da requisição): os dados de teste entram na empresa principal.
  await client.query("SELECT set_config('app.empresa_id', '1', false)");
  const databasePath = require.resolve("../src/config/database");
  require.cache[databasePath] = { id: databasePath, filename: databasePath, loaded: true, exports: client };
  for (const modulo of ["../src/services/knowledgeMetricsService", "../src/controllers/catalogController", "../src/services/permissionService", "../src/controllers/chamados/registro"]) {
    delete require.cache[require.resolve(modulo)];
  }
  const { resumoBase } = require("../src/services/knowledgeMetricsService");
  const { listarBase } = require("../src/controllers/catalogController");

  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM base_conhecimento_recomendacoes");
    await client.query("DELETE FROM base_conhecimento");
    const artigo = async (titulo, status, visualizacoes) => (await client.query(
      "INSERT INTO base_conhecimento (titulo, conteudo, status, visualizacoes) VALUES ($1, 'x', $2, $3) RETURNING id",
      [titulo, status, visualizacoes]
    )).rows[0].id;
    const pouco = await artigo("Muito recomendado, resolve pouco", "publicado", 40);
    const bom = await artigo("Resolve bem", "publicado", 20);
    const novo = await artigo("Poucos dados", "publicado", 2);
    await artigo("Aguardando revisão", "revisao", 0);
    const chamado = (await client.query("INSERT INTO chamados (titulo, descricao) VALUES ('x', 'y') RETURNING id")).rows[0].id;
    const recomendar = (artigoId, quantidade, { resolveu = null, clicado = false, chamadoId = null, diasAtras = 0 } = {}) => client.query(
      `INSERT INTO base_conhecimento_recomendacoes (artigo_id, confianca, resolveu, respondido_em, clicado_em, chamado_id, criado_em)
       SELECT $1, 0.8, $2::boolean, CASE WHEN $2::boolean IS NULL THEN NULL ELSE NOW() END,
              CASE WHEN $3 THEN NOW() END, $4, NOW() - make_interval(days => $5)
       FROM generate_series(1, $6)`,
      [artigoId, resolveu, clicado, chamadoId, diasAtras, quantidade]
    );
    await recomendar(pouco, 1, { resolveu: true, clicado: true });
    await recomendar(pouco, 9, { resolveu: false, clicado: true, chamadoId: chamado });
    await recomendar(pouco, 2);
    await recomendar(bom, 5, { resolveu: true, clicado: true });
    await recomendar(bom, 1, { resolveu: true, clicado: true, chamadoId: chamado }); // disse sim, mas abriu chamado: não conta
    await recomendar(bom, 4, { diasAtras: 60 });
    await recomendar(novo, 3);

    const res = { status() { return this; }, json(body) { this.body = body; return this; } };
    await listarBase({ query: { todos: "true" }, user: { id: 1, perfil: "admin" } }, res);
    const porTitulo = Object.fromEntries(res.body.map((a) => [a.titulo, a]));
    assert.deepEqual(
      (({ recomendacoes, cliques, autoatendimentos, nao_resolveu, taxa_sucesso, revisar }) => ({ recomendacoes, cliques, autoatendimentos, nao_resolveu, taxa_sucesso, revisar }))(porTitulo["Muito recomendado, resolve pouco"]),
      { recomendacoes: 12, cliques: 10, autoatendimentos: 1, nao_resolveu: 9, taxa_sucesso: 0.08, revisar: true }
    );
    assert.equal(porTitulo["Resolve bem"].autoatendimentos, 5, "sim seguido de chamado não é autoatendimento");
    assert.equal(porTitulo["Resolve bem"].revisar, false);
    assert.equal(porTitulo["Poucos dados"].revisar, false);
    assert.equal(porTitulo["Aguardando revisão"].taxa_sucesso, null, "sem recomendação, sem taxa");

    const resumo = await resumoBase({ dias: 30 });
    assert.deepEqual(resumo, {
      publicados: 3, em_revisao: 1, visualizacoes: 62,
      recomendacoes: 21, autoatendimentos: 6, taxa_sucesso: 0.29, artigos_revisar: 1,
    });
    assert.equal((await resumoBase({ dias: 90 })).recomendacoes, 25, "período maior inclui as antigas");
  } finally {
    await client.query("ROLLBACK");
    await client.end();
  }
});
