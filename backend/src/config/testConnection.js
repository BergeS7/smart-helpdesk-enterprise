/**
 * Responsabilidade: Configuração compartilhada de test connection; inicializa integrações e parâmetros de infraestrutura.
 */
const pool = require("./database");

async function testConnection() {
  try {
    const result = await pool.query("SELECT NOW()");
    console.log("Banco conectado com sucesso!");
    console.log(result.rows[0]);
  } catch (error) {
    console.error("Erro ao conectar ao banco:");
    console.error(error.message);
  }
}

testConnection();