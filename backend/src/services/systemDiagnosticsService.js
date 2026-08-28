const pool = require("../config/database");
const { getRedisClient } = require("../config/redis");
const { metricsSnapshot } = require("./requestMetricsService");

const startedAt = Date.now();
const errors = [];
const MAX_ERRORS = 200;

function recordError(entry = {}) {
  const item = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    source: entry.source || "backend",
    level: entry.level || "error",
    message: String(entry.message || "Erro não identificado").slice(0, 1000),
    requestId: entry.requestId || null,
    path: entry.path || null,
    context: entry.context || null,
  };
  errors.unshift(item);
  if (errors.length > MAX_ERRORS) errors.length = MAX_ERRORS;
  console.error(JSON.stringify(item));
  return item;
}

async function checkDatabase() {
  const before = Date.now();
  try {
    await pool.query("SELECT 1 AS ok");
    return { status: "operational", latencyMs: Date.now() - before };
  } catch (error) {
    recordError({ source: "health", message: error.message, context: "database" });
    return { status: "unavailable", latencyMs: Date.now() - before };
  }
}

async function checkAgent() {
  try {
    const exists = await pool.query("SELECT to_regclass('public.ativos') AS table_name");
    if (!exists.rows[0]?.table_name) return { status: "not_configured", total: 0, current: 0, stale: 0 };
    const result = await pool.query(`SELECT COUNT(*)::int total,
      COUNT(*) FILTER (WHERE ultimo_heartbeat >= NOW() - INTERVAL '26 hours')::int current,
      COUNT(*) FILTER (WHERE ultimo_heartbeat IS NULL OR ultimo_heartbeat < NOW() - INTERVAL '26 hours')::int stale,
      MAX(ultimo_heartbeat) last_heartbeat FROM ativos`);
    const row = result.rows[0];
    return {
      status: row.total === 0 ? "not_configured" : row.current > 0 ? "operational" : "degraded",
      total: row.total, current: row.current, stale: row.stale, lastHeartbeat: row.last_heartbeat,
    };
  } catch (error) {
    recordError({ source: "health", message: error.message, context: "agent" });
    return { status: "unavailable", total: 0, current: 0, stale: 0 };
  }
}

async function checkRedis() {
  const before = Date.now();
  const client = getRedisClient();
  if (!client) return { status: "not_configured", latencyMs: 0 };
  try {
    if (!client.isReady) return { status: "connecting", latencyMs: Date.now() - before };
    await client.ping();
    return { status: "operational", latencyMs: Date.now() - before };
  } catch (error) {
    recordError({ source: "health", message: error.message, context: "redis" });
    return { status: "unavailable", latencyMs: Date.now() - before };
  }
}

async function diagnostics() {
  const [database, redis, agent] = await Promise.all([checkDatabase(), checkRedis(), checkAgent()]);
  const api = { status: "operational", uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000), timestamp: new Date().toISOString() };
  const ok = database.status === "operational";
  const memory = process.memoryUsage();
  const processInfo = { node: process.version, rssMb: Number((memory.rss / 1048576).toFixed(1)), heapUsedMb: Number((memory.heapUsed / 1048576).toFixed(1)) };
  return { ok, api, database, redis, agent, process: processInfo, requests: metricsSnapshot(), recentErrors: errors.slice(0, 30) };
}

module.exports = { recordError, diagnostics, errors };
