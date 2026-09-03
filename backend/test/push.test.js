const test = require("node:test");
const assert = require("node:assert/strict");
const calls = [];
let subscriptions = [];
let sendError;
const databasePath = require.resolve("../src/config/database");
const query = async (sql, values) => {
  calls.push({ sql, values });
  if (sql.startsWith("SELECT s.subscription")) return { rows: subscriptions };
  if (sql.startsWith("SELECT public_key")) return { rows: [{ public_key: "public", private_key: "private" }] };
  return { rows: [] };
};
require.cache[databasePath] = { id: databasePath, filename: databasePath, loaded: true, exports: { query, connect: async () => ({ query, release() {} }) } };
const webpush = require("web-push");
const sends = [];
webpush.sendNotification = async (...args) => { sends.push(args); if (sendError) throw sendError; };
const push = require("../src/services/pushService");
const controller = require("../src/controllers/pushController");
const subscription = { endpoint: "https://fcm.googleapis.com/fcm/send/test", keys: { p256dh: Buffer.alloc(65, 4).toString("base64url"), auth: Buffer.alloc(16, 1).toString("base64url") } };
function response() { return { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } }; }

test("aceita provedores push e bloqueia destinos internos ou disfarçados", () => {
  for (const host of ["fcm.googleapis.com", "web.push.apple.com", "updates.push.services.mozilla.com", "wns2.notify.windows.com"]) {
    assert.equal(push.validSubscription({ ...subscription, endpoint: `https://${host}/send/test` }), true);
  }
  for (const endpoint of ["http://fcm.googleapis.com/x", "https://127.0.0.1/x", "https://localhost/x", "https://fcm.googleapis.com.evil.test/x", "https://fcm.googleapis.com:444/x", "https://user@fcm.googleapis.com/x"]) {
    assert.equal(push.validSubscription({ ...subscription, endpoint }), false);
  }
  assert.equal(push.validSubscription({ ...subscription, keys: { auth: "invalid", p256dh: "invalid" } }), false);
});

test("clique contém somente URL local e identifica o destinatário", () => {
  const payload = JSON.parse(push.notificationPayload(7, { id: 4, titulo: "Status", mensagem: "Atualizado", link: "/chamados/42" }));
  assert.equal(payload.url, "/?pushUser=7&pushTicket=42");
  assert.equal(payload.tag, "helpdesk-7-4");
  assert.equal(JSON.parse(push.notificationPayload(7, { link: "https://evil.test" })).url, "/?pushUser=7");
});

test("envia para usuário ativo com versão de sessão válida e limpa endpoint expirado", async () => {
  subscriptions = [{ subscription }];
  sendError = { statusCode: 410 };
  assert.equal(await push.sendToUser(7, { id: 1 }, subscription.endpoint), 0);
  const selection = calls.find(({ sql }) => sql.startsWith("SELECT s.subscription"));
  assert.deepEqual(selection.values, [7, subscription.endpoint]);
  assert.match(selection.sql, /u.status='ativo'/);
  assert.match(selection.sql, /s.token_version=COALESCE/);
  assert.ok(calls.some(({ sql, values }) => sql.startsWith("DELETE FROM web_push_subscriptions") && values[1] === 7));
  sendError = undefined;
  assert.equal(await push.sendToUser(7, { id: 2 }), 1);
  assert.equal(sends.at(-1)[2].timeout, 5000);
});

test("teste e remoção usam a conta autenticada, não um usuário do corpo", async () => {
  const res = response();
  await controller.unsubscribe({ user: { id: 7 }, body: { usuario_id: 999, endpoint: subscription.endpoint } }, res);
  assert.equal(res.code, 200);
  assert.deepEqual(calls.at(-1).values, [subscription.endpoint, 7]);
  subscriptions = [];
  const testRes = response();
  await controller.test({ user: { id: 7 }, body: { usuario_id: 999, endpoint: subscription.endpoint } }, testRes);
  assert.equal(testRes.code, 503);
});

test("inscrição inválida não grava no banco", async () => {
  const count = calls.length;
  const res = response();
  await controller.subscribe({ user: { id: 7 }, body: { endpoint: "https://localhost/" } }, res);
  assert.equal(res.code, 400);
  assert.equal(calls.length, count);
});

test("diagnóstico distingue inscrição ausente de falha no provedor", async () => {
  subscriptions = [];
  assert.deepEqual(await push.sendToUserDetailed(7, {}), { sent: 0, total: 0, failures: ["subscription_missing_or_revoked"] });
  subscriptions = [{ subscription }];
  sendError = { statusCode: 403 };
  const result = await push.sendToUserDetailed(7, {});
  assert.deepEqual(result, { sent: 0, total: 1, failures: ["provider_http_403"] });
  sendError = undefined;
});
