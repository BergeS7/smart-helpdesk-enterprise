const cors = require("cors");
const helmet = require("helmet");
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");
const { correlationId } = require("../config/security");

const production = process.env.NODE_ENV === "production";
const origins = String(process.env.ALLOWED_ORIGINS || "http://localhost:8090")
  .split(",").map((item) => item.trim()).filter(Boolean);

const corsMiddleware = cors({
  origin(origin, callback) {
    if (!origin || origins.includes(origin)) return callback(null, true);
    return callback(Object.assign(new Error("Origem não autorizada"), { status: 403, expose: true }));
  },
  credentials: false,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Authorization", "Content-Type", "X-Request-ID", "X-Agent-Enrollment"],
  maxAge: 600,
});

const helmetMiddleware = helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "same-origin" },
  hsts: production ? { maxAge: 31536000, includeSubDomains: true, preload: false } : false,
  referrerPolicy: { policy: "no-referrer" },
});

function requestContext(req, res, next) {
  const incoming = String(req.headers["x-request-id"] || "");
  req.id = /^[A-Za-z0-9._-]{8,100}$/.test(incoming) ? incoming : correlationId();
  res.setHeader("X-Request-ID", req.id);
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Cache-Control", "no-store");
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (production && res.statusCode >= 500 && body && typeof body === "object") {
      const safe = { ...body, erro: "Ocorreu um erro interno. Informe o código da solicitação ao suporte.", requestId: req.id };
      delete safe.detalhe; delete safe.stack; delete safe.sql;
      return originalJson(safe);
    }
    return originalJson(body);
  };
  next();
}

function limiter({ windowMs, limit, prefix }) {
  return rateLimit({
    windowMs, limit, standardHeaders: "draft-7", legacyHeaders: false,
    keyGenerator: (req) => `${prefix}:${ipKeyGenerator(req.ip)}:${String(req.body?.email || req.body?.deviceId || "-").trim().toLowerCase().slice(0, 160)}`,
    handler: (req, res) => res.status(429).json({ erro: "Muitas tentativas. Aguarde antes de tentar novamente.", requestId: req.id }),
  });
}

const authLimiter = limiter({ windowMs: 15 * 60 * 1000, limit: 12, prefix: "auth" });
const recoveryLimiter = limiter({ windowMs: 20 * 60 * 1000, limit: 6, prefix: "recovery" });
const registrationLimiter = limiter({ windowMs: 60 * 60 * 1000, limit: 8, prefix: "registration" });
const uploadLimiter = limiter({ windowMs: 15 * 60 * 1000, limit: 30, prefix: "upload" });
const agentEnrollmentLimiter = limiter({ windowMs: 60 * 60 * 1000, limit: 15, prefix: "agent" });
const apiLimiter = limiter({ windowMs: 60 * 1000, limit: 300, prefix: "api" });

function notFound(req, res) { res.status(404).json({ erro: "Recurso não encontrado.", requestId: req.id }); }
function errorHandler(error, req, res, _next) {
  const status = Number(error.status || error.statusCode) || 500;
  const safeStatus = status >= 400 && status < 600 ? status : 500;
  require("../services/systemDiagnosticsService").recordError({ source: "backend", requestId: req.id, path: req.originalUrl, message: error.message, context: { method: req.method, status: safeStatus } });
  const message = error.expose || safeStatus < 500 ? error.message : "Ocorreu um erro interno. Informe o código da solicitação ao suporte.";
  res.status(safeStatus).json({ erro: message, requestId: req.id });
}

module.exports = { corsMiddleware, helmetMiddleware, requestContext, authLimiter, recoveryLimiter, registrationLimiter, uploadLimiter, agentEnrollmentLimiter, apiLimiter, notFound, errorHandler };
