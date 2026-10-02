/**
 * Responsabilidade: configurações de marca (nome, cor, contato) da empresa dona do destinatário,
 * para o e-mail sair com a identidade certa mesmo fora de uma requisição logada (recuperação de
 * senha, confirmação de cadastro). Sem empresa, valem as do contexto atual (ou as padrão).
 */
const { executarComoEmpresa } = require("../config/tenantContext");

async function configuracoesDaEmpresa(empresaId) {
  const { carregarConfiguracoesObjeto } = require("../controllers/settingsController");
  const carregar = () => carregarConfiguracoesObjeto().catch(() => ({}));
  return empresaId ? executarComoEmpresa(empresaId, carregar) : carregar();
}

module.exports = { configuracoesDaEmpresa };
