const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const { exigirPerfis, exigirPermissao } = require("../middlewares/authMiddleware");
const { listarCatalogo, criarCatalogo, atualizarCatalogo, listarBase, criarBase, atualizarBase, registrarVisualizacaoBase, avaliarArtigoBase } = require("../controllers/catalogController");

router.get("/base-conhecimento", authMiddleware, listarBase);
router.post("/base-conhecimento", authMiddleware, exigirPermissao("gerenciar_base"), criarBase);
router.put("/base-conhecimento/:id", authMiddleware, exigirPermissao("gerenciar_base"), atualizarBase);
router.post("/base-conhecimento/:id/visualizar", authMiddleware, registrarVisualizacaoBase);
router.post("/base-conhecimento/:id/avaliar", authMiddleware, avaliarArtigoBase);

router.get("/:tipo", authMiddleware, listarCatalogo);
router.post("/:tipo", authMiddleware, exigirPerfis(["admin", "desenvolvedor"]), criarCatalogo);
router.put("/:tipo/:id", authMiddleware, exigirPerfis(["admin", "desenvolvedor"]), atualizarCatalogo);

module.exports = router;
