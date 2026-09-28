/**
 * Responsabilidade: hierarquia SaaS — o perfil desenvolvedor virou admin e o acesso de plataforma
 * pertence só à conta de PLATFORM_OWNER_EMAIL, protegida contra admins das empresas.
 */
const test = require("node:test");
const assert = require("node:assert/strict");

process.env.PLATFORM_OWNER_EMAIL = "Dono@Plataforma.com";

const DONO = { id: 1, email: "dono@plataforma.com", email_verificado_em: new Date() };
const OUTRO = { id: 2, email: "tecnico@empresa.com", email_verificado_em: new Date() };
const queries = [];
const databasePath = require.resolve("../src/config/database");
require.cache[databasePath] = { id: databasePath, filename: databasePath, loaded: true, exports: {
  query: async (sql, params = []) => {
    queries.push(sql);
    if (/SELECT email, email_verificado_em FROM usuarios WHERE id/.test(sql)) {
      return { rows: [DONO, OUTRO].filter((u) => String(u.id) === String(params[0])) };
    }
    if (/^\s*DELETE FROM usuarios/.test(sql)) return { rows: [{ id: params[0], email: OUTRO.email, foto_perfil: null }] };
    return { rows: [] };
  },
} };

const { normalizarPerfil, ehAdmin, ehDonoPlataforma, ehEmailDonoPlataforma } = require("../src/utils/permissoes");
const { exigirDonoPlataforma } = require("../src/middlewares/authMiddleware");
const { createUser, atualizarUsuarioAdmin, excluirUsuarioAdmin } = require("../src/controllers/userController");

function resposta() {
  return { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}
const admin = { id: 5, nome: "Admin", perfil: "admin", plataforma: false };

test("perfil desenvolvedor e seus apelidos viram admin da empresa", () => {
  for (const legado of ["desenvolvedor", "DEV", "developer", "super_admin", "administrador"]) {
    assert.equal(normalizarPerfil(legado), "admin");
    assert.equal(ehAdmin(legado), true);
  }
  assert.equal(normalizarPerfil("supervisor"), "supervisor");
});

test("acesso de plataforma exige o e-mail configurado e confirmado", () => {
  assert.equal(ehEmailDonoPlataforma(" DONO@plataforma.com "), true);
  assert.equal(ehDonoPlataforma(DONO), true);
  assert.equal(ehDonoPlataforma({ ...DONO, email_verificado_em: null }), false);
  assert.equal(ehDonoPlataforma(OUTRO), false);
  const anterior = process.env.PLATFORM_OWNER_EMAIL;
  process.env.PLATFORM_OWNER_EMAIL = "";
  assert.equal(ehDonoPlataforma(DONO), false);
  process.env.PLATFORM_OWNER_EMAIL = anterior;
});

test("rotas de plataforma recusam admin de empresa e aceitam o dono", () => {
  const recusada = resposta();
  let passou = false;
  exigirDonoPlataforma({ user: admin }, recusada, () => { passou = true; });
  assert.equal(recusada.statusCode, 403);
  assert.equal(passou, false);
  exigirDonoPlataforma({ user: { ...admin, plataforma: true } }, resposta(), () => { passou = true; });
  assert.equal(passou, true);
});

test("admin não cria usuário com o e-mail reservado da plataforma", async () => {
  const res = resposta();
  await createUser({ user: admin, body: { nome: "X", email: "dono@plataforma.com", senha: "12345678" } }, res);
  assert.equal(res.statusCode, 403);
  assert.match(res.body.erro, /reservado/);
});

test("admin não altera nem exclui a conta dona da plataforma", async () => {
  const alterar = resposta();
  await atualizarUsuarioAdmin({ user: admin, params: { id: "1" }, body: { email: "outro@x.com" } }, alterar);
  assert.equal(alterar.statusCode, 403);

  const excluir = resposta();
  await excluirUsuarioAdmin({ user: admin, params: { id: "1" } }, excluir);
  assert.equal(excluir.statusCode, 403);
  assert.equal(queries.some((sql) => /^\s*DELETE FROM usuarios/.test(sql)), false);
});

test("admin não passa o e-mail reservado para outra conta", async () => {
  const res = resposta();
  await atualizarUsuarioAdmin({ user: admin, params: { id: "2" }, body: { email: "dono@plataforma.com" } }, res);
  assert.equal(res.statusCode, 403);
  assert.match(res.body.erro, /reservado/);
});

test("admin exclui usuário comum da empresa, como fazia o desenvolvedor", async () => {
  const res = resposta();
  await excluirUsuarioAdmin({ user: admin, params: { id: "2" } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(queries.some((sql) => /^\s*DELETE FROM usuarios/.test(sql)), true);
});
