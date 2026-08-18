const express = require("express");
const router = express.Router();

const authModule = require("../middlewares/authMiddleware");
const {
  listarAvisosAtivos,
  listarAvisosAdmin,
  criarAvisoManutencao,
  atualizarAvisoManutencao,
  excluirAvisoManutencao,
} = require("../controllers/maintenanceController");

const authMiddleware =
  typeof authModule === "function"
    ? authModule
    : authModule.authMiddleware || authModule.default;

function normalizarPerfilLocal(perfil) {
  const valor = String(perfil || "usuario").trim().toLowerCase();

  if (["super_admin", "dev", "developer"].includes(valor)) {
    return "desenvolvedor";
  }

  if (["usuario", "tecnico", "admin", "administrador", "desenvolvedor"].includes(valor)) {
    return valor === "administrador" ? "admin" : valor;
  }

  return "usuario";
}

function exigirDesenvolvedor(req, res, next) {
  const perfil = normalizarPerfilLocal(req.user?.perfil);

  if (perfil !== "desenvolvedor") {
    return res.status(403).json({
      erro: "Apenas desenvolvedor pode gerenciar avisos de manutenção.",
    });
  }

  next();
}

function exigirEquipe(req, res, next) {
  const perfil = normalizarPerfilLocal(req.user?.perfil);

  if (!["tecnico", "admin", "desenvolvedor"].includes(perfil)) {
    return res.status(403).json({
      erro: "Você não tem permissão para acessar avisos administrativos.",
    });
  }

  next();
}

if (typeof authMiddleware !== "function") {
  throw new Error(
    "authMiddleware não foi carregado corretamente. Verifique backend/src/middlewares/authMiddleware.js"
  );
}

router.get("/ativos", listarAvisosAtivos);

router.get(
  "/admin",
  authMiddleware,
  exigirEquipe,
  listarAvisosAdmin
);

router.post(
  "/",
  authMiddleware,
  exigirDesenvolvedor,
  criarAvisoManutencao
);

router.put(
  "/:id",
  authMiddleware,
  exigirDesenvolvedor,
  atualizarAvisoManutencao
);

router.delete(
  "/:id",
  authMiddleware,
  exigirDesenvolvedor,
  excluirAvisoManutencao
);

module.exports = router;