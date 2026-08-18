CREATE TABLE IF NOT EXISTS performance_ratings (id SERIAL PRIMARY KEY, ticket_id INTEGER NOT NULL REFERENCES chamados(id) ON DELETE CASCADE, technician_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL, team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL, client_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE, overall_rating SMALLINT NOT NULL CHECK (overall_rating BETWEEN 1 AND 5), courtesy_rating SMALLINT NOT NULL CHECK (courtesy_rating BETWEEN 1 AND 5), communication_rating SMALLINT NOT NULL CHECK (communication_rating BETWEEN 1 AND 5), resolution_rating SMALLINT NOT NULL CHECK (resolution_rating BETWEEN 1 AND 5), speed_rating SMALLINT NOT NULL CHECK (speed_rating BETWEEN 1 AND 5), nps_score SMALLINT NOT NULL CHECK (nps_score BETWEEN 0 AND 10), comment TEXT, sentiment VARCHAR(16) NOT NULL DEFAULT 'neutral' CHECK (sentiment IN ('positive','neutral','negative')), sentiment_score NUMERIC(5,2) NOT NULL DEFAULT 0, keywords JSONB NOT NULL DEFAULT '[]'::jsonb, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(ticket_id, client_id));
CREATE TABLE IF NOT EXISTS performance_scores (id SERIAL PRIMARY KEY, technician_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE, team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE, month SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12), year SMALLINT NOT NULL CHECK (year >= 2020), performance_score NUMERIC(5,2) NOT NULL DEFAULT 0, average_rating NUMERIC(4,2) NOT NULL DEFAULT 0, average_resolution_time NUMERIC(12,2) NOT NULL DEFAULT 0, sla_rate NUMERIC(5,2) NOT NULL DEFAULT 0, first_contact_resolution_rate NUMERIC(5,2) NOT NULL DEFAULT 0, reopen_rate NUMERIC(5,2) NOT NULL DEFAULT 0, productivity_score NUMERIC(5,2) NOT NULL DEFAULT 0, total_closed_tickets INTEGER NOT NULL DEFAULT 0, total_ratings INTEGER NOT NULL DEFAULT 0, nps_average NUMERIC(5,2) NOT NULL DEFAULT 0, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE UNIQUE INDEX IF NOT EXISTS idx_performance_scores_scope_period ON performance_scores (COALESCE(technician_id, 0), COALESCE(team_id, 0), month, year);
CREATE INDEX IF NOT EXISTS idx_performance_ratings_technician_created ON performance_ratings(technician_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_performance_ratings_team_created ON performance_ratings(team_id, created_at DESC);
ALTER TABLE performance_ratings ADD COLUMN IF NOT EXISTS source VARCHAR(32) NOT NULL DEFAULT 'detailed';
ALTER TABLE performance_ratings ADD COLUMN IF NOT EXISTS legacy_rating_id INTEGER;
ALTER TABLE performance_ratings DROP CONSTRAINT IF EXISTS performance_ratings_ticket_id_client_id_key;
ALTER TABLE performance_ratings DROP CONSTRAINT IF EXISTS performance_ratings_client_id_fkey;
ALTER TABLE performance_ratings ALTER COLUMN client_id DROP NOT NULL;
ALTER TABLE performance_ratings ADD CONSTRAINT performance_ratings_client_id_fkey FOREIGN KEY(client_id) REFERENCES usuarios(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_performance_ratings_ticket ON performance_ratings(ticket_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_performance_ratings_legacy ON performance_ratings(legacy_rating_id) WHERE legacy_rating_id IS NOT NULL;

CREATE OR REPLACE FUNCTION validar_avaliacao_chamado() RETURNS trigger AS $$
DECLARE solicitante INTEGER; tecnico INTEGER; equipe INTEGER; estado TEXT;
BEGIN
  SELECT usuario_id,responsavel_id,team_id,status INTO solicitante,tecnico,equipe,estado FROM chamados WHERE id=NEW.ticket_id;
  IF estado IS NULL THEN RAISE EXCEPTION 'Chamado não encontrado'; END IF;
  IF estado NOT IN ('RESOLVED','CLOSED','CANCELED') THEN RAISE EXCEPTION 'Somente chamados finalizados podem ser avaliados'; END IF;
  IF NEW.client_id IS NULL AND NEW.source<>'legacy_migration' THEN RAISE EXCEPTION 'Solicitante da avaliação é obrigatório'; END IF;
  IF NEW.client_id IS NOT NULL AND NEW.client_id IS DISTINCT FROM solicitante THEN RAISE EXCEPTION 'A avaliação deve pertencer ao solicitante do chamado'; END IF;
  NEW.technician_id:=tecnico; NEW.team_id:=equipe; RETURN NEW;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_validar_avaliacao_chamado BEFORE INSERT OR UPDATE ON performance_ratings FOR EACH ROW EXECUTE FUNCTION validar_avaliacao_chamado();

ALTER TABLE chamado_avaliacoes RENAME TO chamado_avaliacoes_legacy_archive;
CREATE VIEW chamado_avaliacoes AS SELECT id,ticket_id AS chamado_id,client_id AS usuario_id,overall_rating::integer AS nota,comment AS comentario,created_at AS criado_em,updated_at AS atualizado_em FROM performance_ratings;
