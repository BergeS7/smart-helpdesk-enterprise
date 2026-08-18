const pool = require("../config/database");

function normalizarTexto(valor) {
  return String(valor || "").trim();
}

function tipoValido(tipo) {
  return ["info", "warning", "danger", "success"].includes(String(tipo || "").trim());
}

function normalizarTipo(tipo) {
  return tipoValido(tipo) ? String(tipo).trim() : "info";
}

function parseBoolean(valor, fallback = true) {
  if (valor === undefined || valor === null || valor === "") return fallback;
  if (typeof valor === "boolean") return valor;
  return ["true", "1", "sim", "ativo"].includes(String(valor).toLowerCase());
}

function normalizarData(valor) {
  if (!valor) return null;
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return null;
  return data.toISOString();
}

async function listarAvisosAtivos(req, res) {
  try {
    const result = await pool.query(
      `SELECT
          id,
          titulo,
          mensagem,
          tipo,
          ativo,
          inicio_em,
          fim_em,
          criado_por,
          criado_em,
          atualizado_em
       FROM avisos_sistema
       WHERE ativo = TRUE
         AND (inicio_em IS NULL OR inicio_em <= CURRENT_TIMESTAMP)
         AND (fim_em IS NULL OR fim_em >= CURRENT_TIMESTAMP)
       ORDER BY criado_em DESC`
    );

    return res.json(result.rows);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      erro: "Erro ao listar avisos ativos",
      detalhe: error.message,
    });
  }
}

async function listarAvisosAdmin(req, res) {
  try {
    const result = await pool.query(
      `SELECT
          a.id,
          a.titulo,
          a.mensagem,
          a.tipo,
          a.ativo,
          a.inicio_em,
          a.fim_em,
          a.criado_por,
          a.criado_em,
          a.atualizado_em,
          u.nome AS criado_por_nome
       FROM avisos_sistema a
       LEFT JOIN usuarios u ON u.id = a.criado_por
       ORDER BY a.criado_em DESC`
    );

    return res.json(result.rows);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      erro: "Erro ao listar avisos administrativos",
      detalhe: error.message,
    });
  }
}

async function criarAvisoManutencao(req, res) {
  try {
    const {
      titulo,
      mensagem,
      tipo,
      ativo,
      inicio_em,
      fim_em,
    } = req.body;

    if (!normalizarTexto(titulo)) {
      return res.status(400).json({
        erro: "Título é obrigatório",
      });
    }

    if (!normalizarTexto(mensagem)) {
      return res.status(400).json({
        erro: "Mensagem é obrigatória",
      });
    }

    const result = await pool.query(
      `INSERT INTO avisos_sistema
       (titulo, mensagem, tipo, ativo, inicio_em, fim_em, criado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING
          id,
          titulo,
          mensagem,
          tipo,
          ativo,
          inicio_em,
          fim_em,
          criado_por,
          criado_em,
          atualizado_em`,
      [
        normalizarTexto(titulo),
        normalizarTexto(mensagem),
        normalizarTipo(tipo),
        parseBoolean(ativo, true),
        normalizarData(inicio_em),
        normalizarData(fim_em),
        req.user?.id || null,
      ]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      erro: "Erro ao criar aviso de manutenção",
      detalhe: error.message,
    });
  }
}

async function atualizarAvisoManutencao(req, res) {
  try {
    const { id } = req.params;

    const {
      titulo,
      mensagem,
      tipo,
      ativo,
      inicio_em,
      fim_em,
    } = req.body;

    const result = await pool.query(
      `UPDATE avisos_sistema
       SET
          titulo = COALESCE($1, titulo),
          mensagem = COALESCE($2, mensagem),
          tipo = COALESCE($3, tipo),
          ativo = COALESCE($4, ativo),
          inicio_em = $5,
          fim_em = $6,
          atualizado_em = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING
          id,
          titulo,
          mensagem,
          tipo,
          ativo,
          inicio_em,
          fim_em,
          criado_por,
          criado_em,
          atualizado_em`,
      [
        titulo !== undefined ? normalizarTexto(titulo) : null,
        mensagem !== undefined ? normalizarTexto(mensagem) : null,
        tipo !== undefined ? normalizarTipo(tipo) : null,
        ativo !== undefined ? parseBoolean(ativo, true) : null,
        inicio_em ? normalizarData(inicio_em) : null,
        fim_em ? normalizarData(fim_em) : null,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        erro: "Aviso não encontrado",
      });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      erro: "Erro ao atualizar aviso de manutenção",
      detalhe: error.message,
    });
  }
}

async function excluirAvisoManutencao(req, res) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM avisos_sistema
       WHERE id = $1
       RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        erro: "Aviso não encontrado",
      });
    }

    return res.json({
      mensagem: "Aviso excluído com sucesso",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      erro: "Erro ao excluir aviso de manutenção",
      detalhe: error.message,
    });
  }
}

module.exports = {
  listarAvisosAtivos,
  listarAvisosAdmin,
  criarAvisoManutencao,
  atualizarAvisoManutencao,
  excluirAvisoManutencao,
};