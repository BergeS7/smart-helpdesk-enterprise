const pool = require("../config/database");
const { ehEquipe } = require("../utils/permissoes");

// A fila atual é compartilhada pelos perfis de suporte, mesmo sem atribuição.
async function notificarNovoChamadoNaFila(chamado, criarNotificacao) {
  if (chamado.responsavel_id != null) return;
  const result = await pool.query("SELECT id,perfil FROM usuarios WHERE COALESCE(status,'ativo')='ativo'");
  const destinatarios = result.rows.filter((usuario) => ehEquipe(usuario.perfil));
  await Promise.all(destinatarios.map((usuario) => criarNotificacao(
    usuario.id,
    "Novo chamado na fila",
    `${chamado.numero_chamado || `#${chamado.id}`} - ${chamado.titulo}`,
    "info",
    `/chamados/${chamado.id}`,
  )));
}

module.exports = { notificarNovoChamadoNaFila };
