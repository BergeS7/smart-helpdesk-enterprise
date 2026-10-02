/**
 * Responsabilidade: catálogo dos planos Base, Plus e Pro e o cálculo da mensalidade.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const { RECURSOS, PLANOS, calcularMensalidade, planoTemRecurso, planoMinimoPara, dadosPlanoPublico } = require("../src/domain/planos");
const { exigirRecurso, recursoOuVazio } = require("../src/middlewares/authMiddleware");

test("planos em ordem de preço, do Base ao Pro", () => {
  assert.deepEqual(PLANOS, ["base", "plus", "pro"]);
});

test("mensalidade é o preço fixo até a faixa de técnicos incluída", () => {
  assert.equal(calcularMensalidade("base", 0).total, 399);
  assert.equal(calcularMensalidade("base", 3).total, 399);
  assert.equal(calcularMensalidade("plus", 5).total, 549);
  assert.equal(calcularMensalidade("pro", 8).total, 749);
});

test("técnico acima da faixa é cobrado como extra", () => {
  assert.deepEqual(calcularMensalidade("base", 5), {
    plano: "base", tecnicos: 5, tecnicosIncluidos: 3, tecnicosExtras: 2, valorBase: 399, valorExtras: 98, total: 497,
  });
  assert.equal(calcularMensalidade("plus", 7).total, 549 + 2 * 69);
  assert.equal(calcularMensalidade("pro", 15).total, 749 + 7 * 89);
});

test("plano desconhecido não tem mensalidade nem recursos", () => {
  assert.equal(calcularMensalidade("enterprise", 4), null);
  assert.equal(planoTemRecurso("enterprise", RECURSOS.BASE_CONHECIMENTO), false);
  assert.deepEqual(dadosPlanoPublico(undefined), {});
});

test("base de conhecimento a partir do Plus; assistente de IA só no Pro", () => {
  assert.equal(planoTemRecurso("base", RECURSOS.BASE_CONHECIMENTO), false);
  assert.equal(planoTemRecurso("plus", RECURSOS.BASE_CONHECIMENTO), true);
  assert.equal(planoTemRecurso("plus", RECURSOS.ASSISTENTE_IA), false);
  assert.equal(planoTemRecurso("pro", RECURSOS.ASSISTENTE_IA), true);
  assert.equal(planoMinimoPara(RECURSOS.BASE_CONHECIMENTO), "plus");
  assert.equal(planoMinimoPara(RECURSOS.ASSISTENTE_IA), "pro");
  assert.deepEqual(dadosPlanoPublico("plus"), { plano: "plus", plano_nome: "Plus", recursos: ["base_conhecimento"] });
});

function respostaFalsa() {
  return {
    statusCode: 200, body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test("rota de recurso fora do plano recusa e diz o plano necessário", () => {
  const res = respostaFalsa();
  let seguiu = false;
  exigirRecurso(RECURSOS.ASSISTENTE_IA)({ user: { plano: "plus" } }, res, () => { seguiu = true; });
  assert.equal(seguiu, false);
  assert.equal(res.statusCode, 403);
  assert.match(res.body.erro, /plano Pro/);

  exigirRecurso(RECURSOS.ASSISTENTE_IA)({ user: { plano: "pro" } }, respostaFalsa(), () => { seguiu = true; });
  assert.equal(seguiu, true);
});

test("lista de recurso fora do plano responde vazia em vez de erro", () => {
  const res = respostaFalsa();
  let seguiu = false;
  recursoOuVazio(RECURSOS.BASE_CONHECIMENTO)({ user: { plano: "base" } }, res, () => { seguiu = true; });
  assert.equal(seguiu, false);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, []);
});
