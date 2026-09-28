/**
 * Responsabilidade: regras do cadastro de empresas clientes (slug, CNPJ e validação dos dados).
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const { gerarSlug, slugValido, proximoSlugLivre, cnpjValido, normalizarCnpj, validarEmpresa } = require("../src/domain/empresa");

test("slug sai do nome sem acentos, espaços ou símbolos", () => {
  assert.equal(gerarSlug("Maranhão Motos Ltda."), "maranhao-motos-ltda");
  assert.equal(gerarSlug("  Açaí & Cia  "), "acai-cia");
  assert.equal(gerarSlug("###"), "empresa");
  assert.ok(gerarSlug("x".repeat(80)).length <= 50);
  assert.equal(slugValido("maranhao-motos"), true);
  assert.equal(slugValido("Com Espaço"), false);
  assert.equal(slugValido("api"), false, "slug que colide com rota do sistema");
});

test("slug repetido ganha número, e reservado ganha sufixo", () => {
  assert.equal(proximoSlugLivre("acme", []), "acme");
  assert.equal(proximoSlugLivre("acme", ["acme", "acme-2"]), "acme-3");
  assert.equal(proximoSlugLivre("cadastro", []), "cadastro-empresa");
});

test("CNPJ confere os dígitos verificadores", () => {
  assert.equal(cnpjValido(normalizarCnpj("11.222.333/0001-81")), true);
  assert.equal(cnpjValido(normalizarCnpj("11.222.333/0001-82")), false);
  assert.equal(cnpjValido("11111111111111"), false, "sequência repetida");
  assert.equal(cnpjValido("123"), false);
});

test("cadastro exige nome e e-mail do responsável; plano padrão é o essencial", () => {
  const ok = validarEmpresa({ nome: "Acme", email_responsavel: " TI@Acme.com.br ", cnpj: "11.222.333/0001-81" });
  assert.deepEqual(ok.erros, []);
  assert.deepEqual(ok.dados, { nome: "Acme", email_responsavel: "ti@acme.com.br", cnpj: "11222333000181", plano: "essencial" });

  const ruim = validarEmpresa({ nome: "A", email_responsavel: "sem-arroba", plano: "gratis", cnpj: "000" });
  assert.equal(ruim.erros.length, 4);
});

test("edição valida só os campos enviados e aceita remover o CNPJ", () => {
  assert.deepEqual(validarEmpresa({ status: "suspensa" }, { parcial: true }), { dados: { status: "suspensa" }, erros: [] });
  assert.deepEqual(validarEmpresa({ plano: "profissional" }, { parcial: true }).dados, { plano: "profissional" });
  assert.deepEqual(validarEmpresa({ cnpj: "" }, { parcial: true }).dados, { cnpj: null });
  assert.match(validarEmpresa({ status: "apagada" }, { parcial: true }).erros[0], /Situação/);
});
