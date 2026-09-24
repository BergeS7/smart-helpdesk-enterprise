/**
 * Responsabilidade: regras do artigo da base de conhecimento: status de publicação e campos editáveis.
 */
const STATUS_ARTIGO = Object.freeze(["rascunho", "revisao", "publicado", "arquivado"]);

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
const CAMPOS_OBRIGATORIOS = Object.freeze(["titulo", "conteudo"]);
const ERRO_OBRIGATORIOS = "Título e conteúdo são obrigatórios";

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

module.exports = { STATUS_ARTIGO, CAMPOS_TEXTO, normalizarArtigo };
