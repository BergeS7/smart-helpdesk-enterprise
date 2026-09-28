/**
 * Responsabilidade: área de atuação de cada empresa, formada pelas unidades que ela cadastrou (ativo_unidades).
 * As consultas respeitam a empresa do contexto (RLS); fora de uma requisição, use executarComoEmpresa.
 */
const pool = require("../config/database");

async function listarUnidades({ incluirInativas = false } = {}) {
  const result = await pool.query(
    `SELECT id, nome, municipio, latitude, longitude, rede_prefixo, ativa
       FROM ativo_unidades
      WHERE ($1::boolean OR ativa)
      ORDER BY municipio, nome`,
    [incluirInativas]
  );
  return result.rows;
}

// Município e unidade vazios continuam aceitos (localização é opcional); preenchidos, precisam ser uma unidade ativa da empresa.
async function localidadeValida(municipio, unidade) {
  const cidade = String(municipio || "").trim();
  const nome = String(unidade || "").trim();
  if (!cidade && !nome) return true;
  if (!cidade || !nome) return false;
  const result = await pool.query("SELECT 1 FROM ativo_unidades WHERE ativa AND municipio = $1 AND nome = $2", [cidade, nome]);
  return result.rows.length > 0;
}

module.exports = { listarUnidades, localidadeValida };
