/**
 * Responsabilidade: uso da faixa de técnicos do plano pela empresa logada e o aviso de técnico extra
 * ao criar, aprovar ou promover alguém da equipe. A empresa principal fica fora (cliente de antes do
 * SaaS, não deve perceber mudança).
 */
const pool = require("../config/database");
const { EMPRESA_PRINCIPAL } = require("../config/tenantContext");
const { PERFIS_COBRADOS, calcularMensalidade, contaComoTecnico, dadosPlano, impactoNovoTecnico } = require("../domain/planos");

const CODIGO_TECNICO_EXTRA = "TECNICO_EXTRA";

const isenta = (req) => Number(req.user?.empresaId) === EMPRESA_PRINCIPAL;

const reais = (valor) => Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

async function contarTecnicos(empresaId) {
  const result = await pool.query(
    "SELECT COUNT(*)::int AS total FROM usuarios WHERE empresa_id = $1 AND perfil = ANY($2) AND status = 'ativo'",
    [empresaId, PERFIS_COBRADOS]
  );
  return result.rows[0].total;
}

/** Resumo para a tela de usuários: quantos técnicos a empresa tem e quanto isso custa no plano. */
async function usoDoPlano(req) {
  const plano = req.user?.plano;
  if (isenta(req) || !dadosPlano(plano)) return { isenta: true };
  const mensalidade = calcularMensalidade(plano, await contarTecnicos(req.user.empresaId));
  return {
    isenta: false,
    plano,
    plano_nome: dadosPlano(plano).nome,
    tecnicos: mensalidade.tecnicos,
    tecnicos_incluidos: mensalidade.tecnicosIncluidos,
    tecnicos_extras: mensalidade.tecnicosExtras,
    valor_tecnico_extra: dadosPlano(plano).valorTecnicoExtra,
    mensalidade: mensalidade.total,
  };
}

/**
 * Se a mudança (antes → depois) coloca mais um técnico ativo acima da faixa do plano, devolve o
 * impacto na mensalidade; senão, null. O controller pede confirmação ao admin (409) até ele aceitar.
 */
async function tecnicoExtra(req, antes, depois) {
  if (isenta(req) || contaComoTecnico(antes) || !contaComoTecnico(depois)) return null;
  return impactoNovoTecnico(req.user?.plano, await contarTecnicos(req.user.empresaId));
}

const confirmouExtra = (req) => req.body?.confirmar_extra === true;

function avisoTecnicoExtra(impacto) {
  return {
    erro: `Este técnico passa da faixa do plano ${impacto.plano_nome} (${impacto.tecnicos_incluidos} incluídos) `
      + `e a mensalidade vai de ${reais(impacto.mensalidade_atual)} para ${reais(impacto.mensalidade_nova)}.`,
    codigo: CODIGO_TECNICO_EXTRA,
    impacto,
  };
}

// Vai para a auditoria quando o admin confirma, para conferir a cobrança depois.
function descricaoTecnicoExtra(impacto) {
  return `Técnico extra confirmado no plano ${impacto.plano_nome}: ${impacto.tecnicos_depois} técnicos `
    + `(${impacto.tecnicos_incluidos} incluídos), mensalidade de ${reais(impacto.mensalidade_atual)} para ${reais(impacto.mensalidade_nova)}.`;
}

module.exports = { CODIGO_TECNICO_EXTRA, usoDoPlano, tecnicoExtra, confirmouExtra, avisoTecnicoExtra, descricaoTecnicoExtra };
