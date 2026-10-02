/**
 * Responsabilidade: conteúdo de cada e-mail do sistema, todos no modelo único de emailLayout.js.
 * Só monta (assunto, texto, html, anexos); quem envia é o emailService.
 */
const { montarEmail } = require("./emailLayout");

function primeiroNome(nome) {
  return String(nome || "").trim().split(/\s+/)[0] || "";
}

function saudacaoPara(nome) {
  const primeiro = primeiroNome(nome);
  return primeiro ? `Olá, ${primeiro},` : "Olá,";
}

function formatarDataHora(valor) {
  const data = valor ? new Date(valor) : new Date();
  if (Number.isNaN(data.getTime())) return "";
  return data.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatarData(valor) {
  const data = valor ? new Date(valor) : null;
  if (!data || Number.isNaN(data.getTime())) return "";
  return data.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

// Mesmos parâmetros da notificação push: o portal abre o chamado (ou a avaliação) depois do login,
// e só para o dono do chamado.
function linksChamado(chamado, base) {
  if (!base || !chamado?.id || !chamado?.usuario_id) return null;
  const query = new URLSearchParams({ pushUser: String(chamado.usuario_id), pushTicket: String(chamado.id) });
  const detalhe = `${base}/portal/chamados?${query}`;
  query.set("pushAction", "avaliar");
  return { avaliar: `${base}/portal/chamados?${query}`, detalhe };
}

function emailRecuperacaoSenha({ nome, codigo, config }) {
  return montarEmail({
    config,
    assunto: "Seu código para redefinir a senha",
    previa: `Código ${codigo}. Vale por 20 minutos.`,
    etiqueta: "Recuperação de senha",
    titulo: "Redefina sua senha",
    saudacao: saudacaoPara(nome),
    paragrafos: ["Recebemos um pedido para redefinir a senha da sua conta. Use o código abaixo na tela de recuperação."],
    codigo,
    observacao: "O código vale por 20 minutos e só pode ser usado uma vez. Se você não pediu a troca de senha, ignore este e-mail: sua senha continua a mesma.",
  });
}

function emailVerificacao({ nome, codigo, config }) {
  return montarEmail({
    config,
    assunto: "Confirme seu e-mail",
    previa: `Código ${codigo}. Vale por 20 minutos.`,
    etiqueta: "Confirmação de cadastro",
    titulo: "Confirme seu e-mail",
    saudacao: saudacaoPara(nome),
    paragrafos: ["Para concluir o seu cadastro, informe o código abaixo na tela de confirmação."],
    codigo,
    observacao: "O código vale por 20 minutos. Se você não fez este cadastro, ignore este e-mail.",
  });
}

const EVENTOS_CHAMADO = {
  criado: {
    etiqueta: "Chamado aberto",
    assunto: (n) => `Chamado ${n} aberto`,
    texto: () => "Recebemos o seu chamado. A equipe de suporte vai analisar e você acompanha cada atualização pelo portal.",
  },
  status: {
    etiqueta: "Chamado atualizado",
    assunto: (n) => `Chamado ${n} atualizado`,
    texto: ({ status }) => `A situação do seu chamado mudou para "${status}".`,
  },
  reaberto: {
    etiqueta: "Chamado reaberto",
    assunto: (n) => `Chamado ${n} reaberto`,
    texto: () => "O seu chamado foi reaberto e voltou para atendimento.",
  },
};

/** Avisos do chamado ao solicitante: aberto, situação alterada ou reaberto. */
function emailChamado({ evento, chamado, status, motivo, config, base }) {
  const modelo = EVENTOS_CHAMADO[evento];
  const numero = chamado.numero_chamado || `#${chamado.id}`;
  const links = linksChamado(chamado, base);
  return montarEmail({
    config,
    assunto: modelo.assunto(numero),
    previa: modelo.texto({ status }),
    etiqueta: modelo.etiqueta,
    titulo: chamado.titulo || numero,
    saudacao: saudacaoPara(chamado.solicitante),
    paragrafos: [modelo.texto({ status })],
    detalhes: [
      ["Chamado", numero],
      ["Situação", status],
      ["Prioridade", chamado.prioridade],
      ["Motivo", motivo],
      ["Atualizado em", formatarDataHora(new Date())],
    ],
    botao: links ? { texto: "Ver chamado", url: links.detalhe } : null,
    observacao: links ? null : "Acesse o portal para acompanhar o chamado.",
  });
}

/** Chamado concluído: convite para avaliar o atendimento. */
function emailAvaliacao({ chamado, config, base }) {
  const numero = chamado.numero_chamado || `#${chamado.id}`;
  const links = linksChamado(chamado, base);
  const introducao = "O atendimento do chamado abaixo foi concluído. Pedimos que avalie o atendimento recebido; sua resposta é usada para acompanhar a qualidade do suporte.";
  return montarEmail({
    config,
    assunto: `Chamado ${numero} concluído — avalie o atendimento`,
    previa: `O atendimento do chamado ${numero} foi concluído.`,
    etiqueta: "Chamado concluído",
    titulo: chamado.titulo || numero,
    saudacao: saudacaoPara(chamado.solicitante),
    paragrafos: [introducao],
    detalhes: [
      ["Chamado", numero],
      ["Responsável", chamado.responsavel],
      ["Concluído em", formatarDataHora(chamado.finalizado_em)],
    ],
    botao: links ? { texto: "Avaliar atendimento", url: links.avaliar } : null,
    linkSecundario: links ? { antes: "Ou", texto: "acesse o chamado para ver o histórico completo", url: links.detalhe } : null,
    observacao: links ? null : "Acesse o portal para avaliar o atendimento.",
    rodape: "Caso o problema persista, o chamado pode ser reaberto pelo portal.",
  });
}

/** Link de liberação: o responsável pela empresa cria a senha e vira o administrador. */
function emailLiberacao({ empresa, link, expiraEm, config }) {
  return montarEmail({
    config,
    assunto: `Seu acesso ao Smart HelpDesk está liberado — ${empresa}`,
    previa: "Crie sua senha e comece a usar o Smart HelpDesk.",
    etiqueta: "Acesso liberado",
    titulo: `Bem-vindo ao Smart HelpDesk, ${empresa}`,
    saudacao: "Olá,",
    paragrafos: [
      `O acesso da ${empresa} ao Smart HelpDesk foi liberado e você foi indicado como responsável.`,
      "Pelo botão abaixo você cria a sua senha e entra como administrador da empresa: a partir daí, cadastra a equipe, as unidades e começa a receber chamados.",
    ],
    detalhes: [["Empresa", empresa], ["Link válido até", formatarData(expiraEm)]],
    botao: { texto: "Criar minha senha", url: link },
    observacao: "O link vale uma única vez. Se ele expirar, peça um novo a quem liberou o acesso.",
  });
}

module.exports = { emailRecuperacaoSenha, emailVerificacao, emailChamado, emailAvaliacao, emailLiberacao, linksChamado };
