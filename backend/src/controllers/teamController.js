const pool = require("../config/database");

const MODES = new Set(["manual", "round_robin", "least_load"]);
const TEAM_PROFILES = new Set(["tecnico", "admin", "desenvolvedor", "super_admin"]);

function text(value, max = 255) { return String(value || "").trim().slice(0, max); }
function id(value) { const number = Number(value); return Number.isInteger(number) && number > 0 ? number : null; }
function isAdmin(req) { return ["admin", "desenvolvedor", "super_admin"].includes(req.user?.perfil); }

async function isManager(req, teamId) {
  if (isAdmin(req)) return true;
  const result = await pool.query("SELECT 1 FROM teams WHERE id = $1 AND manager_id = $2 AND active = TRUE", [teamId, req.user?.id]);
  return result.rowCount > 0;
}

async function getTeam(teamId) {
  const result = await pool.query(
    `SELECT t.*, m.nome AS manager_name,
      COUNT(tu.user_id)::int AS members_count
     FROM teams t
     LEFT JOIN usuarios m ON m.id = t.manager_id
     LEFT JOIN team_users tu ON tu.team_id = t.id
     WHERE t.id = $1
     GROUP BY t.id, m.nome`, [teamId]
  );
  return result.rows[0] || null;
}

exports.list = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, m.nome AS manager_name, COUNT(tu.user_id)::int AS members_count
       FROM teams t LEFT JOIN usuarios m ON m.id = t.manager_id
       LEFT JOIN team_users tu ON tu.team_id = t.id
       WHERE ($1::boolean OR t.active = TRUE)
       GROUP BY t.id, m.nome ORDER BY t.active DESC, t.name ASC`,
      [isAdmin(req)]
    );
    res.json(result.rows);
  } catch (error) { res.status(500).json({ erro: "Erro ao listar equipes" }); }
};

exports.get = async (req, res) => {
  try { const team = await getTeam(id(req.params.id)); return team ? res.json(team) : res.status(404).json({ erro: "Equipe não encontrada" }); }
  catch (_) { return res.status(400).json({ erro: "Identificador de equipe inválido" }); }
};

exports.create = async (req, res) => {
  try {
    const name = text(req.body.name, 120); const description = text(req.body.description, 1000);
    const managerId = id(req.body.manager_id); const color = /^#[0-9a-f]{6}$/i.test(text(req.body.color, 7)) ? text(req.body.color, 7) : "#2563eb";
    const distributionMode = MODES.has(req.body.distribution_mode) ? req.body.distribution_mode : "manual";
    if (!name) return res.status(400).json({ erro: "Nome da equipe é obrigatório" });
    if (managerId) {
      const manager = await pool.query("SELECT perfil FROM usuarios WHERE id = $1", [managerId]);
      if (!manager.rows[0] || !TEAM_PROFILES.has(manager.rows[0].perfil)) return res.status(400).json({ erro: "Gerente deve ser um atendente ativo" });
    }
    const created = await pool.query(
      `INSERT INTO teams (name, description, color, manager_id, distribution_mode)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`, [name, description || null, color, managerId, distributionMode]
    );
    if (managerId) await pool.query("INSERT INTO team_users (team_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING", [created.rows[0].id, managerId]);
    res.status(201).json(await getTeam(created.rows[0].id));
  } catch (error) { if (error.code === "23505") return res.status(409).json({ erro: "Já existe uma equipe com este nome" }); res.status(500).json({ erro: "Erro ao criar equipe" }); }
};

exports.update = async (req, res) => {
  try {
    const teamId = id(req.params.id); if (!teamId) return res.status(400).json({ erro: "Identificador inválido" });
    if (!(await isManager(req, teamId))) return res.status(403).json({ erro: "Somente o gerente da equipe pode alterá-la" });
    const current = await getTeam(teamId); if (!current) return res.status(404).json({ erro: "Equipe não encontrada" });
    const name = req.body.name === undefined ? current.name : text(req.body.name, 120);
    if (!name) return res.status(400).json({ erro: "Nome da equipe é obrigatório" });
    const mode = req.body.distribution_mode === undefined ? current.distribution_mode : req.body.distribution_mode;
    if (!MODES.has(mode)) return res.status(400).json({ erro: "Modo de distribuição inválido" });
    const managerId = req.body.manager_id === undefined ? current.manager_id : id(req.body.manager_id);
    await pool.query(
      `UPDATE teams SET name=$1, description=$2, color=$3, manager_id=$4, active=$5, distribution_mode=$6, updated_at=CURRENT_TIMESTAMP WHERE id=$7`,
      [name, req.body.description === undefined ? current.description : text(req.body.description, 1000) || null, req.body.color === undefined ? current.color : (/^#[0-9a-f]{6}$/i.test(text(req.body.color, 7)) ? text(req.body.color, 7) : current.color), managerId, req.body.active === undefined ? current.active : Boolean(req.body.active), mode, teamId]
    );
    if (managerId) await pool.query("INSERT INTO team_users (team_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING", [teamId, managerId]);
    res.json(await getTeam(teamId));
  } catch (error) { res.status(500).json({ erro: "Erro ao atualizar equipe" }); }
};

exports.remove = async (req, res) => {
  try { const teamId = id(req.params.id); if (!isAdmin(req)) return res.status(403).json({ erro: "Somente administradores podem excluir equipes" }); const result = await pool.query("DELETE FROM teams WHERE id = $1 RETURNING id", [teamId]); return result.rowCount ? res.status(204).end() : res.status(404).json({ erro: "Equipe não encontrada" }); }
  catch (_) { return res.status(400).json({ erro: "Não foi possível excluir a equipe vinculada a chamados" }); }
};

exports.members = async (req, res) => {
  try { const teamId = id(req.params.id); const result = await pool.query(`SELECT u.id,u.nome,u.email,u.perfil,u.departamento,tu.created_at FROM team_users tu JOIN usuarios u ON u.id=tu.user_id WHERE tu.team_id=$1 ORDER BY u.nome`, [teamId]); res.json(result.rows); }
  catch (_) { res.status(400).json({ erro: "Identificador inválido" }); }
};

exports.addMember = async (req, res) => {
  try { const teamId=id(req.params.id), userId=id(req.body.user_id); if (!teamId || !userId) return res.status(400).json({ erro: "Usuário e equipe são obrigatórios" }); if (!(await isManager(req, teamId))) return res.status(403).json({ erro: "Somente o gerente pode gerenciar membros" }); const user=await pool.query("SELECT perfil FROM usuarios WHERE id=$1 AND COALESCE(status,'ativo')='ativo'",[userId]); if (!user.rows[0] || !TEAM_PROFILES.has(user.rows[0].perfil)) return res.status(400).json({ erro: "Apenas atendentes ativos podem participar da equipe" }); await pool.query("INSERT INTO team_users (team_id,user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",[teamId,userId]); res.status(201).json({ mensagem:"Membro adicionado" }); }
  catch (_) { res.status(500).json({ erro:"Erro ao adicionar membro" }); }
};

exports.removeMember = async (req, res) => {
  try { const teamId=id(req.params.id), userId=id(req.params.userId); if (!(await isManager(req, teamId))) return res.status(403).json({ erro:"Somente o gerente pode gerenciar membros" }); const team=await getTeam(teamId); if (team?.manager_id===userId) return res.status(400).json({ erro:"Transfira a gerência antes de remover este membro" }); await pool.query("DELETE FROM team_users WHERE team_id=$1 AND user_id=$2",[teamId,userId]); res.status(204).end(); }
  catch (_) { res.status(400).json({ erro:"Identificador inválido" }); }
};

exports.changeManager = async (req, res) => {
  try { const teamId=id(req.params.id), userId=id(req.body.user_id); if (!isAdmin(req)) return res.status(403).json({ erro:"Somente administradores podem transferir a gerência" }); const member=await pool.query("SELECT 1 FROM team_users WHERE team_id=$1 AND user_id=$2",[teamId,userId]); if (!member.rowCount) return res.status(400).json({ erro:"O novo gerente deve fazer parte da equipe" }); await pool.query("UPDATE teams SET manager_id=$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2",[userId,teamId]); res.json(await getTeam(teamId)); }
  catch (_) { res.status(400).json({ erro:"Não foi possível transferir a gerência" }); }
};

exports.searchUsers = async (req, res) => {
  try { const q=text(req.query.q,120); const result=await pool.query(`SELECT id,nome,email,perfil,departamento FROM usuarios WHERE COALESCE(status,'ativo')='ativo' AND perfil = ANY($1::text[]) AND ($2='' OR nome ILIKE '%' || $2 || '%' OR email ILIKE '%' || $2 || '%') ORDER BY nome LIMIT 30`,[Array.from(TEAM_PROFILES),q]); res.json(result.rows); }
  catch (_) { res.status(500).json({ erro:"Erro ao pesquisar usuários" }); }
};
