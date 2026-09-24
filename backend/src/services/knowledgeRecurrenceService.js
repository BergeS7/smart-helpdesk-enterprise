/**
 * Responsabilidade: detectar problemas recorrentes nos chamados e verificar se a base já os cobre.
 * Reaproveita a mesma análise de texto da busca de artigos (configuração pt_unaccent).
 */
const pool = require("../config/database");
const cfg = require("../config/knowledgeSearch");
const { agruparChamados, efetividade, situacaoRecorrencia } = require("../domain/knowledgeBase");
const { buscarArtigosRelacionados } = require("./knowledgeSearchService");
const { SQL_EFETIVIDADE_POR_ARTIGO } = require("./knowledgeMetricsService");
const { getJson, setJson, remove } = require("./redisCacheService");
const { ehEquipe } = require("../utils/permissoes");

// Demandas de desenvolvimento seguem outro fluxo e não são "problemas" da base.
const TIPOS_DESENVOLVIMENTO = ["bug", "melhoria", "automacao", "integracao", "dashboard / relatorio", "novo sistema"];
const EXEMPLOS_POR_GRUPO = 5;

async function carregarChamados() {
  const genericos = await pool.query(
    "SELECT ARRAY(SELECT lexeme FROM unnest(to_tsvector('pt_unaccent', $1))) AS termos",
    [cfg.RECORRENCIA_PALAVRAS_GENERICAS]
  );
  const { rows } = await pool.query(
    `SELECT c.id, c.numero_chamado, c.titulo, c.descricao, c.criado_em,
       ARRAY(SELECT lexeme FROM unnest(to_tsvector('pt_unaccent', coalesce(c.titulo, '') || ' ' || coalesce(c.descricao, '')))) AS termos,
       ARRAY(SELECT lexeme FROM unnest(to_tsvector('pt_unaccent', coalesce(c.titulo, '')))) AS termos_titulo
     FROM chamados c
     WHERE c.criado_em >= NOW() - make_interval(days => $1)
       AND c.status <> 'CANCELED'
       AND lower(unaccent(coalesce(c.tipo_chamado, ''))) <> ALL($2::text[])
     ORDER BY c.criado_em DESC
     LIMIT $3`,
    [cfg.RECORRENCIA_DIAS, TIPOS_DESENVOLVIMENTO, cfg.RECORRENCIA_MAX_CHAMADOS]
  );
  return { chamados: rows, termosGenericos: new Set(genericos.rows[0].termos) };
}

// Uma consulta para a efetividade de todos os artigos encontrados (sem N+1).
async function carregarEfetividade(artigoIds) {
  if (!artigoIds.length) return new Map();
  const { rows } = await pool.query(`SELECT * FROM (${SQL_EFETIVIDADE_POR_ARTIGO}) e WHERE e.artigo_id = ANY($1::int[])`, [artigoIds]);
  return new Map(rows.map((row) => [row.artigo_id, row]));
}

// A equipe enxerga artigos internos; os demais não. Por isso há um cache para cada visão.
const chaveCache = (user) => `cache:kb-recorrencias:${ehEquipe(user?.perfil) ? "equipe" : "publico"}`;

async function limparCacheRecorrencias() {
  await Promise.all([remove(chaveCache({ perfil: "tecnico" })), remove(chaveCache({ perfil: "usuario" }))]);
}

async function detectarRecorrencias({ user }) {
  const emCache = await getJson(chaveCache(user));
  if (emCache) return emCache;
  const grupos = await calcularRecorrencias({ user });
  await setJson(chaveCache(user), grupos, cfg.RECORRENCIA_CACHE_SEGUNDOS);
  return grupos;
}

// "user" é quem consulta (equipe técnica): artigos internos contam como existentes, mas são sinalizados.
async function calcularRecorrencias({ user }) {
  const { chamados, termosGenericos } = await carregarChamados();
  const grupos = agruparChamados(chamados, {
    sobreposicaoMinima: cfg.RECORRENCIA_SOBREPOSICAO,
    minChamados: cfg.RECORRENCIA_MIN_CHAMADOS,
    termosGenericos,
  })
    .sort((a, b) => b.chamados.length - a.chamados.length)
    .slice(0, cfg.RECORRENCIA_MAX_GRUPOS);

  // O texto do chamado mais central representa o grupo na busca de artigos.
  const artigos = await Promise.all(grupos.map(async ({ representante }) =>
    (await buscarArtigosRelacionados({ texto: `${representante.titulo} ${representante.descricao}`, user }))[0] || null
  ));
  const metricas = await carregarEfetividade(artigos.filter(Boolean).map((artigo) => artigo.id));

  return grupos.map(({ chamados, representante }, i) => {
    const encontrado = artigos[i];
    const artigo = encontrado && { ...encontrado, recomendacoes: 0, autoatendimentos: 0, ...metricas.get(encontrado.id) };
    const datas = chamados.map((c) => new Date(c.criado_em).getTime());
    return {
      quantidade: chamados.length,
      dias: cfg.RECORRENCIA_DIAS,
      primeiro_em: new Date(Math.min(...datas)).toISOString(),
      ultimo_em: new Date(Math.max(...datas)).toISOString(),
      titulo: representante.titulo,
      exemplos: chamados.slice(0, EXEMPLOS_POR_GRUPO).map(({ id, numero_chamado, titulo }) => ({ id, numero_chamado, titulo })),
      artigo: artigo ? { ...artigo, ...efetividade(artigo) } : null,
      situacao: situacaoRecorrencia(artigo),
    };
  });
}

module.exports = { detectarRecorrencias, limparCacheRecorrencias };
