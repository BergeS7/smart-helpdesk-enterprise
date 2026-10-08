/**
 * Responsabilidade: Serviço de domínio de privacy compliance; concentra regras reutilizáveis fora da camada HTTP.
 */
const pool = require("../config/database");

const LEGAL_VERSION = "2026-08-08";

async function ensurePrivacyComplianceSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS aceites_legais (
      id BIGSERIAL PRIMARY KEY,
      usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
      versao_privacidade VARCHAR(20) NOT NULL,
      versao_termos VARCHAR(20) NOT NULL,
      ip VARCHAR(100),
      user_agent TEXT,
      aceito_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_aceites_legais_usuario ON aceites_legais(usuario_id, aceito_em DESC);
  `);
}

async function recordLegalAcceptance({ userId, req }) {
  await pool.query(
    `INSERT INTO aceites_legais(usuario_id,versao_privacidade,versao_termos,ip,user_agent)
     VALUES($1,$2,$2,$3,$4)`,
    [userId, LEGAL_VERSION, String(req.ip || "").slice(0, 100), String(req.headers["user-agent"] || "").slice(0, 1000)]
  );
}

// Inventários completos com mais de 180 dias saem, menos o mais recente de cada máquina e os que
// têm alteração registrada (troca de memória, disco...): o histórico de mudanças fica inteiro.
async function applyPrivacyRetention() {
  const result = await pool.query(`
    WITH deleted_metrics AS (
      DELETE FROM ativo_metricas WHERE coletado_em < NOW() - INTERVAL '90 days' RETURNING 1
    ), deleted_snapshots AS (
      DELETE FROM ativo_snapshots s
       WHERE s.coletado_em < NOW() - INTERVAL '180 days'
         AND NOT EXISTS (SELECT 1 FROM ativo_alteracoes al WHERE al.snapshot_id = s.id)
         AND s.id <> (SELECT recente.id FROM ativo_snapshots recente WHERE recente.ativo_id = s.ativo_id
                       ORDER BY recente.coletado_em DESC, recente.id DESC LIMIT 1)
      RETURNING 1
    ), cleared_reset_tokens AS (
      UPDATE usuarios SET reset_token=NULL, reset_expira_em=NULL
      WHERE reset_expira_em < NOW() RETURNING 1
    )
    SELECT
      (SELECT COUNT(*) FROM deleted_metrics)::int AS metricas_removidas,
      (SELECT COUNT(*) FROM deleted_snapshots)::int AS inventarios_removidos,
      (SELECT COUNT(*) FROM cleared_reset_tokens)::int AS tokens_expirados_removidos;
  `);
  return result.rows[0];
}

function startPrivacyRetentionSchedule() {
  const run = () => applyPrivacyRetention().catch((error) => console.error("Erro na retenção LGPD:", error.message));
  run();
  const timer = setInterval(run, 24 * 60 * 60 * 1000);
  timer.unref?.();
}

module.exports = { LEGAL_VERSION, ensurePrivacyComplianceSchema, recordLegalAcceptance, applyPrivacyRetention, startPrivacyRetentionSchedule };
