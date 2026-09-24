/** Base de conhecimento: visibilidade pública (usuários) ou interna (só a equipe técnica). */
exports.up = (pgm) => pgm.sql(`
  -- Artigos existentes continuam visíveis para todos, como já eram.
  ALTER TABLE base_conhecimento
    ADD COLUMN IF NOT EXISTS visibilidade VARCHAR(10) NOT NULL DEFAULT 'publico',
    ADD CONSTRAINT base_conhecimento_visibilidade_check CHECK (visibilidade IN ('publico', 'interno'));
`);

exports.down = (pgm) => pgm.sql(`
  ALTER TABLE base_conhecimento
    DROP CONSTRAINT IF EXISTS base_conhecimento_visibilidade_check,
    DROP COLUMN IF EXISTS visibilidade;
`);
