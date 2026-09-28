/**
 * Responsabilidade: valida o registro de recomendações e o feedback "resolveu?" contra um PostgreSQL real.
 */
const test = require("node:test");
const assert = require("node:assert/strict");

// Exclusivamente um banco descartável com as migrations aplicadas; tudo roda numa transação desfeita no fim.
test("PostgreSQL: recomendação, clique, resposta e vínculo com o chamado", {
  skip: !process.env.KB_TEST_DATABASE_URL,
}, async () => {
  const { Client } = require("pg");
  const client = new Client({ connectionString: process.env.KB_TEST_DATABASE_URL });
  await client.connect();
  // Conexão direta (sem o contexto da requisição): os dados de teste entram na empresa principal.
  await client.query("SELECT set_config('app.empresa_id', '1', false)");
  const databasePath = require.resolve("../src/config/database");
  require.cache[databasePath] = { id: databasePath, filename: databasePath, loaded: true, exports: client };
  delete require.cache[require.resolve("../src/services/knowledgeRecommendationService")];
  const servico = require("../src/services/knowledgeRecommendationService");

  try {
    await client.query("BEGIN");
    const inserir = async (sql, valores) => (await client.query(sql, valores)).rows[0].id;
    const ana = await inserir("INSERT INTO usuarios (nome, email, senha) VALUES ('Ana', 'ana@teste.local', 'x') RETURNING id");
    const bia = await inserir("INSERT INTO usuarios (nome, email, senha) VALUES ('Bia', 'bia@teste.local', 'x') RETURNING id");
    const artigo = await inserir("INSERT INTO base_conhecimento (titulo, conteudo, status) VALUES ('Impressora', 'x', 'publicado') RETURNING id");
    const outro = await inserir("INSERT INTO base_conhecimento (titulo, conteudo, status) VALUES ('E-mail', 'x', 'publicado') RETURNING id");
    const exibir = (usuarioId, ...ids) => servico.registrarExibicoes({ usuarioId, sugestoes: ids.map((id) => ({ id, confianca: 0.8 })) });
    const linha = async (id) => (await client.query("SELECT * FROM base_conhecimento_recomendacoes WHERE id = $1", [id])).rows[0];

    const primeira = await exibir(ana, artigo, outro);
    assert.equal(primeira.size, 2);
    const repetida = await exibir(ana, artigo);
    assert.equal(repetida.get(artigo), primeira.get(artigo), "usuário ainda digitando não duplica a recomendação");
    assert.notEqual((await exibir(bia, artigo)).get(artigo), primeira.get(artigo), "outro usuário tem a própria recomendação");

    const idImpressora = primeira.get(artigo);
    assert.equal(await servico.registrarClique({ id: idImpressora, usuarioId: bia }), false, "não mexe na recomendação de outra pessoa");
    assert.equal(await servico.registrarClique({ id: idImpressora, usuarioId: ana }), true);
    assert.ok((await linha(idImpressora)).clicado_em);

    // Caso 5: "Sim" sem chamado é resolução por autoatendimento.
    assert.equal(await servico.registrarResposta({ id: idImpressora, usuarioId: ana, resolveu: true }), true);
    const resolvida = await linha(idImpressora);
    assert.equal(resolvida.resolveu, true);
    assert.equal(resolvida.chamado_id, null);
    assert.notEqual((await exibir(ana, artigo)).get(artigo), idImpressora, "recomendação respondida não é reaproveitada");

    // Caso 6: "Não" e o chamado segue normalmente, ligado à recomendação que o usuário viu.
    const idEmail = primeira.get(outro);
    await servico.registrarResposta({ id: idEmail, usuarioId: ana, resolveu: false });
    assert.equal((await exibir(ana, outro)).get(outro), idEmail, "depois do \"não\" a mesma sugestão não conta de novo");
    assert.equal((await linha(idEmail)).resolveu, false, "reexibir não apaga a resposta");
    const chamado = await inserir("INSERT INTO chamados (titulo, descricao, usuario_id) VALUES ('E-mail', 'não chega', $1) RETURNING id", [ana]);
    const daBia = (await exibir(bia, outro)).get(outro);
    await servico.vincularChamado({ chamadoId: chamado, usuarioId: ana, ids: [idEmail, daBia, "x"] });
    assert.equal((await linha(idEmail)).chamado_id, chamado);
    assert.equal((await linha(daBia)).chamado_id, null, "não vincula recomendação de outro usuário");

    const { rows } = await client.query(
      "SELECT COUNT(*) FILTER (WHERE resolveu AND chamado_id IS NULL)::int AS autoatendimento FROM base_conhecimento_recomendacoes WHERE usuario_id = $1",
      [ana]
    );
    assert.equal(rows[0].autoatendimento, 1);
  } finally {
    await client.query("ROLLBACK");
    await client.end();
  }
});
