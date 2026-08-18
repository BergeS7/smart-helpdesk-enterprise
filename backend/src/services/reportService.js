const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");

const COLORS = {
  navy: "172554", blue: "2563EB", sky: "0EA5E9", cyan: "06B6D4",
  green: "10B981", amber: "F59E0B", red: "EF4444", violet: "7C3AED",
  ink: "17212B", muted: "64748B", line: "E2E8F0", pale: "F8FAFC", white: "FFFFFF",
};
const { isFinal, label: statusLabel } = require("../domain/ticketStatus");
const { buildReportMetrics } = require("../domain/reportMetrics");

function safeDate(value) { const date = value ? new Date(value) : null; return date && !Number.isNaN(date.getTime()) ? date : null; }
function countBy(rows, getter) { return rows.reduce((acc, row) => { const key = getter(row) || "Não informado"; acc[key] = (acc[key] || 0) + 1; return acc; }, {}); }
function average(values) { const valid = values.map(Number).filter(Number.isFinite); return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null; }
function minutesBetween(start, end) { const a = safeDate(start); const b = safeDate(end); return a && b ? Math.max(0, Math.round((b - a) / 60000)) : null; }
function durationLabel(minutes) { if (minutes == null) return "-"; const h = Math.floor(minutes / 60); const m = minutes % 60; return h ? `${h}h ${m}min` : `${m}min`; }
function reportMetrics(chamados, ratings) {
  const official = buildReportMetrics(chamados);
  return {
    total: official.received,
    open: official.open,
    concluded: official.concluded,
    overdue: official.overdue,
    unassigned: official.unassigned,
    critical: official.critical,
    satisfaction: official.satisfaction,
    ratings: official.ratings,
    slaRate: official.slaRate,
  };
}

