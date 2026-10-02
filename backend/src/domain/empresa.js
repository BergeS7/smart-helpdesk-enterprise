/**
 * Responsabilidade: regras puras do cadastro de empresas clientes (slug, CNPJ, plano e dados do responsável).
 */
const { PLANOS, PLANO_PADRAO } = require("./planos");
const STATUS_EMPRESA = Object.freeze(["ativa", "suspensa", "cancelada"]);
const CONVITE_VALIDADE_DIAS = 7;
const SLUG_MAX = 50;
// Endereços que colidem com rotas do próprio sistema.
const SLUGS_RESERVADOS = new Set(["api", "admin", "ativar", "cadastro", "login", "plataforma", "assets", "suporte"]);

function gerarSlug(nome) {
  const base = String(nome || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX)
    .replace(/-+$/g, "");
  return base || "empresa";
}

function slugValido(slug) {
  return typeof slug === "string" && slug.length <= SLUG_MAX && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) && !SLUGS_RESERVADOS.has(slug);
}

// Primeiro slug livre: nome, nome-2, nome-3... (ocupados vem do banco).
function proximoSlugLivre(base, ocupados) {
  const usados = new Set(ocupados);
  const inicial = SLUGS_RESERVADOS.has(base) ? `${base}-empresa` : base;
  if (!usados.has(inicial)) return inicial;
  for (let n = 2; ; n += 1) {
    const sufixo = `-${n}`;
    const candidato = `${inicial.slice(0, SLUG_MAX - sufixo.length)}${sufixo}`;
    if (!usados.has(candidato)) return candidato;
  }
}

function normalizarCnpj(valor) {
  const digitos = String(valor || "").replace(/\D/g, "");
  return digitos || null;
}

function cnpjValido(digitos) {
  if (!/^\d{14}$/.test(digitos) || /^(\d)\1{13}$/.test(digitos)) return false;
  const digito = (tamanho) => {
    const pesos = tamanho === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const soma = pesos.reduce((total, peso, i) => total + Number(digitos[i]) * peso, 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  return digito(12) === Number(digitos[12]) && digito(13) === Number(digitos[13]);
}

function emailValido(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

/**
 * Valida e normaliza os dados de uma empresa. Em edição (parcial), só confere os campos enviados.
 * Retorna { dados, erros }.
 */
function validarEmpresa(entrada = {}, { parcial = false } = {}) {
  const erros = [];
  const dados = {};
  const informado = (campo) => !parcial || entrada[campo] !== undefined;

  if (informado("nome")) {
    const nome = String(entrada.nome || "").trim();
    if (nome.length < 2 || nome.length > 160) erros.push("Informe o nome da empresa (2 a 160 caracteres).");
    else dados.nome = nome;
  }
  if (informado("email_responsavel")) {
    const email = String(entrada.email_responsavel || "").trim().toLowerCase();
    if (!emailValido(email)) erros.push("Informe um e-mail válido para o responsável.");
    else dados.email_responsavel = email;
  }
  if (entrada.cnpj !== undefined && entrada.cnpj !== null && String(entrada.cnpj).trim() !== "") {
    const cnpj = normalizarCnpj(entrada.cnpj);
    if (!cnpjValido(cnpj)) erros.push("CNPJ inválido.");
    else dados.cnpj = cnpj;
  } else if (entrada.cnpj !== undefined) {
    dados.cnpj = null;
  }
  if (informado("plano") || entrada.plano !== undefined) {
    const plano = String(entrada.plano || (parcial ? "" : PLANO_PADRAO)).trim().toLowerCase();
    if (!PLANOS.includes(plano)) erros.push("Plano inválido.");
    else dados.plano = plano;
  }
  if (entrada.status !== undefined) {
    const status = String(entrada.status).trim().toLowerCase();
    if (!STATUS_EMPRESA.includes(status)) erros.push("Situação da empresa inválida.");
    else dados.status = status;
  }
  return { dados, erros };
}

module.exports = {
  PLANOS, STATUS_EMPRESA, CONVITE_VALIDADE_DIAS,
  gerarSlug, slugValido, proximoSlugLivre, normalizarCnpj, cnpjValido, emailValido, validarEmpresa,
};
