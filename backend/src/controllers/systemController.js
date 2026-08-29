/**
 * Responsabilidade: Controlador HTTP de system; valida a requisição e coordena regras e persistência.
 */
const { diagnostics, recordError } = require("../services/systemDiagnosticsService");

async function health(_req, res) {
  const result = await diagnostics();
  res.status(result.ok ? 200 : 503).json({ ...result, recentErrors: undefined });
}

async function adminDiagnostics(_req, res) {
  res.json(await diagnostics());
}

function frontendError(req, res) {
  recordError({
    source: "frontend",
    message: req.body?.message,
    path: req.body?.path,
    context: {
      stack: String(req.body?.stack || "").slice(0, 4000),
      userAgent: String(req.headers["user-agent"] || "").slice(0, 500),
      userId: req.user?.id,
    },
    requestId: req.id,
  });
  res.status(202).json({ ok: true, requestId: req.id });
}

module.exports = { health, adminDiagnostics, frontendError };
