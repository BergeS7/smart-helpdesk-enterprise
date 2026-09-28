/**
 * Responsabilidade: Configuração compartilhada de database; inicializa integrações e parâmetros de infraestrutura.
 */
require("dotenv").config();

const { Pool } = require("pg");
const { empresaAtual } = require("./tenantContext");

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

// Papel sem BYPASSRLS criado pela migration de isolamento; o dono das tabelas ignora a RLS.
const PAPEL_EMPRESA = "helpdesk_empresa";

// Cada conexão emprestada recebe o contexto da requisição: papel restrito + empresa, ou o dono do banco.
async function aplicarContexto(client) {
  const empresaId = empresaAtual();
  if (client.empresaAplicada === empresaId) return;
  if (empresaId) {
    await client.query("SELECT set_config('role', $1, false), set_config('app.empresa_id', $2, false)", [PAPEL_EMPRESA, String(empresaId)]);
  } else {
    await client.query("SELECT set_config('role', 'none', false), set_config('app.empresa_id', '', false)");
  }
  client.empresaAplicada = empresaId;
}

async function connect() {
  const client = await pool.connect();
  try {
    await aplicarContexto(client);
  } catch (error) {
    client.release(error);
    throw error;
  }
  return client;
}

async function query(...args) {
  const client = await connect();
  try {
    return await client.query(...args);
  } finally {
    client.release();
  }
}

module.exports = { query, connect, end: () => pool.end(), PAPEL_EMPRESA };
