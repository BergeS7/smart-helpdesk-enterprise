-- Responsabilidade: Estrutura ou migração de banco relacionada a 20260923 agent releases.
-- Pacotes da atualização automática do agente. O servidor só armazena; o agente
-- confere a assinatura RSA com a chave pública instalada em cada computador.
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
