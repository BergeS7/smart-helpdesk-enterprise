/**
 * SaaS multiempresa — fase 3: isolamento por empresa com Row Level Security.
 *
 * O backend se conecta como dono das tabelas, que ignora a RLS. Para cada requisição de um
 * usuário logado, a conexão troca para o papel helpdesk_empresa (sem BYPASSRLS) e grava a
 * empresa em app.empresa_id; as políticas abaixo só mostram e só aceitam linhas dessa empresa.
 * Rotinas internas (login, rotas públicas, jobs, migrations) seguem como dono do banco.
 *
 * - empresa_id deixa de ter DEFAULT 1: vem de app.empresa_id ou é herdado do registro pai.
 * - Nomes que eram únicos no sistema inteiro passam a ser únicos dentro de cada empresa.
 */
const TABELAS_DA_EMPRESA = [
  "usuarios", "chamados", "chamado_movimentacoes", "chamado_comentarios", "chamado_anexos", "chamado_avaliacoes_legacy_archive",
  "development_requests", "development_history", "development_projects", "project_tasks",
  "development_approvals", "development_deployments", "ticket_relations",
  "base_conhecimento", "base_conhecimento_recomendacoes", "assistente_interacoes",
  "agente_convites", "ativos", "ativo_snapshots", "ativo_alteracoes", "ativo_alertas", "ativo_metricas", "ativo_unidades",
  "performance_ratings", "performance_scores", "teams", "team_users",
  "respostas_rapidas", "filtros_salvos", "configuracoes_sistema", "departamentos", "tipos_chamado",
  "notificacoes", "auditoria_sistema", "web_push_subscriptions", "usuario_permissoes",
  "prioridade_ia_feedback", "aceites_legais",
];

// Registro filho gravado fora de uma requisição (agente, link de avaliação, rotina) herda a empresa do pai.
const HERANCA = [
  ["chamados", "usuarios", "usuario_id"],
  ["chamado_movimentacoes", "chamados", "chamado_id"],
  ["chamado_comentarios", "chamados", "chamado_id"],
  ["chamado_anexos", "chamados", "chamado_id"],
  ["chamado_avaliacoes_legacy_archive", "chamados", "chamado_id"],
  ["performance_ratings", "chamados", "ticket_id"],
  ["prioridade_ia_feedback", "chamados", "chamado_id"],
  ["ticket_relations", "chamados", "source_ticket_id"],
  ["development_requests", "chamados", "ticket_id"],
  ["development_history", "development_requests", "request_id"],
  ["development_approvals", "development_requests", "request_id"],
  ["development_deployments", "development_requests", "request_id"],
  ["development_projects", "usuarios", "created_by"],
  ["project_tasks", "development_projects", "project_id"],
  ["base_conhecimento", "usuarios", "criado_por"],
  ["base_conhecimento_recomendacoes", "base_conhecimento", "artigo_id"],
  ["ativos", "usuarios", "usuario_id"],
  ["ativo_snapshots", "ativos", "ativo_id"],
  ["ativo_alteracoes", "ativos", "ativo_id"],
  ["ativo_alertas", "ativos", "ativo_id"],
  ["ativo_metricas", "ativos", "ativo_id"],
  ["agente_convites", "usuarios", "criado_por"],
  ["teams", "usuarios", "manager_id"],
  ["team_users", "teams", "team_id"],
  ["performance_scores", "usuarios", "technician_id"],
  ["respostas_rapidas", "usuarios", "criado_por"],
  ["configuracoes_sistema", "usuarios", "atualizado_por"],
  ["notificacoes", "usuarios", "usuario_id"],
  ["web_push_subscriptions", "usuarios", "usuario_id"],
  ["usuario_permissoes", "usuarios", "usuario_id"],
  ["aceites_legais", "usuarios", "usuario_id"],
  ["filtros_salvos", "usuarios", "usuario_id"],
  ["assistente_interacoes", "usuarios", "usuario_id"],
  ["auditoria_sistema", "usuarios", "usuario_id"],
];

// [tabela, restrição antiga, colunas antigas]: passam a ser únicas por empresa.
const UNICOS_POR_EMPRESA = [
  ["teams", "teams_name_key", "name"],
  ["departamentos", "departamentos_nome_key", "nome"],
  ["tipos_chamado", "tipos_chamado_nome_key", "nome"],
  ["ativo_unidades", "ativo_unidades_nome_municipio_key", "nome, municipio"],
];

