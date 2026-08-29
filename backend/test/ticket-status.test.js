/**
 * Responsabilidade: Testes automatizados que verificam ticket status.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const { STATUS, canonicalize, label, isFinal, canTransition } = require("../src/domain/ticketStatus");

test("converte todas as variantes legadas relevantes para códigos canônicos", () => {
  assert.equal(canonicalize("Concluído"), STATUS.CLOSED);
  assert.equal(canonicalize("Concluido"), STATUS.CLOSED);
  assert.equal(canonicalize("Em Análise"), STATUS.IN_PROGRESS);
  assert.equal(canonicalize("Aguardando Usuario"), STATUS.WAITING_USER);
  assert.equal(canonicalize("valor desconhecido"), null);
  assert.equal(label(STATUS.WAITING_THIRD_PARTY), "Aguardando terceiros");
});

test("reconhece estados finais legados e canônicos", () => {
  assert.equal(isFinal("Resolvido"), true);
  assert.equal(isFinal(STATUS.CLOSED), true);
  assert.equal(isFinal(STATUS.REOPENED), false);
});

test("bloqueia transições inválidas", () => {
  assert.equal(canTransition(STATUS.OPEN, STATUS.CLOSED), true);
  assert.equal(canTransition(STATUS.OPEN, STATUS.IN_PROGRESS), true);
  assert.equal(canTransition(STATUS.CLOSED, STATUS.REOPENED), true);
  assert.equal(canTransition(STATUS.CLOSED, STATUS.IN_PROGRESS), false);
  assert.equal(canTransition(STATUS.CLOSED, STATUS.OPEN), false);
});
