const pool = require("../config/database");

function emailNormalizado(value) {
  return String(value || "").trim().toLowerCase();
}

async function usuarioPodeAvaliarChamado(ticket, user) {
  if (!ticket || !user?.id) return false;
  const email = emailNormalizado(user.email);
  if (Number(ticket.usuario_id) === Number(user.id)) return true;
  if (email && emailNormalizado(ticket.email_solicitante) === email) return true;
  if (!ticket.ativo_id) return false;

  const result = await pool.query(
    `SELECT 1
       FROM ativos a
      WHERE a.id = $1
        AND (
          a.usuario_id = $2
          OR LOWER(COALESCE(a.usuario, '')) = LOWER($3)
          OR LOWER(COALESCE(a.usuario, '')) = LOWER($4)
          OR LOWER(REGEXP_REPLACE(COALESCE(a.usuario, ''), '^.*[\\\\/]', '')) = LOWER($5)
        )
      LIMIT 1`,
    [ticket.ativo_id, user.id, user.email || "", user.nome || "", email.split("@")[0] || ""]
  );
  return result.rowCount > 0;
}

module.exports = { usuarioPodeAvaliarChamado };
