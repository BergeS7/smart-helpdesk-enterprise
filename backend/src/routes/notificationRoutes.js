/**
 * Responsabilidade: Rotas de notification; associa endpoints aos middlewares e controladores autorizados.
 */
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const { listarNotificacoes, marcarLida } = require("../controllers/notificationController");

router.get("/", authMiddleware, listarNotificacoes);
router.patch("/ler", authMiddleware, marcarLida);
router.patch("/:id/ler", authMiddleware, marcarLida);

module.exports = router;
