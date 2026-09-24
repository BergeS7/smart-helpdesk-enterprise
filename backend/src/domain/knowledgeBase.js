/**
 * Responsabilidade: regras do artigo da base de conhecimento: status de publicação e campos editáveis.
 */
const { normalizarPerfil, ehEquipe } = require("../utils/permissoes");
const { CONFIANCA_ALTA } = require("../config/knowledgeSearch");

const STATUS_ARTIGO = Object.freeze(["rascunho", "revisao", "publicado", "arquivado"]);
const VISIBILIDADES = Object.freeze(["publico", "interno"]);
// Sem engine de workflow: quem não publica só trabalha com rascunho e revisão.
const STATUS_DO_AUTOR = Object.freeze(["rascunho", "revisao"]);
const PERFIS_PUBLICACAO = Object.freeze(["supervisor", "admin", "desenvolvedor"]);

// Campos de texto editáveis e o tamanho máximo aceito para cada um.
const CAMPOS_TEXTO = Object.freeze({
  titulo: 200,
  categoria: 120,
  palavras_chave: 500,
  resumo: 500,
  problema: 5000,
  sintomas: 5000,
  solucao: 10000,
  conteudo: 20000,
});
const LIMITE_PASSOS = 30;
const LIMITE_TEXTO_PASSO = 2000;
const LIMITE_VIDEO_URL = 500;
const BUCKET_IMAGENS = "knowledge-base";
const PASTA_IMAGENS = "artigos";
const DURACAO_URL_IMAGEM_SEGUNDOS = 60 * 60;
// Só aceita imagens enviadas pelo upload da base, impedindo apontar para arquivos de outros buckets.
const REFERENCIA_IMAGEM = new RegExp(
  `^supabase://${BUCKET_IMAGENS}/${PASTA_IMAGENS}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$`
);
const CAMPOS_OBRIGATORIOS = Object.freeze(["titulo", "conteudo"]);
const ERRO_OBRIGATORIOS = "Título e conteúdo são obrigatórios";

const referenciaImagemValida = (valor) => REFERENCIA_IMAGEM.test(String(valor || ""));

function normalizarPassos(passos, erros) {
  if (!Array.isArray(passos)) {
    erros.add("O passo a passo deve ser uma lista");
    return [];
  }
  if (passos.length > LIMITE_PASSOS) erros.add(`O artigo aceita até ${LIMITE_PASSOS} passos`);
  return passos.slice(0, LIMITE_PASSOS).map((passo) => {
    const texto = String(passo?.texto ?? "").trim();
    const imagem = passo?.imagem ? String(passo.imagem) : null;
    if (!texto) erros.add("Todo passo precisa de uma descrição");
    else if (texto.length > LIMITE_TEXTO_PASSO) erros.add(`Cada passo aceita até ${LIMITE_TEXTO_PASSO} caracteres`);
    if (imagem && !referenciaImagemValida(imagem)) erros.add("Imagem do passo inválida");
    return imagem ? { texto, imagem } : { texto };
  });
}

// Vídeo é só um link externo em HTTPS; o arquivo nunca passa pelo banco.
function normalizarVideoUrl(valor, erros) {
  const texto = String(valor ?? "").trim();
  if (!texto) return null;
  let url;
  try { url = new URL(texto); } catch { url = null; }
  if (!url || url.protocol !== "https:" || texto.length > LIMITE_VIDEO_URL) {
    erros.add("Informe um link de vídeo válido começando com https://");
    return null;
  }
  return url.toString();
}

// Normaliza apenas os campos enviados, para que a atualização parcial preserve o restante.
function normalizarArtigo(body = {}, { criacao = false } = {}) {
  const dados = {};
  const erros = new Set();
  for (const [campo, limite] of Object.entries(CAMPOS_TEXTO)) {
    const obrigatorio = CAMPOS_OBRIGATORIOS.includes(campo);
    if (!(campo in body)) {
      if (criacao && obrigatorio) erros.add(ERRO_OBRIGATORIOS);
      continue;
    }
    const valor = String(body[campo] ?? "").trim();
    if (obrigatorio && !valor) erros.add(ERRO_OBRIGATORIOS);
    else if (valor.length > limite) erros.add(`O campo ${campo} aceita até ${limite} caracteres`);
    dados[campo] = valor || null;
  }

  if ("passos" in body) dados.passos = JSON.stringify(normalizarPassos(body.passos, erros));
  if ("video_url" in body) dados.video_url = normalizarVideoUrl(body.video_url, erros);

  if ("visibilidade" in body) {
    if (VISIBILIDADES.includes(body.visibilidade)) dados.visibilidade = body.visibilidade;
    else erros.add("Visibilidade do artigo inválida");
  }

  if ("status" in body) {
    if (STATUS_ARTIGO.includes(body.status)) dados.status = body.status;
    else erros.add("Status do artigo inválido");
  } else if (typeof body.ativo === "boolean") {
    // Compatibilidade com clientes que ainda enviam apenas o campo "ativo".
    dados.status = body.ativo ? "publicado" : "arquivado";
  } else if (criacao) {
    dados.status = "rascunho";
  }
  if (dados.status) dados.ativo = dados.status === "publicado";

  return { dados, erros: [...erros] };
}

const podePublicar = (perfil) => PERFIS_PUBLICACAO.includes(normalizarPerfil(perfil));

// Devolve o motivo do bloqueio, ou null quando o perfil pode fazer a mudança.
function erroPublicacao(perfil, { statusAtual, novoStatus } = {}) {
  if (podePublicar(perfil)) return null;
  if (statusAtual && !STATUS_DO_AUTOR.includes(statusAtual)) {
    return "Somente supervisores e administradores alteram artigos publicados ou arquivados.";
  }
  if (novoStatus && !STATUS_DO_AUTOR.includes(novoStatus)) {
    return "Somente supervisores e administradores publicam ou arquivam artigos. Envie o artigo para revisão.";
  }
  return null;
}

// Leitura comum: só publicados, e artigos internos apenas para a equipe técnica.
// Vale para listagem, leitura, métricas e recomendação, para que um interno nunca chegue ao usuário.
function condicaoLeitura(user, alias) {
  const publicado = `${alias}.status = 'publicado'`;
  return ehEquipe(user?.perfil) ? publicado : `${publicado} AND ${alias}.visibilidade = 'publico'`;
}

// A busca já descarta o que fica abaixo da confiança mínima; o resto é alta ou moderada.
const nivelConfianca = (confianca) => (confianca >= CONFIANCA_ALTA ? "alta" : "moderada");

module.exports = { STATUS_ARTIGO, CAMPOS_TEXTO, VISIBILIDADES, BUCKET_IMAGENS, PASTA_IMAGENS, DURACAO_URL_IMAGEM_SEGUNDOS, referenciaImagemValida, normalizarArtigo, podePublicar, erroPublicacao, condicaoLeitura, nivelConfianca };
