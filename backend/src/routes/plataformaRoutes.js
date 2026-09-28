/**
 * Responsabilidade: Rotas da administração da plataforma SaaS (só o dono, em modo sistema).
 */
const router = require("express").Router();
const auth = require("../middlewares/authMiddleware");
const { exigirDonoPlataforma } = require("../middlewares/authMiddleware");
const empresas = require("../controllers/empresaController");

router.use(auth, exigirDonoPlataforma);
router.get("/empresas", empresas.listarEmpresas);
router.post("/empresas", empresas.criarEmpresa);
router.patch("/empresas/:id", empresas.atualizarEmpresa);
router.post("/empresas/:id/convite", empresas.gerarNovoConvite);

module.exports = router;
