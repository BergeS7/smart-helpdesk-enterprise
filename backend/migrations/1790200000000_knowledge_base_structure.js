/** Base de conhecimento: campos estruturados do artigo e status de publicação. */
exports.up = (pgm) => pgm.sql(`
  -- A tabela nasce nos scripts de init; aqui só garante sua existência em bancos antigos.
  CREATE TABLE IF NOT EXISTS base_conhecimento (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(200) NOT NULL,
    categoria VARCHAR(120),
    palavras_chave TEXT,
    conteudo TEXT NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  ALTER TABLE base_conhecimento
    ADD COLUMN IF NOT EXISTS visualizacoes INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS util_total INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS nao_util_total INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS resumo TEXT,
    ADD COLUMN IF NOT EXISTS problema TEXT,
    ADD COLUMN IF NOT EXISTS sintomas TEXT,
    ADD COLUMN IF NOT EXISTS solucao TEXT,
    ADD COLUMN IF NOT EXISTS status VARCHAR(20),
    ADD COLUMN IF NOT EXISTS atualizado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL;

  -- Artigos existentes mantêm a visibilidade atual: ativo = publicado.
  UPDATE base_conhecimento
     SET status = CASE WHEN ativo THEN 'publicado' ELSE 'arquivado' END
   WHERE status IS NULL;

  ALTER TABLE base_conhecimento
    ALTER COLUMN status SET DEFAULT 'rascunho',
    ALTER COLUMN status SET NOT NULL,
    ADD CONSTRAINT base_conhecimento_status_check
      CHECK (status IN ('rascunho', 'revisao', 'publicado', 'arquivado'));

  CREATE INDEX IF NOT EXISTS idx_base_conhecimento_status ON base_conhecimento(status);
`);

exports.down = (pgm) => pgm.sql(`
  DROP INDEX IF EXISTS idx_base_conhecimento_status;
  ALTER TABLE base_conhecimento
    DROP CONSTRAINT IF EXISTS base_conhecimento_status_check,
    DROP COLUMN IF EXISTS atualizado_por,
    DROP COLUMN IF EXISTS status,
    DROP COLUMN IF EXISTS solucao,
    DROP COLUMN IF EXISTS sintomas,
    DROP COLUMN IF EXISTS problema,
    DROP COLUMN IF EXISTS resumo;
`);
