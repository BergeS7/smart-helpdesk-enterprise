-- Responsabilidade: Estrutura ou migração de banco relacionada a 20260818 p1 ticket location.
BEGIN;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS municipio VARCHAR(150);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS unidade VARCHAR(180);
ALTER TABLE chamados ADD COLUMN IF NOT EXISTS municipio_solicitante VARCHAR(150);
ALTER TABLE chamados ADD COLUMN IF NOT EXISTS unidade_solicitante VARCHAR(180);
CREATE INDEX IF NOT EXISTS idx_chamados_municipio_criado ON chamados(municipio_solicitante, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_chamados_unidade_criado ON chamados(unidade_solicitante, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_chamados_team_criado ON chamados(team_id, criado_em DESC);
COMMENT ON COLUMN chamados.municipio_solicitante IS 'Fotografia do município do solicitante no momento da abertura';
COMMENT ON COLUMN chamados.unidade_solicitante IS 'Fotografia da unidade do solicitante no momento da abertura';
UPDATE ativo_unidades SET ativa = FALSE WHERE municipio NOT IN ('Santa Inês', 'Santa Luzia do Tide', 'Bom Jardim', 'Pio XII', 'Brejo de Areia', 'Alto Alegre do Pindaré', 'Vitória do Mearim', 'Luís Domingues', 'Amapá do Maranhão', 'Carutapera', 'Bela Vista do Maranhão', 'Satubinha', 'Tufilândia', 'Altamira do Maranhão', 'Buriticupu', 'Igarapé do Meio', 'Godofredo Viana', 'Boa Vista do Gurupi', 'Maracaçumé', 'Santa Luzia do Paruá', 'Governador Nunes Freire', 'Cândido Mendes', 'Monção', 'Pindaré-Mirim', 'Junco do Maranhão', 'São João do Carú', 'Presidente Médici');
COMMIT;
