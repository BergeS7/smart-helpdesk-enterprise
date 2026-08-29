-- Responsabilidade: Estrutura ou migração de banco relacionada a 20260821 email verification.
BEGIN;

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS email_verificado_em TIMESTAMPTZ;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS email_verificacao_hash VARCHAR(128);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS email_verificacao_expira_em TIMESTAMPTZ;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS email_verificacao_tentativas INTEGER NOT NULL DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS email_verificacao_enviado_em TIMESTAMPTZ;

-- Contas administrativas existentes permanecem acessíveis após a migração.
UPDATE usuarios
   SET email_verificado_em = COALESCE(email_verificado_em, CURRENT_TIMESTAMP)
 WHERE perfil IN ('desenvolvedor','developer','dev','super_admin');

COMMIT;
