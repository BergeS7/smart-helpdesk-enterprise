/**
 * Responsabilidade: catálogo comercial dos planos (preço, faixa de técnicos e recursos liberados)
 * e o cálculo da mensalidade de cada empresa. Mudou o preço? Mude só aqui.
 */
const RECURSOS = Object.freeze({
  BASE_CONHECIMENTO: "base_conhecimento",
  ASSISTENTE_IA: "assistente_ia",
});

// Preço fixo com uma faixa de técnicos incluída; quem passa da faixa paga por técnico extra.
// A IA tem custo por pergunta, por isso só o Pro libera o assistente.
const CATALOGO = Object.freeze({
  base: Object.freeze({ nome: "Base", mensalidade: 399, tecnicosIncluidos: 3, valorTecnicoExtra: 49, recursos: Object.freeze([]) }),
  plus: Object.freeze({ nome: "Plus", mensalidade: 549, tecnicosIncluidos: 5, valorTecnicoExtra: 69, recursos: Object.freeze([RECURSOS.BASE_CONHECIMENTO]) }),
  pro: Object.freeze({ nome: "Pro", mensalidade: 749, tecnicosIncluidos: 8, valorTecnicoExtra: 89, recursos: Object.freeze([RECURSOS.BASE_CONHECIMENTO, RECURSOS.ASSISTENTE_IA]) }),
});

const PLANOS = Object.freeze(Object.keys(CATALOGO));
const PLANO_PADRAO = "base";

// Perfis que contam como técnico na cobrança: toda a equipe que atende, inclusive o admin.
const PERFIS_COBRADOS = Object.freeze(["tecnico", "supervisor", "admin"]);

function dadosPlano(plano) {
  return CATALOGO[plano] || null;
}

function recursosDoPlano(plano) {
  return [...(dadosPlano(plano)?.recursos || [])];
}

function planoTemRecurso(plano, recurso) {
  return recursosDoPlano(plano).includes(recurso);
}

// Primeiro plano (do mais barato ao mais caro) que libera o recurso; usado na mensagem de upgrade.
function planoMinimoPara(recurso) {
  return PLANOS.find((plano) => planoTemRecurso(plano, recurso)) || null;
}

function arredondar(valor) {
  return Math.round(valor * 100) / 100;
}

// O que a sessão do frontend recebe para mostrar ou esconder telas. Sem plano conhecido, não envia nada
// (o frontend libera e o servidor continua sendo quem bloqueia de fato).
function dadosPlanoPublico(plano) {
  const dados = dadosPlano(plano);
  return dados ? { plano, plano_nome: dados.nome, recursos: [...dados.recursos] } : {};
}

/** Mensalidade de tabela: preço do plano + técnicos acima da faixa incluída. */
function calcularMensalidade(plano, tecnicos) {
  const dados = dadosPlano(plano);
  if (!dados) return null;
  const quantidade = Math.max(0, Math.floor(Number(tecnicos) || 0));
  const tecnicosExtras = Math.max(0, quantidade - dados.tecnicosIncluidos);
  const valorExtras = arredondar(tecnicosExtras * dados.valorTecnicoExtra);
  return {
    plano,
    tecnicos: quantidade,
    tecnicosIncluidos: dados.tecnicosIncluidos,
    tecnicosExtras,
    valorBase: dados.mensalidade,
    valorExtras,
    total: arredondar(dados.mensalidade + valorExtras),
  };
}

module.exports = {
  RECURSOS, CATALOGO, PLANOS, PLANO_PADRAO, PERFIS_COBRADOS,
  dadosPlano, dadosPlanoPublico, recursosDoPlano, planoTemRecurso, planoMinimoPara, calcularMensalidade,
};