function styleTitle(sheet, title, subtitle, lastColumn = "L") {
  sheet.mergeCells(`A1:${lastColumn}2`); sheet.getCell("A1").value = title;
  sheet.getCell("A1").style = { fill: { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.navy } }, font: { name: "Arial", size: 22, bold: true, color: { argb: COLORS.white } }, alignment: { vertical: "middle", horizontal: "left" } };
  sheet.mergeCells(`A3:${lastColumn}3`); sheet.getCell("A3").value = subtitle;
  sheet.getCell("A3").style = { fill: { type: "pattern", pattern: "solid", fgColor: { argb: "DBEAFE" } }, font: { name: "Arial", size: 10, color: { argb: COLORS.navy } }, alignment: { vertical: "middle" } };
  sheet.getRow(1).height = 26; sheet.getRow(2).height = 22; sheet.getRow(3).height = 24;
  sheet.views = [{ showGridLines: false }];
}
function styleSection(cell, text, spanEnd) {
  const sheet = cell.worksheet; const row = cell.row; const start = cell.col;
  cell.value = text;
  for (let column = start; column <= spanEnd; column += 1) { sheet.getCell(row, column).style = { fill: { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.navy } }, font: { bold: true, color: { argb: COLORS.white }, size: 11 }, alignment: { vertical: "middle" } }; }
  sheet.getRow(row).height = 23;
}
function addKpi(sheet, colStart, colEnd, label, value, color) {
  sheet.mergeCells(5, colStart, 5, colEnd); sheet.mergeCells(6, colStart, 7, colEnd);
  const labelCell = sheet.getCell(5, colStart); const valueCell = sheet.getCell(6, colStart);
  labelCell.value = label.toUpperCase(); valueCell.value = value;
  labelCell.style = { fill: { type: "pattern", pattern: "solid", fgColor: { argb: color } }, font: { bold: true, size: 9, color: { argb: COLORS.white } }, alignment: { horizontal: "center", vertical: "middle" } };
  valueCell.style = { fill: { type: "pattern", pattern: "solid", fgColor: { argb: "F8FAFC" } }, font: { bold: true, size: 20, color: { argb: COLORS.ink } }, alignment: { horizontal: "center", vertical: "middle" }, border: { bottom: { style: "thin", color: { argb: COLORS.line } }, left: { style: "thin", color: { argb: COLORS.line } }, right: { style: "thin", color: { argb: COLORS.line } } } };
}
function addDistribution(sheet, startRow, startCol, title, data, color) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const total = entries.slice(0, 8).reduce((sum, [, value]) => sum + Number(value || 0), 0);
  styleSection(sheet.getCell(startRow, startCol), title, startCol + 2);
  sheet.getCell(startRow + 1, startCol).value = "Categoria"; sheet.getCell(startRow + 1, startCol + 1).value = "Quantidade"; sheet.getCell(startRow + 1, startCol + 2).value = "%";
  for (let column = startCol; column <= startCol + 2; column += 1) { const cell = sheet.getCell(startRow + 1, column); cell.style = { fill: { type: "pattern", pattern: "solid", fgColor: { argb: "E2E8F0" } }, font: { bold: true, color: { argb: COLORS.ink } } }; }
  entries.slice(0, 8).forEach(([name, value], index) => {
    const row = startRow + 2 + index; sheet.getCell(row, startCol).value = name; sheet.getCell(row, startCol + 1).value = value;
    sheet.getCell(row, startCol + 2).value = { formula: `=IFERROR(${sheet.getCell(row, startCol + 1).address}/SUM(${sheet.getCell(startRow + 2, startCol + 1).address}:${sheet.getCell(startRow + 1 + Math.max(1, entries.slice(0, 8).length), startCol + 1).address}),0)`, result: total ? Number(value) / total : 0 };
    sheet.getCell(row, startCol + 2).numFmt = "0.0%";
  });
  if (entries.length) sheet.addConditionalFormatting({ ref: `${sheet.getCell(startRow + 2, startCol + 1).address}:${sheet.getCell(startRow + 1 + entries.slice(0, 8).length, startCol + 1).address}`, rules: [{ type: "dataBar", cfvo: [{ type: "min" }, { type: "max" }], color }] });
  return entries.length;
}
function styleDataSheet(sheet, headers) {
  sheet.views = [{ state: "frozen", ySplit: 5, showGridLines: false }];
  const header = sheet.getRow(5); header.values = headers; header.height = 32;
  header.eachCell((cell) => { cell.style = { fill: { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.navy } }, font: { bold: true, color: { argb: COLORS.white }, size: 10 }, alignment: { vertical: "middle", wrapText: true } }; });
  sheet.autoFilter = { from: { row: 5, column: 1 }, to: { row: 5, column: headers.length } };
}

