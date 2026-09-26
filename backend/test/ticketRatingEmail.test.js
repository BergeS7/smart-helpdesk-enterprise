const test = require("node:test");
const assert = require("node:assert/strict");
const { montarEmailAvaliacao, urlBasePortal } = require("../src/services/ticketRatingEmailService");

const chamado = { id: 42, usuario_id: 7, numero_chamado: "CH-2026-0042", titulo: "Impressora <não> imprime", solicitante: "Maria Souza", responsavel: "João Técnico", finalizado_em: "2026-09-26T14:30:00Z" };
const config = { nome_sistema: "Help Maranhão", cor_principal: "#ff6600", email_suporte: "suporte@empresa.com" };

test("usa APP_URL e, sem ela, a primeira origem do CORS", () => {
  assert.equal(urlBasePortal({ APP_URL: "https://help.empresa.com/", ALLOWED_ORIGINS: "https://outra.com" }), "https://help.empresa.com");
  assert.equal(urlBasePortal({ ALLOWED_ORIGINS: "https://a.com, https://b.com" }), "https://a.com");
  assert.equal(urlBasePortal({ APP_URL: "javascript:alert(1)" }), null);
  assert.equal(urlBasePortal({}), null);
});

test("e-mail leva ao chamado e à avaliação com a identidade do sistema", () => {
  const { assunto, texto, html } = montarEmailAvaliacao({ chamado, config, base: "https://help.empresa.com" });
  assert.match(assunto, /CH-2026-0042/);
  assert.ok(html.includes("https://help.empresa.com/portal/chamados?pushUser=7&amp;pushTicket=42&amp;pushAction=avaliar"));
  assert.ok(html.includes("https://help.empresa.com/portal/chamados?pushUser=7&amp;pushTicket=42\""));
  assert.ok(html.includes("#ff6600"));
  assert.ok(html.includes("Help Maranhão"));
  assert.ok(html.includes("Olá, Maria,"));
  assert.ok(html.includes("Impressora &lt;não&gt; imprime"), "título é escapado");
  assert.ok(!html.includes("<não>"));
  assert.match(texto, /Avaliar atendimento: https:\/\/help\.empresa\.com\/portal\/chamados\?pushUser=7&pushTicket=42&pushAction=avaliar/);
});

test("sem endereço público do portal, o e-mail sai sem botões e cor inválida volta ao padrão", () => {
  const { html, texto } = montarEmailAvaliacao({ chamado, config: { cor_principal: "red" }, base: null });
  assert.ok(!html.includes("pushTicket"));
  assert.ok(html.includes("#17a9d4"));
  assert.ok(html.includes("Smart HelpDesk"));
  assert.match(texto, /Acesse o portal/);
});

test("logo: usa a configurada e, sem ela, embute a padrão no e-mail", () => {
  const base = "https://help.empresa.com";
  const padrao = montarEmailAvaliacao({ chamado, config: {}, base: null });
  assert.ok(padrao.html.includes(`src="cid:${padrao.anexos[0].cid}"`));
  assert.ok(require("fs").existsSync(padrao.anexos[0].path), "arquivo da logo padrão existe");
  assert.deepEqual(montarEmailAvaliacao({ chamado, config: { logo_url: "https://cdn.x.com/a.png" }, base }).anexos, []);
  assert.ok(montarEmailAvaliacao({ chamado, config: { logo_url: "https://cdn.x.com/a.png", logo_1_url: "https://cdn.x.com/b.png" }, base }).html.includes("https://cdn.x.com/b.png"));
  assert.ok(montarEmailAvaliacao({ chamado, config: { logo_url: "/uploads/logo.png" }, base }).html.includes(`${base}/uploads/logo.png`));
});
