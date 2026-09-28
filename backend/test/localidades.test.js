/**
 * Responsabilidade: a área de atuação vem das unidades ativas da empresa, não de uma lista fixa no código.
 */
const test = require("node:test");
const assert = require("node:assert/strict");

const consultas = [];
const databasePath = require.resolve("../src/config/database");
require.cache[databasePath] = { id: databasePath, filename: databasePath, loaded: true, exports: {
  query: async (sql, params = []) => {
    consultas.push({ sql, params });
    // Unidades ativas "desta empresa" (a RLS faz o filtro por empresa no banco real).
    const unidades = [{ municipio: "Recife", nome: "Filial Boa Viagem" }];
    const existe = unidades.some((u) => u.municipio === params[0] && u.nome === params[1]);
    return { rows: existe ? [{ "?column?": 1 }] : [] };
  },
} };
const { localidadeValida } = require("../src/services/localidadesService");

test("aceita uma unidade ativa da empresa, em qualquer município", async () => {
  assert.equal(await localidadeValida(" Recife ", "Filial Boa Viagem"), true);
  assert.match(consultas.at(-1).sql, /ativa AND municipio = \$1 AND nome = \$2/);
});

test("recusa unidade que a empresa não tem, inclusive as antigas fixas da Maranhão Motos", async () => {
  assert.equal(await localidadeValida("Santa Inês", "Maranhão Motos - Santa Inês"), false);
  assert.equal(await localidadeValida("Recife", "Outra filial"), false);
});

test("localização continua opcional, mas município e unidade vêm juntos", async () => {
  const antes = consultas.length;
  assert.equal(await localidadeValida("", ""), true);
  assert.equal(await localidadeValida(undefined, null), true);
  assert.equal(await localidadeValida("Recife", ""), false);
  assert.equal(await localidadeValida("", "Filial Boa Viagem"), false);
  assert.equal(consultas.length, antes, "casos resolvidos sem ir ao banco");
});
