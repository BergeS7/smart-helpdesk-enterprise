const express = require("express");
const path = require("path");
const swaggerUi = require("swagger-ui-express");
const { openapiDocument } = require("./docs/openapi");
const { corsMiddleware, helmetMiddleware, requestContext, apiLimiter, notFound, errorHandler } = require("./middlewares/securityMiddleware");

const userRoutes = require("./routes/userRoutes");
const chamadoRoutes = require("./routes/chamadoRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const authRoutes = require("./routes/authRoutes");
const catalogRoutes = require("./routes/catalogRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const maintenanceRoutes = require("./routes/maintenanceRoutes");
const teamRoutes = require("./routes/teamRoutes");
const performanceRoutes = require("./routes/performanceRoutes");
const assetRoutes = require("./routes/assetRoutes");
const permissionRoutes = require("./routes/permissionRoutes");
const systemRoutes = require("./routes/systemRoutes");
const { ensureAssetSchema } = require("./services/assetSchemaService");
const { ensurePrioritySchema } = require("./services/prioritySchemaService");
const { ensurePermissionSchema } = require("./services/permissionService");
const { ensurePrivacyComplianceSchema, startPrivacyRetentionSchedule } = require("./services/privacyComplianceService");
const { ensureSlaPauseSchema } = require("./services/slaPauseSchemaService");
const { ensureEmailVerificationSchema } = require("./services/emailVerificationSchemaService");

const app = express();

// Permite reconhecer protocolo e host encaminhados pelo Nginx/reverse proxy.
app.set("trust proxy", 1);

app.use(requestContext);
app.use(helmetMiddleware);
app.use(corsMiddleware);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/api", apiLimiter);

app.use(
  "/uploads/perfis",
  express.static(path.join(__dirname, "../uploads/perfis"), {
    etag: false,
    maxAge: 0,
    setHeaders: (res) => {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      // O frontend de produção está na Vercel e os arquivos legados no Render.
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    },
  })
);
app.use(
  "/uploads/sistema",
  express.static(path.join(__dirname, "../uploads/sistema"), {
    fallthrough: false,
    maxAge: "1h",
    setHeaders: (res) => res.setHeader("Cross-Origin-Resource-Policy", "cross-origin"),
  })
);

app.get("/", (req, res) => {
  res.json({ message: "API funcionando" });
});

app.use("/api/system", systemRoutes);
app.get("/api/health", require("./controllers/systemController").health);
app.get("/api/docs.json", (req, res) => res.json(openapiDocument));
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openapiDocument));

app.use("/api/usuarios", userRoutes);
app.use("/api/chamados", chamadoRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/catalogos", catalogRoutes);
app.use("/api/notificacoes", notificationRoutes);
app.use("/api/configuracoes", settingsRoutes);
app.use("/api/avisos", maintenanceRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/performance", performanceRoutes);
app.use("/api/assets", assetRoutes);
app.use("/api/permissoes", permissionRoutes);
app.use(notFound);
app.use(errorHandler);

ensureAssetSchema().catch((error) => console.error("Erro ao preparar módulo de ativos:", error));
ensurePrioritySchema().catch((error) => console.error("Erro ao preparar IA de prioridades:", error));
ensurePermissionSchema().catch((error) => console.error("Erro ao preparar permissões:", error));
ensureSlaPauseSchema().catch((error) => console.error("Erro ao preparar pausa de SLA:", error));
ensureEmailVerificationSchema().catch((error) => console.error("Erro ao preparar verificação de e-mail:", error));
ensurePrivacyComplianceSchema()
  .then(startPrivacyRetentionSchedule)
  .catch((error) => console.error("Erro ao preparar conformidade LGPD:", error));

module.exports = app;
