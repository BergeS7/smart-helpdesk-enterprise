const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const { exigirPerfis } = require("../middlewares/authMiddleware");
const uploadLogoSistema = require("../middlewares/systemLogoUploadMiddleware");
const { obterConfiguracoes, salvarConfiguracoes, atualizarLogoSistema, atualizarLogoSistema1 } = require("../controllers/settingsController");

// Público para permitir que login, topo e menus usem nome/logo/cor antes do login.
router.get("/", obterConfiguracoes);
router.put("/", authMiddleware, exigirPerfis(["desenvolvedor"]), salvarConfiguracoes);
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

router.patch("/logo", authMiddleware, exigirPerfis(["desenvolvedor"]), uploadLogoComPrefixo("logo1"), atualizarLogoSistema);
router.patch("/logo1", authMiddleware, exigirPerfis(["desenvolvedor"]), uploadLogoComPrefixo("logo1"), atualizarLogoSistema1);

module.exports = router;
