/**
 * Responsabilidade: Controlador HTTP de catalog; valida a requisição e coordena regras e persistência.
 */
const pool = require("../config/database");

function tabelaValida(tipo) {
  if (tipo === "departamentos") return "departamentos";
  if (tipo === "tipos") return "tipos_chamado";
  return null;
}

const listarCatalogo = async (req, res) => {
  try {
    if (req.params.tipo === "cargos") {
      const result = await pool.query(
        `SELECT MIN(id) AS id, TRIM(cargo) AS nome, NULL::text AS descricao, TRUE AS ativo
         FROM usuarios
         WHERE NULLIF(TRIM(COALESCE(cargo, '')), '') IS NOT NULL
           AND LOWER(TRIM(cargo)) NOT IN ('desenvolvedor', 'developer')
         GROUP BY TRIM(cargo)
         ORDER BY TRIM(cargo) ASC`
      );
      return res.json(result.rows);
    }
    const tabela = tabelaValida(req.params.tipo);
    if (!tabela) return res.status(400).json({ erro: "Catálogo inválido" });
    const result = await pool.query(`SELECT * FROM ${tabela} ORDER BY ativo DESC, nome ASC`);
    return res.json(result.rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ erro: "Erro ao listar catálogo", detalhe: error.message });
  }
};

const criarCatalogo = async (req, res) => {
  try {
    const tabela = tabelaValida(req.params.tipo);
    if (!tabela) return res.status(400).json({ erro: "Catálogo inválido" });
    const { nome, descricao } = req.body;
    if (!nome) return res.status(400).json({ erro: "Nome é obrigatório" });
    const result = await pool.query(`INSERT INTO ${tabela} (nome, descricao) VALUES ($1, $2) RETURNING *`, [String(nome).trim(), descricao || null]);
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ erro: "Erro ao criar item", detalhe: error.message });
  }
};

const atualizarCatalogo = async (req, res) => {
  try {
    const tabela = tabelaValida(req.params.tipo);
    if (!tabela) return res.status(400).json({ erro: "Catálogo inválido" });
    const { nome, descricao, ativo } = req.body;
    const result = await pool.query(
      `UPDATE ${tabela} SET nome = COALESCE($1, nome), descricao = COALESCE($2, descricao), ativo = COALESCE($3, ativo) WHERE id = $4 RETURNING *`,
      [nome || null, descricao || null, typeof ativo === "boolean" ? ativo : null, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ erro: "Item não encontrado" });
    return res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ erro: "Erro ao atualizar item", detalhe: error.message });
  }
};

const listarBase = async (req, res) => {
  try {
    const { q, categoria } = req.query;
    const params = [];
    const where = ["ativo = TRUE"];
    if (categoria) { params.push(categoria); where.push(`LOWER(COALESCE(categoria,'')) = LOWER($${params.length})`); }
    if (q) { params.push(`%${q}%`, `%${q}%`, `%${q}%`); where.push(`(LOWER(titulo) LIKE LOWER($${params.length-2}) OR LOWER(COALESCE(palavras_chave,'')) LIKE LOWER($${params.length-1}) OR LOWER(conteudo) LIKE LOWER($${params.length}))`); }
    const result = await pool.query(`SELECT * FROM base_conhecimento WHERE ${where.join(" AND ")} ORDER BY COALESCE(visualizacoes, 0) DESC, atualizado_em DESC`, params);
    return res.json(result.rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ erro: "Erro ao listar base de conhecimento", detalhe: error.message });
  }
};

const criarBase = async (req, res) => {
  try {
    const { titulo, categoria, palavras_chave, conteudo, ativo } = req.body;
    if (!titulo || !conteudo) return res.status(400).json({ erro: "Título e conteúdo são obrigatórios" });
    const result = await pool.query(
      `INSERT INTO base_conhecimento (titulo, categoria, palavras_chave, conteudo, ativo, criado_por)
       VALUES ($1, $2, $3, $4, COALESCE($5, TRUE), $6) RETURNING *`,
      [titulo, categoria || null, palavras_chave || null, conteudo, typeof ativo === "boolean" ? ativo : true, req.user.id]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ erro: "Erro ao criar artigo", detalhe: error.message });
  }
};

const atualizarBase = async (req, res) => {
  try {
    const { titulo, categoria, palavras_chave, conteudo, ativo } = req.body;
    const result = await pool.query(
      `UPDATE base_conhecimento SET titulo = COALESCE($1, titulo), categoria = COALESCE($2, categoria), palavras_chave = COALESCE($3, palavras_chave), conteudo = COALESCE($4, conteudo), ativo = COALESCE($5, ativo), atualizado_em = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *`,
      [titulo || null, categoria || null, palavras_chave || null, conteudo || null, typeof ativo === "boolean" ? ativo : null, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ erro: "Artigo não encontrado" });
    return res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ erro: "Erro ao atualizar artigo", detalhe: error.message });
  }
};



const registrarVisualizacaoBase = async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE base_conhecimento
       SET visualizacoes = COALESCE(visualizacoes, 0) + 1,
           atualizado_em = atualizado_em
       WHERE id = $1
       RETURNING *`,
      [req.params.id]
    ).catch(() => ({ rows: [] }));
    if (result.rows.length === 0) return res.status(404).json({ erro: "Artigo não encontrado" });
    return res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ erro: "Erro ao registrar visualização", detalhe: error.message });
  }
};

const avaliarArtigoBase = async (req, res) => {
  try {
    const util = req.body.util === true || req.body.util === "true";
    const coluna = util ? "util_total" : "nao_util_total";
    const result = await pool.query(
      `UPDATE base_conhecimento
       SET ${coluna} = COALESCE(${coluna}, 0) + 1,
           atualizado_em = atualizado_em
       WHERE id = $1
       RETURNING *`,
      [req.params.id]
    ).catch(() => ({ rows: [] }));
    if (result.rows.length === 0) return res.status(404).json({ erro: "Artigo não encontrado" });
    return res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ erro: "Erro ao avaliar artigo", detalhe: error.message });
  }
};

module.exports = { listarCatalogo, criarCatalogo, atualizarCatalogo, listarBase, criarBase, atualizarBase, registrarVisualizacaoBase, avaliarArtigoBase };
