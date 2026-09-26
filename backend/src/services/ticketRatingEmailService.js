/**
 * Responsabilidade: e-mail enviado ao solicitante quando o chamado é concluído, convidando a avaliar o atendimento.
 */
const path = require("path");
const { enviarEmail } = require("./emailService");

const COR_PADRAO = "#17a9d4";
const NOME_PADRAO = "Smart HelpDesk";
// Tons fixos do tema do portal (--shd-deep e --shd-ink em appShared.tsx).
const COR_PROFUNDA = "#073b66";
const COR_TINTA = "#091923";
// A logo vai embutida no e-mail (anexo inline via CID). Uma URL não serve: o Gmail busca as imagens
// pelos servidores do Google, que não alcançam uploads locais nem ambientes internos.
const LOGO_CID = "logo@smart-helpdesk";
const LOGO_ARQUIVO = path.join(__dirname, "..", "assets", "email-logo.png");

function escaparHtml(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

// O link precisa do endereço público do portal: APP_URL, ou a primeira origem liberada no CORS.
function urlBasePortal(env = process.env) {
  const candidata = String(env.APP_URL || "").trim() || String(env.ALLOWED_ORIGINS || "").split(",")[0].trim();
  try {
    const url = new URL(candidata);
    return ["http:", "https:"].includes(url.protocol) ? url.origin : null;
  } catch { return null; }
}

// Mesmos parâmetros da notificação push: o portal abre o chamado (ou a avaliação) depois do login,
// e só para o dono do chamado.
function linksChamado(chamado, base) {
  if (!base) return null;
  const query = new URLSearchParams({ pushUser: String(chamado.usuario_id), pushTicket: String(chamado.id) });
  const detalhe = `${base}/portal/chamados?${query}`;
  query.set("pushAction", "avaliar");
  return { avaliar: `${base}/portal/chamados?${query}`, detalhe };
}

function formatarData(valor) {
  const data = valor ? new Date(valor) : new Date();
  if (Number.isNaN(data.getTime())) return "";
  return data.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function marcaSistema(config = {}) {
  const cor = /^#[0-9a-fA-F]{6}$/.test(String(config.cor_principal || "").trim()) ? config.cor_principal.trim() : COR_PADRAO;
  const anexos = [{ filename: "logo.png", path: LOGO_ARQUIVO, cid: LOGO_CID }];
  return { nome: String(config.nome_sistema || "").trim() || NOME_PADRAO, cor, logo: `cid:${LOGO_CID}`, anexos, suporte: String(config.email_suporte || "").trim() };
}

function linhaDetalhe(rotulo, valor) {
  if (!valor) return "";
  return `<tr>
                  <td style="padding:12px 0;border-top:1px solid #e5e7eb;color:#6b7280;font-size:13px;width:130px;vertical-align:top">${escaparHtml(rotulo)}</td>
                  <td style="padding:12px 0;border-top:1px solid #e5e7eb;color:#111827;font-size:14px">${escaparHtml(valor)}</td>
                </tr>`;
}

function montarEmailAvaliacao({ chamado, config, base }) {
  const marca = marcaSistema(config);
  const links = linksChamado(chamado, base);
  const primeiroNome = String(chamado.solicitante || "").trim().split(/\s+/)[0];
  const saudacao = primeiroNome ? `Olá, ${primeiroNome},` : "Olá,";
  const numero = chamado.numero_chamado || `#${chamado.id}`;
  const concluidoEm = formatarData(chamado.finalizado_em);
  const assunto = `Chamado ${numero} concluído — avalie o atendimento`;
  const introducao = "O atendimento do chamado abaixo foi concluído. Pedimos que avalie o atendimento recebido; sua resposta é usada para acompanhar a qualidade do suporte.";

  const texto = [
    saudacao,
    "",
    introducao,
    "",
    `Chamado: ${numero}`,
    chamado.titulo ? `Assunto: ${chamado.titulo}` : null,
    chamado.responsavel ? `Responsável: ${chamado.responsavel}` : null,
    concluidoEm ? `Concluído em: ${concluidoEm}` : null,
    "",
    links ? `Avaliar atendimento: ${links.avaliar}` : "Acesse o portal para avaliar o atendimento.",
    links ? `Ver chamado: ${links.detalhe}` : null,
    "",
    "Caso o problema persista, o chamado pode ser reaberto pelo portal.",
    marca.suporte ? `Contato: ${marca.suporte}` : null,
    "",
    marca.nome,
  ].filter((linha) => linha !== null).join("\n");

  const nomeMarca = `<span style="font-size:16px;font-weight:600;color:#ffffff;letter-spacing:0.2px">${escaparHtml(marca.nome)}</span>`;
  const cabecalho = `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="padding-right:12px;vertical-align:middle"><img src="${escaparHtml(marca.logo)}" alt="" width="40" height="40" style="display:block;width:40px;height:40px;border:0"></td>
            <td style="vertical-align:middle">${nomeMarca}</td>
          </tr></table>`;

  const acoes = links ? `
            <tr><td style="padding:32px 40px 0">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                <td bgcolor="${marca.cor}" style="background-color:${marca.cor};border-radius:4px">
                  <a href="${escaparHtml(links.avaliar)}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none">Avaliar atendimento</a>
                </td>
              </tr></table>
            </td></tr>
            <tr><td style="padding:16px 40px 0;font-size:13px;color:#6b7280">
              Ou <a href="${escaparHtml(links.detalhe)}" style="color:${COR_PROFUNDA};font-weight:600;text-decoration:underline">acesse o chamado</a> para ver o histórico completo.
            </td></tr>` : `
            <tr><td style="padding:32px 40px 0;font-size:14px;color:#374151">Acesse o portal para avaliar o atendimento.</td></tr>`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escaparHtml(assunto)}</title></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">O atendimento do chamado ${escaparHtml(numero)} foi concluído.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f3f4f6">
    <tr><td align="center" style="padding:40px 16px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px">
        <tr><td bgcolor="${COR_TINTA}" style="background-color:${COR_TINTA};background-image:linear-gradient(135deg,${COR_TINTA},${COR_PROFUNDA});padding:20px 40px;border-bottom:3px solid ${marca.cor}">${cabecalho}</td></tr>
        <tr><td style="background-color:#ffffff;border:1px solid #e5e7eb;border-top:0;padding:0 0 40px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td style="padding:40px 40px 0">
              <p style="margin:0 0 8px;font-size:12px;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;color:${marca.cor}">Chamado concluído</p>
              <h1 style="margin:0;font-size:20px;line-height:1.4;font-weight:600;color:#111827">${escaparHtml(chamado.titulo || numero)}</h1>
            </td></tr>
            <tr><td style="padding:24px 40px 0;font-size:14px;line-height:1.7;color:#374151">
              <p style="margin:0 0 12px">${escaparHtml(saudacao)}</p>
              <p style="margin:0">${escaparHtml(introducao)}</p>
            </td></tr>
            <tr><td style="padding:28px 40px 0">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-bottom:1px solid #e5e7eb">
                ${linhaDetalhe("Chamado", numero)}
                ${linhaDetalhe("Responsável", chamado.responsavel)}
                ${linhaDetalhe("Concluído em", concluidoEm)}
              </table>
            </td></tr>${acoes}
          </table>
        </td></tr>
        <tr><td style="padding:24px 4px 0;font-size:12px;line-height:1.7;color:#9ca3af">
          Caso o problema persista, o chamado pode ser reaberto pelo portal.${marca.suporte ? ` Contato: <a href="mailto:${escaparHtml(marca.suporte)}" style="color:#6b7280">${escaparHtml(marca.suporte)}</a>.` : ""}<br>
          Mensagem automática enviada por ${escaparHtml(marca.nome)}. Não responda a este e-mail.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { assunto, texto, html, anexos: marca.anexos };
}

// Não interrompe o fluxo do chamado: falha de configuração ou de SMTP só vai para o log.
async function enviarEmailAvaliacao(chamado) {
  if (!chamado?.email_solicitante) return { enviado: false, motivo: "Destinatário não informado" };
  try {
    const { carregarConfiguracoesObjeto } = require("../controllers/settingsController");
    const config = await carregarConfiguracoesObjeto().catch(() => ({}));
    const email = montarEmailAvaliacao({ chamado, config, base: urlBasePortal() });
    return await enviarEmail({ para: chamado.email_solicitante, ...email });
  } catch (error) {
    console.error("Erro ao enviar e-mail de avaliação:", error.message);
    return { enviado: false, motivo: error.message };
  }
}

module.exports = { enviarEmailAvaliacao, montarEmailAvaliacao, urlBasePortal };
