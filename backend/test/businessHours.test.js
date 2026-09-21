const test = require('node:test');
const assert = require('node:assert/strict');
const { isBusinessTime, businessMinutesBetween } = require('../src/domain/businessHours');
const at = (day, time) => `2026-09-${day}T${time}:00-03:00`;

test('expediente inclui sábado de manhã e exclui domingo e limites de fechamento', () => {
  for (const [day, time, expected] of [
    [21, '07:59', false], [21, '08:00', true], [21, '17:59', true], [21, '18:00', false],
    [21, '11:59', true], [21, '12:00', false], [21, '13:59', false], [21, '14:00', true],
    [26, '08:00', true], [26, '11:59', true], [26, '12:00', false], [27, '10:00', false],
  ]) assert.equal(isBusinessTime(at(day, time)), expected, `${day} ${time}`);
});

test('almoço congela o saldo e cada dia de semana soma oito horas úteis', () => {
  assert.equal(businessMinutesBetween(at(21, '08:00'), at(21, '18:00')), 480);
  assert.equal(businessMinutesBetween(at(21, '11:00'), at(21, '15:00')), 120);
  for (const time of ['12:00', '13:00', '14:00']) {
    assert.equal(businessMinutesBetween(at(21, time), at(21, '15:00')), 60);
  }
  assert.equal(businessMinutesBetween(at(26, '08:00'), at(26, '18:00')), 240);
});

test('saldo permanece constante durante noites e domingo', () => {
  const deadline = at(28, '09:00');
  assert.equal(businessMinutesBetween(at(25, '17:00'), at(26, '09:00')), 120);
  for (const start of [at(26, '12:00'), at(26, '23:00'), at(27, '10:00'), at(28, '08:00')]) {
    assert.equal(businessMinutesBetween(start, deadline), 60);
  }
  assert.equal(businessMinutesBetween(at(26, '11:00'), deadline), 120);
});

test('contagem usa Fortaleza independentemente do fuso do processo e preserva frações', () => {
  assert.equal(isBusinessTime('2026-09-21T11:00:00Z'), true);
  assert.equal(isBusinessTime('2026-09-21T10:59:59Z'), false);
  assert.equal(businessMinutesBetween('2026-09-21T20:59:30Z', '2026-09-22T11:00:30Z'), 1);
  assert.equal(businessMinutesBetween(at(28, '09:00'), at(26, '11:00')), -120);
  assert.equal(businessMinutesBetween('invalid', new Date()), null);
});
