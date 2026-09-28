/**
 * Responsabilidade: Rotas de permission; associa endpoints aos middlewares e controladores autorizados.
 */
const express = require("express");
const auth = require("../middlewares/authMiddleware");
const { exigirPerfis } = require("../middlewares/authMiddleware");
const controller = require("../controllers/permissionController");
const router = express.Router();

router.use(auth);
router.get("/me", controller.mine);
router.get("/catalog", exigirPerfis(["admin"]), controller.catalog);
router.get("/users/:id", exigirPerfis(["admin"]), controller.byUser);
router.put("/users/:id", exigirPerfis(["admin"]), controller.update);

module.exports = router;
