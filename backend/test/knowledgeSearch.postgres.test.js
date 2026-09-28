/**
 * Responsabilidade: valida a busca de artigos relacionados contra um PostgreSQL real (casos do item 23).
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const { ARTIGOS, CONSULTAS } = require("./fixtures/baseConhecimento");

// Exclusivamente um banco descartável com as migrations aplicadas; tudo roda numa transação desfeita no fim.
test("PostgreSQL: recomendação por confiança e visibilidade", {
  skip: !process.env.KB_TEST_DATABASE_URL,
}, async () => {
  const { Client } = require("pg");
  const client = new Client({ connectionString: process.env.KB_TEST_DATABASE_URL });
  await client.connect();
  // Conexão direta (sem o contexto da requisição): os dados de teste entram na empresa principal.
  await client.query("SELECT set_config('app.empresa_id', '1', false)");
  const databasePath = require.resolve("../src/config/database");
  require.cache[databasePath] = { id: databasePath, filename: databasePath, loaded: true, exports: client };
  delete require.cache[require.resolve("../src/services/knowledgeSearchService")];
  const { buscarArtigosRelacionados } = require("../src/services/knowledgeSearchService");

  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM base_conhecimento");
    const ids = {};
    for (const a of ARTIGOS) {
      const { rows } = await client.query(
        `INSERT INTO base_conhecimento (titulo, categoria, palavras_chave, resumo, problema, sintomas, solucao, passos, conteudo, status, visibilidade, ativo)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::text, $11, $10::text = 'publicado') RETURNING id`,
        [a.titulo, a.categoria, a.palavras_chave, a.resumo, a.problema || null, a.sintomas || null, a.solucao || null,
          JSON.stringify(a.passos || []), a.conteudo, a.status, a.visibilidade]
      );
      ids[rows[0].id] = a.chave;
    }
    const usuario = { id: 1, perfil: "usuario" };
    const tecnico = { id: 2, perfil: "tecnico" };
    const buscar = async (texto, user = usuario) =>
      (await buscarArtigosRelacionados({ texto, user })).map((r) => ({ chave: ids[r.id], nivel: r.nivel, confianca: r.confianca }));

    const alta = await buscar(CONSULTAS.altaRelacao);
    assert.equal(alta[0].chave, "impressora", "caso 1: artigo altamente relacionado");
    assert.equal(alta[0].nivel, "alta");

    const parcial = await buscar(CONSULTAS.parcial);
    assert.deepEqual(parcial.map((r) => [r.chave, r.nivel]), [["erp_lento", "moderada"]], "caso 2: ajuda possível");

    assert.deepEqual(await buscar(CONSULTAS.semRelacao), [], "caso 3: nada relacionado");

    assert.equal((await buscar(CONSULTAS.interno)).some((r) => r.chave === "senha_ad"), false, "caso 4: interno oculto do usuário");
    assert.equal((await buscar(CONSULTAS.interno, tecnico))[0].chave, "senha_ad", "interno visível para a equipe");

    const digitacao = await buscar(CONSULTAS.comErroDeDigitacao);
    assert.equal(digitacao[0].chave, "impressora", "erro de digitação ainda encontra pelo título");

    assert.equal((await buscar(CONSULTAS.textoLongo))[0].chave, "impressora", "texto longo e informal");
    assert.equal((await buscar(CONSULTAS.rascunho)).some((r) => r.chave === "boleto_rascunho"), false, "rascunho nunca é sugerido");
    assert.deepEqual(await buscar("curto"), [], "texto curto demais não consulta o banco");

    for (const texto of Object.values(CONSULTAS)) {
      const resultado = await buscar(texto, tecnico);
      assert.ok(resultado.length <= 3, "no máximo 3 sugestões");
      assert.ok(resultado.every((r) => r.confianca >= 0.4), "nada abaixo da confiança mínima");
    }
  } finally {
    await client.query("ROLLBACK");
    await client.end();
  }
});
