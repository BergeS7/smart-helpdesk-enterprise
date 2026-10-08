/**
 * Responsabilidade: login e recuperação de senha não revelam quais e-mails têm conta, e pedir
 * outro código de recuperação não libera quem está bloqueado por tentativas erradas.
 */
const test = require("node:test");
const assert = require("node:assert/strict");

function simular(caminho, exports) {
  const resolvido = require.resolve(caminho);
  require.cache[resolvido] = { id: resolvido, filename: resolvido, loaded: true, exports };
}

let usuarios = [];
const consultas = [];
const enviados = [];
let emailLigado = true;

simular("../src/config/database", {
  query: async (sql, params = []) => {
    consultas.push({ sql, params });
    if (/^\s*SELECT/i.test(sql) && /FROM usuarios/i.test(sql)) {
      return { rows: usuarios.filter((u) => u.email === String(params[0]).toLowerCase()) };
    }
    return { rows: [], rowCount: 1 };
  },
});
simular("../src/services/emailService", {
  emailConfigurado: () => emailLigado,
  enviarEmail: async (mensagem) => { enviados.push(mensagem); return { enviado: true }; },
});
simular("../src/services/emailMarcaEmpresa", { configuracoesDaEmpresa: async () => ({}) });
simular("../src/utils/profilePhoto", { montarUrlFotoPerfil: async () => null });
simular("../src/services/systemDiagnosticsService", { recordError: () => {}, diagnostics: async () => ({}) });

process.env.JWT_SECRET = process.env.JWT_SECRET || "segredo-de-teste-com-tamanho-suficiente";
const bcrypt = require("bcrypt");
const { login, loginAdmin, solicitarRecuperacaoSenha } = require("../src/controllers/authController");

function resposta() {
  return {
    statusCode: 200, body: null, headersSent: false,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; this.headersSent = true; return this; },
  };
}

test.beforeEach(() => {
  usuarios = [];
  consultas.length = 0;
  enviados.length = 0;
  emailLigado = true;
});

test("login com e-mail inexistente também passa pelo bcrypt e responde igual à senha errada", async () => {
  const res = resposta();
  const inicio = process.hrtime.bigint();
  await login({ body: { email: "ninguem@exemplo.com", senha: "qualquer-coisa" } }, res);
  const ms = Number(process.hrtime.bigint() - inicio) / 1e6;
  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, { erro: "Credenciais inválidas" });
  assert.ok(ms > 20, `a conferência fictícia do bcrypt deveria levar tempo (levou ${ms.toFixed(1)} ms)`);
});

test("recuperação responde a mesma mensagem para e-mail existente e inexistente", async () => {
  usuarios = [{ id: 1, nome: "Ana", email: "ana@exemplo.com", empresa_id: 1, reset_bloqueado_ate: null }];
  const existe = resposta();
  const naoExiste = resposta();
  await solicitarRecuperacaoSenha({ body: { email: "ana@exemplo.com" } }, existe);
  await solicitarRecuperacaoSenha({ body: { email: "ninguem@exemplo.com" } }, naoExiste);
  assert.equal(existe.statusCode, 200);
  assert.deepEqual(existe.body, naoExiste.body);
  assert.equal(enviados.length, 1, "só quem tem conta recebe o código");
  assert.equal(enviados[0].para, "ana@exemplo.com");
});

test("quem está bloqueado não recebe código novo, e a resposta não muda", async () => {
  usuarios = [{ id: 1, nome: "Ana", email: "ana@exemplo.com", empresa_id: 1, reset_bloqueado_ate: new Date(Date.now() + 10 * 60000).toISOString() }];
  const res = resposta();
  await solicitarRecuperacaoSenha({ body: { email: "ana@exemplo.com" } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(enviados.length, 0);
  assert.equal(consultas.some(({ sql }) => /UPDATE usuarios/i.test(sql)), false, "o bloqueio e o contador ficam como estão");
});

test("código novo não zera as tentativas erradas recentes", async () => {
  usuarios = [{ id: 1, nome: "Ana", email: "ana@exemplo.com", empresa_id: 1, reset_bloqueado_ate: null }];
  await solicitarRecuperacaoSenha({ body: { email: "ana@exemplo.com" } }, resposta());
  const update = consultas.find(({ sql }) => /reset_token_hash = \$1/.test(sql));
  assert.ok(update);
  assert.doesNotMatch(update.sql, /reset_tentativas = 0,/);
  assert.match(update.sql, /INTERVAL '30 minutes' THEN 0/);
});

test("sem serviço de e-mail a recuperação avisa para todos, sem consultar o usuário", async () => {
  emailLigado = false;
  const res = resposta();
  await solicitarRecuperacaoSenha({ body: { email: "ana@exemplo.com" } }, res);
  assert.equal(res.statusCode, 503);
  assert.equal(consultas.length, 0);
});

test("supervisor entra pelo login geral e pelo da equipe", async () => {
  const senha = await bcrypt.hash("senha-do-supervisor", 4);
  usuarios = [{ id: 9, nome: "Paula", email: "paula@exemplo.com", senha, perfil: "supervisor", status: "ativo", email_verificado_em: "2026-10-01", empresa_status: "ativa", empresa_plano: "pro", token_version: 1 }];
  for (const rota of [login, loginAdmin]) {
    const res = resposta();
    await rota({ body: { email: "paula@exemplo.com", senha: "senha-do-supervisor" } }, res);
    assert.equal(res.statusCode, 200, JSON.stringify(res.body));
    assert.equal(res.body.usuario.perfil, "supervisor");
    assert.ok(res.body.token);
  }
});
