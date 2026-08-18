const test = require('node:test');
const assert = require('node:assert/strict');
const { unitFor, validLocation } = require('../src/domain/serviceArea');

test('aceita município e unidade oficiais', () => {
  assert.equal(validLocation('Santa Inês', unitFor('Santa Inês')), true);
  assert.equal(validLocation('Buriticupu', unitFor('Buriticupu')), true);
});

test('rejeita localidades fora da área declarada', () => {
  assert.equal(validLocation('Imperatriz', 'Unidade Imperatriz'), false);
  assert.equal(validLocation('São Luís', 'Matriz São Luís'), false);
  assert.equal(validLocation('Zé Doca', 'Matriz Zé Doca'), false);
});
