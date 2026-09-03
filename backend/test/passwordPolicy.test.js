const test = require("node:test");
const assert = require("node:assert/strict");
const { senhaValida } = require("../src/utils/passwordPolicy");

test("aceita oito caracteres sem exigir mistura de tipos", () => {
  for (const senha of ["abcdefgh", "ABCDEFGH", "12345678", "!!!!!!!!", "senha simples", "Abc123!?"]) {
    assert.equal(senhaValida(senha), true);
  }
});

test("recusa senhas menores que oito caracteres mesmo com complexidade", () => {
  for (const senha of ["", "abcdefg", "Ab1!xyz", "1234567"]) {
    assert.equal(senhaValida(senha), false);
  }
});

test("recusa valores que não sejam texto", () => {
  for (const senha of [undefined, null, 12345678, {}, []]) {
    assert.equal(senhaValida(senha), false);
  }
});
