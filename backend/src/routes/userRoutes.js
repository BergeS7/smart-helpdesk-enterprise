/**
 * Responsabilidade: Rotas de user; associa endpoints aos middlewares e controladores autorizados.
 */
const express = require("express");
const router = express.Router();
const { registrationLimiter, uploadLimiter } = require("../middlewares/securityMiddleware");
const uploadFotoPerfil = require("../middlewares/profilePhotoUploadMiddleware");

const authModule = require("../middlewares/authMiddleware");

const {
  criarPrimeiroAdmin,
  cadastrarUsuarioPublico,
  verificarEmail,
  reenviarVerificacaoEmail,
  createUser,
  listarUsuarios,
  aprovarUsuario,
  rejeitarUsuario,
  atualizarUsuarioAdmin,
  obterMeuPerfil,
  atualizarMeuPerfil,
  atualizarMinhaFotoPerfil,
  removerMinhaFotoPerfil,
  excluirUsuarioAdmin,
} = require("../controllers/userController");

const authMiddleware =
  typeof authModule === "function"
    ? authModule
    : authModule.authMiddleware || authModule.default;

if (typeof authMiddleware !== "function") {
  throw new Error(
    "authMiddleware não foi carregado corretamente. Verifique backend/src/middlewares/authMiddleware.js"
  );
}

function normalizarPerfilLocal(perfil) {
  const valor = String(perfil || "usuario").trim().toLowerCase();

  if (["super_admin", "dev", "developer"].includes(valor)) {
    return "desenvolvedor";
  }

  if (["administrador"].includes(valor)) {
    return "admin";
  }

  if (["usuario", "tecnico", "admin", "desenvolvedor"].includes(valor)) {
    return valor;
  }

  return "usuario";
}

function exigirPerfisLocais(perfisPermitidos) {
  return (req, res, next) => {
    const perfil = normalizarPerfilLocal(req.user?.perfil || req.usuario?.perfil);
    const permitidos = perfisPermitidos.map(normalizarPerfilLocal);

    if (!permitidos.includes(perfil)) {
      return res.status(403).json({
        erro: "Você não tem permissão para executar esta ação.",
      });
    }

    next();
  };
}

function tratarUploadFoto(req, res, next) {
  uploadFotoPerfil.single("foto")(req, res, (error) => {
    if (error) {
      const tamanhoExcedido = error?.code === "LIMIT_FILE_SIZE";
      return res.status(400).json({
        erro: tamanhoExcedido
          ? "A foto deve ter no máximo 5 MB."
          : error.message || "Erro ao enviar foto.",
      });
    }

    next();
  });
}

// Rotas públicas
router.post("/primeiro-admin", registrationLimiter, criarPrimeiroAdmin);
router.post("/cadastro", registrationLimiter, cadastrarUsuarioPublico);
router.post("/verificar-email", registrationLimiter, verificarEmail);
router.post("/reenviar-verificacao", registrationLimiter, reenviarVerificacaoEmail);

// Rotas do próprio usuário
router.get("/me", authMiddleware, obterMeuPerfil);
router.put("/me", authMiddleware, atualizarMeuPerfil);
router.patch("/me/foto", authMiddleware, uploadLimiter, tratarUploadFoto, atualizarMinhaFotoPerfil);
router.delete("/me/foto", authMiddleware, removerMinhaFotoPerfil);

// Rotas administrativas
router.get(
  "/",
  authMiddleware,
  exigirPerfisLocais(["tecnico", "admin", "desenvolvedor"]),
  listarUsuarios
);

router.post(
  "/",
  authMiddleware,
  exigirPerfisLocais(["admin", "desenvolvedor"]),
  createUser
);

router.patch(
  "/:id/aprovar",
  authMiddleware,
  exigirPerfisLocais(["admin", "desenvolvedor"]),
  aprovarUsuario
);

router.patch(
  "/:id/rejeitar",
  authMiddleware,
  exigirPerfisLocais(["admin", "desenvolvedor"]),
  rejeitarUsuario
);

router.put(
  "/:id",
  authMiddleware,
  exigirPerfisLocais(["desenvolvedor"]),
  atualizarUsuarioAdmin
);

router.delete(
  "/:id",
  authMiddleware,
  exigirPerfisLocais(["desenvolvedor"]),
  excluirUsuarioAdmin
);

module.exports = router;
