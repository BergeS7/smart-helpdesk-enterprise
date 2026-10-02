/**
 * Responsabilidade: Rotas de catalog; associa endpoints aos middlewares e controladores autorizados.
 */
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const { exigirPerfis, exigirPermissao, manterEmpresa, exigirRecurso, recursoOuVazio } = require("../middlewares/authMiddleware");
const { RECURSOS } = require("../domain/planos");
const uploadImagem = require("../middlewares/profilePhotoUploadMiddleware");
const { listarCatalogo, criarCatalogo, atualizarCatalogo, listarBase, obterBase, sugerirBase, listarRecorrencias, sugestaoArtigoDoChamado, criarRascunhoDoChamado, registrarCliqueRecomendacao, responderRecomendacao, enviarImagemBase, criarBase, atualizarBase, registrarVisualizacaoBase, avaliarArtigoBase } = require("../controllers/catalogController");

// Reaproveita o upload da foto de perfil: só PNG, JPG ou WEBP, até 5 MB.
function tratarUploadImagem(req, res, next) {
  uploadImagem.single("imagem")(req, res, (error) => {
    if (!error) return next();
    const erro = error.code === "LIMIT_FILE_SIZE" ? "A imagem deve ter no máximo 5 MB." : error.message || "Erro ao enviar imagem.";
    return res.status(400).json({ erro });
  });
}

// Base de conhecimento é recurso do plano: as listas ficam vazias sem ele, o resto recusa.
const comBase = exigirRecurso(RECURSOS.BASE_CONHECIMENTO);
const listaDaBase = recursoOuVazio(RECURSOS.BASE_CONHECIMENTO);

router.get("/base-conhecimento", authMiddleware, listaDaBase, listarBase);
router.post("/base-conhecimento/imagens", authMiddleware, comBase, exigirPermissao("gerenciar_base"), tratarUploadImagem, manterEmpresa, enviarImagemBase);
router.get("/base-conhecimento/sugestoes", authMiddleware, listaDaBase, sugerirBase);
router.get("/base-conhecimento/recorrentes", authMiddleware, listaDaBase, exigirPermissao("gerenciar_base"), listarRecorrencias);
router.get("/base-conhecimento/chamados/:chamadoId/sugestao", authMiddleware, comBase, exigirPermissao("gerenciar_base"), sugestaoArtigoDoChamado);
router.post("/base-conhecimento/chamados/:chamadoId/rascunho", authMiddleware, comBase, exigirPermissao("gerenciar_base"), criarRascunhoDoChamado);
router.post("/base-conhecimento/recomendacoes/:id/clique", authMiddleware, comBase, registrarCliqueRecomendacao);
router.post("/base-conhecimento/recomendacoes/:id/resposta", authMiddleware, comBase, responderRecomendacao);
router.get("/base-conhecimento/:id", authMiddleware, comBase, obterBase);
router.post("/base-conhecimento", authMiddleware, comBase, exigirPermissao("gerenciar_base"), criarBase);
router.put("/base-conhecimento/:id", authMiddleware, comBase, exigirPermissao("gerenciar_base"), atualizarBase);
router.post("/base-conhecimento/:id/visualizar", authMiddleware, comBase, registrarVisualizacaoBase);
router.post("/base-conhecimento/:id/avaliar", authMiddleware, comBase, avaliarArtigoBase);

router.get("/:tipo", authMiddleware, listarCatalogo);
router.post("/:tipo", authMiddleware, exigirPerfis(["admin"]), criarCatalogo);
router.put("/:tipo/:id", authMiddleware, exigirPerfis(["admin"]), atualizarCatalogo);

module.exports = router;
