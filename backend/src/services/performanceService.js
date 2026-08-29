/**
 * Responsabilidade: Serviço de domínio de performance; concentra regras reutilizáveis fora da camada HTTP.
 */
const pool = require("../config/database");
const FINAL = ["RESOLVED", "CLOSED", "CANCELED"];
const clamp = (value, min, max) =>
  Math.max(min, Math.min(max, Number(value) || 0));
const round = (value) => Math.round((Number(value) || 0) * 100) / 100;
function analyzeComment(comment) {
  const text = String(comment || "").toLowerCase();
  const positive = [
    "ótimo",
    "otimo",
    "excelente",
    "rápido",
    "rapido",
    "educado",
    "resolveu",
    "obrigado",
  ].filter((x) => text.includes(x)).length;
  const negative = [
    "ruim",
    "demora",
    "lento",
    "péssimo",
    "pessimo",
    "não resolveu",
    "nao resolveu",
  ].filter((x) => text.includes(x)).length;
  const score = positive - negative;
  return {
    sentiment: score > 0 ? "positive" : score < 0 ? "negative" : "neutral",
    score,
    keywords: [...new Set(text.match(/[\p{L}\d]{4,}/gu) || [])].slice(0, 12),
  };
}
function performanceScore(i) {
  const rating = clamp((i.average_rating / 5) * 100, 0, 100);
  const time = clamp(100 - (i.average_resolution_time / 480) * 100, 0, 100);
  return round(
    rating * 0.4 +
      i.sla_rate * 0.2 +
      time * 0.15 +
      i.first_contact_resolution_rate * 0.1 +
      (100 - i.reopen_rate) * 0.1 +
      i.productivity_score * 0.05,
  );
}
async function calculateIndicators({
  technicianId = null,
  teamId = null,
  month,
  year,
}) {
  const filters = [
      "c.status = ANY($1::text[])",
      "EXTRACT(MONTH FROM c.finalizado_em)=$2",
      "EXTRACT(YEAR FROM c.finalizado_em)=$3",
    ],
    params = [FINAL, month, year];
  if (technicianId) {
    params.push(technicianId);
    filters.push(`c.responsavel_id=$${params.length}`);
  }
  if (teamId) {
    params.push(teamId);
    filters.push(`c.team_id=$${params.length}`);
  }
  const tickets = await pool.query(
    `SELECT COUNT(*)::int total_closed_tickets,COALESCE(AVG(EXTRACT(EPOCH FROM (c.finalizado_em-c.criado_em))/60),0) average_resolution_time,COALESCE(AVG(CASE WHEN c.sla_limite_resolucao IS NULL OR c.finalizado_em<=c.sla_limite_resolucao THEN 100 ELSE 0 END),0) sla_rate,COALESCE(AVG(CASE WHEN c.reaberto_em IS NULL THEN 100 ELSE 0 END),0) first_contact_resolution_rate,COALESCE(AVG(CASE WHEN c.reaberto_em IS NOT NULL THEN 100 ELSE 0 END),0) reopen_rate FROM chamados c WHERE ${filters.join(" AND ")}`,
    params,
  );
  const rfilters = [
      "EXTRACT(MONTH FROM pr.created_at)=$1",
      "EXTRACT(YEAR FROM pr.created_at)=$2",
    ],
    rparams = [month, year];
  if (technicianId) {
    rparams.push(technicianId);
    rfilters.push(`pr.technician_id=$${rparams.length}`);
  }
  if (teamId) {
    rparams.push(teamId);
    rfilters.push(`pr.team_id=$${rparams.length}`);
  }
  const ratings = await pool.query(
    `SELECT COUNT(*)::int total_ratings,COALESCE(AVG(overall_rating),0) average_rating,COALESCE(AVG(nps_score),0) nps_average FROM performance_ratings pr WHERE ${rfilters.join(" AND ")}`,
    rparams,
  );
  const out = { ...tickets.rows[0], ...ratings.rows[0] };
  out.productivity_score = clamp(
    (Number(out.total_closed_tickets) / 30) * 100,
    0,
    100,
  );
  Object.keys(out).forEach((key) => {
    if (!["total_closed_tickets", "total_ratings"].includes(key))
      out[key] = round(out[key]);
  });
  out.performance_score = performanceScore(out);
  return out;
}
async function updatePerformance({
  technicianId = null,
  teamId = null,
  date = new Date(),
}) {
  const month = date.getMonth() + 1,
    year = date.getFullYear(),
    i = await calculateIndicators({ technicianId, teamId, month, year });
  await pool.query(
    "DELETE FROM performance_scores WHERE technician_id IS NOT DISTINCT FROM $1 AND team_id IS NOT DISTINCT FROM $2 AND month=$3 AND year=$4",
    [technicianId, teamId, month, year],
  );
  const columns = [
      "technician_id",
      "team_id",
      "month",
      "year",
      "performance_score",
      "average_rating",
      "average_resolution_time",
      "sla_rate",
      "first_contact_resolution_rate",
      "reopen_rate",
      "productivity_score",
      "total_closed_tickets",
      "total_ratings",
      "nps_average",
    ],
    values = [
      technicianId,
      teamId,
      month,
      year,
      ...columns.slice(4).map((key) => i[key]),
    ];
  const saved = await pool.query(
    `INSERT INTO performance_scores (${columns.join(",")}) VALUES (${columns.map((_, x) => `$${x + 1}`).join(",")}) RETURNING *`,
    values,
  );
  return saved.rows[0];
}
async function recordRating({ ticket, clientId, rating }) {
  const ai = analyzeComment(rating.comment);
  const created = await pool.query(
    "INSERT INTO performance_ratings (ticket_id,technician_id,team_id,client_id,overall_rating,courtesy_rating,communication_rating,resolution_rating,speed_rating,nps_score,comment,sentiment,sentiment_score,keywords) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *",
    [
      ticket.id,
      ticket.responsavel_id || null,
      ticket.team_id || null,
      clientId,
      rating.overall_rating,
      rating.courtesy_rating,
      rating.communication_rating,
      rating.resolution_rating,
      rating.speed_rating,
      rating.nps_score,
      String(rating.comment || "").trim() || null,
      ai.sentiment,
      ai.score,
      JSON.stringify(ai.keywords),
    ],
  );
  await Promise.all([
    updatePerformance({
      technicianId: ticket.responsavel_id || null,
    }),
    updatePerformance({ teamId: ticket.team_id || null }),
    updatePerformance({}),
  ]);
  return created.rows[0];
}
async function ranking({ scope, month, year }) {
  const where =
    scope === "teams"
      ? "ps.team_id IS NOT NULL AND ps.technician_id IS NULL"
      : "ps.technician_id IS NOT NULL";
  const ratingJoin =
    scope === "teams"
      ? "LEFT JOIN (SELECT team_id,AVG(courtesy_rating) courtesy_rating,AVG(communication_rating) communication_rating,AVG(resolution_rating) resolution_rating,AVG(speed_rating) speed_rating FROM performance_ratings WHERE EXTRACT(MONTH FROM created_at)=$1 AND EXTRACT(YEAR FROM created_at)=$2 GROUP BY team_id) detail ON detail.team_id=ps.team_id"
      : "LEFT JOIN (SELECT technician_id,AVG(courtesy_rating) courtesy_rating,AVG(communication_rating) communication_rating,AVG(resolution_rating) resolution_rating,AVG(speed_rating) speed_rating FROM performance_ratings WHERE EXTRACT(MONTH FROM created_at)=$1 AND EXTRACT(YEAR FROM created_at)=$2 GROUP BY technician_id) detail ON detail.technician_id=ps.technician_id";
  const result = await pool.query(
    `SELECT ps.*,COALESCE(u.nome,t.name,'Empresa') name,u.email,u.departamento,ROUND(COALESCE(detail.courtesy_rating,0)::numeric,2) courtesy_rating,ROUND(COALESCE(detail.communication_rating,0)::numeric,2) communication_rating,ROUND(COALESCE(detail.resolution_rating,0)::numeric,2) resolution_rating,ROUND(COALESCE(detail.speed_rating,0)::numeric,2) speed_rating FROM performance_scores ps LEFT JOIN usuarios u ON u.id=ps.technician_id LEFT JOIN teams t ON t.id=ps.team_id ${ratingJoin} WHERE ${where} AND ps.month=$1 AND ps.year=$2 ORDER BY ps.performance_score DESC,ps.sla_rate DESC,ps.average_resolution_time ASC,ps.reopen_rate ASC,ps.productivity_score DESC`,
    [month, year],
  );
  return result.rows;
}
module.exports = {
  calculateIndicators,
  updatePerformance,
  recordRating,
  ranking,
};
