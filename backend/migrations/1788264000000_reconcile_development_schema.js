/** Reconcilia instalações que receberam uma versão parcial do módulo de desenvolvimento. */
exports.up = (pgm) => pgm.sql(`
  ALTER TABLE development_requests
    ADD COLUMN IF NOT EXISTS code VARCHAR(24),
    ADD COLUMN IF NOT EXISTS nature VARCHAR(40),
    ADD COLUMN IF NOT EXISTS status VARCHAR(40) DEFAULT 'nova',
    ADD COLUMN IF NOT EXISTS current_process TEXT,
    ADD COLUMN IF NOT EXISTS problem TEXT,
    ADD COLUMN IF NOT EXISTS expected_result TEXT,
    ADD COLUMN IF NOT EXISTS frequency VARCHAR(30),
    ADD COLUMN IF NOT EXISTS executions_per_month NUMERIC(12,2),
    ADD COLUMN IF NOT EXISTS people_involved INTEGER,
    ADD COLUMN IF NOT EXISTS current_time_minutes NUMERIC(12,2),
    ADD COLUMN IF NOT EXISTS automated_time_minutes NUMERIC(12,2),
    ADD COLUMN IF NOT EXISTS sectors JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS systems JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS no_delivery_impact TEXT,
    ADD COLUMN IF NOT EXISTS expected_benefits JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS impact SMALLINT,
    ADD COLUMN IF NOT EXISTS reach SMALLINT,
    ADD COLUMN IF NOT EXISTS gain SMALLINT,
    ADD COLUMN IF NOT EXISTS urgency SMALLINT,
    ADD COLUMN IF NOT EXISTS score SMALLINT,
    ADD COLUMN IF NOT EXISTS calculated_priority VARCHAR(16),
    ADD COLUMN IF NOT EXISTS final_priority VARCHAR(16),
    ADD COLUMN IF NOT EXISTS priority_reason TEXT,
    ADD COLUMN IF NOT EXISTS effort VARCHAR(24),
    ADD COLUMN IF NOT EXISTS story_points SMALLINT,
    ADD COLUMN IF NOT EXISTS feasibility TEXT,
    ADD COLUMN IF NOT EXISTS developer_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS due_date DATE,
    ADD COLUMN IF NOT EXISTS rejection_reason VARCHAR(40),
    ADD COLUMN IF NOT EXISTS rejection_details TEXT,
    ADD COLUMN IF NOT EXISTS converted_project_id BIGINT,
    ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

  CREATE SEQUENCE IF NOT EXISTS development_code_seq;
  UPDATE development_requests
     SET code = 'DEV-' || TO_CHAR(COALESCE(created_at, NOW()), 'YYYY') || '-' || LPAD(id::text, 6, '0')
   WHERE code IS NULL OR BTRIM(code) = '';
  SELECT setval('development_code_seq', GREATEST(COALESCE((SELECT MAX(id) FROM development_requests), 0), 1), TRUE);
  ALTER TABLE development_requests
    ALTER COLUMN code SET DEFAULT ('DEV-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(nextval('development_code_seq')::text, 6, '0'));
  CREATE UNIQUE INDEX IF NOT EXISTS uq_development_requests_code ON development_requests(code);
  CREATE INDEX IF NOT EXISTS idx_dev_request_status_score ON development_requests(status, score DESC);
  CREATE INDEX IF NOT EXISTS idx_dev_request_assignee ON development_requests(developer_id, team_id);

  ALTER TABLE development_projects
    ADD COLUMN IF NOT EXISTS code VARCHAR(24),
    ADD COLUMN IF NOT EXISTS name VARCHAR(180),
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS requester_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS sponsor_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS developer_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS priority VARCHAR(16),
    ADD COLUMN IF NOT EXISTS status VARCHAR(40) DEFAULT 'planejamento',
    ADD COLUMN IF NOT EXISTS progress SMALLINT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS planned_start DATE,
    ADD COLUMN IF NOT EXISTS planned_delivery DATE,
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

  CREATE SEQUENCE IF NOT EXISTS project_code_seq;
  UPDATE development_projects
     SET code = 'PRJ-' || TO_CHAR(COALESCE(created_at, NOW()), 'YYYY') || '-' || LPAD(id::text, 6, '0')
   WHERE code IS NULL OR BTRIM(code) = '';
  SELECT setval('project_code_seq', GREATEST(COALESCE((SELECT MAX(id) FROM development_projects), 0), 1), TRUE);
  ALTER TABLE development_projects
    ALTER COLUMN code SET DEFAULT ('PRJ-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(nextval('project_code_seq')::text, 6, '0'));
  CREATE UNIQUE INDEX IF NOT EXISTS uq_development_projects_code ON development_projects(code);

  ALTER TABLE project_tasks
    ADD COLUMN IF NOT EXISTS responsible_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS priority VARCHAR(16),
    ADD COLUMN IF NOT EXISTS status VARCHAR(24) DEFAULT 'a_fazer',
    ADD COLUMN IF NOT EXISTS due_date DATE,
    ADD COLUMN IF NOT EXISTS effort VARCHAR(24),
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
`);

exports.down = () => {};
