-- Rode este arquivo no banco smart_helpdesk se você já criou as tabelas antes.
-- Ele adiciona os campos novos sem apagar os chamados existentes.

ALTER TABLE chamados
  ADD COLUMN IF NOT EXISTS email_solicitante VARCHAR(160);

ALTER TABLE chamados
  ADD COLUMN IF NOT EXISTS prioridade_ia_motivo TEXT;

CREATE INDEX IF NOT EXISTS idx_chamados_email_solicitante
  ON chamados (LOWER(email_solicitante));

CREATE INDEX IF NOT EXISTS idx_chamados_status
  ON chamados (status);
