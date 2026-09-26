/**
 * Responsabilidade: regras do assistente da base: o que vai para a IA e como a resposta volta.
 * Funções puras; a chamada à API e o banco ficam em services/assistenteService.
 */
const limites = require("../config/assistente");
const { agruparChamados } = require("./knowledgeBase");

const SITUACOES = Object.freeze(["resolvido", "esclarecer", "sem_resposta"]);

// Curto de propósito: é enviado em toda pergunta.
const INSTRUCOES = [
  "Você é o assistente de suporte de TI da empresa. Responda em português, curto e direto.",
  "Use somente os artigos enviados. Entenda o que a pessoa quis dizer mesmo com erros de digitação, siglas ou termos informais.",
  "Se um artigo resolve: explique o passo a passo numerado, um passo por linha, em linguagem simples, sem repetir a pergunta. Os números dos artigos usados vão só no campo artigos, nunca no texto.",
  "Se falta informação para escolher o artigo certo: faça uma única pergunta objetiva.",
  "Se nenhum artigo resolve: diga isso em uma frase e sugira abrir um chamado.",
  "Nunca invente procedimentos, links, senhas ou contatos. Não mencione que recebeu artigos; fale como suporte.",
].join("\n");

const cortar = (texto, limite) => {
  const valor = String(texto ?? "").replace(/\s+\n/g, "\n").trim();
  return valor.length > limite ? `${valor.slice(0, limite - 1)}…` : valor;
};

function normalizarPergunta(texto) {
  return cortar(texto, limites.PERGUNTA_MAX_CARACTERES);
}

// O histórico vem do navegador: aceita só texto, só os papéis conhecidos e só as últimas mensagens.
// A API exige que a conversa comece pelo usuário.
function normalizarHistorico(historico) {
  const mensagens = (Array.isArray(historico) ? historico : [])
    .map((m) => ({
      role: m?.papel === "assistente" ? "assistant" : m?.papel === "usuario" ? "user" : null,
      content: cortar(m?.texto, limites.HISTORICO_MAX_CARACTERES),
    }))
    .filter((m) => m.role && m.content)
    .slice(-limites.HISTORICO_MAX_MENSAGENS);
  while (mensagens.length && mensagens[0].role !== "user") mensagens.shift();
  return mensagens;
}

// Perguntas de continuação ("e no celular?") só encontram artigo junto com a pergunta anterior.
function textoDeBusca(pergunta, historico) {
  const anterior = [...historico].reverse().find((m) => m.role === "user");
  return [anterior?.content, pergunta].filter(Boolean).join(" ");
}

// Só os campos que ajudam a responder, sem conteúdo livre longo.
function formatarArtigo(artigo, numero) {
  const passos = (Array.isArray(artigo.passos) ? artigo.passos : [])
    .slice(0, limites.MAX_PASSOS)
    .map((p, i) => `${i + 1}. ${p.texto}`)
    .join("\n");
  const partes = [
    `[${numero}] ${artigo.titulo}`,
    artigo.problema && `Problema: ${artigo.problema}`,
    artigo.sintomas && `Sintomas: ${artigo.sintomas}`,
    artigo.solucao && `Solução: ${artigo.solucao}`,
    passos && `Passos:\n${passos}`,
    !passos && !artigo.solucao && artigo.conteudo && `Conteúdo: ${artigo.conteudo}`,
  ].filter(Boolean);
  return cortar(partes.join("\n"), limites.ARTIGO_MAX_CARACTERES);
}

// Os artigos vão só na pergunta atual: no histórico ficam apenas as falas, para não reenviar texto.
function montarMensagens({ pergunta, historico, artigos }) {
  const contexto = artigos.map((artigo, i) => formatarArtigo(artigo, i + 1)).join("\n\n");
  return [
    ...historico,
    { role: "user", content: `<artigos>\n${contexto}\n</artigos>\n\nPergunta: ${pergunta}` },
  ];
}

// Modelos menores às vezes escrevem "1. ... 2. ..." na mesma linha, mesmo instruídos: quebra aqui.
// Só mexe quando a lista começa em "1." e tem "2.", para não quebrar números soltos no texto.
function separarPassos(texto) {
  if (!/(^|\s)1\.\s/.test(texto) || !/\s2\.\s/.test(texto)) return texto;
  return texto.replace(/[ \t]+(?=\d{1,2}\.\s)/g, "\n");
}

// Converte a saída da IA; números de artigo fora da lista enviada são descartados.
function interpretarResposta(texto, artigos) {
  let dados;
  try { dados = JSON.parse(texto); } catch { dados = null; }
  if (!dados || typeof dados.resposta !== "string" || !dados.resposta.trim()) return null;
  const situacao = SITUACOES.includes(dados.situacao) ? dados.situacao : "sem_resposta";
  const usados = [...new Set(Array.isArray(dados.artigos) ? dados.artigos : [])]
    .map((n) => artigos[Number(n) - 1])
    .filter(Boolean);
  return { resposta: separarPassos(dados.resposta.trim()), situacao, artigos: situacao === "resolvido" ? usados : [] };
}

// Agrupa perguntas sem resposta pelo assunto, com o mesmo critério dos problemas recorrentes.
// Pergunta é curta: todos os termos contam como "título". Quem não entrou em grupo vira item sozinho.
// Devolve os itens do maior para o menor, com a pergunta mais recente de cada um como representante.
function agruparLacunas(perguntas, { termosGenericos = new Set() } = {}) {
  const lista = perguntas.map((p) => ({ ...p, termos_titulo: p.termos }));
  // O agrupamento de chamados pode pôr a mesma pergunta em dois grupos: aqui cada uma conta uma
  // vez só, no maior grupo; grupo que fica com menos de duas perguntas se desfaz.
  const agrupadas = new Set();
  const grupos = [];
  agruparChamados(lista, { sobreposicaoMinima: limites.LACUNAS_SOBREPOSICAO, minChamados: 2, termosGenericos })
    .sort((a, b) => b.chamados.length - a.chamados.length)
    .forEach((grupo) => {
      const livres = grupo.chamados.filter((p) => !agrupadas.has(p.id));
      if (livres.length < 2) return;
      livres.forEach((p) => agrupadas.add(p.id));
      grupos.push(livres);
    });
  const itens = [
    ...grupos,
    ...lista.filter((p) => !agrupadas.has(p.id)).map((p) => [p]),
  ].map((doGrupo) => {
    const recentes = [...doGrupo].sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em));
    const textos = [...new Set(recentes.map((p) => p.pergunta))];
    return {
      pergunta: textos[0],
      quantidade: doGrupo.length,
      usuarios: new Set(doGrupo.map((p) => p.usuario_id)).size,
      ultima_em: new Date(recentes[0].criado_em).toISOString(),
      exemplos: textos.slice(1, 1 + limites.LACUNAS_EXEMPLOS),
    };
  });
  return itens.sort((a, b) => b.quantidade - a.quantidade || b.ultima_em.localeCompare(a.ultima_em));
}

module.exports = { SITUACOES, INSTRUCOES, agruparLacunas, normalizarPergunta, normalizarHistorico, textoDeBusca, formatarArtigo, montarMensagens, interpretarResposta };
