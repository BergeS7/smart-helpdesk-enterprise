/**
 * Responsabilidade: decidir quando um chamado resolvido deve virar artigo e reunir o material do rascunho.
 */
const pool = require("../config/database");
const { isFinal } = require("../domain/ticketStatus");
const { ehEquipe } = require("../utils/permissoes");
const { buscarArtigosRelacionados } = require("./knowledgeSearchService");
const { detectarRecorrencias } = require("./knowledgeRecurrenceService");

// O vínculo chamado -> rascunho fica na auditoria que já existe, sem coluna nova.
const ACAO_RASCUNHO = "criado_de_chamado";

async function rascunhoDoChamado(chamadoId) {
  const { rows } = await pool.query(
    `SELECT b.id, b.titulo, b.status FROM auditoria_sistema a
     JOIN base_conhecimento b ON b.id = a.entidade_id
     WHERE a.entidade = 'base_conhecimento' AND a.acao = $1 AND a.dados->>'chamado_id' = $2::text
     ORDER BY a.id DESC LIMIT 1`,
    [ACAO_RASCUNHO, chamadoId]
  );
  return rows[0] || null;
}

async function comentariosDaEquipe(chamadoId) {
  const { rows } = await pool.query(
    "SELECT mensagem, autor_perfil FROM chamado_comentarios WHERE chamado_id = $1 ORDER BY criado_em, id",
    [chamadoId]
  );
  return rows.filter((c) => ehEquipe(c.autor_perfil));
}

// Sugere só quando faz sentido: chamado encerrado, sem rascunho, sem artigo de alta confiança
// e parte de um problema recorrente (evita um artigo por chamado isolado).
async function analisarChamado({ chamado, user }) {
  if (!isFinal(chamado.status)) return { sugerir: false, motivo: "chamado_em_aberto" };
  const rascunho = await rascunhoDoChamado(chamado.id);
  if (rascunho) return { sugerir: false, motivo: "rascunho_existente", rascunho };

  const [relacionados, recorrencias] = await Promise.all([
    buscarArtigosRelacionados({ texto: `${chamado.titulo} ${chamado.descricao}`, user }),
    detectarRecorrencias({ user }),
  ]);
  const artigo = relacionados[0] || null;
  if (artigo?.nivel === "alta") return { sugerir: false, motivo: "artigo_existente", artigo };

  const grupo = recorrencias.find((g) => g.chamados_ids.includes(Number(chamado.id)));
  if (!grupo) return { sugerir: false, motivo: "sem_recorrencia", artigo };
  return { sugerir: true, motivo: "problema_recorrente", recorrencia: { quantidade: grupo.quantidade, dias: grupo.dias }, artigo };
}

module.exports = { ACAO_RASCUNHO, analisarChamado, comentariosDaEquipe, rascunhoDoChamado };
