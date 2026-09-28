/**
 * Responsabilidade: Rotas públicas das empresas: link de liberação do admin e link de cadastro da equipe.
 */
const router = require("express").Router();
const { registrationLimiter } = require("../middlewares/securityMiddleware");
const empresas = require("../controllers/empresaController");

// Só a ativação conta no limite de cadastro; as consultas de abertura da página ficam no limite geral da API.

router.get("/convites/:token", empresas.consultarConvite);
router.post("/convites/:token/ativar", registrationLimiter, empresas.ativarConvite);
router.get("/publico/:slug", empresas.empresaPublica);

module.exports = router;
