require("dotenv").config();
const { validateProductionSecurity } = require("./src/config/security");
validateProductionSecurity();
const app = require("./src/app");
const { recordError } = require("./src/services/systemDiagnosticsService");
const { runMigrations } = require("./scripts/migrate");
const { startOperationalAlerts } = require("./src/services/operationalAlertService");

process.on("unhandledRejection", (reason) => {
  recordError({ source: "backend-process", message: reason instanceof Error ? reason.message : String(reason), context: "unhandledRejection" });
});
process.on("uncaughtException", (error) => {
  recordError({ source: "backend-process", message: error.message, context: "uncaughtException" });
  process.exitCode = 1;
});

const PORT = process.env.PORT || 3001;

async function startServer() {
  await runMigrations("up");
  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    startOperationalAlerts();
  });
}

startServer().catch((error) => {
  recordError({ source: "backend-bootstrap", message: error.message, context: "migration" });
  console.error("Falha ao iniciar a API:", error.message);
  process.exit(1);
});
