\set ON_ERROR_STOP on

-- Bootstrap completo para um projeto Supabase/PostgreSQL vazio.
-- Execute com psql; os caminhos abaixo sao relativos a este arquivo.

\ir ../docker/postgres/init/01-schema.sql
\ir ../docker/postgres/init/02-update-schema.sql
\ir ../docker/postgres/init/03-user-features.sql
\ir ../docker/postgres/init/04-login.sql
\ir ../docker/postgres/init/05-enterprise.sql
\ir ../docker/postgres/init/06-full-features.sql
\ir ../docker/postgres/init/07-profiles-permissions.sql
\ir ../docker/postgres/init/08-teams-enterprise.sql
\ir ../docker/postgres/init/09-performance-enterprise.sql
\ir ../docker/postgres/init/10-p0-security.sql

\ir migrations/20260818_p1_kanban_retention.sql
\ir migrations/20260818_p1_ticket_assignment.sql
\ir migrations/20260818_p1_ticket_status.sql
\ir migrations/20260821_email_verification.sql
\ir migrations/20260825_supabase_avatars.sql

-- Tabelas de inventario e evolucoes de SLA sao criadas de forma idempotente
-- pelos servicos de inicializacao do backend na primeira conexao.

-- Bloqueia acesso pela Data API mesmo se ela for ativada por engano no futuro.
-- As funcoes sao condicionais para o script tambem funcionar em PostgreSQL comum,
-- onde os papeis anon/authenticated do Supabase nao existem.
DO $security$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon';
    EXECUTE 'REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated';
    EXECUTE 'REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM authenticated';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM authenticated';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM authenticated';
  END IF;
END
$security$;
