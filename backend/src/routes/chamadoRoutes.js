const express = require("express");
const router = express.Router();

const {
  criarChamado,
  listarChamados,
  listarChamadosDoUsuario,
  buscarChamadoPorId,
  atualizarChamado,
  encerrarChamado,
  reabrirChamado,
  adicionarComentario,
  listarComentarios,
  adicionarAnexos,
  baixarAnexo,
  listarAnexos,
  listarMovimentacoes,
  avaliarChamado,
  excluirChamado,
  exportarRelatorio,
  obterResumoRelatorio,
  assumirChamado,
  listarRespostasRapidas,
  criarRespostaRapida,
  listarFiltrosSalvos,
  salvarFiltro,
  excluirFiltro,
} = require("../controllers/chamadoController");

const authMiddleware = require("../middlewares/authMiddleware");
const { exigirPerfis, exigirPermissao } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/uploadMiddleware");
const { uploadLimiter } = require("../middlewares/securityMiddleware");

router.post("/", authMiddleware, criarChamado);
router.get("/", authMiddleware, exigirPerfis(["admin", "desenvolvedor", "tecnico"]), listarChamados);
router.get("/usuario/me", authMiddleware, listarChamadosDoUsuario);
router.get("/relatorios/resumo/metricas", authMiddleware, exigirPermissao("baixar_relatorios"), obterResumoRelatorio);
router.get("/relatorios/:formato", authMiddleware, exigirPermissao("baixar_relatorios"), exportarRelatorio);
router.get("/respostas-rapidas/lista", authMiddleware, exigirPerfis(["admin", "desenvolvedor", "tecnico"]), listarRespostasRapidas);
router.post("/respostas-rapidas", authMiddleware, exigirPerfis(["admin", "desenvolvedor", "tecnico"]), criarRespostaRapida);
router.get("/filtros-salvos/lista", authMiddleware, exigirPerfis(["admin", "desenvolvedor", "tecnico"]), listarFiltrosSalvos);
router.post("/filtros-salvos", authMiddleware, exigirPerfis(["admin", "desenvolvedor", "tecnico"]), salvarFiltro);
router.delete("/filtros-salvos/:id", authMiddleware, exigirPerfis(["admin", "desenvolvedor", "tecnico"]), excluirFiltro);

router.get("/:id", authMiddleware, buscarChamadoPorId);
router.patch("/:id", authMiddleware, exigirPermissao("gerenciar_chamados"), atualizarChamado);
router.patch("/:id/assumir", authMiddleware, exigirPermissao("gerenciar_chamados"), assumirChamado);
router.patch("/:id/encerrar", authMiddleware, exigirPermissao("gerenciar_chamados"), encerrarChamado);
router.patch("/:id/reabrir", authMiddleware, reabrirChamado);

router.get("/:id/comentarios", authMiddleware, listarComentarios);
router.post("/:id/comentarios", authMiddleware, adicionarComentario);

router.get("/:id/anexos", authMiddleware, listarAnexos);
router.post("/:id/anexos", authMiddleware, uploadLimiter, upload.array("arquivos", 5), adicionarAnexos);
router.get("/:id/anexos/:anexoId/download", authMiddleware, baixarAnexo);

router.get("/:id/movimentacoes", authMiddleware, listarMovimentacoes);
router.post("/:id/avaliar", authMiddleware, avaliarChamado);

router.delete("/:id", authMiddleware, exigirPerfis(["desenvolvedor"]), excluirChamado);

module.exports = router;
