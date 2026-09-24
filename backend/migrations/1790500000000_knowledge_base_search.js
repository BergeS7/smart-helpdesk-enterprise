/**
 * Base de conhecimento: busca textual em português (sem acentos e com radicais) e similaridade de título.
 * O vetor é uma coluna gerada: só é recalculado quando o artigo muda, nunca a cada busca.
 */
exports.up = (pgm) => pgm.sql(`
  CREATE EXTENSION IF NOT EXISTS unaccent;
  CREATE EXTENSION IF NOT EXISTS pg_trgm;

  DO $$
  BEGIN
    -- Stopwords antes do unaccent: a lista do português tem acento ("não", "já").
    IF NOT EXISTS (SELECT 1 FROM pg_ts_dict WHERE dictname = 'pt_stopwords') THEN
      CREATE TEXT SEARCH DICTIONARY pt_stopwords (TEMPLATE = simple, STOPWORDS = portuguese, ACCEPT = false);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_ts_config WHERE cfgname = 'pt_unaccent') THEN
      CREATE TEXT SEARCH CONFIGURATION pt_unaccent (COPY = portuguese);
      ALTER TEXT SEARCH CONFIGURATION pt_unaccent
        ALTER MAPPING FOR hword, hword_part, word WITH pt_stopwords, unaccent, portuguese_stem;
    END IF;
  END $$;

  -- Pesos: A título e palavras-chave; B resumo, problema e sintomas; C solução e passos; D conteúdo.
  ALTER TABLE base_conhecimento ADD COLUMN IF NOT EXISTS busca tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('pt_unaccent'::regconfig, coalesce(titulo, '') || ' ' || coalesce(palavras_chave, '')), 'A') ||
    setweight(to_tsvector('pt_unaccent'::regconfig, coalesce(resumo, '') || ' ' || coalesce(problema, '') || ' ' || coalesce(sintomas, '')), 'B') ||
    setweight(to_tsvector('pt_unaccent'::regconfig, coalesce(solucao, '') || ' ' || jsonb_path_query_array(passos, '$[*].texto')::text), 'C') ||
    setweight(to_tsvector('pt_unaccent'::regconfig, coalesce(conteudo, '')), 'D')
  ) STORED;

  CREATE INDEX IF NOT EXISTS idx_base_conhecimento_busca ON base_conhecimento USING GIN (busca);
`);

// As extensões ficam: podem ser usadas por outras partes do banco.
exports.down = (pgm) => pgm.sql(`
  DROP INDEX IF EXISTS idx_base_conhecimento_busca;
  ALTER TABLE base_conhecimento DROP COLUMN IF EXISTS busca;
  DROP TEXT SEARCH CONFIGURATION IF EXISTS pt_unaccent;
  DROP TEXT SEARCH DICTIONARY IF EXISTS pt_stopwords;
`);
