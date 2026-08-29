-- Responsabilidade: Estrutura ou migração de banco relacionada a 20260821 reset clean developer only.
-- ATENCAO: limpeza destrutiva e irreversivel sem backup.
-- Mantem somente contas com perfil desenvolvedor e configuracoes tecnicas neutras.
-- Execute manualmente apenas depois de confirmar o backup e as contas preservadas.

BEGIN;

DO $$
DECLARE
  developer_count INTEGER;
  table_name TEXT;
  tables_to_clear TEXT[] := ARRAY[
    'performance_ratings',
    'performance_scores',
    'prioridade_ia_feedback',
    'ativo_alteracoes',
    'ativo_alertas',
    'ativo_metricas',
    'ativo_snapshots',
    'ativos',
    'agente_convites',
    'chamado_avaliacoes',
    'chamado_anexos',
    'chamado_comentarios',
    'chamado_movimentacoes',
    'chamados',
    'filtros_salvos',
    'respostas_rapidas',
    'base_conhecimento',
    'departamentos',
    'tipos_chamado',
    'notificacoes',
    'avisos_sistema',
    'auditoria',
    'auditoria_sistema',
    'aceites_legais',
    'usuario_permissoes',
    'team_users',
    'teams',
    'empresas'
  ];
BEGIN
  SELECT COUNT(*)::INTEGER
    INTO developer_count
    FROM usuarios
   WHERE LOWER(COALESCE(perfil, '')) IN ('desenvolvedor', 'developer', 'dev', 'super_admin');

  IF developer_count = 0 THEN
    RAISE EXCEPTION 'Limpeza cancelada: nenhuma conta de desenvolvedor foi encontrada.';
  END IF;

  FOREACH table_name IN ARRAY tables_to_clear LOOP
    IF EXISTS (
      SELECT 1
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public'
         AND c.relname = table_name
         AND c.relkind IN ('r', 'p')
    ) THEN
      EXECUTE format('TRUNCATE TABLE %I RESTART IDENTITY CASCADE', table_name);
    END IF;
  END LOOP;

  UPDATE usuarios
     SET perfil = 'desenvolvedor',
         status = 'ativo',
         empresa_id = NULL,
         aprovado_por = NULL,
         tentativas_login = 0,
         bloqueado_ate = NULL,
         reset_token = NULL,
         reset_expira_em = NULL
   WHERE LOWER(COALESCE(perfil, '')) IN ('desenvolvedor', 'developer', 'dev', 'super_admin');

  DELETE FROM usuarios
   WHERE perfil <> 'desenvolvedor';
END $$;

DELETE FROM configuracoes_sistema
 WHERE chave NOT IN (
   'nome_sistema',
   'email_suporte',
   'cor_principal',
   'logo_url',
   'logo_1_url',
   'sla_critica_resposta',
   'sla_critica_resolucao',
   'sla_alta_resposta',
   'sla_alta_resolucao',
   'sla_media_resposta',
   'sla_media_resolucao',
   'sla_baixa_resposta',
   'sla_baixa_resolucao',
   'closedTicketsHideAfter'
 );

INSERT INTO configuracoes_sistema (chave, valor)
VALUES
  ('nome_sistema', 'Smart HelpDesk'),
  ('email_suporte', ''),
  ('cor_principal', '#2563eb'),
  ('logo_url', ''),
  ('logo_1_url', ''),
  ('sla_critica_resposta', '15'),
  ('sla_critica_resolucao', '120'),
  ('sla_alta_resposta', '60'),
  ('sla_alta_resolucao', '480'),
  ('sla_media_resposta', '240'),
  ('sla_media_resolucao', '1440'),
  ('sla_baixa_resposta', '1440'),
  ('sla_baixa_resolucao', '2880'),
  ('closedTicketsHideAfter', '24h')
ON CONFLICT (chave) DO UPDATE
SET valor = EXCLUDED.valor,
    atualizado_por = NULL,
    atualizado_em = CURRENT_TIMESTAMP;

COMMIT;
