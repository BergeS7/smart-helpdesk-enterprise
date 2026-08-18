BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM chamados
    WHERE status NOT IN (
      'OPEN','IN_PROGRESS','WAITING_USER','WAITING_THIRD_PARTY','RESOLVED','CLOSED','CANCELED','REOPENED',
      'Aberto','Em Aberto','Em Andamento','Em Análise','Aguardando Usuario','Aguardando Usuário',
      'Aguardando cliente','Aguardando Terceiros','Resolvido','Concluido','Concluído','Fechado','Cancelado','Reaberto','Pausado'
    )
  ) THEN
    RAISE EXCEPTION 'Migration interrompida: existem status de chamado não mapeados';
  END IF;
END $$;

ALTER TABLE chamados DROP CONSTRAINT IF EXISTS chamados_status_check;

UPDATE chamados SET status = CASE status
  WHEN 'Aberto' THEN 'OPEN'
  WHEN 'Em Aberto' THEN 'OPEN'
  WHEN 'Em Andamento' THEN 'IN_PROGRESS'
  WHEN 'Em Análise' THEN 'IN_PROGRESS'
  WHEN 'Aguardando Usuario' THEN 'WAITING_USER'
  WHEN 'Aguardando Usuário' THEN 'WAITING_USER'
  WHEN 'Aguardando cliente' THEN 'WAITING_USER'
  WHEN 'Pausado' THEN 'WAITING_USER'
  WHEN 'Aguardando Terceiros' THEN 'WAITING_THIRD_PARTY'
  WHEN 'Resolvido' THEN 'RESOLVED'
  WHEN 'Concluido' THEN 'CLOSED'
  WHEN 'Concluído' THEN 'CLOSED'
  WHEN 'Fechado' THEN 'CLOSED'
  WHEN 'Cancelado' THEN 'CANCELED'
  WHEN 'Reaberto' THEN 'REOPENED'
  ELSE status
END;

ALTER TABLE chamados ALTER COLUMN status SET DEFAULT 'OPEN';
ALTER TABLE chamados ADD CONSTRAINT chamados_status_check CHECK (
  status IN ('OPEN','IN_PROGRESS','WAITING_USER','WAITING_THIRD_PARTY','RESOLVED','CLOSED','CANCELED','REOPENED')
);
CREATE INDEX IF NOT EXISTS idx_chamados_status_atualizado ON chamados(status, atualizado_em DESC);

COMMIT;

-- Rollback lógico documentado (executar apenas após remover a constraint):
-- UPDATE chamados SET status = CASE status
--   WHEN 'OPEN' THEN 'Em Aberto' WHEN 'IN_PROGRESS' THEN 'Em Andamento'
--   WHEN 'WAITING_USER' THEN 'Aguardando Usuario' WHEN 'WAITING_THIRD_PARTY' THEN 'Aguardando Terceiros'
--   WHEN 'RESOLVED' THEN 'Resolvido' WHEN 'CLOSED' THEN 'Concluido'
--   WHEN 'CANCELED' THEN 'Cancelado' WHEN 'REOPENED' THEN 'Reaberto' END;
-- ALTER TABLE chamados ALTER COLUMN status SET DEFAULT 'Em Aberto';
