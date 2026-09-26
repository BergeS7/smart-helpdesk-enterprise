/**
 * Responsabilidade: encontrar artigos da base relacionados ao texto de um chamado, com nota de confiança.
 * Usa a busca textual do Postgres (coluna busca) e a similaridade de título do pg_trgm; nada sai do banco.
 */
const pool = require("../config/database");
const busca = require("../config/knowledgeSearch");
const { condicaoLeitura, nivelConfianca } = require("../domain/knowledgeBase");

// Cada termo do texto vale 1 se aparece nos campos principais (pesos A e B) e menos nos demais.
// A cobertura é limitada por TERMOS_REFERENCIA para que descrições longas não diluam a nota.
// confiancaMinima permite a quem filtra depois (o assistente) receber candidatos mais fracos.
async function buscarArtigosRelacionados({ texto, user, confiancaMinima = busca.CONFIANCA_MINIMA }) {
  const consulta = String(texto || "").trim().slice(0, busca.TEXTO_MAX_CARACTERES);
  if (consulta.length < busca.TEXTO_MIN_CARACTERES) return [];

  const { rows } = await pool.query(
    `WITH termos AS (
       SELECT DISTINCT lexeme FROM unnest(to_tsvector('pt_unaccent', $1))
     ), consulta AS (
       SELECT to_tsquery('simple', string_agg(quote_literal(lexeme), ' | ')) AS q, count(*) AS total FROM termos
     ), candidatos AS (
       SELECT b.id, b.titulo, b.resumo, b.categoria, b.video_url, b.visibilidade, c.total,
         word_similarity(lower(b.titulo), lower($1)) AS similaridade_titulo,
         (SELECT COALESCE(SUM(CASE
             WHEN b.busca @@ to_tsquery('simple', quote_literal(t.lexeme) || ':AB') THEN 1
             WHEN b.busca @@ to_tsquery('simple', quote_literal(t.lexeme)) THEN $2::numeric
             ELSE 0 END), 0) FROM termos t) AS pontos
       FROM base_conhecimento b CROSS JOIN consulta c
       WHERE ${condicaoLeitura(user, "b")}
         AND (b.busca @@ c.q OR word_similarity(lower(b.titulo), lower($1)) >= $3)
     ), pontuados AS (
       SELECT id, titulo, resumo, categoria, video_url, visibilidade,
         ROUND(($4 * LEAST(1, COALESCE(pontos / NULLIF(LEAST(total, $5), 0), 0)) + $6 * similaridade_titulo)::numeric, 2) AS confianca
       FROM candidatos
     )
     SELECT * FROM pontuados WHERE confianca >= $7 ORDER BY confianca DESC, id LIMIT $8`,
    [
      consulta,
      busca.PESO_TERMO_SECUNDARIO,
      busca.SIMILARIDADE_TITULO_CANDIDATO,
      busca.PESO_TERMOS,
      busca.TERMOS_REFERENCIA,
      busca.PESO_TITULO,
      confiancaMinima,
      busca.MAX_RESULTADOS,
    ]
  );
  return rows.map((artigo) => {
    const confianca = Number(artigo.confianca);
    return { ...artigo, confianca, nivel: nivelConfianca(confianca) };
  });
}

module.exports = { buscarArtigosRelacionados };
