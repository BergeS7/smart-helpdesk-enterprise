/**
 * Responsabilidade: Serviço de domínio de sla pause schema; concentra regras reutilizáveis fora da camada HTTP.
 */
const pool = require("../config/database");

async function ensureSlaPauseSchema() {
  await pool.query(`
    ALTER TABLE chamados
      ADD COLUMN IF NOT EXISTS sla_pausado_em TIMESTAMP,
      ADD COLUMN IF NOT EXISTS sla_tempo_pausado_segundos BIGINT NOT NULL DEFAULT 0;

    UPDATE chamados
       SET sla_pausado_em = COALESCE(sla_pausado_em, atualizado_em, CURRENT_TIMESTAMP),
           vencido = FALSE
     WHERE status = 'WAITING_USER'
       AND sla_pausado_em IS NULL;
  `);
}

module.exports = { ensureSlaPauseSchema };
