/**
 * Responsabilidade: Controlador HTTP de catalog; valida a requisição e coordena regras e persistência.
 */
const pool = require("../config/database");
const { normalizarArtigo } = require("../domain/knowledgeBase");
const { userHasPermission } = require("../services/permissionService");
const { registrarAuditoria } = require("./chamados/registro");

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

// Quem gerencia a base pode pedir todos os status (?todos=true); os demais veem só publicados.
const listarBase = async (req, res) => {
  try {
    const { q, categoria } = req.query;
    const params = [];
    const where = [];
    const gestao = req.query.todos === "true" && await userHasPermission(req.user, "gerenciar_base");
    if (!gestao) where.push("b.status = 'publicado'");
    if (categoria) { params.push(categoria); where.push(`LOWER(COALESCE(b.categoria,'')) = LOWER($${params.length})`); }
    if (q) { params.push(`%${q}%`); where.push(`CONCAT_WS(' ', b.titulo, b.palavras_chave, b.resumo, b.problema, b.sintomas, b.solucao, b.conteudo) ILIKE $${params.length}`); }
    const result = await pool.query(
      `SELECT b.*, autor.nome AS autor_nome, editor.nome AS atualizado_por_nome
       FROM base_conhecimento b
       LEFT JOIN usuarios autor ON autor.id = b.criado_por
       LEFT JOIN usuarios editor ON editor.id = b.atualizado_por
       ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
       ORDER BY COALESCE(b.visualizacoes, 0) DESC, b.atualizado_em DESC`,
      params
    );
    return res.json(result.rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ erro: "Erro ao listar base de conhecimento", detalhe: error.message });
  }
};

const criarBase = async (req, res) => {
  try {
    const { dados, erros } = normalizarArtigo(req.body, { criacao: true });
    if (erros.length) return res.status(400).json({ erro: erros[0], detalhes: erros });
    // As colunas vêm da lista fixa do domínio, nunca do corpo da requisição.
    const campos = { ...dados, criado_por: req.user.id, atualizado_por: req.user.id };
    const colunas = Object.keys(campos);
    const result = await pool.query(
      `INSERT INTO base_conhecimento (${colunas.join(", ")})
       VALUES (${colunas.map((_, i) => `$${i + 1}`).join(", ")}) RETURNING *`,
      Object.values(campos)
    );
    const artigo = result.rows[0];
    await registrarAuditoria(req, "base_conhecimento", artigo.id, "criado", `Artigo "${artigo.titulo}" criado como ${artigo.status}.`);
    return res.status(201).json(artigo);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ erro: "Erro ao criar artigo", detalhe: error.message });
  }
};

const atualizarBase = async (req, res) => {
  try {
    const { dados, erros } = normalizarArtigo(req.body);
    if (erros.length) return res.status(400).json({ erro: erros[0], detalhes: erros });
    const colunas = Object.keys(dados);
    if (!colunas.length) return res.status(400).json({ erro: "Nenhum campo para atualizar" });
    const valores = [...Object.values(dados), req.user.id, req.params.id];
    const result = await pool.query(
      `UPDATE base_conhecimento
       SET ${colunas.map((coluna, i) => `${coluna} = $${i + 1}`).join(", ")},
           atualizado_por = $${valores.length - 1}, atualizado_em = CURRENT_TIMESTAMP
       WHERE id = $${valores.length} RETURNING *`,
      valores
    );
    if (result.rows.length === 0) return res.status(404).json({ erro: "Artigo não encontrado" });
    const artigo = result.rows[0];
    await registrarAuditoria(req, "base_conhecimento", artigo.id, "atualizado", `Artigo "${artigo.titulo}" atualizado (${artigo.status}).`, { campos: colunas });
    return res.json(artigo);
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
       WHERE id = $1 AND status = 'publicado'
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
       WHERE id = $1 AND status = 'publicado'
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

module.exports = { 
   listarCatalogo,
   criarCatalogo,
   atualizarCatalogo, 
   listarBase, 
   criarBase, 
   atualizarBase, 
   registrarVisualizacaoBase, 
   avaliarArtigoBase,
  };

  
 // (👉ﾟヮﾟ)👉 👈(ﾟヮﾟ👈)