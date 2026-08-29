-- Responsabilidade: Estrutura ou migração de banco relacionada a 20260826 asset user ratings.
-- Permite que o usuário diretamente vinculado ao ativo avalie chamados
-- abertos pela equipe técnica em nome dele.
ALTER TABLE ativos
  ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ativos_usuario_id ON ativos(usuario_id);

UPDATE ativos a
   SET usuario_id = u.id
  FROM usuarios u
 WHERE a.usuario_id IS NULL
   AND COALESCE(u.status, 'ativo') = 'ativo'
   AND (
     LOWER(COALESCE(a.usuario, '')) = LOWER(u.email)
     OR LOWER(COALESCE(a.usuario, '')) = LOWER(u.nome)
     OR LOWER(REGEXP_REPLACE(COALESCE(a.usuario, ''), '^.*[\\/]', '')) = LOWER(SPLIT_PART(u.email, '@', 1))
   );

CREATE OR REPLACE FUNCTION validar_avaliacao_chamado() RETURNS trigger AS $$
DECLARE solicitante INTEGER; tecnico INTEGER; equipe INTEGER; estado TEXT; ativo BIGINT; autorizado BOOLEAN;
BEGIN
  SELECT usuario_id,responsavel_id,team_id,status,ativo_id
    INTO solicitante,tecnico,equipe,estado,ativo
    FROM chamados WHERE id=NEW.ticket_id;
  IF estado IS NULL THEN RAISE EXCEPTION 'Chamado da avaliação não encontrado'; END IF;
  IF estado NOT IN ('RESOLVED','CLOSED','CANCELED') THEN RAISE EXCEPTION 'Somente chamados finalizados podem ser avaliados'; END IF;
  IF NEW.client_id IS NULL AND NEW.source <> 'legacy_migration' THEN RAISE EXCEPTION 'Usuário da avaliação é obrigatório'; END IF;
  IF NEW.client_id IS NOT NULL AND NEW.client_id IS DISTINCT FROM solicitante THEN
    SELECT EXISTS (
      SELECT 1 FROM ativos a JOIN usuarios u ON u.id=NEW.client_id
       WHERE a.id=ativo AND (
         a.usuario_id=NEW.client_id
         OR LOWER(COALESCE(a.usuario,''))=LOWER(u.email)
         OR LOWER(COALESCE(a.usuario,''))=LOWER(u.nome)
         OR LOWER(REGEXP_REPLACE(COALESCE(a.usuario,''), '^.*[\\/]', ''))=LOWER(SPLIT_PART(u.email,'@',1))
       )
    ) INTO autorizado;
    IF NOT COALESCE(autorizado,FALSE) THEN RAISE EXCEPTION 'A avaliação deve pertencer ao solicitante ou ao usuário vinculado ao ativo'; END IF;
  END IF;
  NEW.technician_id:=tecnico; NEW.team_id:=equipe; RETURN NEW;
END $$ LANGUAGE plpgsql;
