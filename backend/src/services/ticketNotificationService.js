const pool = require("../config/database");
const { canonicalize } = require("../domain/ticketStatus");

async function criarNotificacao(usuarioId, titulo, mensagem, tipo = "info", link = null) {
  if (!usuarioId) return;
  try {
    const result = await pool.query("INSERT INTO notificacoes(usuario_id,titulo,mensagem,tipo,link) VALUES($1,$2,$3,$4,$5) RETURNING id", [usuarioId,titulo,mensagem,tipo,link]);
    if (result.rows[0]) await require("./pushService").sendSafely(usuarioId, { id: result.rows[0].id, titulo, mensagem, link });
  } catch (error) { console.error("Erro notificação:", error.message); }
}

function mensagemStatus(chamado, status) {
  const titulo = String(chamado.titulo || chamado.numero_chamado || `#${chamado.id}`);
  switch (canonicalize(status)) {
    case "IN_PROGRESS": return ["Chamado em andamento", `${titulo} — Seu atendimento está em andamento.`];
    case "WAITING_USER": return ["Chamado aguardando você", `${titulo} — Precisamos da sua resposta para continuar o atendimento.`];
    case "RESOLVED":
    case "CLOSED": return ["Chamado concluído — faça a avaliação", `${titulo} — Atendimento concluído. Avalie o atendimento com uma nota e um breve comentário.`];
    default: return null;
  }
}

async function notificarStatus(chamado, status, anterior = null) {
  if (["RESOLVED", "CLOSED"].includes(canonicalize(anterior)) && ["RESOLVED", "CLOSED"].includes(canonicalize(status))) return;
  const message = mensagemStatus(chamado, status);
  const concluido = ["RESOLVED", "CLOSED"].includes(canonicalize(status));
  if (message) await criarNotificacao(chamado.usuario_id, ...message, concluido ? "success" : "info", `/chamados/${chamado.id}${concluido ? "?action=avaliar" : ""}`);
}

async function notificarAvaliacao(chamado, nota, comentario) {
  const breve = String(comentario || "").replace(/\s+/g, " ").trim();
  const trecho = breve.length > 160 ? `${breve.slice(0,157)}…` : breve;
  await criarNotificacao(chamado.responsavel_id, "Você foi avaliado", `Nota ${nota}/5 — ${trecho}`, "info", `/chamados/${chamado.id}`);
}

async function notificarInteracao(chamado, autor, evento, quantidade = 1) {
  const autorId = Number(autor?.id);
  const destinatarios = [...new Set([chamado.usuario_id, chamado.responsavel_id]
    .filter((id) => id != null && Number(id) !== autorId))];
  if (!destinatarios.length) return;

  const referencia = chamado.numero_chamado || `#${chamado.id}`;
  const nomeAutor = String(autor?.nome || "Alguém").replace(/\s+/g, " ").trim().slice(0, 80);
  const anexos = Math.max(1, Number(quantidade) || 1);
  const titulo = evento === "anexo"
    ? (anexos > 1 ? "Novos anexos no chamado" : "Novo anexo no chamado")
    : "Nova mensagem no chamado";
  const acao = evento === "anexo"
    ? `adicionou ${anexos > 1 ? `${anexos} anexos` : "um novo anexo"}`
    : "enviou uma nova mensagem";

  await Promise.all(destinatarios.map((usuarioId) => criarNotificacao(
    usuarioId,
    titulo,
    `${nomeAutor} ${acao} em ${referencia}.`,
    "info",
    `/chamados/${chamado.id}`,
  )));
}

module.exports = { criarNotificacao, mensagemStatus, notificarStatus, notificarAvaliacao, notificarInteracao };
