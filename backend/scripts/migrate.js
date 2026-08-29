/**
 * Responsabilidade: Automação de migrate; executa uma tarefa operacional ou de geração do projeto.
 */
require("dotenv").config();
const path = require("path");
const { runner } = require("node-pg-migrate");

const ssl = String(process.env.DB_SSL || "false") === "true"
  ? { rejectUnauthorized: String(process.env.DB_SSL_REJECT_UNAUTHORIZED || "false") === "true" }
  : undefined;

const databaseUrl = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL, ssl }
  : {
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: Number(process.env.DB_PORT || 5432),
      ssl,
    };

async function runMigrations(direction = "up") {
  const normalizedDirection = direction === "down" ? "down" : "up";
  await runner({
    databaseUrl,
    dir: path.join(__dirname, "..", "migrations"),
    migrationsTable: "pgmigrations",
    direction: normalizedDirection,
    count: normalizedDirection === "down" ? 1 : Infinity,
    verbose: true,
  });
  console.log(`Migrations aplicadas com sucesso (${normalizedDirection}).`);
}

if (require.main === module) {
  runMigrations(process.argv[2])
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Falha ao executar migrations:", error.message);
      process.exit(1);
    });
}

module.exports = { runMigrations };
