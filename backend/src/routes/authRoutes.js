const express = require("express");
const router = express.Router();
const { login, loginUsuario, loginAdmin, solicitarRecuperacaoSenha, redefinirSenha } = require("../controllers/authController");
const { authLimiter, recoveryLimiter } = require("../middlewares/securityMiddleware");

router.post("/login", authLimiter, login);
router.post("/login/usuario", authLimiter, loginUsuario);
router.post("/login/admin", authLimiter, loginAdmin);
router.post("/recuperar-senha", recoveryLimiter, solicitarRecuperacaoSenha);
router.post("/redefinir-senha", recoveryLimiter, redefinirSenha);

module.exports = router;
