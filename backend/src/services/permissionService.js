/**
 * Responsabilidade: Serviço de domínio de permission; concentra regras reutilizáveis fora da camada HTTP.
 */
const pool = require("../config/database");
const { normalizarPerfil } = require("../utils/permissoes");

const PERMISSIONS = Object.freeze([
  { key: "visualizar_dashboard", label: "Visualizar dashboard", description: "Acessar indicadores e métricas operacionais." },
  { key: "visualizar_relatorios", label: "Visualizar relatórios", description: "Consultar indicadores e relatórios operacionais." },
  { key: "exportar_dados", label: "Exportar dados", description: "Exportar dados em CSV, Excel e PDF." },
  { key: "baixar_relatorios", label: "Baixar relatórios (legado)", description: "Compatibilidade com acessos existentes." },
  { key: "visualizar_patrimonio", label: "Visualizar patrimônio", description: "Consultar ativos e o mapa de equipamentos." },
  { key: "administrar_ativos", label: "Administrar ativos", description: "Alterar localização, estado e configurações dos agentes." },
  { key: "gerenciar_chamados", label: "Gerenciar chamados", description: "Alterar, assumir e concluir chamados." },
  { key: "assumir_chamados", label: "Assumir chamados", description: "Aceitar chamados disponíveis na fila." },
  { key: "delegar_chamados", label: "Delegar chamados", description: "Atribuir chamados a outros técnicos ou equipes." },
  { key: "alterar_prioridade", label: "Alterar prioridade", description: "Modificar a prioridade final com justificativa." },
  { key: "encerrar_chamados", label: "Encerrar chamados", description: "Resolver e encerrar atendimentos." },
  { key: "gerenciar_usuarios", label: "Gerenciar usuários", description: "Cadastrar, editar e conceder acessos." },
  { key: "alterar_configuracoes", label: "Alterar configurações", description: "Modificar parâmetros globais do sistema." },
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

const PROFILE_DEFAULTS = Object.freeze({
  usuario: [],
  tecnico: ["assumir_chamados", "alterar_prioridade", "encerrar_chamados", "gerenciar_chamados"],
  supervisor: ["visualizar_dashboard", "visualizar_relatorios", "assumir_chamados", "delegar_chamados", "alterar_prioridade", "encerrar_chamados", "gerenciar_chamados"],
});

async function listUserPermissions(userId, user) {
  if (hasFullAccess(user)) return PERMISSIONS.map((permission) => permission.key);
  const result = await pool.query("SELECT permissao FROM usuario_permissoes WHERE usuario_id = $1 ORDER BY permissao", [userId]);
  return [...new Set([...(PROFILE_DEFAULTS[normalizarPerfil(user?.perfil)] || []), ...result.rows.map((row) => row.permissao)])].filter((key) => KEYS.has(key));
}

async function userHasPermission(user, permission) {
  if (hasFullAccess(user)) return true;
  if ((PROFILE_DEFAULTS[normalizarPerfil(user?.perfil)] || []).includes(permission)) return true;
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
