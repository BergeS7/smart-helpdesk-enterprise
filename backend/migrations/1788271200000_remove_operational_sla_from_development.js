/** Demandas de desenvolvimento seguem planejamento próprio, não o SLA da central. */
exports.up = (pgm) => pgm.sql(`
  UPDATE chamados
     SET sla = NULL,
         sla_limite_resposta = NULL,
         sla_limite_resolucao = NULL,
         vencido = FALSE,
         sla_alerta_enviado = FALSE,
         sla_escalado = FALSE,
         atualizado_em = CURRENT_TIMESTAMP
   WHERE LOWER(COALESCE(tipo_chamado, '')) IN
    ('bug','melhoria','automação','automacao','integração','integracao',
     'dashboard / relatório','dashboard / relatorio','novo sistema');
`);

exports.down = () => null;
