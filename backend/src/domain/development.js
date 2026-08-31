/** Regras puras do fluxo de desenvolvimento. */
const DEVELOPMENT_TYPES = Object.freeze(["bug", "melhoria", "automacao", "integracao", "dashboard_relatorio", "novo_sistema"]);
const DEVELOPMENT_STATUSES = Object.freeze(["nova", "em_analise", "levantamento_requisitos", "avaliacao_tecnica", "aguardando_aprovacao", "backlog", "em_desenvolvimento", "em_testes", "homologacao", "pronto_implantacao", "implantacao", "concluido", "cancelado"]);
const PROJECT_STATUSES = Object.freeze(["planejamento", "aguardando_aprovacao", "aprovado", "em_desenvolvimento", "em_testes", "homologacao", "implantacao", "concluido", "suspenso", "cancelado"]);
const TASK_STATUSES = Object.freeze(["a_fazer", "em_andamento", "bloqueado", "em_testes", "concluido"]);
const EFFORTS = Object.freeze(["muito_pequeno", "pequeno", "medio", "grande", "muito_grande"]);

function scoreDevelopment(input = {}, thresholds = { baixa: 7, media: 11, alta: 15 }) {
  const values = [input.impacto, input.alcance, input.ganho, input.urgencia].map(Number);
  if (values.some((value) => !Number.isInteger(value) || value < 1 || value > 5)) throw Object.assign(new Error("Impacto, alcance, ganho e urgência devem estar entre 1 e 5."), { status: 400 });
  const total = values.reduce((sum, value) => sum + value, 0);
  const prioridade = total <= thresholds.baixa ? "baixa" : total <= thresholds.media ? "media" : total <= thresholds.alta ? "alta" : "critica";
  return { total, prioridade };
}

function calculateSavings({ tempo_antes_minutos = 0, tempo_depois_minutos = 0, execucoes_mes = 0, pessoas = 0 } = {}) {
  const monthlyMinutes = Math.max(0, Number(tempo_antes_minutos) - Number(tempo_depois_minutos)) * Math.max(0, Number(execucoes_mes)) * Math.max(0, Number(pessoas));
  return { horas_mes: Number((monthlyMinutes / 60).toFixed(2)), horas_ano: Number((monthlyMinutes * 12 / 60).toFixed(2)) };
}

module.exports = { DEVELOPMENT_TYPES, DEVELOPMENT_STATUSES, PROJECT_STATUSES, TASK_STATUSES, EFFORTS, scoreDevelopment, calculateSavings };
