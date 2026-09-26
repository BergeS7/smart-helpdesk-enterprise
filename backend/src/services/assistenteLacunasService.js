/**
 * Responsabilidade: painel da equipe com o que o assistente não conseguiu responder.
 * Agrupa as perguntas sem resposta por assunto e indica quais já ganharam artigo depois.
 */
const pool = require("../config/database");
const limites = require("../config/assistente");
const { RECORRENCIA_PALAVRAS_GENERICAS } = require("../config/knowledgeSearch");
const { agruparLacunas } = require("../domain/assistente");
const { buscarArtigosRelacionados } = require("./knowledgeSearchService");

const SEM_RESPOSTA = ["sem_artigo", "sem_resposta"];
// A cobertura é vista como o usuário a vê: artigo interno não resolve a dúvida de quem pergunta.
const VISAO_USUARIO = Object.freeze({ perfil: "usuario" });

async function carregarPerguntas() {
  const genericos = await pool.query(
    "SELECT ARRAY(SELECT lexeme FROM unnest(to_tsvector('pt_unaccent', $1))) AS termos",
    [`${RECORRENCIA_PALAVRAS_GENERICAS} ${limites.LACUNAS_PALAVRAS_GENERICAS}`]
  );
  const { rows } = await pool.query(
    `SELECT id, usuario_id, pergunta, criado_em,
       ARRAY(SELECT lexeme FROM unnest(to_tsvector('pt_unaccent', pergunta))) AS termos
     FROM assistente_interacoes
     WHERE situacao = ANY($1::text[]) AND criado_em >= NOW() - make_interval(days => $2)
     ORDER BY criado_em DESC
     LIMIT $3`,
    [SEM_RESPOSTA, limites.LACUNAS_DIAS, limites.LACUNAS_MAX_PERGUNTAS]
  );
  return { perguntas: rows, termosGenericos: new Set(genericos.rows[0].termos) };
}

async function carregarResumo() {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS perguntas,
       COUNT(*) FILTER (WHERE situacao = 'resolvido')::int AS resolvidas,
       COUNT(*) FILTER (WHERE situacao = ANY($1::text[]))::int AS sem_resposta,
       COALESCE(SUM(tokens_entrada), 0)::int AS tokens_entrada,
       COALESCE(SUM(tokens_saida), 0)::int AS tokens_saida
     FROM assistente_interacoes WHERE criado_em >= NOW() - make_interval(days => $2)`,
    [SEM_RESPOSTA, limites.LACUNAS_DIAS]
  );
  return rows[0];
}

// Artigo publicado ou alterado depois da última pergunta do grupo é a resposta da equipe a ela.
async function verificarCobertura(itens) {
  const encontrados = await Promise.all(itens.map(async (item) =>
    (await buscarArtigosRelacionados({ texto: item.pergunta, user: VISAO_USUARIO, confiancaMinima: limites.CONFIANCA_MINIMA }))[0] || null
  ));
  const ids = [...new Set(encontrados.filter(Boolean).map((a) => a.id))];
  const { rows } = ids.length
    ? await pool.query("SELECT id, GREATEST(criado_em, COALESCE(atualizado_em, criado_em)) AS alterado_em FROM base_conhecimento WHERE id = ANY($1::int[])", [ids])
    : { rows: [] };
  const alteracao = new Map(rows.map((r) => [r.id, new Date(r.alterado_em)]));
  return itens.map((item, i) => {
    const artigo = encontrados[i];
    const cobre = artigo && alteracao.get(artigo.id) > new Date(item.ultima_em);
    return { ...item, artigo: cobre ? { id: artigo.id, titulo: artigo.titulo } : null };
  });
}

async function listarLacunas() {
  const [{ perguntas, termosGenericos }, resumo] = await Promise.all([carregarPerguntas(), carregarResumo()]);
  const itens = await verificarCobertura(agruparLacunas(perguntas, { termosGenericos }).slice(0, limites.LACUNAS_MAX_ITENS));
  return { dias: limites.LACUNAS_DIAS, resumo, itens };
}

module.exports = { listarLacunas };
