/**
 * Responsabilidade: modelo único dos e-mails do sistema (cabeçalho com a marca, título, texto,
 * código em destaque, detalhes, botão e rodapé), em HTML compatível com os leitores de e-mail
 * (tabelas e estilos em linha) e com a versão em texto puro para quem não lê HTML.
 * Todo valor vindo de dados é escapado; links só entram se forem http(s).
 */
const path = require("path");

const COR_PADRAO = "#17a9d4";
const NOME_PADRAO = "Smart HelpDesk";
// Tons fixos do tema do portal (--shd-deep e --shd-ink em appShared.tsx).
const COR_PROFUNDA = "#073b66";
const COR_TINTA = "#091923";
// A logo vai embutida (anexo inline via CID): o Gmail busca imagens por servidores próprios,
// que não alcançam uploads locais nem ambientes internos.
const LOGO_CID = "logo@smart-helpdesk";
const LOGO_ARQUIVO = path.join(__dirname, "..", "assets", "email-logo.png");
const FONTE = "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

function escaparHtml(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function linkSeguro(url) {
  try {
    const u = new URL(String(url));
    return ["http:", "https:"].includes(u.protocol) ? u.href : null;
  } catch {
    return null;
  }
}

/** Nome, cor e contato da marca a partir das configurações do sistema (com padrões). */
function marcaSistema(config = {}) {
  const cor = /^#[0-9a-fA-F]{6}$/.test(String(config.cor_principal || "").trim()) ? config.cor_principal.trim() : COR_PADRAO;
  return {
    nome: String(config.nome_sistema || "").trim() || NOME_PADRAO,
    cor,
    suporte: String(config.email_suporte || "").trim(),
    anexos: [{ filename: "logo.png", path: LOGO_ARQUIVO, cid: LOGO_CID }],
  };
}

function blocoCodigo(codigo, cor) {
  return `<tr><td style="padding:28px 40px 0">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td align="center" style="background-color:#f3f6fa;border:1px solid #dde5ee;border-radius:10px;padding:22px 16px">
                  <div style="font-size:12px;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;color:#6b7280;margin-bottom:8px">Seu código</div>
                  <div style="font-family:'SFMono-Regular',Consolas,'Liberation Mono',monospace;font-size:34px;font-weight:700;letter-spacing:10px;color:${cor}">${escaparHtml(codigo)}</div>
                </td></tr>
              </table>
            </td></tr>`;
}

function blocoDetalhes(detalhes) {
  const linhas = detalhes.filter(([, valor]) => valor).map(([rotulo, valor]) => `<tr>
                  <td style="padding:12px 0;border-top:1px solid #e5e7eb;color:#6b7280;font-size:13px;width:140px;vertical-align:top">${escaparHtml(rotulo)}</td>
                  <td style="padding:12px 0;border-top:1px solid #e5e7eb;color:#111827;font-size:14px">${escaparHtml(valor)}</td>
                </tr>`).join("");
  if (!linhas) return "";
  return `<tr><td style="padding:28px 40px 0">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-bottom:1px solid #e5e7eb">${linhas}</table>
            </td></tr>`;
}

function blocoBotao(botao, cor) {
  return `<tr><td style="padding:32px 40px 0">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                <td bgcolor="${cor}" style="background-color:${cor};border-radius:8px">
                  <a href="${escaparHtml(botao.url)}" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none">${escaparHtml(botao.texto)}</a>
                </td>
              </tr></table>
            </td></tr>`;
}

/**
 * Monta o e-mail. Campos:
 * assunto, previa (texto curto que o leitor mostra ao lado do assunto), etiqueta (linha acima do
 * título), titulo, saudacao, paragrafos[], codigo, detalhes [[rótulo, valor]], botao {texto, url},
 * linkSecundario {antes, texto, url}, observacao (texto menor depois do conteúdo), rodape, config.
 */
function montarEmail({
  assunto, previa, etiqueta, titulo, saudacao, paragrafos = [], codigo, detalhes = [], botao,
  linkSecundario, observacao, rodape, config = {},
}) {
  const marca = marcaSistema(config);
  const botaoValido = botao && linkSeguro(botao.url) ? { ...botao, url: linkSeguro(botao.url) } : null;
  const secundario = linkSecundario && linkSeguro(linkSecundario.url) ? { ...linkSecundario, url: linkSeguro(linkSecundario.url) } : null;
  const notaRodape = rodape || "";

  const texto = [
    saudacao,
    saudacao ? "" : null,
    ...paragrafos.flatMap((p) => [p, ""]),
    codigo ? `Código: ${codigo}` : null,
    codigo ? "" : null,
    ...detalhes.filter(([, v]) => v).map(([r, v]) => `${r}: ${v}`),
    detalhes.some(([, v]) => v) ? "" : null,
    botaoValido ? `${botaoValido.texto}: ${botaoValido.url}` : null,
    secundario ? `${secundario.texto}: ${secundario.url}` : null,
    botaoValido || secundario ? "" : null,
    observacao || null,
    observacao ? "" : null,
    notaRodape || null,
    marca.suporte ? `Contato: ${marca.suporte}` : null,
    marca.nome,
  ].filter((linha) => linha !== null && linha !== undefined).join("\n");

  const cabecalho = `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="padding-right:12px;vertical-align:middle"><img src="cid:${LOGO_CID}" alt="" width="40" height="40" style="display:block;width:40px;height:40px;border:0"></td>
            <td style="vertical-align:middle"><span style="font-size:16px;font-weight:600;color:#ffffff;letter-spacing:0.2px">${escaparHtml(marca.nome)}</span></td>
          </tr></table>`;

  const corpo = [
    `<tr><td style="padding:40px 40px 0">
              ${etiqueta ? `<p style="margin:0 0 8px;font-size:12px;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;color:${marca.cor}">${escaparHtml(etiqueta)}</p>` : ""}
              <h1 style="margin:0;font-size:21px;line-height:1.4;font-weight:600;color:#111827">${escaparHtml(titulo)}</h1>
            </td></tr>`,
    saudacao || paragrafos.length
      ? `<tr><td style="padding:22px 40px 0;font-size:15px;line-height:1.7;color:#374151">
              ${saudacao ? `<p style="margin:0 0 12px">${escaparHtml(saudacao)}</p>` : ""}
              ${paragrafos.map((p) => `<p style="margin:0 0 12px">${escaparHtml(p)}</p>`).join("")}
            </td></tr>`
      : "",
    codigo ? blocoCodigo(codigo, marca.cor) : "",
    blocoDetalhes(detalhes),
    botaoValido ? blocoBotao(botaoValido, marca.cor) : "",
    secundario
      ? `<tr><td style="padding:16px 40px 0;font-size:13px;line-height:1.6;color:#6b7280">
              ${escaparHtml(secundario.antes || "Ou")} <a href="${escaparHtml(secundario.url)}" style="color:${COR_PROFUNDA};font-weight:600;text-decoration:underline">${escaparHtml(secundario.texto)}</a>.
            </td></tr>`
      : "",
    observacao
      ? `<tr><td style="padding:24px 40px 0;font-size:13px;line-height:1.6;color:#6b7280">${escaparHtml(observacao)}</td></tr>`
      : "",
  ].join("");

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escaparHtml(assunto)}</title></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:${FONTE}">
  ${previa ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escaparHtml(previa)}</div>` : ""}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f3f4f6">
    <tr><td align="center" style="padding:40px 16px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px">
        <tr><td bgcolor="${COR_TINTA}" style="background-color:${COR_TINTA};background-image:linear-gradient(135deg,${COR_TINTA},${COR_PROFUNDA});padding:20px 40px;border-radius:12px 12px 0 0;border-bottom:3px solid ${marca.cor}">${cabecalho}</td></tr>
        <tr><td style="background-color:#ffffff;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px;padding:0 0 40px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${corpo}
          </table>
        </td></tr>
        <tr><td style="padding:24px 8px 0;font-size:12px;line-height:1.7;color:#9ca3af">
          ${notaRodape ? `${escaparHtml(notaRodape)}${marca.suporte ? " " : ""}` : ""}${marca.suporte ? `Contato: <a href="mailto:${escaparHtml(marca.suporte)}" style="color:#6b7280">${escaparHtml(marca.suporte)}</a>.` : ""}${notaRodape || marca.suporte ? "<br>" : ""}
          Mensagem automática enviada por ${escaparHtml(marca.nome)}. Não responda a este e-mail.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { assunto, texto, html, anexos: marca.anexos };
}

module.exports = { montarEmail, marcaSistema, escaparHtml, COR_PADRAO, NOME_PADRAO };
