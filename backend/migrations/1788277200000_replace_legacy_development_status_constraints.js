/** Substitui apenas CHECKs legados que dependem da coluna status. */
exports.up = (pgm) => pgm.sql(`
  DO $$
  DECLARE item RECORD;
  BEGIN
    FOR item IN
      SELECT DISTINCT constraint_name
        FROM information_schema.constraint_column_usage
       WHERE table_schema = 'public'
         AND table_name = 'development_requests'
         AND column_name = 'status'
         AND constraint_name IN (
           SELECT conname
             FROM pg_constraint
            WHERE conrelid = 'public.development_requests'::regclass
              AND contype = 'c'
         )
    LOOP
      EXECUTE format('ALTER TABLE public.development_requests DROP CONSTRAINT %I', item.constraint_name);
    END LOOP;
  END $$;

  ALTER TABLE public.development_requests
    DROP CONSTRAINT IF EXISTS development_requests_status_check;

  ALTER TABLE public.development_requests
    ADD CONSTRAINT development_requests_status_check CHECK (status IN
      ('nova','em_analise','levantamento_requisitos','avaliacao_tecnica','aguardando_aprovacao',
       'backlog','em_desenvolvimento','em_testes','homologacao','pronto_implantacao',
       'implantacao','concluido','cancelado')) NOT VALID;
`);

exports.down = () => null;
