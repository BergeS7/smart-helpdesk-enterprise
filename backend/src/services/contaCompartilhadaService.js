/**
 * Responsabilidade: conta "Equipamentos compartilhados", o solicitante dos chamados de equipamentos
 * sem responsável específico (PCs da oficina, recepção, salas de reunião...).
 *
 * - Existe no máximo uma por empresa (índice único parcial da migration 1791700000000) e é criada na
 *   primeira vez que a equipe precisa dela, então empresas novas não exigem cadastro manual.
 * - Ninguém faz login com ela: a senha é aleatória e descartada, e o login recusa a conta mesmo assim.
 * - O e-mail usa o domínio reservado ".invalid" (RFC 2606): nunca chega a uma caixa postal real, e o
 *   emailService não tenta enviar para ele.
 * - Não aparece na gestão de usuários e não pode ser alterada nem excluída por lá.
 */
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const pool = require("../config/database");

const NOME_CONTA_COMPARTILHADA = "Equipamentos compartilhados";
const DOMINIO_SEM_CAIXA_POSTAL = "sistema.invalid";

const CAMPOS = `id, nome, email, COALESCE(perfil, 'usuario') AS perfil, COALESCE(status, 'ativo') AS status,
  telefone, departamento, municipio, unidade, cargo`;

/**
 * Lê a marca de conta compartilhada sem depender da coluna existir: to_jsonb devolve null para uma
 * coluna ausente. Assim login e listagem continuam funcionando se esta versão da API entrar no ar
 * antes da migration (em produção o Vercel publica sem migrar; quem migra é o Render).
 * Uso: `${sqlEhContaCompartilhada("usuarios")}` dentro de um SELECT/WHERE sobre a tabela usuarios.
 */
function sqlEhContaCompartilhada(alias) {
  return `COALESCE((to_jsonb(${alias}.*) ->> 'conta_compartilhada')::boolean, FALSE)`;
}

function emailDaConta(empresaId) {
  return `equipamentos.compartilhados.e${empresaId}@${DOMINIO_SEM_CAIXA_POSTAL}`;
}


async function buscarConta(empresaId) {
  const result = await pool.query(
    `SELECT ${CAMPOS} FROM usuarios WHERE conta_compartilhada = TRUE AND empresa_id = $1 LIMIT 1`,
    [empresaId]
  );
  return result.rows[0] || null;
}

/**
 * Conta compartilhada da empresa de quem está abrindo o chamado; cria se ainda não existir.
 * Devolve null se o autor não tiver empresa (não deve acontecer depois da migration multiempresa).
 */
async function obterContaCompartilhada(autorId) {
  const empresa = await pool.query("SELECT empresa_id FROM usuarios WHERE id = $1", [autorId]);
  const empresaId = empresa.rows[0]?.empresa_id;
  if (!empresaId) return null;

  const existente = await buscarConta(empresaId);
  if (existente) return existente;

  // Senha que ninguém conhece; o hash só existe porque a coluna é obrigatória.
  const senha = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);
  const criada = await pool.query(
    `INSERT INTO usuarios (nome, email, senha, perfil, status, departamento, cargo, empresa_id, conta_compartilhada)
     VALUES ($1, $2, $3, 'usuario', 'ativo', $1, 'Conta do sistema', $4, TRUE)
     ON CONFLICT (empresa_id) WHERE conta_compartilhada DO NOTHING
     RETURNING ${CAMPOS}`,
    [NOME_CONTA_COMPARTILHADA, emailDaConta(empresaId), senha, empresaId]
  );
  // Sem linha: outra requisição criou ao mesmo tempo; usa a dela.
  return criada.rows[0] || buscarConta(empresaId);
}

/** true quando o id é a conta compartilhada (para bloquear edição e exclusão pela gestão de usuários). */
async function ehContaCompartilhada(usuarioId) {
  const result = await pool.query(
    `SELECT ${sqlEhContaCompartilhada("usuarios")} AS compartilhada FROM usuarios WHERE id = $1`,
    [usuarioId]
  );
  return result.rows[0]?.compartilhada === true;
}

module.exports = {
  NOME_CONTA_COMPARTILHADA,
  sqlEhContaCompartilhada,
  ehContaCompartilhada,
  obterContaCompartilhada,
};
