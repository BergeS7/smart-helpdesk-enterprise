/**
 * Responsabilidade: Testes automatizados que verificam as regras do assistente da base de conhecimento.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const limites = require("../src/config/assistente");
const { agruparLacunas, normalizarPergunta, normalizarHistorico, textoDeBusca, formatarArtigo, montarMensagens, interpretarResposta } = require("../src/domain/assistente");

const VPN = { id: 10, titulo: "Não consigo conectar na VPN", problema: "VPN não conecta", solucao: "Reinstalar o cliente", passos: [{ texto: "Abra o FortiClient" }, { texto: "Clique em Conectar" }] };
const IHS = { id: 20, titulo: "Acesso ao IHS", conteudo: "Peça liberação ao gestor" };

test("pergunta é cortada no limite", () => {
  const pergunta = normalizarPergunta("a".repeat(limites.PERGUNTA_MAX_CARACTERES + 50));
  assert.equal(pergunta.length, limites.PERGUNTA_MAX_CARACTERES);
});

test("histórico mantém só as últimas falas válidas e começa pelo usuário", () => {
  const historico = normalizarHistorico([
    { papel: "usuario", texto: "primeira" },
    { papel: "assistente", texto: "resposta 1" },
    { papel: "sistema", texto: "ignorar" },
    { papel: "usuario", texto: "" },
    { papel: "usuario", texto: "segunda" },
    { papel: "assistente", texto: "x".repeat(1000) },
    { papel: "usuario", texto: "terceira" },
  ]);
  assert.ok(historico.length <= limites.HISTORICO_MAX_MENSAGENS);
  assert.equal(historico[0].role, "user");
  assert.ok(historico.every((m) => m.content.length <= limites.HISTORICO_MAX_CARACTERES));
  assert.deepEqual(normalizarHistorico("não é lista"), []);
});

test("busca junta a pergunta anterior do usuário para perguntas de continuação", () => {
  const historico = [{ role: "user", content: "VPN não conecta" }, { role: "assistant", content: "Siga os passos" }];
  assert.equal(textoDeBusca("e no celular?", historico), "VPN não conecta e no celular?");
  assert.equal(textoDeBusca("VPN caiu", []), "VPN caiu");
});

test("artigo vai numerado, com passos, e usa o conteúdo só quando não há solução nem passos", () => {
  const vpn = formatarArtigo(VPN, 1);
  assert.match(vpn, /^\[1\] Não consigo conectar na VPN/);
  assert.match(vpn, /1\. Abra o FortiClient\n2\. Clique em Conectar/);
  assert.match(formatarArtigo(IHS, 2), /Conteúdo: Peça liberação/);
  assert.ok(formatarArtigo({ titulo: "x", solucao: "y".repeat(5000) }, 1).length <= limites.ARTIGO_MAX_CARACTERES);
});

test("artigos vão só na pergunta atual", () => {
  const historico = [{ role: "user", content: "oi" }, { role: "assistant", content: "olá" }];
  const mensagens = montarMensagens({ pergunta: "VPN caiu", historico, artigos: [VPN] });
  assert.equal(mensagens.length, 3);
  assert.equal(mensagens[0].content, "oi");
  assert.match(mensagens[2].content, /<artigos>[\s\S]*\[1\][\s\S]*Pergunta: VPN caiu$/);
});

test("resposta resolvida devolve os artigos citados e ignora números inexistentes", () => {
  const texto = JSON.stringify({ resposta: " 1. Abra o FortiClient ", situacao: "resolvido", artigos: [2, 2, 9] });
  const resultado = interpretarResposta(texto, [VPN, IHS]);
  assert.equal(resultado.resposta, "1. Abra o FortiClient");
  assert.deepEqual(resultado.artigos.map((a) => a.id), [20]);
});

test("sem resposta ou esclarecimento não exibe artigos; saída inválida vira null", () => {
  assert.deepEqual(interpretarResposta(JSON.stringify({ resposta: "Qual sistema?", situacao: "esclarecer", artigos: [1] }), [VPN]).artigos, []);
  assert.equal(interpretarResposta(JSON.stringify({ resposta: "x", situacao: "outra", artigos: [] }), [VPN]).situacao, "sem_resposta");
  assert.equal(interpretarResposta("{truncado", [VPN]), null);
  assert.equal(interpretarResposta(JSON.stringify({ resposta: "  ", situacao: "resolvido", artigos: [] }), [VPN]), null);
});

test("perguntas sem resposta do mesmo assunto viram um item; as avulsas ficam sozinhas", () => {
  const p = (id, usuario_id, pergunta, termos, dia) => ({ id, usuario_id, pergunta, termos, criado_em: `2026-09-${dia}T10:00:00Z` });
  const itens = agruparLacunas([
    p(1, 7, "IHS não abre", ["ihs", "abr"], 10),
    p(2, 8, "erro no IHS ao logar", ["erro", "ihs", "log"], 12),
    p(3, 7, "IHS não abre", ["ihs", "abr"], 11),
    p(4, 9, "impressora sem toner", ["impressor", "toner"], 13),
  ], { termosGenericos: new Set(["erro"]) });

  assert.equal(itens.length, 2);
  assert.deepEqual(itens[0], {
    pergunta: "erro no IHS ao logar",
    quantidade: 3,
    usuarios: 2,
    ultima_em: "2026-09-12T10:00:00.000Z",
    exemplos: ["IHS não abre"],
  });
  assert.equal(itens[1].pergunta, "impressora sem toner");
  assert.equal(itens[1].quantidade, 1);
});

test("pergunta que o agrupamento pôs em dois grupos conta uma vez só", () => {
  const p = (id, termos) => ({ id, usuario_id: id, pergunta: `p${id}`, termos, criado_em: `2026-09-1${id}T10:00:00Z` });
  // "ihs" reúne 1, 2 e 3; "senha" reúne 3 e 4 com pouca sobreposição: a 3 ficaria nos dois grupos.
  const itens = agruparLacunas([p(1, ["ihs"]), p(2, ["ihs"]), p(3, ["ihs", "senh"]), p(4, ["senh"])]);
  assert.equal(itens.reduce((total, item) => total + item.quantidade, 0), 4);
  assert.deepEqual(itens.map((i) => i.quantidade), [3, 1]);
});

test("passos escritos na mesma linha são quebrados; números soltos no texto ficam", () => {
  const resultado = (resposta) => interpretarResposta(JSON.stringify({ resposta, situacao: "resolvido", artigos: [1] }), [VPN]).resposta;
  assert.equal(resultado("1. Abra o Outlook. 2. Adicione a conta."), "1. Abra o Outlook.\n2. Adicione a conta.");
  assert.equal(resultado("1. Abra o Outlook\n2. Adicione a conta"), "1. Abra o Outlook\n2. Adicione a conta");
  assert.equal(resultado("Atualize para a versão 2. Depois reinicie."), "Atualize para a versão 2. Depois reinicie.");
});
