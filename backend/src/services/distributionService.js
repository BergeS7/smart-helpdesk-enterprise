const pool = require("../config/database");

const ACTIVE_STATUSES = ["OPEN", "IN_PROGRESS", "WAITING_USER", "WAITING_THIRD_PARTY", "REOPENED"];

/** Distribui chamados sem acoplar a regra de seleção ao controlador. */
async function selectAssignee(teamId, mode) {
  if (!teamId || mode === "manual") return null;
  const orderBy = mode === "round_robin"
    ? "COALESCE(tu.last_assigned_at, TIMESTAMP 'epoch') ASC, u.id ASC"
    : "COUNT(c.id) FILTER (WHERE c.status = ANY($2::text[])) ASC, u.id ASC";
  const result = await pool.query(
    `SELECT u.id, u.nome
       FROM team_users tu
       JOIN usuarios u ON u.id = tu.user_id
       LEFT JOIN chamados c ON c.responsavel_id = u.id
      WHERE tu.team_id = $1
        AND COALESCE(u.status, 'ativo') = 'ativo'
        AND COALESCE(u.disponivel_atendimento, TRUE) = TRUE
        AND COALESCE(u.perfil, 'usuario') IN ('tecnico','admin','desenvolvedor','super_admin')
      GROUP BY u.id, u.nome, tu.last_assigned_at
      ORDER BY ${orderBy}
      LIMIT 1`,
    [teamId, ACTIVE_STATUSES]
  );
  return result.rows[0] || null;
}

async function distributeTicket({ teamId, distributionMode }) {
  const assignee = await selectAssignee(teamId, distributionMode);
  if (assignee && distributionMode === "round_robin") {
    await pool.query(
      "UPDATE team_users SET last_assigned_at = CURRENT_TIMESTAMP WHERE team_id = $1 AND user_id = $2",
      [teamId, assignee.id]
    );
  }
  return assignee;
}

module.exports = { distributeTicket, selectAssignee };
