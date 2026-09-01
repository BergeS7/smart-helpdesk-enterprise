/** Recupera chamados de desenvolvimento criados antes da correção do vínculo da demanda. */
exports.up = (pgm) => pgm.sql(`
  INSERT INTO development_requests
    (ticket_id, nature, status, problem, expected_result, created_by, created_at, updated_at)
  SELECT
    c.id,
    CASE LOWER(c.tipo_chamado)
      WHEN 'bug' THEN 'bug'
      WHEN 'melhoria' THEN 'melhoria'
      WHEN 'automação' THEN 'automacao'
      WHEN 'automacao' THEN 'automacao'
      WHEN 'integração' THEN 'integracao'
      WHEN 'integracao' THEN 'integracao'
      WHEN 'dashboard / relatório' THEN 'dashboard_relatorio'
      WHEN 'dashboard / relatorio' THEN 'dashboard_relatorio'
      WHEN 'novo sistema' THEN 'novo_sistema'
    END,
    'nova',
    c.descricao,
    c.descricao,
    c.usuario_id,
    COALESCE(c.criado_em, NOW()),
    COALESCE(c.atualizado_em, c.criado_em, NOW())
  FROM chamados c
  WHERE LOWER(c.tipo_chamado) IN
    ('bug', 'melhoria', 'automação', 'automacao', 'integração', 'integracao',
     'dashboard / relatório', 'dashboard / relatorio', 'novo sistema')
    AND NOT EXISTS (
      SELECT 1 FROM development_requests d WHERE d.ticket_id = c.id
    );
`);

exports.down = () => null;
