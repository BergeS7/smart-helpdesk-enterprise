/**
 * Responsabilidade: Controlador HTTP de notification; valida a requisição e coordena regras e persistência.
 */
const pool = require("../config/database");

const listarNotificacoes = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM notificacoes WHERE usuario_id = $1 ORDER BY criado_em DESC LIMIT 50", [req.user.id]);
    return res.json(result.rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ erro: "Erro ao listar notificações", detalhe: error.message });
  }
};

const marcarLida = async (req, res) => {
  try {
    await pool.query("UPDATE notificacoes SET lida = TRUE WHERE usuario_id = $1 AND ($2::int IS NULL OR id = $2)", [req.user.id, req.params.id || null]);
    return res.json({ mensagem: "Notificação atualizada" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ erro: "Erro ao atualizar notificação", detalhe: error.message });
  }
};

module.exports = { listarNotificacoes, marcarLida };
