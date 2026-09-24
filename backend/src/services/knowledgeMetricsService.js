/**
 * Responsabilidade: indicadores de uso e efetividade da base de conhecimento.
 */
const pool = require("../config/database");
const { efetividade } = require("../domain/knowledgeBase");

// Agregado por artigo, para ser ligado por LEFT JOIN em uma única consulta (sem N+1).
// Autoatendimento: o usuário disse que resolveu e não abriu chamado depois.
const SQL_EFETIVIDADE_POR_ARTIGO = `
  SELECT artigo_id,
    COUNT(*)::int AS recomendacoes,
    COUNT(clicado_em)::int AS cliques,
    COUNT(*) FILTER (WHERE resolveu AND chamado_id IS NULL)::int AS autoatendimentos,
    COUNT(*) FILTER (WHERE resolveu = FALSE)::int AS nao_resolveu
  FROM base_conhecimento_recomendacoes
  GROUP BY artigo_id`;

// Resumo para o dashboard. Recomendações seguem o período do dashboard; visualizações são
// um contador acumulado do artigo (não há histórico por data), por isso são totais.
async function resumoBase({ dias }) {
  const [totais, porArtigo] = await Promise.all([
    pool.query(
      `SELECT
         (SELECT COUNT(*) FROM base_conhecimento WHERE status = 'publicado')::int AS publicados,
         (SELECT COUNT(*) FROM base_conhecimento WHERE status = 'revisao')::int AS em_revisao,
         (SELECT COALESCE(SUM(visualizacoes), 0) FROM base_conhecimento)::int AS visualizacoes,
         COUNT(*)::int AS recomendacoes,
         COUNT(*) FILTER (WHERE resolveu AND chamado_id IS NULL)::int AS autoatendimentos
       FROM base_conhecimento_recomendacoes
       WHERE criado_em >= NOW() - make_interval(days => $1)`,
      [dias]
    ),
    pool.query(
      `SELECT e.recomendacoes, e.autoatendimentos FROM (${SQL_EFETIVIDADE_POR_ARTIGO}) e
       JOIN base_conhecimento b ON b.id = e.artigo_id AND b.status = 'publicado'`
    ),
  ]);
  const resumo = totais.rows[0];
  return {
    ...resumo,
    taxa_sucesso: efetividade(resumo).taxa_sucesso,
    artigos_revisar: porArtigo.rows.filter((artigo) => efetividade(artigo).revisar).length,
  };
}

module.exports = { SQL_EFETIVIDADE_POR_ARTIGO, resumoBase };
