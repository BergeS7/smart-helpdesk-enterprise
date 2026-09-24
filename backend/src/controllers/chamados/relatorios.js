/**
 * Responsabilidade: exportação (Excel/PDF) e resumo de relatórios de chamados.
 */
const pool = require("../../config/database");
const { generateExcelReport, generatePdfReport } = require("../../services/reportService");
const { buildReportMetrics } = require("../../domain/reportMetrics");
const { registrarAuditoria } = require("./registro");
const { consultarChamados, usuarioEhEquipe } = require("./comum");

const exportarRelatorio = async (req, res) => {
  try {
    if (!usuarioEhEquipe(req)) req.query = { ...req.query, meus: undefined, solicitante_me: "true" };
    const formato = String(req.params.formato || "csv").toLowerCase();
    const chamados = await consultarChamados(req);
    const nomeBase = `chamados-${new Date().toISOString().slice(0, 10)}`;
    const ids = chamados.map((chamado) => Number(chamado.id)).filter(Number.isFinite);
    const performanceResult = ids.length ? await pool.query(
      `SELECT pr.*, c.numero_chamado,
              COALESCE(u.nome, c.responsavel, 'Não identificado') AS technician_name,
              COALESCE(t.name, 'Sem equipe') AS team_name
       FROM performance_ratings pr
       JOIN chamados c ON c.id = pr.ticket_id
       LEFT JOIN usuarios u ON u.id = pr.technician_id
       LEFT JOIN teams t ON t.id = pr.team_id
       WHERE pr.ticket_id = ANY($1::int[])
       ORDER BY pr.created_at DESC`,
      [ids]
    ).catch(() => ({ rows: [] })) : { rows: [] };
    const ratings = performanceResult.rows;
    const linhas = chamados.map((c) => ({
      Número: c.numero_chamado || c.id,
      Título: c.titulo,
      Status: c.status,
      Prioridade: c.prioridade,
      "Prioridade IA": c.prioridade_ia,
      Categoria: c.categoria_ia,
      Tipo: c.tipo_chamado,
      Departamento: c.setor,
      Município: c.municipio_solicitante || "Não informado",
      Unidade: c.unidade_solicitante || "Não informada",
      Equipe: c.team_name || "Sem equipe",
      Solicitante: c.solicitante,
      "E-mail": c.email_solicitante,
      Responsável: c.responsavel,
      Vencido: c.vencido ? "Sim" : "Não",
      Criado: c.criado_em,
      Atualizado: c.atualizado_em,
    }));

    await registrarAuditoria(req, "relatorio", null, "exportacao", `Exportou relatório em ${formato}`, { filtros: req.query });

    if (formato === "csv") {
      const headers = Object.keys(linhas[0] || { Número: "" });
      const csv = [headers.join(";"), ...linhas.map((r) => headers.map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(";"))].join("\n");
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${nomeBase}.csv"`);
      return res.send("\ufeff" + csv);
    }

    if (formato === "excel" || formato === "xlsx") {
      const buffer = await generateExcelReport({ chamados, ratings, filters: req.query, generatedBy: req.user.nome || req.user.email || "Usuário" });
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${nomeBase}.xlsx"`);
      res.setHeader("Content-Length", buffer.length);
      return res.send(Buffer.from(buffer));
    }

    if (formato === "pdf") {
      const buffer = await generatePdfReport({ chamados, ratings, filters: req.query, generatedBy: req.user.nome || req.user.email || "Usuário" });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${nomeBase}.pdf"`);
      res.setHeader("Content-Length", buffer.length);
      return res.send(buffer);
    }

    return res.status(400).json({ erro: "Formato inválido. Use csv, excel ou pdf." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ erro: "Erro ao exportar relatório", detalhe: error.message });
  }
};

const obterResumoRelatorio = async (req, res) => {
  try {
    if (!usuarioEhEquipe(req)) return res.status(403).json({ erro: "Acesso não autorizado" });
    const chamados = await consultarChamados(req);
    return res.json(buildReportMetrics(chamados));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ erro: "Erro ao calcular relatório", detalhe: error.message });
  }
};

module.exports = {
  exportarRelatorio,
  obterResumoRelatorio,
};
