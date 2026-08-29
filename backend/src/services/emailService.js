/**
 * Responsabilidade: Serviço de domínio de email; concentra regras reutilizáveis fora da camada HTTP.
 */
const nodemailer = require("nodemailer");

function emailConfigurado() {
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

async function enviarEmail({ para, assunto, texto, html }) {
  if (!para) return { enviado: false, motivo: "Destinatário não informado" };

  if (!emailConfigurado()) {
    return { enviado: false, motivo: "SMTP não configurado" };
  }

  await obterTransporter().sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: para,
    subject: assunto,
    text: texto,
    html,
  });

  return { enviado: true };
}

async function verificarConexaoEmail() {
  if (!emailConfigurado()) return { configurado: false, conectado: false };
  await obterTransporter().verify();
  return { configurado: true, conectado: true };
}

module.exports = { emailConfigurado, enviarEmail, verificarConexaoEmail };
