/**
 * Responsabilidade: cálculo de SLA configurável, sincronização dos chamados ativos e alertas de prazo.
 */
const pool = require("../../config/database");
const { carregarConfiguracoesObjeto } = require("../settingsController");
const { isBusinessTime, businessMinutesBetween } = require("../../domain/businessHours");
const { STATUS, canonicalize: canonicalizeStatus, label: statusLabel, isFinal: statusFinalizado, canTransition, REOPEN_WINDOW_DAYS, reopenDeadline, isReopenWindowOpen } = require("../../domain/ticketStatus");
const { registrarMovimentacao } = require("./registro");

function formatarPrazo(minutos) {
  const total = Number(minutos || 0);
  if (total < 60) return `${total}min`;
  if (total % 60 === 0) return `${total / 60}h`;
  return `${Math.floor(total / 60)}h${total % 60}min`;
}

function montarSLAConfiguravel(prioridade, config = {}) {
  const normalizada = String(prioridade || "Media").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  const prefixo = normalizada === "critica" ? "critica" : normalizada === "alta" ? "alta" : normalizada === "baixa" ? "baixa" : "media";
  const defaults = {
    critica: { resposta: 15, resolucao: 120 },
    alta: { resposta: 60, resolucao: 480 },
    media: { resposta: 240, resolucao: 1440 },
    baixa: { resposta: 1440, resolucao: 2880 },
  };

  const respostaMinutos = Math.max(1, Number(config[`sla_${prefixo}_resposta`] || defaults[prefixo].resposta));
  const resolucaoMinutos = Math.max(1, Number(config[`sla_${prefixo}_resolucao`] || defaults[prefixo].resolucao));

  return {
    respostaMinutos,
    resolucaoMinutos,
    label: `Resposta: ${formatarPrazo(respostaMinutos)} / resolução: ${formatarPrazo(resolucaoMinutos)} úteis`,
  };
}

async function calcularSLAConfiguravel(prioridade) {
  const config = await carregarConfiguracoesObjeto().catch(() => ({}));
  return montarSLAConfiguravel(prioridade, config);
}

let sincronizacaoSlaAtivos = null;

// Normaliza prazos antigos uma única vez por processo antes das leituras de SLA.
async function sincronizarSlaChamadosAtivosUmaVez() {
  if (!sincronizacaoSlaAtivos) {
    sincronizacaoSlaAtivos = (async () => {
      const config = await carregarConfiguracoesObjeto().catch(() => ({}));
      const regras = {
        critica: montarSLAConfiguravel("Critica", config),
        alta: montarSLAConfiguravel("Alta", config),
        media: montarSLAConfiguravel("Media", config),
        baixa: montarSLAConfiguravel("Baixa", config),
      };
      const resposta = [regras.critica.respostaMinutos, regras.alta.respostaMinutos, regras.media.respostaMinutos, regras.baixa.respostaMinutos];
      const resolucao = [regras.critica.resolucaoMinutos, regras.alta.resolucaoMinutos, regras.media.resolucaoMinutos, regras.baixa.resolucaoMinutos];
      const labels = [regras.critica.label, regras.alta.label, regras.media.label, regras.baixa.label];
      await pool.query(
        `WITH regras AS (
           SELECT c.id,
             CASE WHEN LOWER(c.prioridade) IN ('critica','crítica') THEN $1::integer WHEN LOWER(c.prioridade)='alta' THEN $2::integer WHEN LOWER(c.prioridade) IN ('media','média') THEN $3::integer ELSE $4::integer END resposta,
             CASE WHEN LOWER(c.prioridade) IN ('critica','crítica') THEN $5::integer WHEN LOWER(c.prioridade)='alta' THEN $6::integer WHEN LOWER(c.prioridade) IN ('media','média') THEN $7::integer ELSE $8::integer END resolucao,
             CASE WHEN LOWER(c.prioridade) IN ('critica','crítica') THEN $9::text WHEN LOWER(c.prioridade)='alta' THEN $10::text WHEN LOWER(c.prioridade) IN ('media','média') THEN $11::text ELSE $12::text END label
           FROM chamados c
           WHERE c.status NOT IN ('RESOLVED','CLOSED','CANCELED')
             AND LOWER(COALESCE(c.tipo_chamado, '')) NOT IN ('bug','melhoria','automação','automacao','integração','integracao','dashboard / relatório','dashboard / relatorio','novo sistema')
         )
         UPDATE chamados c SET
           sla_resposta_minutos=r.resposta, sla_resolucao_minutos=r.resolucao, sla=r.label,
           sla_limite_resposta=CASE WHEN c.primeira_resposta_em IS NULL THEN sla_add_business_seconds(c.sla_limite_resposta, (r.resposta - c.sla_resposta_minutos) * 60.0) ELSE c.sla_limite_resposta END,
           sla_limite_resolucao=sla_add_business_seconds(c.sla_limite_resolucao, (r.resolucao - c.sla_resolucao_minutos) * 60.0),
           vencido=FALSE, sla_alerta_enviado=FALSE, sla_escalado=FALSE
         FROM regras r
         WHERE c.id=r.id AND (c.sla_resposta_minutos IS DISTINCT FROM r.resposta OR c.sla_resolucao_minutos IS DISTINCT FROM r.resolucao)`,
        [...resposta, ...resolucao, ...labels]
      );
    })().catch((error) => {
      sincronizacaoSlaAtivos = null;
      throw error;
    });
  }
  return sincronizacaoSlaAtivos;
}

