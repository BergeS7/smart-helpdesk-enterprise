BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM chamados WHERE responsavel_id IS NULL AND NULLIF(BTRIM(responsavel),'') IS NOT NULL AND status NOT IN ('RESOLVED','CLOSED','CANCELED')) THEN
    RAISE EXCEPTION 'Migration interrompida: há chamados ativos dependentes apenas do nome do responsável';
  END IF;
  IF EXISTS (
    SELECT 1 FROM chamados c
    WHERE c.team_id IS NOT NULL AND c.responsavel_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM team_users tu WHERE tu.team_id=c.team_id AND tu.user_id=c.responsavel_id)
  ) THEN
    RAISE EXCEPTION 'Migration interrompida: há responsáveis fora da equipe do chamado';
  END IF;
END $$;

DROP INDEX IF EXISTS idx_chamados_assigned_to_status;
ALTER TABLE chamados DROP COLUMN IF EXISTS assigned_to;

CREATE OR REPLACE FUNCTION validar_atribuicao_chamado() RETURNS trigger AS $$
DECLARE nome_responsavel TEXT;
BEGIN
  IF NEW.team_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM teams WHERE id=NEW.team_id AND active=TRUE) THEN
    RAISE EXCEPTION 'A equipe atribuída deve estar ativa';
  END IF;
  IF NEW.responsavel_id IS NOT NULL THEN
    SELECT nome INTO nome_responsavel FROM usuarios
      WHERE id=NEW.responsavel_id AND COALESCE(status,'ativo')='ativo'
        AND perfil IN ('tecnico','admin','desenvolvedor','super_admin');
    IF nome_responsavel IS NULL THEN RAISE EXCEPTION 'O responsável deve ser um atendente ativo'; END IF;
    IF NEW.team_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM team_users WHERE team_id=NEW.team_id AND user_id=NEW.responsavel_id) THEN
      RAISE EXCEPTION 'O responsável deve ser membro da equipe atribuída';
    END IF;
    NEW.responsavel := nome_responsavel;
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validar_atribuicao_chamado ON chamados;
CREATE TRIGGER trg_validar_atribuicao_chamado
BEFORE INSERT OR UPDATE OF responsavel_id, team_id ON chamados
FOR EACH ROW EXECUTE FUNCTION validar_atribuicao_chamado();

CREATE OR REPLACE FUNCTION proteger_membro_com_chamado_ativo() RETURNS trigger AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM chamados WHERE team_id=OLD.team_id AND responsavel_id=OLD.user_id AND status NOT IN ('RESOLVED','CLOSED','CANCELED')) THEN
    RAISE EXCEPTION 'Reatribua os chamados ativos antes de remover o membro da equipe';
  END IF;
  RETURN OLD;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_proteger_membro_com_chamado_ativo ON team_users;
CREATE TRIGGER trg_proteger_membro_com_chamado_ativo
BEFORE DELETE ON team_users FOR EACH ROW EXECUTE FUNCTION proteger_membro_com_chamado_ativo();

CREATE OR REPLACE FUNCTION devolver_chamados_de_usuario_inativo() RETURNS trigger AS $$
BEGIN
  IF COALESCE(OLD.status,'ativo')='ativo' AND COALESCE(NEW.status,'ativo')<>'ativo' THEN
    UPDATE chamados SET responsavel_id=NULL, atualizado_em=CURRENT_TIMESTAMP
      WHERE responsavel_id=NEW.id AND status NOT IN ('RESOLVED','CLOSED','CANCELED');
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_devolver_chamados_usuario_inativo ON usuarios;
CREATE TRIGGER trg_devolver_chamados_usuario_inativo
AFTER UPDATE OF status ON usuarios FOR EACH ROW EXECUTE FUNCTION devolver_chamados_de_usuario_inativo();

CREATE INDEX IF NOT EXISTS idx_chamados_responsavel_status ON chamados(responsavel_id,status,atualizado_em DESC);
COMMIT;

-- Rollback estrutural (a coluna passa a espelhar responsavel_id; não volta a ser autoridade):
-- ALTER TABLE chamados ADD COLUMN assigned_to INTEGER REFERENCES usuarios(id) ON DELETE SET NULL;
-- UPDATE chamados SET assigned_to=responsavel_id;
-- DROP TRIGGER trg_validar_atribuicao_chamado ON chamados;
-- DROP TRIGGER trg_proteger_membro_com_chamado_ativo ON team_users;
-- DROP TRIGGER trg_devolver_chamados_usuario_inativo ON usuarios;
