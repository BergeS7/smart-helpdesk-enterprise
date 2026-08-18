const test = require("node:test");
const assert = require("node:assert/strict");
const policy = require("../src/policies/ticketPolicy");

const closedOther = { id: 9, status: "Concluido", usuario_id: 100, responsavel_id: 20, email_solicitante: "cliente@empresa.com" };

test("técnico não modifica histórico de outro técnico", () => {
  assert.equal(policy.canMutate({ id: 21, perfil: "tecnico" }, closedOther), false);
  assert.equal(policy.canAddContent({ id: 21, perfil: "tecnico" }, closedOther), false);
});

test("nem o técnico responsável adiciona conteúdo após encerramento", () => {
  assert.equal(policy.canMutate({ id: 20, perfil: "tecnico" }, closedOther), true);
  assert.equal(policy.canAddContent({ id: 20, perfil: "tecnico" }, closedOther), false);
});

test("somente solicitante pode avaliar chamado encerrado", () => {
  assert.equal(policy.canRate({ id: 100, perfil: "usuario", email: "cliente@empresa.com" }, closedOther), true);
  assert.equal(policy.canRate({ id: 20, perfil: "tecnico" }, closedOther), false);
  assert.equal(policy.canRate({ id: 1, perfil: "admin" }, closedOther), false);
});
