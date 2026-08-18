-- Enterprise Teams: idempotent migration for existing installations.
CREATE TABLE IF NOT EXISTS teams (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  description TEXT,
  color VARCHAR(7) NOT NULL DEFAULT '#2563eb' CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
  manager_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  distribution_mode VARCHAR(20) NOT NULL DEFAULT 'manual' CHECK (distribution_mode IN ('manual','round_robin','least_load')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS team_users (
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  last_assigned_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (team_id, user_id)
);
ALTER TABLE chamados ADD COLUMN IF NOT EXISTS team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL;
ALTER TABLE chamados ADD COLUMN IF NOT EXISTS assigned_to INTEGER REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE chamados ADD COLUMN IF NOT EXISTS closed_hidden_at TIMESTAMP;
INSERT INTO configuracoes_sistema (chave, valor) VALUES ('closedTicketsHideAfter', '24h') ON CONFLICT (chave) DO NOTHING;
CREATE INDEX IF NOT EXISTS idx_team_users_user ON team_users(user_id);
CREATE INDEX IF NOT EXISTS idx_chamados_team_status ON chamados(team_id, status, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_chamados_assigned_to_status ON chamados(assigned_to, status);
