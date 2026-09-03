const test = require("node:test");
const assert = require("node:assert/strict");
const saved = [];
const databasePath = require.resolve("../src/config/database");
require.cache[databasePath] = { id: databasePath, filename: databasePath, loaded: true, exports: { query: async (_sql, values) => { saved.push(values); return { rows: [{ id: saved.length }] }; } } };
const pushPath = require.resolve("../src/services/pushService");
require.cache[pushPath] = { id: pushPath, filename: pushPath, loaded: true, exports: { sendSafely: async () => {} } };
const { mensagemStatus, notificarStatus, notificarAvaliacao } = require("../src/services/ticketNotificationService");
const ticket = { id: 8, titulo: "Computador não liga", usuario_id: 3, responsavel_id: 7 };

test("notifica solicitante apenas nos estados solicitados", async () => {
  for (const status of ["OPEN", "REOPENED", "CANCELED", "WAITING_THIRD_PARTY"]) assert.equal(mensagemStatus(ticket, status), null);
  for (const status of ["IN_PROGRESS", "WAITING_USER", "RESOLVED", "CLOSED"]) {
    await notificarStatus(ticket, status);
    assert.equal(saved.at(-1)[0], 3);
    assert.ok(saved.at(-1)[2].includes(ticket.titulo));
  }
  assert.match(saved.at(-1)[1], /faça a avaliação/);
  assert.equal(saved.at(-1)[4], "/chamados/8?action=avaliar");
  const count = saved.length;
  await notificarStatus(ticket, "CLOSED", "RESOLVED");
  assert.equal(saved.length, count);
});

test("avaliação avisa somente o atendente avaliado com nota e comentário curto", async () => {
  await notificarAvaliacao(ticket, 4, "Bom atendimento. ".repeat(30));
  const message = saved.at(-1);
  assert.equal(message[0], 7);
  assert.equal(message[1], "Você foi avaliado");
  assert.match(message[2], /^Nota 4\/5 — Bom atendimento\./);
  assert.ok(message[2].length < 180);
  assert.equal(message[4], "/chamados/8");
});
