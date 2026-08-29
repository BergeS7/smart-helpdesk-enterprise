/**
 * Responsabilidade: Serviço de domínio de priority schema; concentra regras reutilizáveis fora da camada HTTP.
 */
const pool=require("../config/database");
async function ensurePrioritySchema(){await pool.query(`
 ALTER TABLE chamados ADD COLUMN IF NOT EXISTS prioridade_ia_confianca NUMERIC(5,2);
 ALTER TABLE chamados ADD COLUMN IF NOT EXISTS prioridade_ia_analise JSONB;
 CREATE TABLE IF NOT EXISTS prioridade_ia_feedback(
  id BIGSERIAL PRIMARY KEY,chamado_id BIGINT NOT NULL REFERENCES chamados(id) ON DELETE CASCADE,
  prioridade_sugerida VARCHAR(30),prioridade_final VARCHAR(30) NOT NULL,motivo TEXT,
  corrigido_por BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,criado_em TIMESTAMPTZ DEFAULT NOW()
 );
 CREATE INDEX IF NOT EXISTS idx_prioridade_feedback_chamado ON prioridade_ia_feedback(chamado_id);
`)}
module.exports={ensurePrioritySchema};
