const test = require("node:test");
const assert = require("node:assert/strict");
const databasePath = require.resolve("../src/config/database");
const queries = [];
require.cache[databasePath] = { id: databasePath, filename: databasePath, loaded: true, exports: {
  query: async (sql) => {
    queries.push(sql);
    return { rows: ["usuario", "tecnico", "supervisor", "admin", "desenvolvedor", "super_admin", "developer", "desconhecido"].map((perfil, index) => ({ id: index + 1, perfil })) };
  },
} };
const { notificarNovoChamadoNaFila } = require("../src/services/queueNotificationService");

test("novo chamado sem responsável notifica toda a equipe da fila uma vez", async () => {
  const sent = [];
  await notificarNovoChamadoNaFila({ id: 10, numero_chamado: "HD-0010", titulo: "Solicitação", responsavel_id: null }, async (...args) => sent.push(args));
  assert.deepEqual(sent.map(([id]) => id), [2, 3, 4, 5, 6, 7]);
  assert.equal(sent.every((item) => item[1] === "Novo chamado na fila" && item[4] === "/chamados/10"), true);
  assert.match(queries.at(-1), /COALESCE\(status,'ativo'\)='ativo'/);
});

test("chamado atribuído não dispara alerta de fila para toda a equipe", async () => {
  const before = queries.length;
  await notificarNovoChamadoNaFila({ id: 10, responsavel_id: 2 }, async () => assert.fail("Não deve enviar alerta de fila"));
  assert.equal(queries.length, before);
});
