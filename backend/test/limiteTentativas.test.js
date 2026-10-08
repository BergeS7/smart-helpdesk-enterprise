/**
 * Responsabilidade: garante que trocar o e-mail a cada tentativa não escapa do limite por IP.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
delete process.env.REDIS_URL;
const express = require("express");
const { authLimiter, registrationLimiter } = require("../src/middlewares/securityMiddleware");

async function comServidor(limitador, resposta, acao) {
  const app = express();
  app.use(express.json());
  app.post("/rota", limitador, (req, res) => resposta(req, res));
  const server = app.listen(0);
  const enviar = (email) => fetch(`http://127.0.0.1:${server.address().port}/rota`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }),
  }).then((r) => r.status);
  try { return await acao(enviar); } finally { server.close(); }
}

test("cadastro: e-mails diferentes do mesmo IP param no limite por IP", async () => {
  await comServidor(registrationLimiter, (req, res) => res.status(201).json({}), async (enviar) => {
    for (let i = 0; i < 30; i += 1) assert.equal(await enviar(`pessoa${i}@exemplo.com`), 201);
    assert.equal(await enviar("pessoa31@exemplo.com"), 429);
  });
});

test("login: falhas com e-mails diferentes param no limite por IP; logins certos não contam", async () => {
  await comServidor(authLimiter, (req, res) => res.status(req.body.email.startsWith("ok") ? 200 : 401).json({}), async (enviar) => {
    for (let i = 0; i < 40; i += 1) assert.equal(await enviar(`ok${i}@exemplo.com`), 200);
    for (let i = 0; i < 30; i += 1) assert.equal(await enviar(`errado${i}@exemplo.com`), 401);
    assert.equal(await enviar("errado31@exemplo.com"), 429);
  });
});
