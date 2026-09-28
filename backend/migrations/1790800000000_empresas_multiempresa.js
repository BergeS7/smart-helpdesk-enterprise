/**
 * SaaS multiempresa — fase 1: base de empresas.
 * Cada empresa cliente passa a ser uma linha de `empresas`, e toda tabela com dados de cliente
 * ganha `empresa_id`. Os dados que já existem ficam na "empresa principal" (id 1).
 *
 * O DEFAULT 1 é provisório: mantém o sistema funcionando enquanto as consultas ainda não
 * filtram por empresa. Na fase de isolamento ele sai e cada INSERT passa a informar a empresa.
 *
 * Ficam sem empresa_id por serem da plataforma: empresas, agente_versoes, web_push_keys.
 * avisos_sistema recebe empresa_id opcional: NULL é aviso global da plataforma.
 */
const TABELAS_DA_EMPRESA = [
  // chamado_avaliacoes virou view sobre performance_ratings; o que sobrou dela está no arquivo legado.
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

const listaSql = TABELAS_DA_EMPRESA.map((tabela) => `'${tabela}'`).join(", ");

exports.up = (pgm) => pgm.sql(`
  CREATE TABLE IF NOT EXISTS empresas (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(160) NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  ALTER TABLE empresas ADD COLUMN IF NOT EXISTS slug VARCHAR(60);
  ALTER TABLE empresas ADD COLUMN IF NOT EXISTS cnpj VARCHAR(14);
  ALTER TABLE empresas ADD COLUMN IF NOT EXISTS plano VARCHAR(30) NOT NULL DEFAULT 'padrao';
  ALTER TABLE empresas ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'ativa';
  ALTER TABLE empresas ADD COLUMN IF NOT EXISTS email_responsavel VARCHAR(160);
  ALTER TABLE empresas ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

  -- A coluna antiga "ativo" nunca foi usada pelo backend; o status passa a ser a única fonte.
  DO $$
  BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'empresas' AND column_name = 'ativo') THEN
      UPDATE empresas SET status = CASE WHEN ativo THEN 'ativa' ELSE 'suspensa' END;
      ALTER TABLE empresas DROP COLUMN ativo;
    END IF;
  END $$;

  UPDATE empresas SET slug = 'empresa-' || id WHERE slug IS NULL;
  ALTER TABLE empresas ALTER COLUMN slug SET NOT NULL;

  DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_empresas_slug') THEN
      ALTER TABLE empresas ADD CONSTRAINT uq_empresas_slug UNIQUE (slug);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_empresas_cnpj') THEN
      ALTER TABLE empresas ADD CONSTRAINT uq_empresas_cnpj UNIQUE (cnpj);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_empresas_status') THEN
      ALTER TABLE empresas ADD CONSTRAINT ck_empresas_status CHECK (status IN ('ativa', 'suspensa', 'cancelada'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_empresas_slug') THEN
      ALTER TABLE empresas ADD CONSTRAINT ck_empresas_slug CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_empresas_cnpj') THEN
      ALTER TABLE empresas ADD CONSTRAINT ck_empresas_cnpj CHECK (cnpj IS NULL OR cnpj ~ '^[0-9]{14}$');
    END IF;
  END $$;

  INSERT INTO empresas (id, nome, slug) VALUES (1, 'Empresa principal', 'principal')
  ON CONFLICT (id) DO NOTHING;
  SELECT setval(pg_get_serial_sequence('empresas', 'id'), (SELECT MAX(id) FROM empresas));

  DO $$
  DECLARE
    tabela TEXT;
  BEGIN
    FOREACH tabela IN ARRAY ARRAY[${listaSql}] LOOP
      -- Algumas tabelas nascem sob demanda; só mexe nas que existem neste banco e são tabelas de fato (não views).
      CONTINUE WHEN NOT EXISTS (SELECT 1 FROM pg_class WHERE oid = to_regclass('public.' || tabela) AND relkind = 'r');

      EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS empresa_id INTEGER', tabela);
      -- usuarios e chamados já tinham empresa_id solto; valores sem empresa correspondente vão para a principal.
      EXECUTE format('UPDATE %I SET empresa_id = 1 WHERE empresa_id IS NULL OR empresa_id NOT IN (SELECT id FROM empresas)', tabela);
      EXECUTE format('ALTER TABLE %I ALTER COLUMN empresa_id SET DEFAULT 1', tabela);
      EXECUTE format('ALTER TABLE %I ALTER COLUMN empresa_id SET NOT NULL', tabela);

      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_' || tabela || '_empresa') THEN
        EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE RESTRICT',
          tabela, 'fk_' || tabela || '_empresa');
      END IF;
      EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I (empresa_id)', 'idx_' || tabela || '_empresa', tabela);
    END LOOP;

    IF to_regclass('public.avisos_sistema') IS NOT NULL THEN
      ALTER TABLE avisos_sistema ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id) ON DELETE CASCADE;
      CREATE INDEX IF NOT EXISTS idx_avisos_sistema_empresa ON avisos_sistema (empresa_id);
    END IF;
  END $$;
`);

exports.down = (pgm) => pgm.sql(`
  DO $$
  DECLARE
    tabela TEXT;
  BEGIN
    FOREACH tabela IN ARRAY ARRAY[${listaSql}] LOOP
      CONTINUE WHEN NOT EXISTS (SELECT 1 FROM pg_class WHERE oid = to_regclass('public.' || tabela) AND relkind = 'r');
      EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', tabela, 'fk_' || tabela || '_empresa');
      -- usuarios e chamados já tinham a coluna antes desta migration; nelas só se desfaz a obrigatoriedade.
      IF tabela IN ('usuarios', 'chamados') THEN
        EXECUTE format('ALTER TABLE %I ALTER COLUMN empresa_id DROP NOT NULL, ALTER COLUMN empresa_id DROP DEFAULT', tabela);
      ELSE
        EXECUTE format('DROP INDEX IF EXISTS %I', 'idx_' || tabela || '_empresa');
        EXECUTE format('ALTER TABLE %I DROP COLUMN IF EXISTS empresa_id', tabela);
      END IF;
    END LOOP;

    IF to_regclass('public.avisos_sistema') IS NOT NULL THEN
      ALTER TABLE avisos_sistema DROP COLUMN IF EXISTS empresa_id;
    END IF;
  END $$;
`);
