/**
 * Responsabilidade: ciclo de vida completo dos chamados (rotas em chamadoRoutes).
 * O código fica dividido por área em ./chamados/*; este arquivo só reúne os handlers exportados.
 */
const { criarChamado, listarChamados, listarChamadosDoUsuario, buscarChamadoPorId, atualizarChamado, encerrarChamado, reabrirChamado, avaliarChamado, excluirChamado, assumirChamado } = require("./chamados/ciclo");
const { adicionarComentario, listarComentarios, adicionarAnexos, baixarAnexo, baixarHistoricoPdf, listarAnexos, listarMovimentacoes } = require("./chamados/interacoes");
const { listarRespostasRapidas, criarRespostaRapida, listarFiltrosSalvos, salvarFiltro, excluirFiltro } = require("./chamados/atendimento");
const { exportarRelatorio, obterResumoRelatorio } = require("./chamados/relatorios");

module.exports = {
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
};