const lista = (tabelas) => tabelas.map((t) => `'${t}'`).join(", ");
const EMPRESA_DO_CONTEXTO = "NULLIF(current_setting('app.empresa_id', true), '')::integer";

exports.up = (pgm) => pgm.sql(`
  DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'helpdesk_empresa') THEN
      CREATE ROLE helpdesk_empresa NOLOGIN NOSUPERUSER NOBYPASSRLS NOINHERIT;
    END IF;
  END $$;
  -- Quem roda as migrations (o mesmo usuário do backend) precisa poder assumir o papel.
  DO $$ BEGIN EXECUTE format('GRANT helpdesk_empresa TO %I', current_user); END $$;

  GRANT USAGE ON SCHEMA public TO helpdesk_empresa;
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO helpdesk_empresa;
  GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO helpdesk_empresa;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO helpdesk_empresa;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO helpdesk_empresa;

  -- Tabelas da plataforma: acessadas só em modo sistema.
  REVOKE ALL ON pgmigrations, web_push_keys, agente_versoes FROM helpdesk_empresa;
  -- A empresa lê o próprio cadastro e os avisos; quem altera é a plataforma.
  REVOKE INSERT, UPDATE, DELETE ON empresas, avisos_sistema FROM helpdesk_empresa;

  ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS isolamento_empresa ON empresas;
  CREATE POLICY isolamento_empresa ON empresas USING (id = ${EMPRESA_DO_CONTEXTO});

  ALTER TABLE avisos_sistema ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS isolamento_empresa ON avisos_sistema;
  CREATE POLICY isolamento_empresa ON avisos_sistema USING (empresa_id IS NULL OR empresa_id = ${EMPRESA_DO_CONTEXTO});

  CREATE OR REPLACE FUNCTION herdar_empresa() RETURNS trigger LANGUAGE plpgsql AS $fn$
  DECLARE
    pai_id TEXT;
  BEGIN
    IF NEW.empresa_id IS NULL THEN
      pai_id := to_jsonb(NEW) ->> TG_ARGV[1];
      IF pai_id IS NOT NULL THEN
        EXECUTE format('SELECT empresa_id FROM %I WHERE id = $1::bigint', TG_ARGV[0]) INTO NEW.empresa_id USING pai_id;
      END IF;
    END IF;
    RETURN NEW;
  END
  $fn$;

  DO $$
  DECLARE
    tabela TEXT;
    heranca TEXT[];
  BEGIN
    FOREACH tabela IN ARRAY ARRAY[${lista(TABELAS_DA_EMPRESA)}] LOOP
      CONTINUE WHEN NOT EXISTS (SELECT 1 FROM pg_class WHERE oid = to_regclass('public.' || tabela) AND relkind = 'r');
      EXECUTE format('ALTER TABLE %I ALTER COLUMN empresa_id SET DEFAULT ${EMPRESA_DO_CONTEXTO.replace(/'/g, "''")}', tabela);
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tabela);
      EXECUTE format('DROP POLICY IF EXISTS isolamento_empresa ON %I', tabela);
      EXECUTE format('CREATE POLICY isolamento_empresa ON %I USING (empresa_id = ${EMPRESA_DO_CONTEXTO.replace(/'/g, "''")}) WITH CHECK (empresa_id = ${EMPRESA_DO_CONTEXTO.replace(/'/g, "''")})', tabela);
    END LOOP;

    FOREACH heranca SLICE 1 IN ARRAY ARRAY[${HERANCA.map((h) => `ARRAY[${lista(h)}]`).join(", ")}] LOOP
      CONTINUE WHEN NOT EXISTS (SELECT 1 FROM pg_class WHERE oid = to_regclass('public.' || heranca[1]) AND relkind = 'r');
      EXECUTE format('DROP TRIGGER IF EXISTS trg_herdar_empresa ON %I', heranca[1]);
      EXECUTE format('CREATE TRIGGER trg_herdar_empresa BEFORE INSERT ON %I FOR EACH ROW EXECUTE FUNCTION herdar_empresa(%L, %L)',
        heranca[1], heranca[2], heranca[3]);
    END LOOP;
  END $$;

  -- A view de avaliações passa a respeitar a RLS de quem consulta, não a do dono da view.
  DO $$
  BEGIN
    IF to_regclass('public.chamado_avaliacoes') IS NOT NULL THEN
      ALTER VIEW chamado_avaliacoes SET (security_invoker = true);
    END IF;
  END $$;

  ALTER TABLE configuracoes_sistema DROP CONSTRAINT IF EXISTS configuracoes_sistema_pkey;
  ALTER TABLE configuracoes_sistema ADD CONSTRAINT configuracoes_sistema_pkey PRIMARY KEY (empresa_id, chave);

  -- A pontuação da empresa inteira (sem técnico e sem equipe) é uma por período em cada empresa.
  DROP INDEX IF EXISTS idx_performance_scores_scope_period;
  CREATE UNIQUE INDEX idx_performance_scores_scope_period
    ON performance_scores (empresa_id, COALESCE(technician_id, 0), COALESCE(team_id, 0), month, year);

  DO $$
  DECLARE
    item TEXT[];
  BEGIN
    FOREACH item SLICE 1 IN ARRAY ARRAY[${UNICOS_POR_EMPRESA.map((u) => `ARRAY[${lista(u)}]`).join(", ")}] LOOP
      CONTINUE WHEN to_regclass('public.' || item[1]) IS NULL;
      EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', item[1], item[2]);
      EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', item[1], 'uq_' || item[1] || '_empresa');
      EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I UNIQUE (empresa_id, %s)', item[1], 'uq_' || item[1] || '_empresa', item[3]);
    END LOOP;
  END $$;
`);

