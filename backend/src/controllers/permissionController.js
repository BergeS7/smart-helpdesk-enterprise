const pool = require("../config/database");
const { PERMISSIONS, listUserPermissions, replaceUserPermissions } = require("../services/permissionService");

exports.catalog = async (_req, res) => res.json(PERMISSIONS);
exports.mine = async (req, res) => {
  try { res.json({ permissions: await listUserPermissions(req.user.id, req.user) }); }
  catch (error) { res.status(500).json({ erro: "Erro ao consultar permissões", detalhe: error.message }); }
};
exports.byUser = async (req, res) => {
  try {
    const target = await pool.query("SELECT id, nome, email, perfil FROM usuarios WHERE id = $1", [req.params.id]);
    if (!target.rows[0]) return res.status(404).json({ erro: "Usuário não encontrado" });
    res.json({ usuario: target.rows[0], permissions: await listUserPermissions(target.rows[0].id, target.rows[0]) });
  } catch (error) { res.status(500).json({ erro: "Erro ao consultar permissões", detalhe: error.message }); }
};
exports.update = async (req, res) => {
  try {
    const target = await pool.query("SELECT id, nome, perfil FROM usuarios WHERE id = $1", [req.params.id]);
    if (!target.rows[0]) return res.status(404).json({ erro: "Usuário não encontrado" });
    if (["admin", "desenvolvedor", "super_admin"].includes(String(target.rows[0].perfil))) return res.status(400).json({ erro: "Administradores já possuem acesso completo por padrão." });
    const permissions = await replaceUserPermissions(target.rows[0].id, req.body.permissions, req.user.id);
    await pool.query(`INSERT INTO auditoria (usuario_id, autor_nome, autor_perfil, entidade, entidade_id, acao, descricao, dados) VALUES ($1,$2,$3,'usuario',$4,'permissoes_atualizadas',$5,$6)`, [req.user.id, req.user.nome || "Administrador", req.user.perfil, target.rows[0].id, `Permissões de ${target.rows[0].nome} atualizadas.`, JSON.stringify({ permissions })]).catch(() => {});
    res.json({ usuario_id: target.rows[0].id, permissions });
  } catch (error) { res.status(500).json({ erro: "Erro ao atualizar permissões", detalhe: error.message }); }
};
