/**
 * Responsabilidade: conteúdo dos e-mails no modelo único (código em destaque, botões, marca da
 * empresa, escape de dados e versão em texto) e a escolha segura do endereço do link de liberação.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const { emailRecuperacaoSenha, emailVerificacao, emailChamado, emailLiberacao } = require("../src/services/emailModelos");
const { montarEmail } = require("../src/services/emailLayout");

test("recuperação de senha traz o código em destaque, o prazo e a marca da empresa", () => {
  const { assunto, html, texto, anexos } = emailRecuperacaoSenha({ nome: "Maria Souza", codigo: "139796", config: { nome_sistema: "Help Maranhão", cor_principal: "#ff6600" } });
  assert.equal(assunto, "Seu código para redefinir a senha");
  assert.ok(html.includes(">139796<"), "código no bloco de destaque");
  assert.ok(html.includes("#ff6600"));
  assert.ok(html.includes("Help Maranhão"));
  assert.ok(html.includes("Olá, Maria,"));
  assert.match(texto, /Código: 139796/);
  assert.match(texto, /20 minutos/);
  assert.equal(anexos.length, 1, "logo embutida");
});

test("confirmação de cadastro usa o mesmo modelo, com padrões quando não há configuração", () => {
  const { html, texto } = emailVerificacao({ nome: "", codigo: "482113", config: {} });
  assert.ok(html.includes(">482113<"));
  assert.ok(html.includes("Smart HelpDesk"));
  assert.ok(html.includes("#17a9d4"));
  assert.match(texto, /^Olá,/);
});

test("aviso de chamado tem botão para o chamado e dados escapados", () => {
  const chamado = { id: 42, usuario_id: 7, numero_chamado: "CH-2026-0042", titulo: "Impressora <não> imprime", solicitante: "Ana", prioridade: "ALTA" };
  const { assunto, html, texto } = emailChamado({ evento: "status", chamado, status: "Em andamento", config: {}, base: "https://helpdesk.berges7.com.br" });
  assert.equal(assunto, "Chamado CH-2026-0042 atualizado");
  assert.ok(html.includes("Impressora &lt;não&gt; imprime"));
  assert.ok(!html.includes("<não>"));
  assert.ok(html.includes("https://helpdesk.berges7.com.br/portal/chamados?pushUser=7&amp;pushTicket=42"));
  assert.match(texto, /Ver chamado: https:\/\/helpdesk\.berges7\.com\.br\/portal\/chamados\?pushUser=7&pushTicket=42/);
  assert.match(texto, /Situação: Em andamento/);
  const semPortal = emailChamado({ evento: "criado", chamado, config: {}, base: null });
  assert.ok(!semPortal.html.includes("pushTicket"));
  assert.match(semPortal.texto, /Acesse o portal/);
});

test("link de liberação leva o botão para criar a senha e a validade", () => {
  const { assunto, html, texto } = emailLiberacao({ empresa: "Acme Ltda", link: "https://helpdesk.berges7.com.br/ativar/TOKEN", expiraEm: "2026-10-09T12:00:00.000Z", config: {} });
  assert.match(assunto, /Acme Ltda/);
  assert.ok(html.includes('href="https://helpdesk.berges7.com.br/ativar/TOKEN"'));
  assert.ok(html.includes("Criar minha senha"));
  assert.match(texto, /Criar minha senha: https:\/\/helpdesk\.berges7\.com\.br\/ativar\/TOKEN/);
  assert.match(texto, /Link válido até: 09\/10\/2026/);
});

test("link que não é http(s) nunca vira botão", () => {
  const { html, texto } = montarEmail({ assunto: "x", titulo: "x", botao: { texto: "Abrir", url: "javascript:alert(1)" } });
  assert.ok(!html.includes("javascript:"));
  assert.ok(!texto.includes("javascript:"));
});

test("endereço do link de liberação só vale se for uma origem liberada", () => {
  const { basePortal } = require("../src/services/empresasPlataformaService");
  const env = { ALLOWED_ORIGINS: "https://smart-helpdesk-enterprise.vercel.app,https://helpdesk.berges7.com.br" };
  assert.equal(basePortal("https://helpdesk.berges7.com.br", env), "https://helpdesk.berges7.com.br");
  assert.equal(basePortal("https://site-malicioso.example", env), "https://smart-helpdesk-enterprise.vercel.app", "cai no padrão");
  assert.equal(basePortal(undefined, env), "https://smart-helpdesk-enterprise.vercel.app");
});
