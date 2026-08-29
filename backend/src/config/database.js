/**
 * Responsabilidade: Configuração compartilhada de database; inicializa integrações e parâmetros de infraestrutura.
 */
require("dotenv").config();

const { Pool } = require("pg");

const ssl = String(process.env.DB_SSL || "false") === "true"
  ? { rejectUnauthorized: String(process.env.DB_SSL_REJECT_UNAUTHORIZED || "false") === "true" }
  : undefined;

const connection = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: Number(process.env.DB_PORT || 5432),
    };

const pool = new Pool({
  ...connection,
  ssl,
  max: Math.max(1, Number(process.env.DB_POOL_MAX || 10)),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

module.exports = pool;