exports.down = (pgm) => pgm.sql(`
  DO $$
  DECLARE
    item TEXT[];
  BEGIN
    FOREACH item SLICE 1 IN ARRAY ARRAY[${UNICOS_POR_EMPRESA.map((u) => `ARRAY[${lista(u)}]`).join(", ")}] LOOP
      CONTINUE WHEN to_regclass('public.' || item[1]) IS NULL;
      EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', item[1], 'uq_' || item[1] || '_empresa');
      EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I UNIQUE (%s)', item[1], item[2], item[3]);
    END LOOP;
  END $$;

  ALTER TABLE configuracoes_sistema DROP CONSTRAINT IF EXISTS configuracoes_sistema_pkey;
  ALTER TABLE configuracoes_sistema ADD CONSTRAINT configuracoes_sistema_pkey PRIMARY KEY (chave);

  DROP INDEX IF EXISTS idx_performance_scores_scope_period;
  CREATE UNIQUE INDEX idx_performance_scores_scope_period
    ON performance_scores (COALESCE(technician_id, 0), COALESCE(team_id, 0), month, year);

  DO $$
  DECLARE
    tabela TEXT;
  BEGIN
    FOREACH tabela IN ARRAY ARRAY[${lista(TABELAS_DA_EMPRESA)}] LOOP
      CONTINUE WHEN NOT EXISTS (SELECT 1 FROM pg_class WHERE oid = to_regclass('public.' || tabela) AND relkind = 'r');
      EXECUTE format('DROP TRIGGER IF EXISTS trg_herdar_empresa ON %I', tabela);
      EXECUTE format('DROP POLICY IF EXISTS isolamento_empresa ON %I', tabela);
      EXECUTE format('ALTER TABLE %I ALTER COLUMN empresa_id SET DEFAULT 1', tabela);
      -- web_push_subscriptions já tinha RLS ligada (sem políticas) antes desta migration.
      IF tabela <> 'web_push_subscriptions' THEN
        EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', tabela);
      END IF;
    END LOOP;
  END $$;

  DROP POLICY IF EXISTS isolamento_empresa ON empresas;
  ALTER TABLE empresas DISABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS isolamento_empresa ON avisos_sistema;
  ALTER TABLE avisos_sistema DISABLE ROW LEVEL SECURITY;
  DROP FUNCTION IF EXISTS herdar_empresa();

  DO $$
  BEGIN
    IF to_regclass('public.chamado_avaliacoes') IS NOT NULL THEN
      ALTER VIEW chamado_avaliacoes RESET (security_invoker);
    END IF;
  END $$;

  -- Papéis valem para o servidor inteiro (outros bancos podem usá-lo): só retira as permissões daqui.
  DROP OWNED BY helpdesk_empresa;
`);
