/** Pacotes assinados da atualização automática do agente; o agente confere a assinatura. */
exports.up = (pgm) => pgm.sql(`
  CREATE TABLE IF NOT EXISTS agente_versoes (
    id BIGSERIAL PRIMARY KEY,
    versao VARCHAR(20) UNIQUE NOT NULL,
    sha256 CHAR(64) NOT NULL,
    assinatura TEXT NOT NULL,
    pacote BYTEA NOT NULL,
    tamanho_bytes INTEGER NOT NULL,
    ativa BOOLEAN NOT NULL DEFAULT TRUE,
    publicado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    publicado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revogado_em TIMESTAMPTZ
  );
`);

exports.down = (pgm) => pgm.sql("DROP TABLE IF EXISTS agente_versoes;");
