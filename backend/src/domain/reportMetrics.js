const { isFinal, label: statusLabel } = require('./ticketStatus');

const validDate = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
};
const average = (values) => {
  const valid = values.map(Number).filter(Number.isFinite);
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null;
};
const minutes = (start, end) => {
  const from = validDate(start); const to = validDate(end);
  return from && to ? Math.max(0, (to - from) / 60000) : null;
};
const distribution = (rows, getter) => Object.entries(rows.reduce((result, row) => {
  const key = getter(row) || 'Não informado';
  result[key] = (result[key] || 0) + 1;
  return result;
}, {})).map(([label, total]) => ({ label, total })).sort((a, b) => b.total - a.total);

function buildReportMetrics(tickets) {
  const concluded = tickets.filter((ticket) => isFinal(ticket.status));
  const open = tickets.filter((ticket) => !isFinal(ticket.status));
  const responseTimes = tickets.map((ticket) => minutes(ticket.criado_em, ticket.primeira_resposta_em)).filter((value) => value != null);
  const resolutionTimes = concluded.map((ticket) => minutes(ticket.criado_em, ticket.finalizado_em)).filter((value) => value != null);
  const slaBase = concluded.filter((ticket) => validDate(ticket.finalizado_em) && validDate(ticket.sla_limite_resolucao));
  const slaMet = slaBase.filter((ticket) => validDate(ticket.finalizado_em) <= validDate(ticket.sla_limite_resolucao)).length;
  const ratings = tickets.map((ticket) => Number(ticket.avaliacao_nota)).filter((value) => value >= 1 && value <= 5);

  return {
    received: tickets.length,
    concluded: concluded.length,
    open: open.length,
    overdue: open.filter((ticket) => ticket.vencido).length,
    unassigned: open.filter((ticket) => !ticket.responsavel_id).length,
    reopened: tickets.filter((ticket) => ticket.reaberto_em).length,
    critical: tickets.filter((ticket) => ['Crítica', 'Critica'].includes(ticket.prioridade)).length,
    firstResponseMinutes: average(responseTimes),
    firstResponseBase: responseTimes.length,
    resolutionMinutes: average(resolutionTimes),
    resolutionBase: resolutionTimes.length,
    slaRate: slaBase.length ? slaMet / slaBase.length : null,
    slaBase: slaBase.length,
    satisfaction: average(ratings),
    ratings: ratings.length,
    byStatus: distribution(tickets, (ticket) => statusLabel(ticket.status)),
    byPriority: distribution(tickets, (ticket) => ticket.prioridade),
    byDepartment: distribution(tickets, (ticket) => ticket.setor),
    byTechnician: distribution(tickets, (ticket) => ticket.responsavel_nome || ticket.responsavel || 'Sem responsável'),
    byTeam: distribution(tickets, (ticket) => ticket.team_name || 'Sem equipe'),
    byMunicipality: distribution(tickets, (ticket) => ticket.municipio_solicitante || 'Não informado'),
    byUnit: distribution(tickets, (ticket) => ticket.unidade_solicitante || 'Não informada'),
    methodology: {
      cohort: 'Chamados criados dentro do período e dos filtros selecionados.',
      firstResponse: 'Média entre criação e primeira resposta, somente onde a primeira resposta existe.',
      resolution: 'Média entre criação e finalização, somente para chamados finalizados com ambas as datas.',
      sla: 'Percentual de chamados finalizados até o limite de resolução, somente quando as duas datas existem.',
      satisfaction: 'Média das avaliações reais vinculadas aos chamados do filtro; registros sem avaliação são ignorados.'
    }
  };
}

module.exports = { buildReportMetrics };
