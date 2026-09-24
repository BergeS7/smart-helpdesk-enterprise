/**
 * Responsabilidade: comentários, anexos, histórico em PDF e movimentações do chamado.
 */
const pool = require("../../config/database");
const { enviarArquivo, baixarArquivo, removerArquivo, lerReferencia } = require("../../utils/supabaseStorage");
const { getJson, setJson, remove: removeCache } = require("../../services/redisCacheService");
const { generateTicketHistoryPdf } = require("../../services/ticketHistoryPdfService");
const { STATUS, canonicalize: canonicalizeStatus, label: statusLabel, isFinal: statusFinalizado, canTransition, REOPEN_WINDOW_DAYS, reopenDeadline, isReopenWindowOpen } = require("../../domain/ticketStatus");
const { criarNotificacao, notificarStatus, notificarAvaliacao, notificarInteracao } = require("../../services/ticketNotificationService");
const { registrarAuditoria, registrarMovimentacao } = require("./registro");
const { assinaturaPermitida, bloquearMutacaoNaoAutorizada, buscarChamadoAutorizado, carregarDetalhesChamado, lerConteudoAnexo, montarUrlAnexo, normalizarTexto, usuarioEhEquipe } = require("./comum");

const adicionarComentario = async (req, res) => {
  try {
    const { id } = req.params;
    const { mensagem } = req.body;
    const acesso = await buscarChamadoAutorizado(req, id);
    if (acesso.erro) return res.status(acesso.status).json({ erro: acesso.erro });
    if (bloquearMutacaoNaoAutorizada(req, res, acesso.chamado)) return;
    if (statusFinalizado(acesso.chamado.status)) return res.status(409).json({ erro: "Registros históricos não aceitam novos comentários. Reabra o chamado primeiro." });
    if (!mensagem || !normalizarTexto(mensagem)) return res.status(400).json({ erro: "Mensagem do comentário é obrigatória" });

    const result = await pool.query(
      `INSERT INTO chamado_comentarios (chamado_id, usuario_id, autor_nome, autor_perfil, mensagem)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [id, req.user.id, req.user.nome, req.user.perfil, normalizarTexto(mensagem)]
    );

    const usuarioRetomouSla = !usuarioEhEquipe(req) && canonicalizeStatus(acesso.chamado.status) === STATUS.WAITING_USER;
    if (usuarioRetomouSla) {
      await pool.query(
        `UPDATE chamados SET
           status = 'IN_PROGRESS',
           sla_limite_resposta = CASE WHEN primeira_resposta_em IS NULL AND sla_pausado_em IS NOT NULL THEN sla_add_business_seconds(sla_limite_resposta, sla_business_seconds(sla_pausado_em, CURRENT_TIMESTAMP::timestamp)) ELSE sla_limite_resposta END,
           sla_limite_resolucao = CASE WHEN sla_pausado_em IS NOT NULL THEN sla_add_business_seconds(sla_limite_resolucao, sla_business_seconds(sla_pausado_em, CURRENT_TIMESTAMP::timestamp)) ELSE sla_limite_resolucao END,
           sla_tempo_pausado_segundos = COALESCE(sla_tempo_pausado_segundos, 0) + CASE WHEN sla_pausado_em IS NOT NULL THEN GREATEST(0, EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - sla_pausado_em))::BIGINT) ELSE 0 END,
           sla_pausado_em = NULL, vencido = FALSE, sla_alerta_enviado = FALSE, sla_escalado = FALSE,
           atualizado_em = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [id]
      );
      await notificarStatus(acesso.chamado, "IN_PROGRESS", acesso.chamado.status);
      await registrarMovimentacao(id, req, "sla_retomado", "SLA retomado automaticamente após resposta do usuário. Status alterado para Em andamento.");
    } else if (usuarioEhEquipe(req) && !acesso.chamado.primeira_resposta_em) {
      await pool.query("UPDATE chamados SET primeira_resposta_em = CURRENT_TIMESTAMP, atualizado_em = CURRENT_TIMESTAMP WHERE id = $1", [id]);
    } else {
      await pool.query("UPDATE chamados SET atualizado_em = CURRENT_TIMESTAMP WHERE id = $1", [id]);
    }

    await registrarMovimentacao(id, req, "comentario", `${usuarioEhEquipe(req) ? "Atendente" : "Usuário"} ${req.user.nome} adicionou um comentário.`);
    await notificarInteracao(acesso.chamado, req.user, "mensagem");

    await removeCache(`cache:ticket:${id}:comments`);
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ erro: "Erro ao adicionar comentário", detalhe: error.message });
  }
};

const listarComentarios = async (req, res) => {
  try {
    const acesso = await buscarChamadoAutorizado(req, req.params.id);
    if (acesso.erro) return res.status(acesso.status).json({ erro: acesso.erro });
    const cacheKey = `cache:ticket:${req.params.id}:comments`;
    const cached = await getJson(cacheKey);
    if (cached) return res.json(cached);
    const result = await pool.query("SELECT * FROM chamado_comentarios WHERE chamado_id = $1 ORDER BY criado_em ASC", [req.params.id]);
    await setJson(cacheKey, result.rows, 60);
    return res.json(result.rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ erro: "Erro ao listar comentários", detalhe: error.message });
  }
};