async function generateExcelReport({ chamados, ratings = [], filters = {}, generatedBy = "Sistema" }) {
  const workbook = new ExcelJS.Workbook(); workbook.creator = "Smart HelpDesk"; workbook.created = new Date();
  const metrics = reportMetrics(chamados, ratings); const now = new Date();
  const summary = workbook.addWorksheet("Visão Geral", { properties: { tabColor: { argb: COLORS.blue } } });
  summary.columns = Array.from({ length: 12 }, (_, i) => ({ key: `c${i}`, width: [18, 12, 9, 4, 18, 12, 9, 4, 18, 12, 9, 4][i] }));
  styleTitle(summary, "SMART HELPDESK | RELATÓRIO EXECUTIVO", `Gerado em ${now.toLocaleString("pt-BR")} por ${generatedBy} | ${chamados.length} chamado(s) no filtro`, "L");
  addKpi(summary, 1, 2, "Chamados", metrics.total, COLORS.blue); addKpi(summary, 4, 5, "Em aberto", metrics.open, COLORS.sky); addKpi(summary, 7, 8, "SLA vencido", metrics.overdue, COLORS.red); addKpi(summary, 10, 11, "Satisfação", metrics.satisfaction == null ? "Sem dados" : `${metrics.satisfaction.toFixed(1)}/5`, COLORS.green);
  addDistribution(summary, 10, 1, "Chamados por status", countBy(chamados, (c) => statusLabel(c.status)), COLORS.blue);
  addDistribution(summary, 10, 5, "Chamados por prioridade", countBy(chamados, (c) => c.prioridade), COLORS.amber);
  addDistribution(summary, 10, 9, "Chamados por departamento", countBy(chamados, (c) => c.setor), COLORS.cyan);
  styleSection(summary.getCell("A22"), "Indicadores de controle", 11);
  const controls = [["Concluídos", metrics.concluded], ["Sem responsável", metrics.unassigned], ["Críticos em aberto", metrics.critical], ["Avaliações recebidas", metrics.ratings], ["Conformidade SLA", metrics.slaRate == null ? "Sem base" : metrics.slaRate]];
  controls.forEach(([label, value], index) => { const row = 23 + index; summary.getCell(row, 1).value = label; summary.getCell(row, 2).value = value; summary.getCell(row, 1).font = { bold: true, color: { argb: COLORS.muted } }; if (label === "Conformidade SLA" && typeof value === "number") summary.getCell(row, 2).numFmt = "0.0%"; });
  summary.getCell("E23").value = "Filtros aplicados"; summary.getCell("E23").font = { bold: true, color: { argb: COLORS.navy } };
  Object.entries(filters).filter(([, value]) => value !== "" && value != null && value !== false).slice(0, 8).forEach(([key, value], index) => { summary.getCell(24 + index, 5).value = key; summary.getCell(24 + index, 6).value = String(value); });
  summary.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 1, paperSize: 9, margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 } };

  const detail = workbook.addWorksheet("Chamados", { properties: { tabColor: { argb: COLORS.sky } } });
  const ticketHeaders = ["Número", "Título", "Status", "Prioridade", "Prioridade IA", "Categoria IA", "Tipo", "Departamento", "Município", "Unidade", "Equipe", "Solicitante", "E-mail", "Responsável", "SLA", "Limite SLA", "Criado em", "Atualizado em", "Finalizado em", "Tempo total (min)", "Comentários", "Anexos", "Avaliação"];
  styleTitle(detail, "BASE DETALHADA DE CHAMADOS", "Use os filtros da linha 5 para segmentar a base. Datas e números permanecem editáveis.", "W"); styleDataSheet(detail, ticketHeaders);
  detail.columns = ticketHeaders.map((_, i) => ({ key: `c${i}`, width: [20, 44, 18, 14, 14, 25, 16, 22, 22, 32, 24, 22, 28, 24, 15, 20, 20, 20, 20, 18, 12, 10, 12][i] }));
  chamados.forEach((c) => detail.addRow([c.numero_chamado || c.id, c.titulo, c.status, c.prioridade, c.prioridade_ia, c.categoria_ia, c.tipo_chamado, c.setor, c.municipio_solicitante || "Não informado", c.unidade_solicitante || "Não informada", c.team_name || "Sem equipe", c.solicitante_nome || c.solicitante, c.solicitante_email || c.email_solicitante, c.responsavel_nome || c.responsavel || "Sem responsável", c.vencido ? "Vencido" : isFinal(c.status) ? "Encerrado" : c.sla_status || "No prazo", safeDate(c.sla_limite_resolucao), safeDate(c.criado_em), safeDate(c.atualizado_em), safeDate(c.finalizado_em), minutesBetween(c.criado_em, c.finalizado_em || c.atualizado_em), Number(c.total_comentarios || 0), Number(c.total_anexos || 0), c.avaliacao_nota ? Number(c.avaliacao_nota) : null]));
  if (chamados.length) {
    for (let rowNumber = 6; rowNumber <= 5 + chamados.length; rowNumber += 1) { const row = detail.getRow(rowNumber); row.eachCell((cell) => { cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowNumber % 2 ? "FFFFFF" : "F8FAFC" } }; cell.alignment = { vertical: "top", wrapText: true }; }); }
    detail.getColumn(16).numFmt = detail.getColumn(17).numFmt = detail.getColumn(18).numFmt = detail.getColumn(19).numFmt = "dd/mm/yyyy hh:mm";
    detail.addConditionalFormatting({ ref: `O6:O${5 + chamados.length}`, rules: [{ type: "containsText", operator: "containsText", text: "Vencido", style: { fill: { type: "pattern", pattern: "solid", bgColor: { argb: "FEE2E2" }, fgColor: { argb: "FEE2E2" } }, font: { color: { argb: COLORS.red }, bold: true } } }] });
  }

  const satisfaction = workbook.addWorksheet("Satisfação", { properties: { tabColor: { argb: COLORS.green } } });
  styleTitle(satisfaction, "SATISFAÇÃO DO CLIENTE INTERNO", "Notas detalhadas do atendimento. Registros ausentes não são estimados.", "N");
  const ratingHeaders = ["Chamado", "Técnico", "Equipe", "Nota geral", "Cortesia", "Comunicação", "Resolução", "Agilidade", "NPS", "Sentimento", "Comentário", "Data"];
  styleDataSheet(satisfaction, ratingHeaders); satisfaction.columns = ratingHeaders.map((_, i) => ({ key: `r${i}`, width: [20, 24, 20, 12, 12, 14, 12, 12, 10, 14, 48, 20][i] }));
  ratings.forEach((r) => satisfaction.addRow([r.numero_chamado || r.ticket_id, r.technician_name || "Não identificado", r.team_name || "Sem equipe", Number(r.overall_rating || 0), Number(r.courtesy_rating || 0), Number(r.communication_rating || 0), Number(r.resolution_rating || 0), Number(r.speed_rating || 0), Number(r.nps_score || 0), r.sentiment || "neutral", r.comment || "", safeDate(r.created_at)]));
  satisfaction.getColumn(12).numFmt = "dd/mm/yyyy hh:mm";
  const distStart = Math.max(8, 7 + ratings.length); styleSection(satisfaction.getCell(distStart, 1), "Distribuição das notas", 4);
  for (let note = 1; note <= 5; note += 1) { const row = distStart + 1 + note; satisfaction.getCell(row, 1).value = `${note} estrela(s)`; satisfaction.getCell(row, 2).value = ratings.filter((r) => Number(r.overall_rating) === note).length; }
  if (ratings.length) satisfaction.addConditionalFormatting({ ref: `B${distStart + 2}:B${distStart + 6}`, rules: [{ type: "dataBar", cfvo: [{ type: "min" }, { type: "max" }], color: COLORS.green }] });

  const technicians = workbook.addWorksheet("Por Técnico", { properties: { tabColor: { argb: COLORS.violet } } });
  styleTitle(technicians, "DESEMPENHO E SATISFAÇÃO POR TÉCNICO", "Comparação baseada somente nos chamados e avaliações presentes no relatório.", "J");
  const techMap = new Map(); chamados.forEach((c) => { const name = c.responsavel_nome || c.responsavel || "Sem responsável"; const item = techMap.get(name) || { name, tickets: 0, closed: 0, overdue: 0, ratings: [] }; item.tickets++; if (isFinal(c.status)) item.closed++; if (c.vencido) item.overdue++; techMap.set(name, item); });
  ratings.forEach((r) => { const name = r.technician_name || "Não identificado"; const item = techMap.get(name) || { name, tickets: 0, closed: 0, overdue: 0, ratings: [] }; item.ratings.push(Number(r.overall_rating)); techMap.set(name, item); });
  const techHeaders = ["Técnico", "Chamados", "Concluídos", "SLA vencido", "Avaliações", "Nota média", "% concluídos"];
  styleDataSheet(technicians, techHeaders); technicians.columns = techHeaders.map((_, i) => ({ key: `t${i}`, width: [30, 14, 14, 14, 14, 14, 16][i] }));
  [...techMap.values()].sort((a, b) => b.tickets - a.tickets).forEach((t) => technicians.addRow([t.name, t.tickets, t.closed, t.overdue, t.ratings.length, average(t.ratings), t.tickets ? t.closed / t.tickets : 0]));
  technicians.getColumn(6).numFmt = "0.00"; technicians.getColumn(7).numFmt = "0.0%";
  if (techMap.size) technicians.addConditionalFormatting({ ref: `F6:F${5 + techMap.size}`, rules: [{ type: "dataBar", cfvo: [{ type: "num", value: 0 }, { type: "num", value: 5 }], color: COLORS.green }] });

  const sla = workbook.addWorksheet("SLA e Prioridades", { properties: { tabColor: { argb: COLORS.amber } } });
  styleTitle(sla, "SLA E PRIORIDADES", "Visão de risco operacional por prioridade e situação do prazo.", "J");
  const priorities = ["Crítica", "Alta", "Média", "Baixa"];
  const slaHeaders = ["Prioridade", "Total", "Em aberto", "Concluídos", "Vencidos", "% vencidos", "Tempo médio (min)"];
  styleDataSheet(sla, slaHeaders); sla.columns = slaHeaders.map((_, i) => ({ key: `s${i}`, width: [18, 12, 14, 14, 12, 14, 20][i] }));
  priorities.forEach((priority) => { const rows = chamados.filter((c) => String(c.prioridade || "").replace("Critica", "Crítica").replace("Media", "Média") === priority); const overdue = rows.filter((c) => c.vencido).length; const times = rows.map((c) => minutesBetween(c.criado_em, c.finalizado_em || c.atualizado_em)).filter((v) => v != null); sla.addRow([priority, rows.length, rows.filter((c) => !isFinal(c.status)).length, rows.filter((c) => isFinal(c.status)).length, overdue, rows.length ? overdue / rows.length : 0, average(times)]); });
  sla.getColumn(6).numFmt = "0.0%"; sla.getColumn(7).numFmt = "#,##0"; sla.addConditionalFormatting({ ref: "F6:F9", rules: [{ type: "dataBar", cfvo: [{ type: "num", value: 0 }, { type: "num", value: 1 }], color: COLORS.red }] });

  const glossary = workbook.addWorksheet("Glossário", { properties: { tabColor: { argb: COLORS.muted } } });
  styleTitle(glossary, "GLOSSÁRIO E CRITÉRIOS", "Definições para leitura e auditoria do relatório.", "F"); glossary.columns = [{ width: 26 }, { width: 78 }, { width: 22 }, { width: 22 }, { width: 18 }, { width: 18 }];
  const definitions = [["Indicador", "Definição"], ["SLA vencido", "Chamado ainda não finalizado cuja data limite de resolução já passou."], ["Conformidade SLA", "Percentual de chamados concluídos dentro do limite de resolução disponível."], ["Satisfação", "Média das notas reais registradas pelo cliente interno, em escala de 1 a 5."], ["NPS", "Pontuação declarada na avaliação de performance, quando disponível."], ["Tempo total", "Minutos entre a abertura e a finalização; em chamados abertos, usa a última atualização apenas na base detalhada."], ["Prioridade IA", "Sugestão calculada pelo classificador; a prioridade final pode ter sido alterada manualmente."], ["Sem dados", "Nenhum registro real disponível para calcular o indicador."]];
  definitions.forEach((values, index) => { glossary.getRow(5 + index).values = values; }); glossary.getRow(5).eachCell((cell) => { cell.style = { fill: { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.navy } }, font: { bold: true, color: { argb: COLORS.white } } }; }); glossary.getColumn(2).alignment = { wrapText: true, vertical: "top" };
  [detail, satisfaction, technicians, sla, glossary].forEach((sheet) => { sheet.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9, margins: { left: 0.25, right: 0.25, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 } }; sheet.headerFooter.oddFooter = "Smart HelpDesk | Página &P de &N"; });
  return workbook.xlsx.writeBuffer();
}

