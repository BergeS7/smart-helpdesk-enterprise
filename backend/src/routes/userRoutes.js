const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();
const { registrationLimiter, uploadLimiter } = require("../middlewares/securityMiddleware");

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

const pastaPerfis = path.join(__dirname, "../../uploads/perfis");

if (!fs.existsSync(pastaPerfis)) {
  fs.mkdirSync(pastaPerfis, { recursive: true });
}

const storagePerfil = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, pastaPerfis);
  },
  filename: (req, file, cb) => {
    const extensaoOriginal = path.extname(file.originalname || "").toLowerCase();

    const extensaoPorMime =
      file.mimetype === "image/png"
        ? ".png"
        : file.mimetype === "image/webp"
        ? ".webp"
        : ".jpg";

    const extensao = [".png", ".jpg", ".jpeg", ".webp"].includes(extensaoOriginal)
      ? extensaoOriginal
      : extensaoPorMime;

    const usuarioId = req.user?.id || req.usuario?.id || "usuario";

    cb(null, `perfil-${usuarioId}-${Date.now()}${extensao}`);
  },
});

const uploadFotoPerfil = multer({
  storage: storagePerfil,
  limits: {
    fileSize: 3 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    const tiposPermitidos = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

    if (tiposPermitidos.includes(file.mimetype)) {
      return cb(null, true);
    }

    return cb(new Error("Tipo de arquivo não permitido. Envie PNG, JPG, JPEG ou WEBP."));
  },
});

function tratarUploadFoto(req, res, next) {
  uploadFotoPerfil.single("foto")(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        erro: "Erro ao enviar foto",
        detalhe: error.message,
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
