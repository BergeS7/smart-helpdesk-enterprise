/**
 * Responsabilidade: registro de auditoria e de movimentações do chamado.
 */
const pool = require("../../config/database");

async function registrarAuditoria(req, entidade, entidadeId, acao, descricao, dados = null) {
  await pool.query(
    `INSERT INTO auditoria_sistema
     (usuario_id, autor_nome, autor_perfil, entidade, entidade_id, acao, descricao, dados)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [req.user?.id || null, req.user?.nome || "Sistema", req.user?.perfil || "sistema", entidade, entidadeId || null, acao, descricao, dados]
  ).catch((err) => console.error("Erro auditoria:", err.message));
}

async function registrarMovimentacao(chamadoId, req, tipo, descricao) {
  const autorNome = req.user?.nome || "Sistema";
  const autorPerfil = req.user?.perfil || "sistema";
  const usuarioId = req.user?.id || null;
  await pool.query(
    `INSERT INTO chamado_movimentacoes
     (chamado_id, usuario_id, autor_nome, autor_perfil, tipo, descricao)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [chamadoId, usuarioId, autorNome, autorPerfil, tipo, descricao]
  );
  await registrarAuditoria(req, "chamado", chamadoId, tipo, descricao);
}

module.exports = {
  registrarAuditoria,
  registrarMovimentacao,
};