function drawHeader(doc, title, subtitle) { doc.rect(0, 0, doc.page.width, 72).fill("#172554"); doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(19).text(title, 36, 24); doc.fillColor("#BFDBFE").font("Helvetica").fontSize(8).text(subtitle, 36, 49); }
function drawFooter(doc, pageNumber, totalPages) { const bottom = doc.page.height - 50; doc.strokeColor("#E2E8F0").moveTo(36, bottom - 8).lineTo(doc.page.width - 36, bottom - 8).stroke(); doc.fillColor("#64748B").fontSize(7).text("Smart HelpDesk - Relatório interno", 36, bottom, { width: 300, lineBreak: false }); doc.text(`Página ${pageNumber} de ${totalPages}`, doc.page.width - 180, bottom, { width: 144, align: "right", lineBreak: false }); }
function drawKpi(doc, x, y, w, label, value, color) { doc.roundedRect(x, y, w, 62, 8).fillAndStroke("#F8FAFC", "#E2E8F0"); doc.rect(x, y, 5, 62).fill(color); doc.fillColor("#64748B").font("Helvetica-Bold").fontSize(7).text(label.toUpperCase(), x + 15, y + 13, { width: w - 25 }); doc.fillColor("#17212B").fontSize(19).text(String(value), x + 15, y + 29, { width: w - 25 }); }
function drawBars(doc, x, y, width, title, data, color) { doc.fillColor("#17212B").font("Helvetica-Bold").fontSize(11).text(title, x, y); const entries = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 6); const max = Math.max(1, ...entries.map(([, value]) => value)); entries.forEach(([label, value], index) => { const rowY = y + 26 + index * 25; doc.fillColor("#475569").font("Helvetica").fontSize(8).text(label, x, rowY, { width: 120, ellipsis: true }); doc.roundedRect(x + 122, rowY + 1, width - 155, 9, 4).fill("#E2E8F0"); doc.roundedRect(x + 122, rowY + 1, Math.max(3, (width - 155) * value / max), 9, 4).fill(color); doc.fillColor("#17212B").font("Helvetica-Bold").text(String(value), x + width - 28, rowY, { width: 28, align: "right" }); }); }

