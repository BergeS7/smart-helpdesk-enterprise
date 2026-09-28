/**
 * Responsabilidade: valida a detecção de problemas recorrentes contra um PostgreSQL real (caso 7).
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const { ARTIGOS, CHAMADOS_RECORRENTES } = require("./fixtures/baseConhecimento");

// Exclusivamente um banco descartável com as migrations aplicadas; tudo roda numa transação desfeita no fim.
test("PostgreSQL: problemas recorrentes e cobertura pela base", {
  skip: !process.env.KB_TEST_DATABASE_URL,
}, async () => {
  const { Client } = require("pg");
  const client = new Client({ connectionString: process.env.KB_TEST_DATABASE_URL });
  await client.connect();
  // Conexão direta (sem o contexto da requisição): os dados de teste entram na empresa principal.
  await client.query("SELECT set_config('app.empresa_id', '1', false)");
  const databasePath = require.resolve("../src/config/database");
  require.cache[databasePath] = { id: databasePath, filename: databasePath, loaded: true, exports: client };
  for (const modulo of ["../src/services/knowledgeRecurrenceService", "../src/services/knowledgeSearchService", "../src/services/knowledgeMetricsService"]) {
    delete require.cache[require.resolve(modulo)];
  }
  const { detectarRecorrencias } = require("../src/services/knowledgeRecurrenceService");

  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM base_conhecimento_recomendacoes");
    await client.query("DELETE FROM base_conhecimento");
    await client.query("DELETE FROM chamados");
    for (const a of ARTIGOS) {
      await client.query(
        `INSERT INTO base_conhecimento (titulo, categoria, palavras_chave, resumo, problema, sintomas, solucao, passos, conteudo, status, visibilidade)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [a.titulo, a.categoria, a.palavras_chave, a.resumo, a.problema || null, a.sintomas || null, a.solucao || null,
          JSON.stringify(a.passos || []), a.conteudo, a.status, a.visibilidade]
      );
    }
    const chamado = (titulo, descricao, { tipo = "Incidente", status = "OPEN", diasAtras = 1 } = {}) => client.query(
      "INSERT INTO chamados (titulo, descricao, tipo_chamado, status, criado_em) VALUES ($1, $2, $3, $4, NOW() - make_interval(days => $5))",
      [titulo, descricao, tipo, status, diasAtras]
    );
    for (const lista of Object.values(CHAMADOS_RECORRENTES)) for (const [titulo, descricao] of lista) await chamado(titulo, descricao);
    // Não entram na conta: demanda de desenvolvimento, chamado cancelado e chamado fora da janela.
    await chamado("Automação da VPN", "Automatizar a conexão da VPN", { tipo: "Automação" });
    await chamado("VPN não conecta", "Aberto por engano", { status: "CANCELED" });
    await chamado("VPN lenta", "Chamado antigo sobre a VPN", { diasAtras: 45 });

    const grupos = await detectarRecorrencias({ user: { id: 1, perfil: "tecnico" } });
    const resumo = grupos.map((g) => ({ quantidade: g.quantidade, situacao: g.situacao, artigo: g.artigo?.titulo || null }));
    assert.deepEqual(resumo, [
      { quantidade: 6, situacao: "sem_artigo", artigo: null },
      { quantidade: 5, situacao: "coberto", artigo: "Impressora não imprime" },
    ], "caso 7: VPN recorrente sem artigo; impressora recorrente com artigo; Wi-Fi abaixo do mínimo");
    assert.match(grupos[0].titulo, /VPN/i);
    assert.equal(grupos[0].exemplos.length, 5, "exemplos limitados");
    assert.ok(grupos[0].exemplos.every((e) => /vpn/i.test(e.titulo) || e.titulo === "Problema na VPN do notebook"));
  } finally {
    await client.query("ROLLBACK");
    await client.end();
  }
});
