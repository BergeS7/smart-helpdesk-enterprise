const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const { emailConfigurado, enviarEmail } = require("../src/services/emailService");

const VARIAVEIS = ["RESEND_API_KEY", "EMAIL_FROM", "SMTP_HOST", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"];

function comAmbiente(valores, fn) {
  return async () => {
    const salvo = Object.fromEntries(VARIAVEIS.map((chave) => [chave, process.env[chave]]));
    const fetchOriginal = global.fetch;
    for (const chave of VARIAVEIS) delete process.env[chave];
    Object.assign(process.env, valores);
    try { await fn(); } finally {
      global.fetch = fetchOriginal;
      for (const chave of VARIAVEIS) if (salvo[chave] === undefined) delete process.env[chave]; else process.env[chave] = salvo[chave];
    }
  };
}

test("com RESEND_API_KEY envia pela API do Resend, com a logo embutida por content_id", comAmbiente(
  { RESEND_API_KEY: "re_teste", EMAIL_FROM: "Help <help@empresa.com>" },
  async () => {
    let chamada;
    global.fetch = async (url, opcoes) => { chamada = { url, opcoes }; return { ok: true, json: async () => ({ id: "abc" }) }; };
    const logo = path.join(__dirname, "../src/assets/email-logo.png");
    const resultado = await enviarEmail({ para: "cliente@x.com", assunto: "Oi", texto: "t", html: "<img src=\"cid:logo\">", anexos: [{ filename: "logo.png", path: logo, cid: "logo" }] });

    assert.deepEqual(resultado, { enviado: true, id: "abc" });
    assert.equal(chamada.url, "https://api.resend.com/emails");
    assert.equal(chamada.opcoes.headers.Authorization, "Bearer re_teste");
    const corpo = JSON.parse(chamada.opcoes.body);
    assert.equal(corpo.from, "Help <help@empresa.com>");
    assert.equal(corpo.to, "cliente@x.com");
    assert.equal(corpo.attachments[0].content_id, "logo");
    assert.ok(Buffer.from(corpo.attachments[0].content, "base64").subarray(1, 4).equals(Buffer.from("PNG")));
  },
));

test("erro do Resend vira exceção com a mensagem da API", comAmbiente(
  { RESEND_API_KEY: "re_teste", EMAIL_FROM: "help@empresa.com" },
  async () => {
    global.fetch = async () => ({ ok: false, status: 403, json: async () => ({ message: "The empresa.com domain is not verified." }) });
    await assert.rejects(enviarEmail({ para: "a@b.com", assunto: "x", texto: "y" }), /Resend 403: The empresa\.com domain is not verified/);
  },
));

test("sem remetente o Resend não conta como configurado; sem chave vale o SMTP", comAmbiente({}, async () => {
  process.env.RESEND_API_KEY = "re_teste";
  assert.equal(emailConfigurado(), false);
  delete process.env.RESEND_API_KEY;
  Object.assign(process.env, { SMTP_HOST: "smtp.x.com", SMTP_USER: "u@x.com", SMTP_PASS: "p" });
  assert.equal(emailConfigurado(), true);
  assert.deepEqual(await enviarEmail({ para: "", assunto: "x" }), { enviado: false, motivo: "Destinatário não informado" });
}));
