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
  baixarHistoricoPdf,
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
const { userHasPermission } = require("../services/permissionService");

function exigirPermissaoDeAtualizacao(req, res, next) {
  const body = req.body || {};
  const permission = body.responsavel_id != null || body.equipe_id != null
    ? "delegar_chamados"
    : body.prioridade != null || body.prioridade_final != null
      ? "alterar_prioridade"
      : "gerenciar_chamados";
  userHasPermission(req.user, permission).then((allowed) => allowed ? next() : res.status(403).json({ erro:"Você não possui permissão para esta alteração.", permissao:permission, requestId:req.id })).catch(next);
}

router.post("/", authMiddleware, criarChamado);
router.get("/", authMiddleware, exigirPerfis(["admin", "desenvolvedor", "supervisor", "tecnico"]), listarChamados);
router.get("/usuario/me", authMiddleware, listarChamadosDoUsuario);
router.get("/relatorios/resumo/metricas", authMiddleware, exigirPermissao("visualizar_relatorios"), obterResumoRelatorio);
router.get("/relatorios/:formato", authMiddleware, exigirPermissao("exportar_dados"), exportarRelatorio);
router.get("/respostas-rapidas/lista", authMiddleware, exigirPerfis(["admin", "desenvolvedor", "tecnico"]), listarRespostasRapidas);
router.post("/respostas-rapidas", authMiddleware, exigirPerfis(["admin", "desenvolvedor", "tecnico"]), criarRespostaRapida);
router.get("/filtros-salvos/lista", authMiddleware, exigirPerfis(["admin", "desenvolvedor", "tecnico"]), listarFiltrosSalvos);
router.post("/filtros-salvos", authMiddleware, exigirPerfis(["admin", "desenvolvedor", "tecnico"]), salvarFiltro);
router.delete("/filtros-salvos/:id", authMiddleware, exigirPerfis(["admin", "desenvolvedor", "tecnico"]), excluirFiltro);

router.get("/:id/historico.pdf", authMiddleware, baixarHistoricoPdf);
router.get("/:id", authMiddleware, buscarChamadoPorId);
router.patch("/:id", authMiddleware, exigirPermissaoDeAtualizacao, atualizarChamado);
router.patch("/:id/assumir", authMiddleware, exigirPermissao("assumir_chamados"), assumirChamado);
router.patch("/:id/encerrar", authMiddleware, exigirPermissao("encerrar_chamados"), encerrarChamado);
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
