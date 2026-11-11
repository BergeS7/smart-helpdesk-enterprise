/**
 * Responsabilidade: regras de abertura de chamado pelo portal (aberturaChamadoService):
 * um chamado por vez, avaliação obrigatória e o que fica fora delas.
 */
const test = require("node:test");
const assert = require("node:assert/strict");

// Banco falso: cada cenário diz o que as consultas encontram e guarda o SQL executado.
function servico({ emAberto = null, pendente = null, corte = "2026-11-01T00:00:00", gravaCorte = true } = {}) {
  const consultas = [];
  const query = async (sql, params = []) => {
    consultas.push({ sql, params });
    if (/NOT IN \('RESOLVED', 'CLOSED', 'CANCELED'\)/.test(sql)) return { rows: emAberto ? [emAberto] : [] };
    if (/^\s*SELECT valor FROM configuracoes_sistema/.test(sql)) return { rows: corte ? [{ valor: corte }] : [] };
    if (/INSERT INTO configuracoes_sistema/.test(sql)) return { rows: gravaCorte ? [{ valor: "2026-11-11T10:00:00" }] : [] };
    if (/performance_ratings pr/.test(sql)) return { rows: pendente ? [pendente] : [] };
    return { rows: [] };
  };
  const arquivo = require.resolve("../src/config/database");
  require.cache[arquivo] = { id: arquivo, filename: arquivo, loaded: true, exports: { query } };
  delete require.cache[require.resolve("../src/services/aberturaChamadoService")];
  return { ...require("../src/services/aberturaChamadoService"), consultas };
}

const ANA = { id: 5, email: "Ana@X.test" };

test("sem chamado aberto nem avaliação pendente, pode abrir", async () => {
  const { verificarBloqueioAbertura } = servico();
  assert.equal(await verificarBloqueioAbertura(ANA), null);
});

test("chamado aberto tem prioridade sobre avaliação pendente na mensagem", async () => {
  const { verificarBloqueioAbertura, consultas } = servico({
    emAberto: { id: 3, numero_chamado: "#HD-2026-0003", status: "WAITING_USER" },
    pendente: { id: 1, numero_chamado: "#HD-2026-0001", status: "CLOSED" },
  });
  const bloqueio = await verificarBloqueioAbertura(ANA);
  assert.equal(bloqueio.codigo, "CHAMADO_EM_ABERTO");
  assert.match(bloqueio.erro, /Aguardando usuário/, "mostra o status em português");
  assert.ok(!consultas.some((c) => /performance_ratings/.test(c.sql)), "nem consulta avaliação");
});

test("chamado sem número usa o id na mensagem", async () => {
  const { verificarBloqueioAbertura } = servico({ pendente: { id: 77, numero_chamado: null, status: "RESOLVED" } });
  const bloqueio = await verificarBloqueioAbertura(ANA);
  assert.equal(bloqueio.codigo, "AVALIACAO_PENDENTE");
  assert.match(bloqueio.erro, /chamado #77/);
});

test("chamados de desenvolvimento ficam fora das duas regras", async () => {
  const { verificarBloqueioAbertura, consultas } = servico();
  await verificarBloqueioAbertura(ANA);
  const regras = consultas.filter((c) => /FROM chamados c/.test(c.sql));
  assert.equal(regras.length, 2);
  for (const consulta of regras) {
    assert.match(consulta.sql, /tipo_chamado[\s\S]*<> ALL\(\$3::text\[\]\)/);
    assert.ok(consulta.params[2].includes("novo sistema"));
    assert.ok(consulta.params[2].includes("melhoria"));
  }
});

test("cancelado não exige avaliação e só conta o que foi finalizado depois da data de corte", async () => {
  const { verificarBloqueioAbertura, consultas } = servico();
  await verificarBloqueioAbertura(ANA);
  const avaliacao = consultas.find((c) => /performance_ratings/.test(c.sql));
  assert.match(avaliacao.sql, /status IN \('RESOLVED', 'CLOSED'\)/);
  assert.match(avaliacao.sql, /finalizado_em >= \$4::timestamp/);
  assert.equal(avaliacao.params[3], "2026-11-01T00:00:00");
});

test("empresa sem data de corte grava a data de agora em vez de cobrar o histórico", async () => {
  const { verificarBloqueioAbertura, consultas } = servico({ corte: null });
  await verificarBloqueioAbertura(ANA);
  assert.ok(consultas.some((c) => /INSERT INTO configuracoes_sistema/.test(c.sql)));
  const avaliacao = consultas.find((c) => /performance_ratings/.test(c.sql));
  assert.equal(avaliacao.params[3], "2026-11-11T10:00:00");
});

test("sem empresa para gravar a data de corte, a avaliação obrigatória fica desligada", async () => {
  const { verificarBloqueioAbertura, consultas } = servico({ corte: null, gravaCorte: false, pendente: { id: 1, status: "CLOSED" } });
  assert.equal(await verificarBloqueioAbertura(ANA), null);
  assert.ok(!consultas.some((c) => /performance_ratings/.test(c.sql)));
});
