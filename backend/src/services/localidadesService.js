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

// Na edição de um usuário, manter a localização que ele já tem é sempre aceito (a unidade pode ter sido
// desativada depois); só uma localização nova precisa ser uma unidade ativa. Campo omitido mantém o atual.
async function localidadeAceitaParaUsuario(usuarioId, municipio, unidade) {
  const atual = (await pool.query("SELECT municipio, unidade FROM usuarios WHERE id = $1", [usuarioId])).rows[0] || {};
  const texto = (valor) => String(valor || "").trim();
  const novoMunicipio = municipio === undefined ? atual.municipio : municipio;
  const novaUnidade = unidade === undefined ? atual.unidade : unidade;
  if (texto(novoMunicipio) === texto(atual.municipio) && texto(novaUnidade) === texto(atual.unidade)) return true;
  return localidadeValida(novoMunicipio, novaUnidade);
}

module.exports = { listarUnidades, localidadeValida, localidadeAceitaParaUsuario };
