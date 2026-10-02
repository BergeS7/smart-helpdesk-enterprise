/**
 * Responsabilidade: API interna para o Console Berges7 (outro sistema, servidor a servidor).
 * Só leitura e só números de cadastro e cobrança: nenhum chamado, usuário ou ativo sai daqui.
 * Protegida pela chave CONSOLE_API_KEY; sem a variável, a rota nem existe (404).
 */
const crypto = require("crypto");
const router = require("express").Router();
const pool = require("../config/database");
const { modoSistema } = require("../middlewares/authMiddleware");
const { PERFIS_COBRADOS, calcularMensalidade, dadosPlano } = require("../domain/planos");

const resumo = (valor) => crypto.createHash("sha256").update(String(valor)).digest();

// Compara os resumos em tempo constante: o tempo da resposta não revela quanto da chave acertou.
function chaveConfere(recebida, esperada) {
  return crypto.timingSafeEqual(resumo(recebida), resumo(esperada));
}

function exigirChaveDoConsole(req, res, next) {
  const esperada = process.env.CONSOLE_API_KEY;
  if (!esperada) return res.status(404).json({ erro: "Recurso não encontrado.", requestId: req.id });
  const recebida = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!recebida || !chaveConfere(recebida, esperada)) return res.status(401).json({ erro: "Chave de serviço inválida." });
  return next();
}

async function listarEmpresas(req, res) {
  try {
    const result = await pool.query(`
      SELECT e.id, e.nome, e.slug, e.cnpj, e.plano, e.status, e.email_responsavel, e.criado_em,
        (SELECT COUNT(*)::int FROM usuarios u WHERE u.empresa_id = e.id AND u.status = 'ativo') AS usuarios_ativos,
        (SELECT COUNT(*)::int FROM usuarios u WHERE u.empresa_id = e.id AND u.perfil = ANY($1) AND u.status = 'ativo') AS tecnicos_cobrados,
        (SELECT MAX(u.ultimo_login_em) FROM usuarios u WHERE u.empresa_id = e.id) AS ultimo_acesso_em
      FROM empresas e
      ORDER BY e.id`, [PERFIS_COBRADOS]);
    return res.json({
      gerado_em: new Date().toISOString(),
      empresas: result.rows.map((empresa) => ({
        ...empresa,
        plano_nome: dadosPlano(empresa.plano)?.nome || null,
        mensalidade: calcularMensalidade(empresa.plano, empresa.tecnicos_cobrados),
      })),
    });
  } catch (error) {
    console.error("Erro ao listar empresas para o console:", error);
    return res.status(500).json({ erro: "Erro ao listar empresas." });
  }
}

router.use(exigirChaveDoConsole, modoSistema);
router.get("/empresas", listarEmpresas);

module.exports = router;
module.exports.exigirChaveDoConsole = exigirChaveDoConsole;
module.exports.listarEmpresas = listarEmpresas;
