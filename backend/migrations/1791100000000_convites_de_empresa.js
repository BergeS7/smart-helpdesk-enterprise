/**
 * SaaS multiempresa — fase 4: cadastro de empresas pela plataforma.
 * - plano passa a aceitar só os planos comerciais (planilha de margem): essencial, profissional, enterprise.
 * - empresa_convites guarda o link de liberação: o responsável abre, cria a senha e vira o admin.
 *   A tabela é da plataforma (só modo sistema); a RLS fica ligada para manter a regra de que toda
 *   tabela com empresa_id é isolada, e o papel das empresas não recebe permissão nela.
 */
exports.up = (pgm) => pgm.sql(`
  UPDATE empresas SET plano = 'enterprise' WHERE plano NOT IN ('essencial', 'profissional', 'enterprise');
  ALTER TABLE empresas ALTER COLUMN plano SET DEFAULT 'essencial';
  ALTER TABLE empresas DROP CONSTRAINT IF EXISTS ck_empresas_plano;
  ALTER TABLE empresas ADD CONSTRAINT ck_empresas_plano CHECK (plano IN ('essencial', 'profissional', 'enterprise'));

  CREATE TABLE IF NOT EXISTS empresa_convites (
    id SERIAL PRIMARY KEY,
    empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    email VARCHAR(160) NOT NULL,
    token_hash CHAR(64) NOT NULL UNIQUE,
    expira_em TIMESTAMPTZ NOT NULL,
    usado_em TIMESTAMPTZ,
    revogado_em TIMESTAMPTZ,
    criado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_empresa_convites_empresa ON empresa_convites (empresa_id, criado_em DESC);

  ALTER TABLE empresa_convites ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS isolamento_empresa ON empresa_convites;
  CREATE POLICY isolamento_empresa ON empresa_convites
    USING (empresa_id = NULLIF(current_setting('app.empresa_id', true), '')::integer);
  REVOKE ALL ON empresa_convites FROM helpdesk_empresa;
`);

exports.down = (pgm) => pgm.sql(`
  DROP TABLE IF EXISTS empresa_convites;
  ALTER TABLE empresas DROP CONSTRAINT IF EXISTS ck_empresas_plano;
  ALTER TABLE empresas ALTER COLUMN plano SET DEFAULT 'padrao';
`);