const adicionarAnexos = async (req, res) => {
  try {
    const { id } = req.params;
    const acesso = await buscarChamadoAutorizado(req, id);
    if (acesso.erro) return res.status(acesso.status).json({ erro: acesso.erro });
    if (bloquearMutacaoNaoAutorizada(req, res, acesso.chamado)) return;
    if (statusFinalizado(acesso.chamado.status)) return res.status(409).json({ erro: "Registros históricos não aceitam novos anexos. Reabra o chamado primeiro." });
    const arquivos = req.files || [];
    if (arquivos.length === 0) return res.status(400).json({ erro: "Nenhum arquivo enviado" });
    const invalidos = arquivos.filter((arquivo) => !assinaturaPermitida(arquivo));
    if (invalidos.length) return res.status(400).json({ erro: "Um ou mais arquivos não correspondem ao tipo permitido." });
    const anexosCriados = [];
    for (const arquivo of arquivos) {
      const caminhoPublico = await enviarArquivo({ bucket: "ticket-attachments", pasta: `chamados/${id}`, arquivo });
      let result;
      try {
        result = await pool.query(
          `INSERT INTO chamado_anexos (chamado_id, usuario_id, nome_original, nome_arquivo, mime_type, tamanho, caminho)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
          [id, req.user.id, arquivo.originalname, caminhoPublico, arquivo.mimetype, arquivo.size, caminhoPublico]
        );
      } catch (error) {
        await removerArquivo(caminhoPublico).catch(() => {});
        throw error;
      }
      anexosCriados.push({ ...result.rows[0], url: montarUrlAnexo(req, result.rows[0]) });
    }
    await registrarMovimentacao(id, req, "anexo", `${req.user.nome} adicionou ${anexosCriados.length} anexo(s).`);
    await notificarInteracao(acesso.chamado, req.user, "anexo", anexosCriados.length);
    return res.status(201).json(anexosCriados);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ erro: "Erro ao anexar arquivo", detalhe: error.message });
  }
};

const listarAnexos = async (req, res) => {
  try {
    const acesso = await buscarChamadoAutorizado(req, req.params.id);
    if (acesso.erro) return res.status(acesso.status).json({ erro: acesso.erro });
    const result = await pool.query("SELECT * FROM chamado_anexos WHERE chamado_id = $1 ORDER BY criado_em DESC", [req.params.id]);
    return res.json(result.rows.map((a) => ({ ...a, url: montarUrlAnexo(req, a) })));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ erro: "Erro ao listar anexos", detalhe: error.message });
  }
};

const baixarAnexo = async (req, res, next) => {
  try {
    const acesso = await buscarChamadoAutorizado(req, req.params.id);
    if (acesso.erro) return res.status(acesso.status).json({ erro: acesso.erro });
    const result = await pool.query("SELECT * FROM chamado_anexos WHERE id=$1 AND chamado_id=$2", [req.params.anexoId, req.params.id]);
    const anexo = result.rows[0];
    if (!anexo) return res.status(404).json({ erro: "Anexo não encontrado" });
    const conteudo = await lerConteudoAnexo(anexo);
    await registrarAuditoria(req, "anexo", anexo.id, "download", `Download do anexo do chamado ${req.params.id}`);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Content-Type", anexo.mime_type || "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(anexo.nome_original)}`);
    return res.send(conteudo);
  } catch (error) { return next(error); }
};

const baixarHistoricoPdf = async (req, res) => {
  try {
    const acesso = await buscarChamadoAutorizado(req, req.params.id);
    if (acesso.erro) return res.status(acesso.status).json({ erro: acesso.erro });
    const chamado = await carregarDetalhesChamado(req, acesso.chamado);
    const buffer = await generateTicketHistoryPdf({
      chamado,
      generatedBy: req.user.nome || req.user.email || "Usuário",
      loadAttachment: lerConteudoAnexo,
    });
    const numero = String(chamado.numero_chamado || `chamado-${chamado.id}`).replace(/[^a-zA-Z0-9_-]+/g, "-");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="historico-${numero}.pdf"`);
    res.setHeader("Content-Length", buffer.length);
    res.setHeader("Cache-Control", "private, no-store");
    return res.send(buffer);
  } catch (error) {
    console.error("Erro ao gerar PDF do chamado:", error);
    return res.status(error.status || 500).json({ erro: "Erro ao gerar PDF do chamado", detalhe: error.message });
  }
};

const listarMovimentacoes = async (req, res) => {
  try {
    const acesso = await buscarChamadoAutorizado(req, req.params.id);
    if (acesso.erro) return res.status(acesso.status).json({ erro: acesso.erro });
    const result = await pool.query("SELECT * FROM chamado_movimentacoes WHERE chamado_id = $1 ORDER BY criado_em ASC", [req.params.id]);
    return res.json(result.rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ erro: "Erro ao listar movimentações", detalhe: error.message });
  }
};

module.exports = {
  adicionarComentario,
  listarComentarios,
  adicionarAnexos,
  listarAnexos,
  baixarAnexo,
  baixarHistoricoPdf,
  listarMovimentacoes,
};
