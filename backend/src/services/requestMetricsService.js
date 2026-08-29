/**
 * Responsabilidade: Serviço de domínio de request metrics; concentra regras reutilizáveis fora da camada HTTP.
 */
const samples = [];
const counters = { total: 0, errors5xx: 0 };
const MAX_SAMPLES = 1000;

function requestMetrics(req, res, next) {
  const started = process.hrtime.bigint();
  res.once("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - started) / 1e6;
    counters.total += 1;
    if (res.statusCode >= 500) counters.errors5xx += 1;
    samples.push({ durationMs, status: res.statusCode, at: Date.now() });
    if (samples.length > MAX_SAMPLES) samples.splice(0, samples.length - MAX_SAMPLES);
  });
  next();
}

function percentile(values, ratio) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return Number(sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))].toFixed(1));
}

function metricsSnapshot() {
  const cutoff = Date.now() - 5 * 60 * 1000;
  const recent = samples.filter((sample) => sample.at >= cutoff);
  const durations = recent.map((sample) => sample.durationMs);
  return {
    totalRequests: counters.total,
    errors5xx: counters.errors5xx,
    last5Minutes: {
      requests: recent.length,
      errors5xx: recent.filter((sample) => sample.status >= 500).length,
      latencyP50Ms: percentile(durations, 0.5),
      latencyP95Ms: percentile(durations, 0.95),
    },
  };
}

module.exports = { requestMetrics, metricsSnapshot };

