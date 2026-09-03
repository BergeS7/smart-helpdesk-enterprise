const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

function worker() {
  const events = {}, shown = [], opened = [];
  const self = {
    location: { origin: "https://helpdesk.test" },
    addEventListener: (name, callback) => { events[name] = callback; },
    registration: { showNotification: async (...args) => { shown.push(args); } },
    clients: { matchAll: async () => [], openWindow: async (url) => { opened.push(url); } },
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../../frontend/public/sw.js"), "utf8"), { self, URL });
  return { events, shown, opened };
}
test("push mostra alerta e clique rejeita destino externo", async () => {
  const { events, shown, opened } = worker();
  let completion;
  events.push({ data: { json: () => ({ title: "Resposta", body: "Nova mensagem", url: "/?pushTicket=8&pushUser=7" }) }, waitUntil(promise) { completion = promise; } });
  await completion;
  assert.equal(shown[0][0], "Resposta");
  assert.equal(shown[0][1].icon, "/pwa-192-v2.png");
  for (const [url, expected] of [["https://evil.test/", "https://helpdesk.test/"], ["/?pushTicket=8&pushUser=7", "https://helpdesk.test/?pushTicket=8&pushUser=7"]]) {
    events.notificationclick({ notification: { data: { url }, close() {} }, waitUntil(promise) { completion = promise; } });
    await completion;
    assert.equal(opened.at(-1), expected);
  }
});
