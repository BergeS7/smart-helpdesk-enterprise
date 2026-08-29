-- Responsabilidade: Estrutura ou migração de banco relacionada a 20260818 p1 kanban retention.
BEGIN;
INSERT INTO configuracoes_sistema (chave, valor)
VALUES ('closedTicketsHideAfter', '24h')
ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor;
COMMIT;

-- Rollback operacional:
-- UPDATE configuracoes_sistema SET valor = 'never' WHERE chave = 'closedTicketsHideAfter';
