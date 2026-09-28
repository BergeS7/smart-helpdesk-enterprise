/**
 * Responsabilidade: Middleware de auth; intercepta requisições antes ou depois dos controladores.
 */
const jwt = require("jsonwebtoken");
const pool = require("../config/database");
const { normalizarPerfil, temPerfil, ehDonoPlataforma } = require("../utils/permissoes");
const { executarComoEmpresa, executarComoSistema } = require("../config/tenantContext");

// Valida o token e descobre a empresa do usuário (consulta feita ainda sem empresa no contexto).
async function carregarSessao(header) {
  const token = String(header || "").replace("Bearer ", "");
  let current;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await pool.query(
      `SELECT u.id, u.nome, u.email, u.perfil, u.status, u.email_verificado_em, u.empresa_id,
              COALESCE(u.token_version,1) AS token_version, e.status AS empresa_status
         FROM usuarios u JOIN empresas e ON e.id = u.empresa_id
        WHERE u.id = $1`,
      [decoded.id]
    );
    current = result.rows[0];
    if (!current || current.status !== "ativo" || Number(decoded.tokenVersion || 1) !== Number(current.token_version)) {
      return { status: 401, erro: "Sessão revogada ou usuário inativo" };
    }
  } catch (error) {
    return { status: 401, erro: "Token inválido ou sessão expirada" };
  }

  const plataforma = ehDonoPlataforma(current);
  if (current.empresa_status !== "ativa" && !plataforma) {
    return { status: 403, erro: "O acesso desta empresa está suspenso. Fale com o responsável pelo contrato." };
  }
  return {
    user: {
      id: current.id,
      nome: current.nome,
      email: current.email,
      perfil: normalizarPerfil(current.perfil),
      plataforma,
      empresaId: current.empresa_id,
      tokenVersion: current.token_version,
    },
  };
}

const authMiddleware = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ erro: "Token não enviado" });

  const sessao = await carregarSessao(header);
  if (!sessao.user) return res.status(sessao.status).json({ erro: sessao.erro, requestId: req.id });
  req.user = sessao.user;
  // Daqui em diante toda consulta da requisição enxerga só os dados desta empresa.
  executarComoEmpresa(req.user.empresaId, next);
};

// Rotas que também servem à tela de login: com sessão válida usam a empresa do usuário, sem ela seguem públicas.
async function autenticacaoOpcional(req, res, next) {
  if (!req.headers.authorization) return next();
  const sessao = await carregarSessao(req.headers.authorization);
  if (!sessao.user) return next();
  req.user = sessao.user;
  executarComoEmpresa(req.user.empresaId, next);
}

// Callbacks de upload (multer) perdem o contexto assíncrono; reaplica a empresa já autenticada.
function manterEmpresa(req, res, next) {
  if (!req.user?.empresaId) return next();
  executarComoEmpresa(req.user.empresaId, next);
}

function exigirPerfil(perfilNecessario) {
  return exigirPerfis([perfilNecessario]);
}

function exigirPerfis(perfis) {
  return (req, res, next) => {
    if (!req.user || !temPerfil(req.user.perfil, perfis)) {
      return res.status(403).json({ erro: "Acesso não autorizado para este perfil" });
    }
    next();
  };
}

// Recursos da plataforma SaaS (diagnóstico, manutenção, versões do agente): só o dono, nunca um perfil.
// Esses recursos não pertencem a uma empresa, então rodam como dono do banco, fora do isolamento.
function exigirDonoPlataforma(req, res, next) {
  if (!req.user?.plataforma) return res.status(403).json({ erro: "Acesso exclusivo da administração da plataforma." });
  executarComoSistema(next);
}

function exigirPermissao(permissao) {
  return async (req, res, next) => {
    try {
      const { userHasPermission } = require("../services/permissionService");
      if (!(await userHasPermission(req.user, permissao))) return res.status(403).json({ erro: "Você não possui permissão para esta função.", permissao });
      next();
    } catch (error) { res.status(500).json({ erro: "Erro ao validar permissão", detalhe: error.message }); }
  };
}

module.exports = authMiddleware;
module.exports.exigirPerfil = exigirPerfil;
module.exports.exigirPerfis = exigirPerfis;
module.exports.exigirPermissao = exigirPermissao;
module.exports.exigirDonoPlataforma = exigirDonoPlataforma;
module.exports.manterEmpresa = manterEmpresa;
module.exports.autenticacaoOpcional = autenticacaoOpcional;
