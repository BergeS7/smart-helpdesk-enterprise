/** Fluxo de demandas e projetos, aditivo e idempotente. */
exports.up = (pgm) => pgm.sql(`
  CREATE TABLE IF NOT EXISTS development_requests (
    id BIGSERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL UNIQUE REFERENCES chamados(id) ON DELETE RESTRICT,
    code VARCHAR(24) UNIQUE,
    nature VARCHAR(40) NOT NULL CHECK (nature IN ('bug','melhoria','automacao','integracao','dashboard_relatorio','novo_sistema')),
    status VARCHAR(40) NOT NULL DEFAULT 'nova' CHECK (status IN ('nova','em_analise','levantamento_requisitos','avaliacao_tecnica','aguardando_aprovacao','backlog','em_desenvolvimento','em_testes','homologacao','pronto_implantacao','implantacao','concluido','cancelado')),
    current_process TEXT, problem TEXT, expected_result TEXT,
    frequency VARCHAR(30), executions_per_month NUMERIC(12,2), people_involved INTEGER CHECK (people_involved IS NULL OR people_involved >= 0),
    current_time_minutes NUMERIC(12,2), automated_time_minutes NUMERIC(12,2),
    sectors JSONB NOT NULL DEFAULT '[]'::jsonb, systems JSONB NOT NULL DEFAULT '[]'::jsonb,
    no_delivery_impact TEXT, expected_benefits JSONB NOT NULL DEFAULT '[]'::jsonb,
    impact SMALLINT CHECK (impact BETWEEN 1 AND 5), reach SMALLINT CHECK (reach BETWEEN 1 AND 5), gain SMALLINT CHECK (gain BETWEEN 1 AND 5), urgency SMALLINT CHECK (urgency BETWEEN 1 AND 5),
    score SMALLINT CHECK (score BETWEEN 4 AND 20), calculated_priority VARCHAR(16), final_priority VARCHAR(16), priority_reason TEXT,
    effort VARCHAR(24), story_points SMALLINT CHECK (story_points IN (1,2,3,5,8,13,21)), feasibility TEXT,
    developer_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL, team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
    due_date DATE, rejection_reason VARCHAR(40), rejection_details TEXT,
    converted_project_id BIGINT, created_by INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), completed_at TIMESTAMPTZ
  );
  CREATE SEQUENCE IF NOT EXISTS development_code_seq;
  UPDATE development_requests SET code = 'DEV-' || TO_CHAR(created_at, 'YYYY') || '-' || LPAD(id::text, 6, '0') WHERE code IS NULL;
  SELECT setval('development_code_seq', GREATEST(COALESCE((SELECT MAX(id) FROM development_requests), 0), 1), TRUE);
  ALTER TABLE development_requests ALTER COLUMN code SET DEFAULT ('DEV-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(nextval('development_code_seq')::text, 6, '0'));
  CREATE INDEX IF NOT EXISTS idx_dev_request_status_score ON development_requests(status, score DESC);
  CREATE INDEX IF NOT EXISTS idx_dev_request_assignee ON development_requests(developer_id, team_id);

  CREATE TABLE IF NOT EXISTS development_history (
    id BIGSERIAL PRIMARY KEY, request_id BIGINT NOT NULL REFERENCES development_requests(id) ON DELETE CASCADE,
    actor_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL, event_type VARCHAR(40) NOT NULL,
    previous_value JSONB, new_value JSONB, comment TEXT, internal BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_dev_history_request ON development_history(request_id, created_at DESC);

  CREATE TABLE IF NOT EXISTS development_projects (
    id BIGSERIAL PRIMARY KEY, code VARCHAR(24) UNIQUE, name VARCHAR(180) NOT NULL, description TEXT,
    requester_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL, sponsor_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    developer_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL, team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
    priority VARCHAR(16), status VARCHAR(40) NOT NULL DEFAULT 'planejamento', progress SMALLINT NOT NULL DEFAULT 0 CHECK(progress BETWEEN 0 AND 100),
    planned_start DATE, planned_delivery DATE, completed_at TIMESTAMPTZ, notes TEXT,
    created_by INTEGER REFERENCES usuarios(id) ON DELETE SET NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE SEQUENCE IF NOT EXISTS project_code_seq;
  UPDATE development_projects SET code = 'PRJ-' || TO_CHAR(created_at, 'YYYY') || '-' || LPAD(id::text, 6, '0') WHERE code IS NULL;
  SELECT setval('project_code_seq', GREATEST(COALESCE((SELECT MAX(id) FROM development_projects), 0), 1), TRUE);
  ALTER TABLE development_projects ALTER COLUMN code SET DEFAULT ('PRJ-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(nextval('project_code_seq')::text, 6, '0'));
  ALTER TABLE development_requests DROP CONSTRAINT IF EXISTS development_requests_converted_project_fk;
  ALTER TABLE development_requests ADD CONSTRAINT development_requests_converted_project_fk FOREIGN KEY(converted_project_id) REFERENCES development_projects(id) ON DELETE SET NULL;
  CREATE INDEX IF NOT EXISTS idx_dev_projects_status ON development_projects(status, planned_delivery);

  CREATE TABLE IF NOT EXISTS project_tasks (
    id BIGSERIAL PRIMARY KEY, project_id BIGINT NOT NULL REFERENCES development_projects(id) ON DELETE CASCADE,
    title VARCHAR(180) NOT NULL, description TEXT, responsible_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    priority VARCHAR(16), status VARCHAR(24) NOT NULL DEFAULT 'a_fazer', due_date DATE, effort VARCHAR(24), completed_at TIMESTAMPTZ,
    created_by INTEGER REFERENCES usuarios(id) ON DELETE SET NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_project_tasks_project ON project_tasks(project_id, status, due_date);

  CREATE TABLE IF NOT EXISTS development_approvals (
    id BIGSERIAL PRIMARY KEY, request_id BIGINT NOT NULL REFERENCES development_requests(id) ON DELETE CASCADE,
    kind VARCHAR(24) NOT NULL CHECK(kind IN ('aprovacao','homologacao')), decision VARCHAR(24) NOT NULL CHECK(decision IN ('aprovado','reprovado','ajustes')),
    comment TEXT, decided_by INTEGER REFERENCES usuarios(id) ON DELETE SET NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK(decision <> 'ajustes' OR NULLIF(BTRIM(comment),'') IS NOT NULL)
  );
  CREATE INDEX IF NOT EXISTS idx_dev_approvals_request ON development_approvals(request_id, created_at DESC);

  CREATE TABLE IF NOT EXISTS development_deployments (
    id BIGSERIAL PRIMARY KEY, request_id BIGINT NOT NULL REFERENCES development_requests(id) ON DELETE CASCADE,
    environment VARCHAR(20) NOT NULL CHECK(environment IN ('desenvolvimento','homologacao','producao')),
    version VARCHAR(40), notes TEXT, system_url TEXT, deployed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), responsible_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
  );
  CREATE TABLE IF NOT EXISTS ticket_relations (
    id BIGSERIAL PRIMARY KEY, source_ticket_id INTEGER NOT NULL REFERENCES chamados(id) ON DELETE CASCADE,
    target_ticket_id INTEGER REFERENCES chamados(id) ON DELETE CASCADE, target_project_id BIGINT REFERENCES development_projects(id) ON DELETE CASCADE,
    relation_type VARCHAR(30) NOT NULL CHECK(relation_type IN ('relacionado','depende_de','bloqueia','duplicado_de','originou','convertido_projeto')),
    created_by INTEGER REFERENCES usuarios(id) ON DELETE SET NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK((target_ticket_id IS NOT NULL)::int + (target_project_id IS NOT NULL)::int = 1)
  );
  CREATE UNIQUE INDEX IF NOT EXISTS uq_ticket_relation ON ticket_relations(source_ticket_id, COALESCE(target_ticket_id,0), COALESCE(target_project_id,0), relation_type);
`);
exports.down = () => {};
