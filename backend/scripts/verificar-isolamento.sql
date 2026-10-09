-- Verificação do isolamento por empresa (papel helpdesk_empresa + Row Level Security).
-- Só leitura: cole tudo no SQL Editor do Supabase e rode. Nada é gravado no banco; o teste
-- de papel usa set_config local, que some no fim da execução.
-- Resultado esperado: todas as linhas com ok = true.

DO $$
DECLARE
  total_usuarios bigint;
  visiveis_principal bigint;
  visiveis_inexistente bigint;
  donos_principal bigint;
  resultado text;
BEGIN
  SELECT COUNT(*) INTO total_usuarios FROM usuarios;
  SELECT COUNT(*) INTO donos_principal FROM usuarios WHERE empresa_id = 1;
  BEGIN
    PERFORM set_config('role', 'helpdesk_empresa', true);
    PERFORM set_config('app.empresa_id', '1', true);
    SELECT COUNT(*) INTO visiveis_principal FROM usuarios;
    PERFORM set_config('app.empresa_id', '999999999', true);
    SELECT COUNT(*) INTO visiveis_inexistente FROM usuarios;
    resultado := format('papel assumido; empresa 1 vê %s de %s usuários (esperado %s); empresa inexistente vê %s (esperado 0)',
      visiveis_principal, total_usuarios, donos_principal, visiveis_inexistente);
    IF visiveis_principal = donos_principal AND visiveis_inexistente = 0 THEN
      resultado := 'OK: ' || resultado;
    ELSE
      resultado := 'FALHA: ' || resultado;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    resultado := 'FALHA: ' || SQLERRM;
  END;
  PERFORM set_config('role', 'none', true);
  PERFORM set_config('app.empresa_id', '', true);
  PERFORM set_config('verificacao.teste_papel', resultado, false);
END $$;

WITH papel AS (
  SELECT * FROM pg_roles WHERE rolname = 'helpdesk_empresa'
),
tabelas_esperadas(tabela) AS (
  SELECT unnest(ARRAY[
    'usuarios', 'chamados', 'chamado_movimentacoes', 'chamado_comentarios', 'chamado_anexos',
    'development_requests', 'development_history', 'development_projects', 'project_tasks',
    'development_approvals', 'development_deployments', 'ticket_relations',
    'base_conhecimento', 'base_conhecimento_recomendacoes', 'assistente_interacoes',
    'agente_convites', 'ativos', 'ativo_snapshots', 'ativo_alteracoes', 'ativo_alertas', 'ativo_metricas', 'ativo_unidades',
    'performance_ratings', 'performance_scores', 'teams', 'team_users',
    'respostas_rapidas', 'filtros_salvos', 'configuracoes_sistema', 'departamentos', 'tipos_chamado',
    'notificacoes', 'auditoria_sistema', 'web_push_subscriptions', 'usuario_permissoes',
    'prioridade_ia_feedback', 'aceites_legais', 'empresas', 'avisos_sistema', 'empresa_convites', 'plataforma_acessos'
  ])
),
tabelas AS (
  SELECT e.tabela, c.oid, c.relrowsecurity,
    EXISTS (SELECT 1 FROM pg_policy p WHERE p.polrelid = c.oid AND p.polname = 'isolamento_empresa') AS tem_politica
  FROM tabelas_esperadas e
  JOIN pg_class c ON c.oid = to_regclass('public.' || e.tabela)
),
-- Lidas pela empresa só em parte ou só pela plataforma: a gravação fica com o dono do banco.
so_da_plataforma(tabela) AS (
  VALUES ('empresas'), ('avisos_sistema'), ('empresa_convites'), ('plataforma_acessos')
),
-- Tabela com empresa_id que ficou fora do isolamento (criada depois sem RLS).
sem_isolamento AS (
  SELECT c.relname
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
  JOIN pg_attribute a ON a.attrelid = c.oid AND a.attname = 'empresa_id' AND NOT a.attisdropped
  WHERE c.relkind = 'r'
    AND NOT EXISTS (SELECT 1 FROM pg_policy p WHERE p.polrelid = c.oid AND p.polname = 'isolamento_empresa')
)
SELECT * FROM (VALUES
  (1, 'usuário desta conexão', current_user::text, true),
  (2, 'papel helpdesk_empresa existe',
    CASE WHEN EXISTS (SELECT 1 FROM papel) THEN 'sim' ELSE 'não' END,
    EXISTS (SELECT 1 FROM papel)),
  (3, 'papel sem superusuário e sem BYPASSRLS',
    COALESCE((SELECT format('superuser=%s, bypassrls=%s, login=%s', rolsuper, rolbypassrls, rolcanlogin) FROM papel), '-'),
    COALESCE((SELECT NOT rolsuper AND NOT rolbypassrls FROM papel), false)),
  (4, 'usuário desta conexão pode assumir o papel',
    CASE WHEN EXISTS (SELECT 1 FROM papel) AND pg_has_role(current_user, 'helpdesk_empresa', 'MEMBER') THEN 'sim' ELSE 'não' END,
    EXISTS (SELECT 1 FROM papel) AND pg_has_role(current_user, 'helpdesk_empresa', 'MEMBER')),
  (5, 'tabelas com RLS ligada e política isolamento_empresa',
    (SELECT format('%s de %s', COUNT(*) FILTER (WHERE relrowsecurity AND tem_politica), COUNT(*)) FROM tabelas)
      || COALESCE(' | faltando: ' || (SELECT string_agg(tabela, ', ') FROM tabelas WHERE NOT (relrowsecurity AND tem_politica)), ''),
    (SELECT bool_and(relrowsecurity AND tem_politica) FROM tabelas)),
  (6, 'tabelas com empresa_id fora do isolamento',
    COALESCE((SELECT string_agg(relname, ', ') FROM sem_isolamento), 'nenhuma'),
    NOT EXISTS (SELECT 1 FROM sem_isolamento)),
  (7, 'papel pode ler e gravar as tabelas da empresa',
    COALESCE('sem permissão em: ' || (
      SELECT string_agg(tabela, ', ') FROM tabelas
      WHERE tabela NOT IN (SELECT tabela FROM so_da_plataforma)
        AND EXISTS (SELECT 1 FROM papel)
        AND NOT has_table_privilege('helpdesk_empresa', oid, 'SELECT, INSERT, UPDATE, DELETE')
    ), 'todas'),
    EXISTS (SELECT 1 FROM papel) AND NOT EXISTS (
      SELECT 1 FROM tabelas
      WHERE tabela NOT IN (SELECT tabela FROM so_da_plataforma)
        AND NOT has_table_privilege('helpdesk_empresa', oid, 'SELECT, INSERT, UPDATE, DELETE')
    )),
  (8, 'teste real: assumir o papel e contar usuários',
    current_setting('verificacao.teste_papel', true),
    COALESCE(current_setting('verificacao.teste_papel', true) LIKE 'OK:%', false))
) AS v(ordem, verificacao, resultado, ok)
ORDER BY ordem;
