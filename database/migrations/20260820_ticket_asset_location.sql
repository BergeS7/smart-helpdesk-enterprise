-- Responsabilidade: Estrutura ou migração de banco relacionada a 20260820 ticket asset location.
ALTER TABLE chamados ADD COLUMN IF NOT EXISTS ativo_id BIGINT;
ALTER TABLE chamados ADD COLUMN IF NOT EXISTS ativo_hostname VARCHAR(255);
ALTER TABLE chamados ADD COLUMN IF NOT EXISTS ativo_patrimonio VARCHAR(100);
ALTER TABLE chamados ADD COLUMN IF NOT EXISTS ativo_municipio VARCHAR(150);
ALTER TABLE chamados ADD COLUMN IF NOT EXISTS ativo_unidade VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_chamados_ativo ON chamados(ativo_id);
CREATE INDEX IF NOT EXISTS idx_chamados_ativo_local ON chamados(ativo_municipio, ativo_unidade);

COMMENT ON COLUMN chamados.ativo_id IS 'Ativo relacionado ao chamado';
COMMENT ON COLUMN chamados.ativo_municipio IS 'Fotografia do município do ativo no momento da abertura';
COMMENT ON COLUMN chamados.ativo_unidade IS 'Fotografia da unidade/local de atendimento do ativo no momento da abertura';
