/**
 * Responsabilidade: aviso de técnico extra ao criar, aprovar ou promover alguém da equipe
 * e o resumo de uso do plano (empresa principal fica fora).
 */
const test = require("node:test");
const assert = require("node:assert/strict");

let tecnicosAtivos = 0;
const consultas = [];
const databasePath = require.resolve("../src/config/database");
require.cache[databasePath] = { id: databasePath, filename: databasePath, loaded: true, exports: {
  query: async (sql, params) => { consultas.push({ sql, params }); return { rows: [{ total: tecnicosAtivos }] }; },
} };

const { usoDoPlano, tecnicoExtra, confirmouExtra, avisoTecnicoExtra, CODIGO_TECNICO_EXTRA } = require("../src/services/usoPlanoService");

const requisicao = (empresaId, plano, body = {}) => ({ user: { empresaId, plano }, body });
const tecnicoAtivo = { perfil: "tecnico", status: "ativo" };

test("ativar técnico acima da faixa devolve o impacto na mensalidade", async () => {
  tecnicosAtivos = 3;
  const extra = await tecnicoExtra(requisicao(2, "base"), { perfil: "usuario", status: "ativo" }, tecnicoAtivo);
  assert.equal(extra.mensalidade_atual, 399);
  assert.equal(extra.mensalidade_nova, 448);
  assert.deepEqual(consultas.at(-1).params, [2, ["tecnico", "supervisor", "admin"]]);
  const aviso = avisoTecnicoExtra(extra);
  assert.equal(aviso.codigo, CODIGO_TECNICO_EXTRA);
  assert.match(aviso.erro, /plano Base \(3 incluídos\).*R\$\s?399,00.*R\$\s?448,00/);
});

test("dentro da faixa, quem já era técnico ou quem não vira técnico não gera aviso", async () => {
  tecnicosAtivos = 2;
  assert.equal(await tecnicoExtra(requisicao(2, "base"), null, tecnicoAtivo), null);
  tecnicosAtivos = 10;
  assert.equal(await tecnicoExtra(requisicao(2, "base"), tecnicoAtivo, { perfil: "admin", status: "ativo" }), null);
  assert.equal(await tecnicoExtra(requisicao(2, "base"), null, { perfil: "tecnico", status: "pendente" }), null);
});

test("empresa principal não recebe aviso nem resumo do plano", async () => {
  tecnicosAtivos = 50;
  const antes = consultas.length;
  assert.equal(await tecnicoExtra(requisicao(1, "pro"), null, tecnicoAtivo), null);
  assert.deepEqual(await usoDoPlano(requisicao(1, "pro")), { isenta: true });
  assert.equal(consultas.length, antes);
});

test("confirmação só vale com confirmar_extra true", () => {
  assert.equal(confirmouExtra(requisicao(2, "base", { confirmar_extra: true })), true);
  assert.equal(confirmouExtra(requisicao(2, "base", { confirmar_extra: "true" })), false);
});

test("resumo do uso do plano para a tela de usuários", async () => {
  tecnicosAtivos = 6;
  assert.deepEqual(await usoDoPlano(requisicao(2, "plus")), {
    isenta: false, plano: "plus", plano_nome: "Plus", tecnicos: 6, tecnicos_incluidos: 5,
    tecnicos_extras: 1, valor_tecnico_extra: 69, mensalidade: 618,
  });
});
