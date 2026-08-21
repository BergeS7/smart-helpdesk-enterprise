const pool = require("../config/database");

async function ensureEmailVerificationSchema() {
  await pool.query(`
    ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS email_verificado_em TIMESTAMPTZ;
    ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS email_verificacao_hash VARCHAR(128);
    ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS email_verificacao_expira_em TIMESTAMPTZ;
    ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS email_verificacao_tentativas INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS email_verificacao_enviado_em TIMESTAMPTZ;
    UPDATE usuarios
       SET email_verificado_em = COALESCE(email_verificado_em, CURRENT_TIMESTAMP)
     WHERE perfil IN ('desenvolvedor','developer','dev','super_admin');
  `);
}

module.exports = { ensureEmailVerificationSchema };
