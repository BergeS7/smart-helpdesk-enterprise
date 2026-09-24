/**
 * Responsabilidade: regras do artigo da base de conhecimento: status de publicação e campos editáveis.
 */
const { normalizarPerfil, ehEquipe } = require("../utils/permissoes");
const { CONFIANCA_ALTA, REVISAO_MIN_RECOMENDACOES, REVISAO_TAXA_SUCESSO_MAXIMA } = require("../config/knowledgeSearch");

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

// Sem recomendações não há taxa: devolve null em vez de inventar 0%.
function efetividade({ recomendacoes = 0, autoatendimentos = 0 } = {}) {
  const total = Number(recomendacoes);
  const taxa = total > 0 ? Math.round((Number(autoatendimentos) / total) * 100) / 100 : null;
  return {
    taxa_sucesso: taxa,
    revisar: total >= REVISAO_MIN_RECOMENDACOES && taxa < REVISAO_TAXA_SUCESSO_MAXIMA,
  };
}

const sobreposicao = (a, b) => {
  let comuns = 0;
  a.forEach((i) => { if (b.has(i)) comuns += 1; });
  return comuns / (a.size + b.size - comuns);
};

// Agrupa chamados que falam do mesmo problema, sem ML: cada termo reúne os chamados que o citam
// e termos que dividem boa parte dos mesmos chamados se juntam (maiores primeiro).
// Só termo presente no título de 2+ chamados abre grupo: o título diz o assunto, enquanto a
// descrição traz setor, local e cumprimentos que se repetem sem ser o problema.
// Devolve os grupos com o chamado que mais cita os termos do grupo como representante.
function agruparChamados(chamados, { sobreposicaoMinima, minChamados, termosGenericos = new Set() }) {
  const porTermo = new Map();
  const titulos = new Map();
  chamados.forEach((chamado, i) => {
    new Set(chamado.termos).forEach((termo) => {
      if (termosGenericos.has(termo)) return;
      if (!porTermo.has(termo)) porTermo.set(termo, new Set());
      porTermo.get(termo).add(i);
    });
    new Set(chamado.termos_titulo).forEach((termo) => titulos.set(termo, (titulos.get(termo) || 0) + 1));
  });

  const grupos = [];
  [...porTermo]
    .filter(([termo, indices]) => indices.size >= 2 && (titulos.get(termo) || 0) >= 2)
    .sort((a, b) => b[1].size - a[1].size)
    .forEach(([termo, indices]) => {
      const mesmoProblema = grupos.find((grupo) => sobreposicao(grupo.indices, indices) >= sobreposicaoMinima);
      if (!mesmoProblema) return grupos.push({ termos: new Set([termo]), indices: new Set(indices) });
      mesmoProblema.termos.add(termo);
      indices.forEach((i) => mesmoProblema.indices.add(i));
    });

  return grupos
    .filter((grupo) => grupo.indices.size >= minChamados)
    .map(({ termos, indices }) => {
      const cobertura = (i) => chamados[i].termos.filter((t) => termos.has(t)).length;
      const lista = [...indices].sort((a, b) => a - b);
      const central = lista.reduce((melhor, i) => (cobertura(i) > cobertura(melhor) ? i : melhor), lista[0]);
      return { chamados: lista.map((i) => chamados[i]), representante: chamados[central] };
    });
}

// O que fazer com um problema recorrente, do mais urgente ao resolvido.
function situacaoRecorrencia(artigo) {
  if (!artigo) return "sem_artigo";
  if (artigo.visibilidade === "interno") return "artigo_interno";
  if (efetividade(artigo).revisar) return "artigo_pouco_efetivo";
  return "coberto";
}

// Rascunho a partir de um chamado resolvido, sem IA generativa: reaproveita o que o atendimento registrou.
// Sai interno e em rascunho: o texto vem de um chamado real e pode ter dados pessoais; o técnico revisa.
function montarRascunhoDeChamado(chamado, comentariosEquipe) {
  const referencia = chamado.numero_chamado || `#${chamado.id}`;
  const ultimo = comentariosEquipe.at(-1);
  const registro = comentariosEquipe.map((c) => `- ${c.mensagem}`);
  const conteudo = [
    `Rascunho gerado a partir do chamado ${referencia}.`,
    "Antes de publicar: revise o texto, retire dados pessoais e complete o passo a passo.",
    ...(registro.length ? ["", "Registro técnico do atendimento:", ...registro] : []),
  ].join("\n");
  const categoria = chamado.categoria_ia && chamado.categoria_ia !== "Não classificado" ? chamado.categoria_ia : "";
  return {
    titulo: String(chamado.titulo || "").slice(0, CAMPOS_TEXTO.titulo),
    categoria: categoria.slice(0, CAMPOS_TEXTO.categoria),
    problema: String(chamado.descricao || "").slice(0, CAMPOS_TEXTO.problema),
    solucao: ultimo ? String(ultimo.mensagem).slice(0, CAMPOS_TEXTO.solucao) : "",
    conteudo: conteudo.slice(0, CAMPOS_TEXTO.conteudo),
    status: "rascunho",
    visibilidade: "interno",
  };
}

module.exports = { STATUS_ARTIGO, CAMPOS_TEXTO, VISIBILIDADES, BUCKET_IMAGENS, PASTA_IMAGENS, DURACAO_URL_IMAGEM_SEGUNDOS, referenciaImagemValida, normalizarArtigo, podePublicar, erroPublicacao, condicaoLeitura, nivelConfianca, efetividade, agruparChamados, situacaoRecorrencia, montarRascunhoDeChamado };
