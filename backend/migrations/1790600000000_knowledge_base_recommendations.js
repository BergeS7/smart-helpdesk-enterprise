/**
 * Recomendações da base: uma linha por artigo exibido a um usuário, com clique e resposta "resolveu?".
 * Tabela própria porque a recomendação acontece antes de existir chamado e a taxa de sucesso
 * depende do evento individual (os contadores do artigo não guardam usuário nem chamado).
 */
exports.up = (pgm) => pgm.sql(`
  CREATE TABLE IF NOT EXISTS base_conhecimento_recomendacoes (
    id BIGSERIAL PRIMARY KEY,
    artigo_id INTEGER NOT NULL REFERENCES base_conhecimento(id) ON DELETE CASCADE,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    chamado_id INTEGER REFERENCES chamados(id) ON DELETE SET NULL,
    confianca NUMERIC(3, 2) NOT NULL CHECK (confianca BETWEEN 0 AND 1),
    clicado_em TIMESTAMP,
    resolveu BOOLEAN,
    respondido_em TIMESTAMP,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK ((resolveu IS NULL) = (respondido_em IS NULL))
  );

  CREATE INDEX IF NOT EXISTS idx_kb_recomendacoes_artigo ON base_conhecimento_recomendacoes(artigo_id);
  CREATE INDEX IF NOT EXISTS idx_kb_recomendacoes_usuario ON base_conhecimento_recomendacoes(usuario_id, criado_em DESC);
`);

exports.down = (pgm) => pgm.sql("DROP TABLE IF EXISTS base_conhecimento_recomendacoes;");
