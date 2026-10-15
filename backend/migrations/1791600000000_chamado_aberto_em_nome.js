/**
 * Abertura de chamado em nome do usuário: técnico, supervisor ou admin registra o atendimento
 * recebido por telefone, presencialmente ou pelo monitoramento, e o usuário atendido fica como
 * solicitante. Quem registrou e por qual canal ficam guardados à parte, para auditoria e métricas.
 * Chamados antigos ficam com aberto_por_id vazio: foram abertos pelo próprio solicitante.
 */
exports.up = (pgm) => pgm.sql(`
  ALTER TABLE chamados ADD COLUMN IF NOT EXISTS aberto_por_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL;
  ALTER TABLE chamados ADD COLUMN IF NOT EXISTS aberto_por_nome VARCHAR(255);
  ALTER TABLE chamados ADD COLUMN IF NOT EXISTS canal_abertura VARCHAR(30);
  CREATE INDEX IF NOT EXISTS idx_chamados_aberto_por ON chamados(aberto_por_id);

  COMMENT ON COLUMN chamados.aberto_por_id IS 'Membro da equipe que registrou o chamado em nome do solicitante';
  COMMENT ON COLUMN chamados.canal_abertura IS 'Canal pelo qual o pedido chegou: portal, telefone, presencial, email, whatsapp, monitoramento ou outro';
`);

exports.down = (pgm) => pgm.sql(`
  DROP INDEX IF EXISTS idx_chamados_aberto_por;
  ALTER TABLE chamados DROP COLUMN IF EXISTS canal_abertura;
  ALTER TABLE chamados DROP COLUMN IF EXISTS aberto_por_nome;
  ALTER TABLE chamados DROP COLUMN IF EXISTS aberto_por_id;
`);
