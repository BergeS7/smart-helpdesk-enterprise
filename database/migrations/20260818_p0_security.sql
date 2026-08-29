-- Responsabilidade: Estrutura ou migração de banco relacionada a 20260818 p0 security.
-- P0 security hardening (additive and safe for existing data).
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS reset_token_hash VARCHAR(128);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS reset_tentativas INTEGER NOT NULL DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS reset_bloqueado_ate TIMESTAMPTZ;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS reset_solicitado_em TIMESTAMPTZ;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS email_verificado_em TIMESTAMPTZ;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS email_verificacao_hash VARCHAR(128);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS email_verificacao_expira_em TIMESTAMPTZ;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS email_verificacao_tentativas INTEGER NOT NULL DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS email_verificacao_enviado_em TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS agente_convites (
  id BIGSERIAL PRIMARY KEY,
  token_hash VARCHAR(128) NOT NULL UNIQUE,
  descricao VARCHAR(255),
  criado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  expira_em TIMESTAMPTZ NOT NULL,
  usado_em TIMESTAMPTZ,
  revogado_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_agente_convites_validade ON agente_convites(expira_em) WHERE usado_em IS NULL AND revogado_em IS NULL;

-- Rollback documentado (não executar com dados em uso):
-- DROP TABLE agente_convites;
-- ALTER TABLE usuarios DROP COLUMN reset_solicitado_em, DROP COLUMN reset_bloqueado_ate,
--   DROP COLUMN reset_tentativas, DROP COLUMN reset_token_hash, DROP COLUMN token_version;
