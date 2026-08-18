const nodemailer = require("nodemailer");

function emailConfigurado() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

async function enviarEmail({ para, assunto, texto, html }) {
  if (!para) return { enviado: false, motivo: "Destinatário não informado" };

  if (!emailConfigurado()) {
    console.log("[EMAIL SIMULADO]", { para, assunto, texto });
    return { enviado: false, simulado: true, motivo: "SMTP não configurado" };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "false") === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: para,
    subject: assunto,
    text: texto,
    html,
  });

  return { enviado: true };
}

module.exports = { enviarEmail };
