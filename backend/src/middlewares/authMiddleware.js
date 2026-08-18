const jwt = require("jsonwebtoken");
const pool = require("../config/database");
const { normalizarPerfil, temPerfil } = require("../utils/permissoes");

const authMiddleware = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ erro: "Token não enviado" });

  const token = header.replace("Bearer ", "");
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await pool.query("SELECT id,nome,email,perfil,status,COALESCE(token_version,1) AS token_version FROM usuarios WHERE id=$1", [decoded.id]);
    const current = result.rows[0];
    if (!current || current.status !== "ativo" || Number(decoded.tokenVersion || 1) !== Number(current.token_version)) {
      return res.status(401).json({ erro: "Sessão revogada ou usuário inativo", requestId: req.id });
    }
    req.user = { id: current.id, nome: current.nome, email: current.email, perfil: normalizarPerfil(current.perfil), tokenVersion: current.token_version };
    next();
  } catch (error) {
    return res.status(401).json({ erro: "Token inválido ou sessão expirada", requestId: req.id });
  }
};

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
