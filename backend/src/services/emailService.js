/**
 * Responsabilidade: Serviço de domínio de email; concentra regras reutilizáveis fora da camada HTTP.
 */
const fs = require("fs");
const nodemailer = require("nodemailer");

// Com RESEND_API_KEY o envio usa a API HTTPS do Resend (porta 443). Hospedagens como o plano
// gratuito do Render bloqueiam as portas SMTP; sem a chave, segue pelo SMTP tradicional.
const RESEND_URL = "https://api.resend.com/emails";
const RESEND_TIMEOUT_MS = 15000;

function provedorEmail() {
  return process.env.RESEND_API_KEY ? "resend" : "smtp";
}

function remetente() {
  return process.env.EMAIL_FROM || process.env.SMTP_FROM || process.env.SMTP_USER;
}

function emailConfigurado() {
  if (provedorEmail() === "resend") return Boolean(process.env.EMAIL_FROM || process.env.SMTP_FROM);
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && (process.env.SMTP_FROM || process.env.SMTP_USER));
}

let transporter;

function obterTransporter() {
  if (!transporter) transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "false") === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporter;
}

// Anexos no formato do nodemailer ({ filename, path, cid }) viram o formato do Resend;
// cid vira content_id, o que mantém imagens embutidas com <img src="cid:...">.
function anexosResend(anexos = []) {
  return anexos.map((anexo) => ({
    filename: anexo.filename,
    content: Buffer.from(anexo.content ?? fs.readFileSync(anexo.path)).toString("base64"),
    ...(anexo.cid ? { content_id: anexo.cid } : {}),
  }));
}

async function enviarViaResend({ para, assunto, texto, html, anexos }) {
  const resposta = await fetch(RESEND_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: remetente(),
      to: para,
      subject: assunto,
      text: texto,
      html,
      ...(anexos?.length ? { attachments: anexosResend(anexos) } : {}),
    }),
    signal: AbortSignal.timeout(RESEND_TIMEOUT_MS),
  });
  const corpo = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw new Error(`Resend ${resposta.status}: ${corpo.message || corpo.name || "falha no envio"}`);
  return { enviado: true, id: corpo.id };
}

async function enviarEmail({ para, assunto, texto, html, anexos }) {
  if (!para) return { enviado: false, motivo: "Destinatário não informado" };

  if (!emailConfigurado()) {
    return { enviado: false, motivo: "Envio de e-mail não configurado" };
  }

  if (provedorEmail() === "resend") return enviarViaResend({ para, assunto, texto, html, anexos });

  await obterTransporter().sendMail({
    from: remetente(),
    to: para,
    subject: assunto,
    text: texto,
    html,
    attachments: anexos,
  });

  return { enviado: true };
}

// O Resend não tem um teste de conexão sem enviar e-mail (chaves de envio não leem outras rotas).
async function verificarConexaoEmail() {
  if (!emailConfigurado()) return { configurado: false, conectado: false, provedor: provedorEmail() };
  if (provedorEmail() === "resend") return { configurado: true, conectado: null, provedor: "resend" };
  await obterTransporter().verify();
  return { configurado: true, conectado: true, provedor: "smtp" };
}

module.exports = { emailConfigurado, enviarEmail, verificarConexaoEmail };
