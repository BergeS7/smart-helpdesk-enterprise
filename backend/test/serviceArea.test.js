/**
 * Responsabilidade: Testes automatizados que verificam service area.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { municipalities, unitFor, validLocation } = require('../src/domain/serviceArea');

test('mantém exatamente as 27 áreas de atuação oficiais e unidades derivadas', () => {
  assert.equal(municipalities.length, 27);
  assert.equal(new Set(municipalities).size, 27);
  for (const municipality of municipalities) {
    assert.equal(validLocation(municipality, unitFor(municipality)), true);
  }
});

test('aceita município e unidade oficiais', () => {
  assert.equal(validLocation('Santa Inês', unitFor('Santa Inês')), true);
  assert.equal(validLocation('Buriticupu', unitFor('Buriticupu')), true);
});

test('rejeita localidades fora da área declarada', () => {
  assert.equal(validLocation('Imperatriz', 'Unidade Imperatriz'), false);
  assert.equal(validLocation('São Luís', 'Matriz São Luís'), false);
  assert.equal(validLocation('Zé Doca', 'Matriz Zé Doca'), false);
});
