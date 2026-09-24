/**
 * Responsabilidade: respostas rápidas e filtros salvos da equipe de atendimento.
 */
const pool = require("../../config/database");
const { normalizarTexto, usuarioEhEquipe } = require("./comum");

const listarRespostasRapidas = async (req, res) => {
  try {
    if (!usuarioEhEquipe(req)) return res.status(403).json({ erro: "Acesso não autorizado" });
    const result = await pool.query(
      `SELECT id, titulo, mensagem, categoria, ativo
       FROM respostas_rapidas
       WHERE ativo = TRUE
       ORDER BY categoria NULLS LAST, titulo ASC`
    );
    return res.json(result.rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ erro: "Erro ao listar respostas rápidas", detalhe: error.message });
  }
};

const criarRespostaRapida = async (req, res) => {
  try {
    if (!usuarioEhEquipe(req)) return res.status(403).json({ erro: "Acesso não autorizado" });
    const { titulo, mensagem, categoria } = req.body;
    if (!titulo || !mensagem) return res.status(400).json({ erro: "Título e mensagem são obrigatórios" });
    const result = await pool.query(
      `INSERT INTO respostas_rapidas (titulo, mensagem, categoria, criado_por)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [normalizarTexto(titulo), normalizarTexto(mensagem), categoria || null, req.user.id]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ erro: "Erro ao criar resposta rápida", detalhe: error.message });
  }
};

const listarFiltrosSalvos = async (req, res) => {
  try {
    if (!usuarioEhEquipe(req)) return res.status(403).json({ erro: "Acesso não autorizado" });
    const result = await pool.query(
      `SELECT id, nome, filtros, criado_em
       FROM filtros_salvos
       WHERE usuario_id = $1
       ORDER BY criado_em DESC`,
      [req.user.id]
    ).catch(() => ({ rows: [] }));
    return res.json(result.rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ erro: "Erro ao listar filtros salvos", detalhe: error.message });
  }
};

const salvarFiltro = async (req, res) => {
  try {
    if (!usuarioEhEquipe(req)) return res.status(403).json({ erro: "Acesso não autorizado" });
    const { nome, filtros } = req.body;
    if (!nome) return res.status(400).json({ erro: "Nome do filtro é obrigatório" });
    const result = await pool.query(
      `INSERT INTO filtros_salvos (usuario_id, nome, filtros)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [req.user.id, normalizarTexto(nome), filtros || {}]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ erro: "Erro ao salvar filtro", detalhe: error.message });
  }
};

const excluirFiltro = async (req, res) => {
  try {
    if (!usuarioEhEquipe(req)) return res.status(403).json({ erro: "Acesso não autorizado" });
    await pool.query("DELETE FROM filtros_salvos WHERE id = $1 AND usuario_id = $2", [req.params.id, req.user.id]);
    return res.json({ mensagem: "Filtro removido" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ erro: "Erro ao excluir filtro", detalhe: error.message });
  }
};

module.exports = {
  listarRespostasRapidas,
  criarRespostaRapida,
  listarFiltrosSalvos,
  salvarFiltro,
  excluirFiltro,
};
