/**
 * Assistente da base de conhecimento: uma linha por pergunta feita no chat.
 * Guarda o que foi perguntado, os artigos usados, o desfecho e o consumo de tokens,
 * para a equipe ver o que a base não cobre e quanto a IA está custando.
 */
exports.up = (pgm) => pgm.sql(`
  CREATE TABLE IF NOT EXISTS assistente_interacoes (
    id BIGSERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    pergunta TEXT NOT NULL,
    situacao VARCHAR(20) NOT NULL,
    artigos_ids INTEGER[] NOT NULL DEFAULT '{}',
    modelo VARCHAR(60),
    tokens_entrada INTEGER NOT NULL DEFAULT 0,
    tokens_saida INTEGER NOT NULL DEFAULT 0,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_assistente_interacoes_situacao ON assistente_interacoes(situacao, criado_em DESC);
  CREATE INDEX IF NOT EXISTS idx_assistente_interacoes_usuario ON assistente_interacoes(usuario_id, criado_em DESC);
`);

exports.down = (pgm) => pgm.sql("DROP TABLE IF EXISTS assistente_interacoes;");
