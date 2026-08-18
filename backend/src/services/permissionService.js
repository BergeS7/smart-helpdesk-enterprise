const pool = require("../config/database");
const { normalizarPerfil } = require("../utils/permissoes");

const PERMISSIONS = Object.freeze([
  { key: "visualizar_dashboard", label: "Visualizar dashboard", description: "Acessar indicadores e métricas operacionais." },
  { key: "baixar_relatorios", label: "Baixar relatórios", description: "Exportar relatórios em CSV, Excel e PDF." },
  { key: "visualizar_patrimonio", label: "Visualizar patrimônio", description: "Consultar ativos e o mapa de equipamentos." },
  { key: "gerenciar_chamados", label: "Gerenciar chamados", description: "Alterar, assumir e concluir chamados." },
  { key: "gerenciar_base", label: "Gerenciar base", description: "Criar e editar artigos da base de conhecimento." },
]);
const KEYS = new Set(PERMISSIONS.map((permission) => permission.key));

async function ensurePermissionSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuario_permissoes (
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      permissao VARCHAR(80) NOT NULL,
      concedida_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
      concedida_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (usuario_id, permissao)
    );
    CREATE INDEX IF NOT EXISTS idx_usuario_permissoes_usuario ON usuario_permissoes(usuario_id);
  `);
}

function hasFullAccess(user) {
  return ["admin", "desenvolvedor"].includes(normalizarPerfil(user?.perfil));
}

async function listUserPermissions(userId, user) {
  if (hasFullAccess(user)) return PERMISSIONS.map((permission) => permission.key);
  const result = await pool.query("SELECT permissao FROM usuario_permissoes WHERE usuario_id = $1 ORDER BY permissao", [userId]);
  return result.rows.map((row) => row.permissao).filter((key) => KEYS.has(key));
}

async function userHasPermission(user, permission) {
  if (hasFullAccess(user)) return true;
  if (normalizarPerfil(user?.perfil) === "tecnico" && permission === "gerenciar_chamados") return true;
  if (!KEYS.has(permission) || !user?.id) return false;
  const result = await pool.query("SELECT 1 FROM usuario_permissoes WHERE usuario_id = $1 AND permissao = $2", [user.id, permission]);
  return result.rowCount > 0;
}

async function replaceUserPermissions(userId, permissions, grantedBy) {
  const valid = [...new Set((Array.isArray(permissions) ? permissions : []).filter((key) => KEYS.has(key)))];
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM usuario_permissoes WHERE usuario_id = $1", [userId]);
    for (const permission of valid) await client.query("INSERT INTO usuario_permissoes (usuario_id, permissao, concedida_por) VALUES ($1, $2, $3)", [userId, permission, grantedBy || null]);
    await client.query("COMMIT");
    return valid;
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}

module.exports = { PERMISSIONS, ensurePermissionSchema, hasFullAccess, listUserPermissions, userHasPermission, replaceUserPermissions };
