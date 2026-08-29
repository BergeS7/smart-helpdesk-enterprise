/**
 * Responsabilidade: Rotas de system; associa endpoints aos middlewares e controladores autorizados.
 */
const router = require("express").Router();
const auth = require("../middlewares/authMiddleware");
const { exigirPerfis } = require("../middlewares/authMiddleware");
const controller = require("../controllers/systemController");

router.get("/health", controller.health);
router.get("/diagnostics", auth, exigirPerfis(["desenvolvedor"]), controller.adminDiagnostics);
router.post("/errors/frontend", auth, controller.frontendError);

module.exports = router;
