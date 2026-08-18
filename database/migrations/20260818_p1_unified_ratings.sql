BEGIN;

ALTER TABLE performance_ratings ADD COLUMN IF NOT EXISTS source VARCHAR(32) NOT NULL DEFAULT 'detailed';
ALTER TABLE performance_ratings ADD COLUMN IF NOT EXISTS legacy_rating_id INTEGER;

ALTER TABLE performance_ratings DROP CONSTRAINT IF EXISTS performance_ratings_ticket_id_client_id_key;
ALTER TABLE performance_ratings DROP CONSTRAINT IF EXISTS performance_ratings_client_id_fkey;
ALTER TABLE performance_ratings ALTER COLUMN client_id DROP NOT NULL;
ALTER TABLE performance_ratings ADD CONSTRAINT performance_ratings_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES usuarios(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_performance_ratings_ticket ON performance_ratings(ticket_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_performance_ratings_legacy ON performance_ratings(legacy_rating_id) WHERE legacy_rating_id IS NOT NULL;

INSERT INTO performance_ratings (
  ticket_id,technician_id,team_id,client_id,overall_rating,courtesy_rating,
  communication_rating,resolution_rating,speed_rating,nps_score,comment,
  sentiment,sentiment_score,keywords,source,legacy_rating_id,created_at,updated_at
)
SELECT av.chamado_id,c.responsavel_id,c.team_id,COALESCE(av.usuario_id,c.usuario_id),
       av.nota,av.nota,av.nota,av.nota,av.nota,
       CASE av.nota WHEN 1 THEN 0 WHEN 2 THEN 3 WHEN 3 THEN 5 WHEN 4 THEN 8 ELSE 10 END,
       av.comentario,'neutral',0,'[]'::jsonb,'legacy_migration',av.id,av.criado_em,av.atualizado_em
FROM chamado_avaliacoes av
JOIN chamados c ON c.id=av.chamado_id
ON CONFLICT (ticket_id) DO NOTHING;

CREATE OR REPLACE FUNCTION validar_avaliacao_chamado() RETURNS trigger AS $$
DECLARE solicitante INTEGER; tecnico INTEGER; equipe INTEGER; estado TEXT;
BEGIN
  SELECT usuario_id,responsavel_id,team_id,status INTO solicitante,tecnico,equipe,estado FROM chamados WHERE id=NEW.ticket_id;
  IF estado IS NULL THEN RAISE EXCEPTION 'Chamado da avaliação não encontrado'; END IF;
  IF estado NOT IN ('RESOLVED','CLOSED','CANCELED') THEN RAISE EXCEPTION 'Somente chamados finalizados podem ser avaliados'; END IF;
  IF NEW.client_id IS NULL AND NEW.source <> 'legacy_migration' THEN RAISE EXCEPTION 'Solicitante da avaliação é obrigatório'; END IF;
  IF NEW.client_id IS NOT NULL AND NEW.client_id IS DISTINCT FROM solicitante THEN RAISE EXCEPTION 'A avaliação deve pertencer ao solicitante do chamado'; END IF;
  NEW.technician_id := tecnico;
  NEW.team_id := equipe;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validar_avaliacao_chamado ON performance_ratings;
CREATE TRIGGER trg_validar_avaliacao_chamado
BEFORE INSERT OR UPDATE ON performance_ratings FOR EACH ROW EXECUTE FUNCTION validar_avaliacao_chamado();

ALTER TABLE chamado_avaliacoes RENAME TO chamado_avaliacoes_legacy_archive;
CREATE VIEW chamado_avaliacoes AS
SELECT id,ticket_id AS chamado_id,client_id AS usuario_id,overall_rating::integer AS nota,
       comment AS comentario,created_at AS criado_em,updated_at AS atualizado_em
FROM performance_ratings;

COMMIT;

-- Rollback documentado:
-- DROP VIEW chamado_avaliacoes;
-- ALTER TABLE chamado_avaliacoes_legacy_archive RENAME TO chamado_avaliacoes;
-- DELETE FROM performance_ratings WHERE source='legacy_migration';
-- DROP TRIGGER trg_validar_avaliacao_chamado ON performance_ratings;
-- DROP INDEX uq_performance_ratings_ticket;
