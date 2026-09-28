/**
 * Responsabilidade: Rotas de settings; associa endpoints aos middlewares e controladores autorizados.
 */
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const { exigirPerfis, manterEmpresa, autenticacaoOpcional } = require("../middlewares/authMiddleware");
const uploadLogoSistema = require("../middlewares/systemLogoUploadMiddleware");
const { obterConfiguracoes, salvarConfiguracoes, atualizarLogoSistema, atualizarLogoSistema1 } = require("../controllers/settingsController");

// Público para a tela de login usar nome/logo/cor; com sessão, devolve as configurações da empresa do usuário.
router.get("/", autenticacaoOpcional, obterConfiguracoes);
router.put("/", authMiddleware, exigirPerfis(["admin"]), salvarConfiguracoes);
function uploadLogoComPrefixo(prefixo) {
  return (req, res, next) => {
    req.logoPrefix = prefixo;
    uploadLogoSistema.single("logo")(req, res, (error) => {
      if (error) {
        return res.status(400).json({
          erro: "Erro ao enviar logo",
          detalhe: error.message,
        });
      }
      next();
    });
  };
}

router.patch("/logo", authMiddleware, exigirPerfis(["admin"]), uploadLogoComPrefixo("logo1"), manterEmpresa, atualizarLogoSistema);
router.patch("/logo1", authMiddleware, exigirPerfis(["admin"]), uploadLogoComPrefixo("logo1"), manterEmpresa, atualizarLogoSistema1);

module.exports = router;