function minutosRestantes(dataLimite, referencia = new Date()) {
  if (!dataLimite) return null;
  const minutes = businessMinutesBetween(referencia, dataLimite);
  return minutes === null ? null : Math.round(minutes);
}

function calcularIndicadoresSla(row) {
  const aguardando = canonicalizeStatus(row.status) === STATUS.WAITING_USER;
  const finalizado = statusFinalizado(row.status);
  const referencia = aguardando && row.sla_pausado_em ? row.sla_pausado_em : finalizado && row.finalizado_em ? row.finalizado_em : new Date();
  const restante = minutosRestantes(row.sla_limite_resolucao, referencia);
  const foraExpediente = !finalizado && Boolean(row.sla_limite_resolucao) && !isBusinessTime();
  const vencido = !aguardando && Boolean(row.sla_limite_resolucao) && new Date(row.sla_limite_resolucao) < new Date(referencia);
  const pausado = aguardando || (foraExpediente && !vencido);
  const resolucao = Number(row.sla_resolucao_minutos || 0);
  let sla_status = pausado ? "pausado" : "normal";
  if (!pausado && row.status && !statusFinalizado(row.status)) {
    if (vencido) sla_status = "vencido";
    else if (restante !== null && resolucao > 0 && restante <= Math.max(30, resolucao * 0.2)) sla_status = "alerta";
  }
  return { ...row, vencido, sla_minutos_restantes: restante, sla_status,
    sla_pausa_motivo: aguardando ? "aguardando_usuario" : foraExpediente ? "fora_expediente" : null };
}

// Detecta chamados próximos do vencimento e evita repetir alertas já enviados.
async function verificarAlertasSla(req = null) {
  if (!isBusinessTime()) return;
  const sistemaReq = req || { user: { id: null, nome: "Sistema", perfil: "sistema" } };
  const result = await pool.query(
    `SELECT id, numero_chamado, titulo, usuario_id, responsavel_id, sla_limite_resolucao, sla_resolucao_minutos, status,
            COALESCE(sla_alerta_enviado, FALSE) AS sla_alerta_enviado,
            COALESCE(sla_escalado, FALSE) AS sla_escalado
     FROM chamados
     WHERE status NOT IN ('RESOLVED','CLOSED','CANCELED','WAITING_USER')
       AND sla_limite_resolucao IS NOT NULL
       AND (
         (COALESCE(sla_alerta_enviado, FALSE) = FALSE AND sla_business_seconds(CURRENT_TIMESTAMP::timestamp, sla_limite_resolucao) <= 1800)
         OR (COALESCE(sla_escalado, FALSE) = FALSE AND sla_limite_resolucao < CURRENT_TIMESTAMP)
       )
     LIMIT 50`
  ).catch(() => ({ rows: [] }));

  for (const chamado of result.rows) {
    if (!chamado.sla_alerta_enviado && minutosRestantes(chamado.sla_limite_resolucao) <= 30) {
      await pool.query("UPDATE chamados SET sla_alerta_enviado = TRUE WHERE id = $1", [chamado.id]).catch(() => {});
      await registrarMovimentacao(chamado.id, sistemaReq, "sla_alerta", "Alerta automático de SLA próximo do vencimento.").catch(() => {});
    }
    if (!chamado.sla_escalado && new Date(chamado.sla_limite_resolucao) < new Date()) {
      await pool.query("UPDATE chamados SET sla_escalado = TRUE, vencido = TRUE WHERE id = $1", [chamado.id]).catch(() => {});
      await registrarMovimentacao(chamado.id, sistemaReq, "sla_escalonado", "Chamado escalonado automaticamente por vencimento de SLA.").catch(() => {});
    }
  }
}

module.exports = {
  formatarPrazo,
  montarSLAConfiguravel,
  calcularSLAConfiguravel,
  sincronizarSlaChamadosAtivosUmaVez,
  minutosRestantes,
  calcularIndicadoresSla,
  verificarAlertasSla,
};
