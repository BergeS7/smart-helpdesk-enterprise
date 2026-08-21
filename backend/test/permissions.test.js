const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizarPerfil, ehEquipe, ehAdmin } = require("../src/utils/permissoes");

test("supervisor é perfil canônico da equipe sem acesso administrativo total", () => {
  assert.equal(normalizarPerfil("SUPERVISOR"), "supervisor");
  assert.equal(ehEquipe("supervisor"), true);
  assert.equal(ehAdmin("supervisor"), false);
});

test("perfis desconhecidos não recebem elevação de privilégio", () => {
  assert.equal(normalizarPerfil("gestor_inventado"), "usuario");
  assert.equal(ehEquipe("gestor_inventado"), false);
});
