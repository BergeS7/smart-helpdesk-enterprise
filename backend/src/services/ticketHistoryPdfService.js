/**
 * Responsabilidade: Serviço de domínio de ticket history pdf; concentra regras reutilizáveis fora da camada HTTP.
 */
const PDFDocument = require("pdfkit");

const COLORS = {
  primary: "#0f172a",
  accent: "#2563eb",
  muted: "#64748b",
  border: "#dbe3ee",
  panel: "#f8fafc",
};

function text(value, fallback = "Não informado") {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function date(value) {
  if (!value) return "Não informado";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? text(value)
    : parsed.toLocaleString("pt-BR", { timeZone: "America/Fortaleza" });
}

function size(bytes) {
  const value = Number(bytes || 0);
  if (!value) return "Tamanho não informado";
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function list(value) {
  if (Array.isArray(value)) return value.length ? value.join(", ") : "Não informado";
  return text(value);
}

function generateTicketHistoryPdf({ chamado, generatedBy, loadAttachment }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 42, bufferPages: true, info: {
      Title: `Histórico ${text(chamado.numero_chamado, `#${chamado.id}`)}`,
      Author: "Smart HelpDesk",
    } });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const resetX = () => { doc.x = doc.page.margins.left; };
    const ensureSpace = (height = 70) => {
      if (doc.y + height > doc.page.height - doc.page.margins.bottom) doc.addPage();
    };
    const section = (title) => {
      ensureSpace(46);
      resetX();
      doc.moveDown(0.7).fillColor(COLORS.primary).font("Helvetica-Bold").fontSize(13).text(title);
      doc.moveDown(0.25).strokeColor(COLORS.border).lineWidth(1).moveTo(doc.x, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
      doc.moveDown(0.6);
    };
    const field = (label, value, x, width) => {
      const labelY = doc.y;
      doc.fillColor(COLORS.muted).font("Helvetica-Bold").fontSize(8).text(label.toUpperCase(), x, labelY, { width });
      doc.fillColor(COLORS.primary).font("Helvetica").fontSize(10).text(text(value), x, labelY + 12, { width });
    };
    const row = (items) => {
      ensureSpace(48);
      const startY = doc.y;
      const gap = 14;
      const width = (pageWidth - gap * (items.length - 1)) / items.length;
      items.forEach(([label, value], index) => {
        doc.y = startY;
        field(label, value, doc.page.margins.left + index * (width + gap), width);
      });
      doc.y = startY + 40;
      resetX();
    };
    const entry = (title, meta, body) => {
      ensureSpace(62);
      const start = doc.y;
      doc.roundedRect(doc.page.margins.left, start, pageWidth, 1, 4).fill(COLORS.border);
      doc.y = start + 8;
      resetX();
      doc.fillColor(COLORS.primary).font("Helvetica-Bold").fontSize(9.5).text(text(title), { width: pageWidth });
      doc.fillColor(COLORS.muted).font("Helvetica").fontSize(8).text(text(meta, ""), { width: pageWidth });
      if (body) doc.moveDown(0.35).fillColor(COLORS.primary).fontSize(9.5).text(text(body), { width: pageWidth, lineGap: 2 });
      doc.moveDown(0.65);
    };

    (async () => {
      doc.fillColor(COLORS.accent).font("Helvetica-Bold").fontSize(10).text("SMART HELPDESK");
      doc.moveDown(0.25).fillColor(COLORS.primary).fontSize(21).text("Histórico completo do chamado");
      doc.moveDown(0.2).fillColor(COLORS.muted).font("Helvetica").fontSize(9).text(`Gerado em ${date(new Date())} por ${text(generatedBy)}`);
      doc.moveDown(0.8);
      doc.roundedRect(doc.page.margins.left, doc.y, pageWidth, 62, 8).fill(COLORS.panel);
      const summaryY = doc.y + 13;
      doc.fillColor(COLORS.primary).font("Helvetica-Bold").fontSize(15).text(text(chamado.numero_chamado, `#${chamado.id}`), doc.page.margins.left + 14, summaryY);
      doc.fontSize(12).text(text(chamado.titulo), doc.page.margins.left + 14, summaryY + 23, { width: pageWidth - 28 });
      doc.y = summaryY + 58;

      section("Dados do atendimento");
      row([["Status", chamado.status], ["Prioridade", chamado.prioridade], ["Tipo", chamado.tipo_chamado]]);
      row([["Solicitante", chamado.solicitante_nome || chamado.solicitante], ["E-mail", chamado.solicitante_email || chamado.email_solicitante], ["Departamento", chamado.setor]]);
      row([["Telefone", chamado.telefone_solicitante], ["Cargo", chamado.cargo_solicitante], ["Responsável", chamado.responsavel_nome || chamado.responsavel]]);
      row([["Categoria", chamado.categoria_ia], ["Equipe", chamado.equipe_nome || chamado.team_name], ["Ativo", chamado.ativo_hostname || chamado.ativo_patrimonio || chamado.ativo_id]]);
      row([["Origem - município", chamado.municipio_solicitante], ["Origem - unidade", chamado.unidade_solicitante], ["Patrimônio", chamado.ativo_patrimonio]]);
      row([["Atendimento - município", chamado.ativo_municipio || chamado.municipio_solicitante], ["Atendimento - unidade", chamado.ativo_unidade || chamado.unidade_solicitante], ["SLA", chamado.sla]]);
      row([["Aberto em", date(chamado.criado_em)], ["Atualizado em", date(chamado.atualizado_em)], ["Encerrado em", date(chamado.finalizado_em)]]);
      row([["Primeira resposta", date(chamado.primeira_resposta_em)], ["Limite de resposta", date(chamado.sla_limite_resposta)], ["Limite de resolução", date(chamado.sla_limite_resolucao)]]);

      section("Descrição");
      resetX();
      doc.fillColor(COLORS.primary).font("Helvetica").fontSize(10).text(text(chamado.descricao), { width: pageWidth, lineGap: 3 });

      if (chamado.demanda_desenvolvimento) {
        const demand = chamado.demanda_desenvolvimento;
        section("Informações da solicitação de desenvolvimento");
        row([["Código", demand.code], ["Natureza", demand.nature], ["Status", demand.status]]);
        entry("Como o processo funciona atualmente", "Informado pelo solicitante", demand.current_process);
        entry("Problema que precisa ser resolvido", "Informado pelo solicitante", demand.problem);
        entry("Resultado esperado", "Informado pelo solicitante", demand.expected_result);
        row([["Frequência", demand.frequency], ["Pessoas envolvidas", demand.people_involved], ["Tempo atual por execução", demand.current_time_minutes != null ? `${demand.current_time_minutes} minutos` : null]]);
        row([["Sistemas envolvidos", list(demand.systems)], ["Execuções por mês", demand.executions_per_month], ["Criada em", date(demand.created_at)]]);
        entry("Impacto se não for executada", "Informado pelo solicitante", demand.no_delivery_impact);
        entry("Benefícios esperados", "Informado pelo solicitante", list(demand.expected_benefits));
      }

      section("Análise e classificação automática");
      row([["Prioridade sugerida", chamado.prioridade_ia], ["Confiança", chamado.prioridade_ia_confianca != null ? `${Math.round(Number(chamado.prioridade_ia_confianca) * (Number(chamado.prioridade_ia_confianca) <= 1 ? 100 : 1))}%` : "Não informada"], ["Responsável sugerido", chamado.ia_responsavel_sugerido]]);
      entry("Motivo da prioridade", "Análise da IA", chamado.prioridade_ia_motivo);
      if (chamado.ia_resposta_inicial) entry("Resposta inicial sugerida", "Análise da IA", chamado.ia_resposta_inicial);
      if (chamado.ia_duplicidade_motivo) entry("Possível duplicidade", chamado.ia_duplicado_de ? `Relacionado ao chamado ${chamado.ia_duplicado_de}` : "Análise da IA", chamado.ia_duplicidade_motivo);

      section(`Mensagens (${(chamado.comentarios || []).length})`);
      if (!(chamado.comentarios || []).length) doc.fillColor(COLORS.muted).fontSize(9).text("Nenhuma mensagem registrada.");
      for (const comment of chamado.comentarios || []) entry(comment.autor_nome, `${text(comment.autor_perfil)} - ${date(comment.criado_em)}`, comment.mensagem);

      section(`Movimentações e auditoria (${(chamado.movimentacoes || []).length})`);
      if (!(chamado.movimentacoes || []).length) doc.fillColor(COLORS.muted).fontSize(9).text("Nenhuma movimentação registrada.");
      for (const movement of chamado.movimentacoes || []) entry(movement.descricao, `${text(movement.tipo)} - ${text(movement.autor_nome)} - ${date(movement.criado_em)}`, "");

      section(`Anexos (${(chamado.anexos || []).length})`);
      if (!(chamado.anexos || []).length) doc.fillColor(COLORS.muted).fontSize(9).text("Nenhum anexo registrado.");
      for (const attachment of chamado.anexos || []) {
        ensureSpace(70);
        resetX();
        doc.fillColor(COLORS.primary).font("Helvetica-Bold").fontSize(10).text(text(attachment.nome_original), { width: pageWidth });
        doc.fillColor(COLORS.muted).font("Helvetica").fontSize(8).text(`${text(attachment.mime_type, "Tipo não informado")} - ${size(attachment.tamanho)} - ${date(attachment.criado_em)}`, { width: pageWidth });
        if (["image/jpeg", "image/jpg", "image/png"].includes(String(attachment.mime_type || "").toLowerCase()) && loadAttachment) {
          try {
            const image = await loadAttachment(attachment);
            if (image?.length) {
              ensureSpace(270);
              doc.moveDown(0.6);
              doc.image(image, { fit: [pageWidth, 245], align: "center" });
              doc.moveDown(0.6);
            }
          } catch (_) {
            doc.moveDown(0.3).fillColor(COLORS.muted).fontSize(8).text("A prévia da imagem não pôde ser incorporada.");
          }
        }
        doc.moveDown(0.8);
      }

      if (chamado.avaliacao) {
        section("Avaliação do atendimento");
        row([["Nota", `${chamado.avaliacao.nota || chamado.avaliacao.overall_rating || 0}/5`], ["Enviada em", date(chamado.avaliacao.criado_em)], ["Comentário", chamado.avaliacao.comentario || chamado.avaliacao.comment]]);
      }

      const range = doc.bufferedPageRange();
      for (let index = 0; index < range.count; index += 1) {
        doc.switchToPage(range.start + index);
        const originalBottomMargin = doc.page.margins.bottom;
        doc.page.margins.bottom = 0;
        doc.fillColor(COLORS.muted).font("Helvetica").fontSize(8).text(
          `Smart HelpDesk - ${text(chamado.numero_chamado, `#${chamado.id}`)} - Página ${index + 1} de ${range.count}`,
          doc.page.margins.left,
          doc.page.height - 28,
          { width: pageWidth, align: "center", lineBreak: false },
        );
        doc.page.margins.bottom = originalBottomMargin;
      }
      doc.end();
    })().catch(reject);
  });
}

module.exports = { generateTicketHistoryPdf };
