/**
 * Responsabilidade: Módulo de index; implementa esta responsabilidade dentro do Smart HelpDesk.
 */
import { createRequire } from "module";

const require = createRequire(import.meta.url);

require("dotenv").config();

const { validateProductionSecurity } = require("../src/config/security");
validateProductionSecurity();

const app = require("../src/app");
const { runMigrations } = require("../scripts/migrate");
const migrationReady = runMigrations("up");

export default async function handler(req, res) {
  try {
    await migrationReady;
    return app(req, res);
  } catch (error) {
    console.error("Falha ao preparar o banco da API serverless:", error);
    return res.status(503).json({
      erro: "O banco de dados está sendo preparado. Tente novamente em instantes.",
      requestId: req.headers["x-request-id"] || null,
    });
  }
}
