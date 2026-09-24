/**
 * Responsabilidade: registrar recomendações da base exibidas ao usuário, cliques, respostas e o chamado aberto depois.
 */
const pool = require("../config/database");
const { JANELA_RECOMENDACAO_MINUTOS } = require("../config/knowledgeSearch");

// Uma consulta para todas as sugestões: reaproveita a recomendação do mesmo artigo enquanto o usuário
// continua no formulário (inclusive depois de um "não") ou cria uma nova. Só o "sim" encerra a recomendação.
// Devolve artigo_id -> id da recomendação.
async function registrarExibicoes({ usuarioId, sugestoes }) {
  if (!sugestoes.length) return new Map();
  const { rows } = await pool.query(
    `WITH entrada AS (
       SELECT * FROM unnest($2::int[], $3::numeric[]) AS e(artigo_id, confianca)
     ), existentes AS (
       UPDATE base_conhecimento_recomendacoes r SET confianca = e.confianca
       FROM entrada e
       WHERE r.artigo_id = e.artigo_id AND r.usuario_id = $1 AND r.chamado_id IS NULL AND r.resolveu IS NOT TRUE
         AND r.criado_em > CURRENT_TIMESTAMP - make_interval(mins => $4)
       RETURNING r.id, r.artigo_id
     ), novos AS (
       INSERT INTO base_conhecimento_recomendacoes (artigo_id, usuario_id, confianca)
       SELECT e.artigo_id, $1, e.confianca FROM entrada e
       WHERE e.artigo_id NOT IN (SELECT artigo_id FROM existentes)
       RETURNING id, artigo_id
     )
     SELECT id, artigo_id FROM existentes UNION ALL SELECT id, artigo_id FROM novos`,
    [usuarioId, sugestoes.map((s) => s.id), sugestoes.map((s) => s.confianca), JANELA_RECOMENDACAO_MINUTOS]
  );
  return new Map(rows.map((row) => [row.artigo_id, Number(row.id)]));
}

// Clique e resposta só valem para recomendações do próprio usuário.
async function registrarClique({ id, usuarioId }) {
  const { rowCount } = await pool.query(
    `UPDATE base_conhecimento_recomendacoes SET clicado_em = COALESCE(clicado_em, CURRENT_TIMESTAMP)
     WHERE id = $1 AND usuario_id = $2`,
    [id, usuarioId]
  );
  return rowCount > 0;
}

// "Sim" sem chamado vinculado é o que conta como resolução por autoatendimento. Nada é fechado aqui.
async function registrarResposta({ id, usuarioId, resolveu }) {
  const { rowCount } = await pool.query(
    `UPDATE base_conhecimento_recomendacoes
     SET resolveu = $3, respondido_em = CURRENT_TIMESTAMP, clicado_em = COALESCE(clicado_em, CURRENT_TIMESTAMP)
     WHERE id = $1 AND usuario_id = $2`,
    [id, usuarioId, resolveu]
  );
  return rowCount > 0;
}

// Ao abrir o chamado, liga a ele as recomendações que o usuário viu no formulário.
async function vincularChamado({ chamadoId, usuarioId, ids }) {
  const validos = [...new Set((Array.isArray(ids) ? ids : []).map(Number).filter(Number.isSafeInteger))];
  if (!validos.length) return;
  await pool.query(
    `UPDATE base_conhecimento_recomendacoes SET chamado_id = $1
     WHERE id = ANY($3::bigint[]) AND usuario_id = $2 AND chamado_id IS NULL`,
    [chamadoId, usuarioId, validos]
  );
}

module.exports = { registrarExibicoes, registrarClique, registrarResposta, vincularChamado };
