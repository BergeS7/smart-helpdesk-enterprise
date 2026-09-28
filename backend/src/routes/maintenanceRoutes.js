/**
 * Responsabilidade: Rotas de maintenance; associa endpoints aos middlewares e controladores autorizados.
 */
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

const { temPerfil } = require("../utils/permissoes");

const authMiddleware =
  typeof authModule === "function"
    ? authModule
    : authModule.authMiddleware || authModule.default;

// Avisos de manutenção valem para a plataforma inteira: só o dono gerencia.
const { exigirDonoPlataforma } = authModule;

function exigirEquipe(req, res, next) {
  if (!req.user?.plataforma && !temPerfil(req.user?.perfil, ["tecnico", "admin"])) {
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
  exigirDonoPlataforma,
  criarAvisoManutencao
);

router.put(
  "/:id",
  authMiddleware,
  exigirDonoPlataforma,
  atualizarAvisoManutencao
);

router.delete(
  "/:id",
  authMiddleware,
  exigirDonoPlataforma,
  excluirAvisoManutencao
);

module.exports = router;