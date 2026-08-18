const express = require("express");
const router = express.Router();
const { obterDashboard } = require("../controllers/dashboardController");
const authMiddleware = require("../middlewares/authMiddleware");
const { exigirPermissao } = require("../middlewares/authMiddleware");

router.get("/", authMiddleware, exigirPermissao("visualizar_dashboard"), obterDashboard);

module.exports = router;
