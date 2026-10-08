/**
 * Proteção para hospedar no Supabase.
 * O Supabase publica o schema public pela API automática (PostgREST) para os papéis anon e
 * authenticated. O HelpDesk não usa essa API: conecta direto no Postgres como dono das tabelas
 * (e troca para helpdesk_empresa nas requisições de usuário). O database/supabase-bootstrap.sql
 * já revogava esses acessos, mas só vale onde foi rodado e para as tabelas que existiam;
 * aqui a revogação passa a fazer parte das migrations e alcança todas as tabelas atuais.
 * Fora do Supabase (Postgres local) os papéis não existem e nada muda.
 */
exports.up = (pgm) => pgm.sql(`
  DO $$
  DECLARE papel TEXT;
  BEGIN
    FOREACH papel IN ARRAY ARRAY['anon', 'authenticated'] LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = papel) THEN
        EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I', papel);
        EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I', papel);
        EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM %I', papel);
        EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %I', papel);
      END IF;
    END LOOP;
  END $$;
`);

// Devolver o acesso da API automática seria abrir os dados; a volta não desfaz nada.
exports.down = () => {};
