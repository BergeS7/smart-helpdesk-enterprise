/** Base de conhecimento: passo a passo (com imagem opcional por passo) e link de vídeo. */
exports.up = (pgm) => pgm.sql(`
  -- Os passos são sempre lidos e gravados juntos, em ordem, e só existem dentro do artigo:
  -- um array JSONB evita uma tabela extra. Imagens ficam no storage; aqui só a referência.
  ALTER TABLE base_conhecimento
    ADD COLUMN IF NOT EXISTS passos JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS video_url TEXT,
    ADD CONSTRAINT base_conhecimento_passos_array_check CHECK (jsonb_typeof(passos) = 'array');
`);

exports.down = (pgm) => pgm.sql(`
  ALTER TABLE base_conhecimento
    DROP CONSTRAINT IF EXISTS base_conhecimento_passos_array_check,
    DROP COLUMN IF EXISTS video_url,
    DROP COLUMN IF EXISTS passos;
`);
