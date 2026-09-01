/** Reconcilia tabelas auxiliares e a restrição de etapas do fluxo de desenvolvimento. */
exports.up = (pgm) => pgm.sql(`
  ALTER TABLE development_history
    ADD COLUMN IF NOT EXISTS request_id BIGINT REFERENCES development_requests(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS actor_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS event_type VARCHAR(40),
    ADD COLUMN IF NOT EXISTS previous_value JSONB,
    ADD COLUMN IF NOT EXISTS new_value JSONB,
    ADD COLUMN IF NOT EXISTS comment TEXT,
    ADD COLUMN IF NOT EXISTS internal BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

  ALTER TABLE development_approvals
    ADD COLUMN IF NOT EXISTS request_id BIGINT REFERENCES development_requests(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS kind VARCHAR(24),
    ADD COLUMN IF NOT EXISTS decision VARCHAR(24),
    ADD COLUMN IF NOT EXISTS comment TEXT,
    ADD COLUMN IF NOT EXISTS decided_by INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

  ALTER TABLE development_deployments
    ADD COLUMN IF NOT EXISTS request_id BIGINT REFERENCES development_requests(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS environment VARCHAR(20),
    ADD COLUMN IF NOT EXISTS version VARCHAR(40),
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS system_url TEXT,
    ADD COLUMN IF NOT EXISTS deployed_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS responsible_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL;

  ALTER TABLE ticket_relations
    ADD COLUMN IF NOT EXISTS source_ticket_id INTEGER REFERENCES chamados(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS target_ticket_id INTEGER REFERENCES chamados(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS target_project_id BIGINT REFERENCES development_projects(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS relation_type VARCHAR(30),
    ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

  ALTER TABLE development_requests
    DROP CONSTRAINT IF EXISTS development_requests_status_check;

  ALTER TABLE development_requests
    ADD CONSTRAINT development_requests_status_check CHECK (status IN
      ('nova','em_analise','levantamento_requisitos','avaliacao_tecnica','aguardando_aprovacao',
       'backlog','em_desenvolvimento','em_testes','homologacao','pronto_implantacao',
       'implantacao','concluido','cancelado')) NOT VALID;

  CREATE INDEX IF NOT EXISTS idx_dev_history_request ON development_history(request_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_dev_approvals_request ON development_approvals(request_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_dev_deployments_request ON development_deployments(request_id, deployed_at DESC);
`);

exports.down = () => null;