async function generatePdfReport({ chamados, ratings = [], filters = {}, generatedBy = "Sistema" }) {
  const metrics = reportMetrics(chamados, ratings); const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 36, bufferPages: true, info: { Title: "Relatório Smart HelpDesk", Author: "Smart HelpDesk" } });
  const chunks = []; doc.on("data", (chunk) => chunks.push(chunk)); const result = new Promise((resolve, reject) => { doc.on("end", () => resolve(Buffer.concat(chunks))); doc.on("error", reject); });
  drawHeader(doc, "Relatório Executivo de Atendimento", `Gerado em ${new Date().toLocaleString("pt-BR")} por ${generatedBy} | ${chamados.length} chamado(s)`);
  const cardW = 174; drawKpi(doc, 36, 96, cardW, "Chamados", metrics.total, "#2563EB"); drawKpi(doc, 222, 96, cardW, "Em aberto", metrics.open, "#0EA5E9"); drawKpi(doc, 408, 96, cardW, "SLA vencido", metrics.overdue, "#EF4444"); drawKpi(doc, 594, 96, cardW, "Satisfação", metrics.satisfaction == null ? "Sem dados" : `${metrics.satisfaction.toFixed(1)}/5`, "#10B981");
  drawBars(doc, 36, 195, 345, "Chamados por status", countBy(chamados, (c) => statusLabel(c.status)), "#2563EB"); drawBars(doc, 420, 195, 348, "Chamados por prioridade", countBy(chamados, (c) => c.prioridade), "#F59E0B");
  doc.fillColor("#17212B").font("Helvetica-Bold").fontSize(11).text("Leitura rápida", 36, 402); doc.fillColor("#475569").font("Helvetica").fontSize(9).text(`Concluídos: ${metrics.concluded}  |  Sem responsável: ${metrics.unassigned}  |  Críticos em aberto: ${metrics.critical}  |  Avaliações: ${metrics.ratings}  |  Conformidade SLA: ${metrics.slaRate == null ? "sem base" : `${(metrics.slaRate * 100).toFixed(1)}%`}`, 36, 425, { width: 732 });
  const activeFilters = Object.entries(filters).filter(([, value]) => value !== "" && value != null && value !== false); if (activeFilters.length) doc.text(`Filtros: ${activeFilters.map(([key, value]) => `${key}=${value}`).join("; ")}`, 36, 452, { width: 732 });

  doc.addPage(); drawHeader(doc, "Satisfação do Cliente Interno", "Indicadores calculados exclusivamente a partir de avaliações registradas");
  if (!ratings.length) { doc.fillColor("#64748B").fontSize(14).text("Nenhuma avaliação detalhada encontrada para o filtro selecionado.", 36, 115); }
  else {
    const dimensions = { "Nota geral": average(ratings.map((r) => r.overall_rating)), Cortesia: average(ratings.map((r) => r.courtesy_rating)), Comunicação: average(ratings.map((r) => r.communication_rating)), Resolução: average(ratings.map((r) => r.resolution_rating)), Agilidade: average(ratings.map((r) => r.speed_rating)) };
    drawBars(doc, 36, 105, 345, "Média por dimensão (0-5)", Object.fromEntries(Object.entries(dimensions).map(([k, v]) => [k, Number((v || 0).toFixed(2))])), "#10B981");
    const byTech = {}; ratings.forEach((r) => { const key = r.technician_name || "Não identificado"; (byTech[key] ||= []).push(Number(r.overall_rating)); }); drawBars(doc, 420, 105, 348, "Avaliação média por técnico", Object.fromEntries(Object.entries(byTech).map(([k, values]) => [k, Number((average(values) || 0).toFixed(2))])), "#7C3AED");
    doc.fillColor("#17212B").font("Helvetica-Bold").fontSize(11).text("Comentários recentes", 36, 315); ratings.filter((r) => r.comment).slice(0, 6).forEach((r, index) => { const y = 342 + index * 31; doc.fillColor("#17212B").font("Helvetica-Bold").fontSize(8).text(`${r.technician_name || "Técnico"} - ${r.overall_rating}/5`, 36, y); doc.fillColor("#64748B").font("Helvetica").text(String(r.comment), 150, y, { width: 618, ellipsis: true }); });
  }

  doc.addPage(); drawHeader(doc, "Chamados Detalhados", "Relação completa conforme os filtros selecionados");
  const columns = [{ key: "number", label: "Número", x: 36, w: 92 }, { key: "title", label: "Título", x: 132, w: 260 }, { key: "status", label: "Status", x: 396, w: 95 }, { key: "priority", label: "Prioridade", x: 495, w: 70 }, { key: "owner", label: "Responsável", x: 569, w: 130 }, { key: "sla", label: "SLA", x: 703, w: 65 }];
  let y = 93; const drawTableHeader = () => { doc.rect(36, y, 732, 24).fill("#172554"); columns.forEach((c) => doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(7).text(c.label, c.x + 4, y + 8, { width: c.w - 8 })); y += 24; }; drawTableHeader();
  chamados.forEach((c, index) => { if (y > 525) { doc.addPage(); drawHeader(doc, "Chamados Detalhados", "Continuação"); y = 93; drawTableHeader(); } const fill = index % 2 ? "#F8FAFC" : "#FFFFFF"; doc.rect(36, y, 732, 27).fill(fill); const row = { number: c.numero_chamado || c.id, title: c.titulo, status: c.status, priority: c.prioridade, owner: c.responsavel_nome || c.responsavel || "Sem responsável", sla: c.vencido ? "Vencido" : isFinal(c.status) ? "Encerrado" : "No prazo" }; columns.forEach((col) => doc.fillColor(col.key === "sla" && c.vencido ? "#DC2626" : "#334155").font(col.key === "number" ? "Helvetica-Bold" : "Helvetica").fontSize(7).text(String(row[col.key] || "-"), col.x + 4, y + 8, { width: col.w - 8, ellipsis: true })); y += 27; });
  const range = doc.bufferedPageRange(); for (let i = range.start; i < range.start + range.count; i += 1) { doc.switchToPage(i); drawFooter(doc, i - range.start + 1, range.count); }
  doc.end(); return result;
}

module.exports = { generateExcelReport, generatePdfReport, durationLabel };
