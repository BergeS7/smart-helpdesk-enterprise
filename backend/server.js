require("dotenv").config();
const { validateProductionSecurity } = require("./src/config/security");
validateProductionSecurity();
const app = require("./src/app");
const { recordError } = require("./src/services/systemDiagnosticsService");

process.on("unhandledRejection", (reason) => {
  recordError({ source: "backend-process", message: reason instanceof Error ? reason.message : String(reason), context: "unhandledRejection" });
});
process.on("uncaughtException", (error) => {
  recordError({ source: "backend-process", message: error.message, context: "uncaughtException" });
  process.exitCode = 1;
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
