/**
 * Responsabilidade: Serviço de domínio de operational alert; concentra regras reutilizáveis fora da camada HTTP.
 */
const { diagnostics } = require("./systemDiagnosticsService");

let previousFingerprint = "";
let lastSentAt = 0;

function activeProblems(snapshot) {
  const problems = [];
  if (snapshot.database.status !== "operational") problems.push(`Banco: ${snapshot.database.status}`);
  if (snapshot.redis && !["operational", "not_configured"].includes(snapshot.redis.status)) problems.push(`Redis: ${snapshot.redis.status}`);
  if (snapshot.agent.total > 0 && snapshot.agent.status !== "operational") problems.push(`Agentes: ${snapshot.agent.stale} atrasado(s)`);
  if (snapshot.requests?.last5Minutes?.errors5xx > 0) problems.push(`API: ${snapshot.requests.last5Minutes.errors5xx} erro(s) 5xx em 5 min`);
  return problems;
}

async function checkAndNotify() {
  const webhook = String(process.env.ALERT_WEBHOOK_URL || "").trim();
  if (!webhook) return;
  const snapshot = await diagnostics();
  const problems = activeProblems(snapshot);
  const fingerprint = problems.sort().join("|");
  if (!fingerprint) { previousFingerprint = ""; return; }
  const now = Date.now();
  if (fingerprint === previousFingerprint && now - lastSentAt < 30 * 60 * 1000) return;
  const response = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Smart HelpDesk com atenção", text: problems.join("\n"), problems, timestamp: new Date().toISOString() }),
  });
  if (!response.ok) throw new Error(`Webhook respondeu ${response.status}`);
  previousFingerprint = fingerprint;
  lastSentAt = now;
}

function startOperationalAlerts() {
  if (!process.env.ALERT_WEBHOOK_URL) return;
  const run = () => checkAndNotify().catch((error) => console.error(`Falha ao enviar alerta operacional: ${error.message}`));
  const timer = setInterval(run, 60 * 1000);
  timer.unref?.();
  run();
}

module.exports = { activeProblems, startOperationalAlerts };

