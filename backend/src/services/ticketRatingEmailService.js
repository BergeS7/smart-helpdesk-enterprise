/**
 * Responsabilidade: e-mails do chamado ao solicitante (aberto, atualizado, reaberto e o convite para
 * avaliar quando é concluído), com o endereço público do portal e a marca da empresa.
 */
const { enviarEmail } = require("./emailService");
const { emailAvaliacao, emailChamado } = require("./emailModelos");
const { configuracoesDaEmpresa } = require("./emailMarcaEmpresa");

// O link precisa do endereço público do portal: APP_URL, ou a primeira origem liberada no CORS.
function urlBasePortal(env = process.env) {
  const candidata = String(env.APP_URL || "").trim() || String(env.ALLOWED_ORIGINS || "").split(",")[0].trim();
  try {
    const url = new URL(candidata);
    return ["http:", "https:"].includes(url.protocol) ? url.origin : null;
  } catch { return null; }
}

function montarEmailAvaliacao({ chamado, config, base }) {
  return emailAvaliacao({ chamado, config, base });
}

// Não interrompe o fluxo do chamado: falha de configuração ou de envio só vai para o log.
async function enviarEmailAvaliacao(chamado) {
  if (!chamado?.email_solicitante) return { enviado: false, motivo: "Destinatário não informado" };
  try {
    const email = montarEmailAvaliacao({ chamado, config: await configuracoesDaEmpresa(), base: urlBasePortal() });
    return await enviarEmail({ para: chamado.email_solicitante, ...email });
  } catch (error) {
    console.error("Erro ao enviar e-mail de avaliação:", error.message);
    return { enviado: false, motivo: error.message };
  }
}

/** evento: "criado" | "status" | "reaberto". Mesmo cuidado: nunca interrompe o chamado. */
async function enviarEmailChamado({ evento, chamado, para, status, motivo }) {
  if (!para) return { enviado: false, motivo: "Destinatário não informado" };
  try {
    const email = emailChamado({ evento, chamado, status, motivo, config: await configuracoesDaEmpresa(), base: urlBasePortal() });
    return await enviarEmail({ para, ...email });
  } catch (error) {
    console.error(`Erro ao enviar e-mail do chamado (${evento}):`, error.message);
    return { enviado: false, motivo: error.message };
  }
}

module.exports = { enviarEmailAvaliacao, enviarEmailChamado, montarEmailAvaliacao, urlBasePortal };
