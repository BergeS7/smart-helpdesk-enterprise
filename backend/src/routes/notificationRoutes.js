/**
 * Responsabilidade: Rotas de notification; associa endpoints aos middlewares e controladores autorizados.
 */
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const { listarNotificacoes, marcarLida } = require("../controllers/notificationController");
const push = require("../controllers/pushController");
const { rateLimit } = require("express-rate-limit");
const pushLimiter = rateLimit({ windowMs: 60000, limit: 10, standardHeaders: true, legacyHeaders: false });

router.get("/push/config", authMiddleware, push.config);
router.post("/push/subscribe", authMiddleware, pushLimiter, push.subscribe);
router.post("/push/unsubscribe", authMiddleware, push.unsubscribe);
router.post("/push/test", authMiddleware, pushLimiter, push.test);

router.get("/", authMiddleware, listarNotificacoes);
router.patch("/ler", authMiddleware, marcarLida);
router.patch("/:id/ler", authMiddleware, marcarLida);

module.exports = router;
