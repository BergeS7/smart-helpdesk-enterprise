-- Kept in the Docker initialization folder for fresh volumes.
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
CREATE INDEX IF NOT EXISTS idx_chamados_team_criado ON chamados(team_id, criado_em DESC);
ALTER TABLE chamados ADD COLUMN IF NOT EXISTS closed_hidden_at TIMESTAMP;
INSERT INTO configuracoes_sistema (chave, valor) VALUES ('closedTicketsHideAfter', '24h') ON CONFLICT (chave) DO NOTHING;
CREATE INDEX IF NOT EXISTS idx_team_users_user ON team_users(user_id);
CREATE INDEX IF NOT EXISTS idx_chamados_team_status ON chamados(team_id, status, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_chamados_responsavel_status ON chamados(responsavel_id, status, atualizado_em DESC);

CREATE OR REPLACE FUNCTION validar_atribuicao_chamado() RETURNS trigger AS $$
DECLARE nome_responsavel TEXT;
BEGIN
  IF NEW.team_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM teams WHERE id=NEW.team_id AND active=TRUE) THEN RAISE EXCEPTION 'A equipe atribuída deve estar ativa'; END IF;
  IF NEW.responsavel_id IS NOT NULL THEN
    SELECT nome INTO nome_responsavel FROM usuarios WHERE id=NEW.responsavel_id AND COALESCE(status,'ativo')='ativo' AND perfil IN ('tecnico','admin','desenvolvedor','super_admin');
    IF nome_responsavel IS NULL THEN RAISE EXCEPTION 'O responsável deve ser um atendente ativo'; END IF;
    IF NEW.team_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM team_users WHERE team_id=NEW.team_id AND user_id=NEW.responsavel_id) THEN RAISE EXCEPTION 'O responsável deve ser membro da equipe atribuída'; END IF;
    NEW.responsavel := nome_responsavel;
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_validar_atribuicao_chamado BEFORE INSERT OR UPDATE OF responsavel_id,team_id ON chamados FOR EACH ROW EXECUTE FUNCTION validar_atribuicao_chamado();

CREATE OR REPLACE FUNCTION proteger_membro_com_chamado_ativo() RETURNS trigger AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM chamados WHERE team_id=OLD.team_id AND responsavel_id=OLD.user_id AND status NOT IN ('RESOLVED','CLOSED','CANCELED')) THEN RAISE EXCEPTION 'Reatribua os chamados ativos antes de remover o membro da equipe'; END IF;
  RETURN OLD;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_proteger_membro_com_chamado_ativo BEFORE DELETE ON team_users FOR EACH ROW EXECUTE FUNCTION proteger_membro_com_chamado_ativo();

CREATE OR REPLACE FUNCTION devolver_chamados_de_usuario_inativo() RETURNS trigger AS $$
BEGIN
  IF COALESCE(OLD.status,'ativo')='ativo' AND COALESCE(NEW.status,'ativo')<>'ativo' THEN UPDATE chamados SET responsavel_id=NULL,atualizado_em=CURRENT_TIMESTAMP WHERE responsavel_id=NEW.id AND status NOT IN ('RESOLVED','CLOSED','CANCELED'); END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_devolver_chamados_usuario_inativo AFTER UPDATE OF status ON usuarios FOR EACH ROW EXECUTE FUNCTION devolver_chamados_de_usuario_inativo();
