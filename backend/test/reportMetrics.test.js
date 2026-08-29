/**
 * Responsabilidade: Testes automatizados que verificam report metrics.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildReportMetrics } = require('../src/domain/reportMetrics');

test('calcula tempos, SLA e satisfação somente com bases válidas', () => {
  const result = buildReportMetrics([
    { status: 'CLOSED', criado_em: '2026-01-01T10:00:00Z', primeira_resposta_em: '2026-01-01T10:30:00Z', finalizado_em: '2026-01-01T12:00:00Z', sla_limite_resolucao: '2026-01-01T13:00:00Z', avaliacao_nota: 5, prioridade: 'Alta', setor: 'TI', responsavel_id: 2, responsavel_nome: 'Ana' },
    { status: 'RESOLVED', criado_em: '2026-01-02T10:00:00Z', finalizado_em: '2026-01-02T15:00:00Z', sla_limite_resolucao: '2026-01-02T14:00:00Z', avaliacao_nota: 3, prioridade: 'Média', setor: 'RH', responsavel_id: 2, responsavel_nome: 'Ana', reaberto_em: '2026-01-02T12:00:00Z' },
    { status: 'OPEN', criado_em: '2026-01-03T10:00:00Z', prioridade: 'Crítica', setor: 'TI', vencido: true }
  ]);
  assert.equal(result.received, 3);
  assert.equal(result.concluded, 2);
  assert.equal(result.open, 1);
  assert.equal(result.firstResponseMinutes, 30);
  assert.equal(result.firstResponseBase, 1);
  assert.equal(result.resolutionMinutes, 210);
  assert.equal(result.slaRate, 0.5);
  assert.equal(result.satisfaction, 4);
  assert.equal(result.ratings, 2);
  assert.equal(result.reopened, 1);
  assert.equal(result.overdue, 1);
});

test('não inventa zero quando não existe base para o indicador', () => {
  const result = buildReportMetrics([{ status: 'OPEN', criado_em: '2026-01-01T10:00:00Z' }]);
  assert.equal(result.firstResponseMinutes, null);
  assert.equal(result.resolutionMinutes, null);
  assert.equal(result.slaRate, null);
  assert.equal(result.satisfaction, null);
});

test('segmenta relatório por equipe, município e unidade', () => {
  const result = buildReportMetrics([{ status: 'OPEN', team_name: 'Infra', municipio_solicitante: 'Santa Inês', unidade_solicitante: 'Maranhão Motos - Santa Inês' }]);
  assert.deepEqual(result.byTeam, [{ label: 'Infra', total: 1 }]);
  assert.deepEqual(result.byMunicipality, [{ label: 'Santa Inês', total: 1 }]);
  assert.deepEqual(result.byUnit, [{ label: 'Maranhão Motos - Santa Inês', total: 1 }]);
});
