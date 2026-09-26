/**
 * Responsabilidade: responder perguntas do chat com a base de conhecimento e a API do Gemini.
 * A busca do Postgres escolhe os artigos; a IA só é chamada quando há artigo para usar.
 * Sem chave configurada, ou se a API falhar, o chat mostra os artigos encontrados.
 */
const pool = require("../config/database");
const limites = require("../config/assistente");
const { buscarArtigosRelacionados } = require("./knowledgeSearchService");
const { registrarExibicoes } = require("./knowledgeRecommendationService");
const { SITUACOES, INSTRUCOES, normalizarHistorico, textoDeBusca, montarMensagens, interpretarResposta } = require("../domain/assistente");

const URL_API = "https://generativelanguage.googleapis.com/v1beta/models";
const MENSAGEM_SEM_ARTIGO = "Não encontrei um tutorial para isso na base. Se quiser, abra um chamado que a equipe de suporte ajuda você.";
// A IA decide que não há solução; o texto ao usuário é sempre este, sem falar em "artigos".
const MENSAGEM_SEM_SOLUCAO = "Não encontrei uma solução para isso na nossa base. Abra um chamado que a equipe de suporte ajuda você.";
const MENSAGEM_SO_ARTIGOS = "Encontrei estes artigos que podem ajudar:";
const MENSAGEM_RECUSA = "Não consigo ajudar com isso por aqui. Abra um chamado que a equipe de suporte atende você.";
// Motivos de parada em que o Gemini bloqueou a resposta por política.
const BLOQUEIOS = new Set(["SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST", "SPII", "RECITATION"]);

// A saída em JSON evita interpretar texto livre e mantém a resposta enxuta.
const FORMATO_SAIDA = Object.freeze({
  type: "OBJECT",
  properties: {
    resposta: { type: "STRING" },
    situacao: { type: "STRING", enum: SITUACOES },
    artigos: { type: "ARRAY", items: { type: "INTEGER" } },
  },
  required: ["resposta", "situacao", "artigos"],
});

const chaveApi = () => process.env.GEMINI_API_KEY || "";

async function carregarArtigos(ids) {
  const { rows } = await pool.query(
    `SELECT id, titulo, problema, sintomas, solucao, passos, conteudo FROM base_conhecimento WHERE id = ANY($1::int[])`,
    [ids]
  );
  const porId = new Map(rows.map((a) => [a.id, a]));
  return ids.map((id) => porId.get(id)).filter(Boolean);
}

// Sobrecarga (429/503) falha na hora e costuma passar: vale nova tentativa. Demora e demais erros, não.
const STATUS_TEMPORARIOS = new Set([429, 500, 503]);

async function chamarGemini(corpo) {
  for (let tentativa = 0; ; tentativa += 1) {
    const ultima = tentativa >= limites.TENTATIVAS_EXTRAS;
    const resposta = await fetch(`${URL_API}/${encodeURIComponent(limites.MODELO)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": chaveApi() },
      signal: AbortSignal.timeout(limites.TEMPO_LIMITE_MS),
      body: corpo,
    });
    if (resposta.ok || ultima || !STATUS_TEMPORARIOS.has(resposta.status)) return resposta;
    console.warn(`Gemini ${resposta.status}: tentando de novo`);
  }
}

async function consultarIA({ pergunta, historico, artigos }) {
  const resposta = await chamarGemini(JSON.stringify({
    systemInstruction: { parts: [{ text: INSTRUCOES }] },
    contents: montarMensagens({ pergunta, historico, artigos }).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    generationConfig: {
      maxOutputTokens: limites.MAX_TOKENS,
      responseMimeType: "application/json",
      responseSchema: FORMATO_SAIDA,
      thinkingConfig: { thinkingLevel: limites.NIVEL_RACIOCINIO },
    },
  }));
  if (!resposta.ok) {
    const erro = await resposta.text().catch(() => "");
    throw new Error(`Gemini ${resposta.status}: ${erro.slice(0, 300)}`);
  }
  const dados = await resposta.json();
  const uso = dados.usageMetadata || {};
  const tokens = { entrada: uso.promptTokenCount || 0, saida: (uso.candidatesTokenCount || 0) + (uso.thoughtsTokenCount || 0), modelo: dados.modelVersion || limites.MODELO };
  const candidato = dados.candidates?.[0];
  if (dados.promptFeedback?.blockReason || BLOQUEIOS.has(candidato?.finishReason)) {
    return { tokens, resultado: { resposta: MENSAGEM_RECUSA, situacao: "sem_resposta", artigos: [] } };
  }
  const texto = (candidato?.content?.parts || []).map((p) => p.text || "").join("");
  return { tokens, resultado: interpretarResposta(texto, artigos) };
}

async function registrarInteracao({ usuarioId, pergunta, situacao, artigos, tokens }) {
  try {
    await pool.query(
      `INSERT INTO assistente_interacoes (usuario_id, pergunta, situacao, artigos_ids, modelo, tokens_entrada, tokens_saida)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [usuarioId, pergunta, situacao, artigos.map((a) => a.id), tokens?.modelo || null, tokens?.entrada || 0, tokens?.saida || 0]
    );
  } catch (error) {
    console.error("Erro ao registrar interação do assistente:", error.message);
  }
}

// Os cartões exibidos contam como recomendação da base, com o mesmo "resolveu?" do formulário de chamado.
async function montarCartoes({ usuarioId, artigos, sugestoes }) {
  const escolhidas = sugestoes.filter((s) => artigos.some((a) => a.id === s.id));
  let recomendacoes = new Map();
  try {
    recomendacoes = await registrarExibicoes({ usuarioId, sugestoes: escolhidas });
  } catch (error) {
    console.error("Erro ao registrar recomendações do assistente:", error.message);
  }
  return escolhidas.map((s) => ({
    id: s.id, titulo: s.titulo, resumo: s.resumo, video_url: s.video_url, recomendacao_id: recomendacoes.get(s.id) || null,
  }));
}

async function perguntar({ pergunta, historico: historicoBruto, user }) {
  const historico = normalizarHistorico(historicoBruto);
  // Continuações ("e se não funcionar?") só fazem sentido com a pergunta anterior, na busca e no painel da equipe.
  const assunto = textoDeBusca(pergunta, historico);
  const sugestoes = (await buscarArtigosRelacionados({ texto: assunto, user, confiancaMinima: limites.CONFIANCA_MINIMA })).slice(0, limites.MAX_ARTIGOS);

  let resultado;
  let tokens = null;
  if (!sugestoes.length) {
    resultado = { resposta: MENSAGEM_SEM_ARTIGO, situacao: "sem_artigo", artigos: [] };
  } else {
    const artigos = await carregarArtigos(sugestoes.map((s) => s.id));
    if (chaveApi()) {
      try {
        ({ resultado, tokens } = await consultarIA({ pergunta, historico, artigos }));
      } catch (error) {
        console.error("Erro ao consultar a IA do assistente:", error.message);
      }
    }
    resultado ||= { resposta: MENSAGEM_SO_ARTIGOS, situacao: "sem_ia", artigos };
    if (resultado.situacao === "sem_resposta") resultado.resposta = MENSAGEM_SEM_SOLUCAO;
  }

  await registrarInteracao({ usuarioId: user.id, pergunta: assunto, situacao: resultado.situacao, artigos: resultado.artigos, tokens });
  const cartoes = await montarCartoes({ usuarioId: user.id, artigos: resultado.artigos, sugestoes });
  return { resposta: resultado.resposta, situacao: resultado.situacao, artigos: cartoes };
}

module.exports = { perguntar };
