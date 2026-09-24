/**
 * Responsabilidade: utilitários compartilhados dos chamados: perfis, acesso, detalhes, anexos, distribuição e consultas.
 */
const pool = require("../../config/database");
const { montarUrlFotoPerfil } = require("../../utils/profilePhoto");
const { enviarArquivo, baixarArquivo, removerArquivo, lerReferencia } = require("../../utils/supabaseStorage");
const { usuarioPodeAvaliarChamado } = require("../../services/ticketEvaluationAccessService");
const { normalizarPerfil, ehAdmin, ehEquipe, ehDesenvolvedor } = require("../../utils/permissoes");
const fs = require("fs");
const path = require("path");
const ticketPolicy = require("../../policies/ticketPolicy");
const { STATUS, canonicalize: canonicalizeStatus, label: statusLabel, isFinal: statusFinalizado, canTransition, REOPEN_WINDOW_DAYS, reopenDeadline, isReopenWindowOpen } = require("../../domain/ticketStatus");
const { criarNotificacao, notificarStatus, notificarAvaliacao, notificarInteracao } = require("../../services/ticketNotificationService");
const { calcularIndicadoresSla, sincronizarSlaChamadosAtivosUmaVez } = require("./sla");

function normalizarEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizarTexto(valor) {
  return String(valor || "").trim();
}

function perfilAdmin(perfil) {
  return ehAdmin(perfil);
}

function perfilEquipe(perfil) {
  return ehEquipe(perfil);
}

function usuarioEhAdmin(req) {
  return perfilAdmin(req.user?.perfil);
}

function usuarioEhEquipe(req) {
  return perfilEquipe(req.user?.perfil);
}

function montarUrlAnexo(req, anexo) {
  return `/api/chamados/${anexo.chamado_id}/anexos/${anexo.id}/download`;
}

async function lerConteudoAnexo(anexo) {
  if (lerReferencia(anexo.caminho) || lerReferencia(anexo.nome_arquivo)) {
    return baixarArquivo(anexo.caminho || anexo.nome_arquivo);
  }
  const base = path.resolve(__dirname, "../../uploads/chamados");
  const arquivo = path.resolve(base, path.basename(anexo.nome_arquivo));
  if (!arquivo.startsWith(`${base}${path.sep}`) || !fs.existsSync(arquivo)) {
    const error = new Error("Arquivo não encontrado");
    error.status = 404;
    throw error;
  }
  return fs.readFileSync(arquivo);
}

function assinaturaPermitida(arquivo) {
  const buffer = arquivo.buffer || (arquivo.path ? fs.readFileSync(arquivo.path) : Buffer.alloc(0));
  const hex = buffer.subarray(0, 12).toString("hex");
  if (arquivo.mimetype === "image/png") return hex.startsWith("89504e470d0a1a0a");
  if (["image/jpeg", "image/jpg"].includes(arquivo.mimetype)) return hex.startsWith("ffd8ff");
  if (arquivo.mimetype === "image/webp") return buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WEBP";
  if (arquivo.mimetype === "application/pdf") return buffer.subarray(0, 5).toString() === "%PDF-";
  if (arquivo.mimetype.includes("officedocument")) return hex.startsWith("504b0304");
  if (["application/msword", "application/vnd.ms-excel"].includes(arquivo.mimetype)) return hex.startsWith("d0cf11e0a1b11ae1");
  if (arquivo.mimetype === "text/plain") return !buffer.subarray(0, 2048).includes(0);
  return false;
}

function podeModificarChamado(req, chamado) {
  return ticketPolicy.canMutate(req.user, chamado);
}

function bloquearMutacaoNaoAutorizada(req, res, chamado) {
  if (podeModificarChamado(req, chamado)) return false;
  res.status(403).json({ erro: statusFinalizado(chamado.status) ? "Registro histórico disponível somente para leitura." : "Você não pode modificar este chamado." });
  return true;
}

async function escolherResponsavelAutomatico({ departamento, categoria }) {
  const params = [];
  const filtros = ["COALESCE(u.status, 'ativo') = 'ativo'", "COALESCE(u.perfil, 'usuario') IN ('tecnico','admin','desenvolvedor','super_admin')"];
  if (departamento) {
    params.push(departamento);
    filtros.push(`(LOWER(COALESCE(u.departamento,'')) = LOWER($${params.length}) OR $${params.length} = '')`);
  }

  const result = await pool.query(
    `SELECT u.id, u.nome, u.email, u.departamento,
            COUNT(c.id) FILTER (WHERE c.status NOT IN ('RESOLVED','CLOSED','CANCELED'))::int AS chamados_ativos
     FROM usuarios u
     LEFT JOIN chamados c ON c.responsavel_id = u.id
     WHERE ${filtros.join(" AND ")}
     GROUP BY u.id, u.nome, u.email, u.departamento
     ORDER BY 
       CASE WHEN LOWER(COALESCE(u.departamento,'')) = LOWER($1) THEN 0 ELSE 1 END,
       chamados_ativos ASC,
       u.id ASC
     LIMIT 1`,
    [departamento || ""]
  ).catch(() => ({ rows: [] }));

  return result.rows[0] || null;
}

async function adicionarFotosParticipantes(req, chamado) {
  if (!chamado) return chamado;

  const solicitanteNome = chamado.solicitante_nome || chamado.solicitante || "";
  const solicitanteEmail = chamado.solicitante_email || chamado.email_solicitante || "";
  const solicitanteId = chamado.solicitante_id || chamado.usuario_id || null;

  const responsavelId = chamado.responsavel_id || null;
  const responsavelSnapshot = chamado.responsavel_nome || chamado.responsavel || "";
  const responsavelNome = responsavelId || statusFinalizado(chamado.status) ? responsavelSnapshot : "";
  const responsavelEmail = chamado.responsavel_email || "";

  return {
    ...chamado,
    solicitante_nome: solicitanteNome,
    solicitante_email: solicitanteEmail,
    solicitante_id: solicitanteId,
    solicitante_foto_url: solicitanteId
      ? await montarUrlFotoPerfil(req, solicitanteId, chamado.solicitante_foto_perfil)
      : "",
    responsavel_nome: responsavelNome,
    responsavel_snapshot: chamado.responsavel || "",
    responsavel_email: responsavelEmail,
    responsavel_foto_url: responsavelId
      ? await montarUrlFotoPerfil(req, responsavelId, chamado.responsavel_foto_perfil)
      : "",
  };
}

async function notificarUsuarioVinculadoAoAtivo(chamado) {
  if (!chamado?.ativo_id) return;
  const vinculado = await pool.query(
    `SELECT u.id
       FROM ativos a
       JOIN usuarios u ON (
         u.id = a.usuario_id
         OR LOWER(COALESCE(a.usuario, '')) = LOWER(u.email)
         OR LOWER(COALESCE(a.usuario, '')) = LOWER(u.nome)
         OR LOWER(REGEXP_REPLACE(COALESCE(a.usuario, ''), '^.*[\\\\/]', '')) = LOWER(SPLIT_PART(u.email, '@', 1))
       )
      WHERE a.id = $1 AND u.id <> COALESCE($2, 0)
        AND COALESCE(u.status, 'ativo') = 'ativo'
      LIMIT 1`,
    [chamado.ativo_id, chamado.usuario_id]
  );
  if (vinculado.rows[0]) {
    await criarNotificacao(vinculado.rows[0].id, "Chamado do seu ativo concluído", `${chamado.numero_chamado} foi concluído. Avalie o atendimento.`, "success", `/chamados/${chamado.id}?action=avaliar`);
  }
}

async function obterUsuarioAtual(req) {
  const result = await pool.query(
    `SELECT id, nome, email, COALESCE(perfil, 'usuario') AS perfil, COALESCE(status, 'ativo') AS status,
            telefone, departamento, municipio, unidade, cargo
     FROM usuarios
     WHERE id = $1`,
    [req.user.id]
  );
  return result.rows[0] || null;
}

async function podeAcessarChamado(req, chamado) {
  if (usuarioEhAdmin(req)) return true;
  if (chamado.team_id) {
    const manager = await pool.query("SELECT 1 FROM teams WHERE id = $1 AND manager_id = $2", [chamado.team_id, req.user?.id]);
    if (manager.rowCount) return true;
  }
  if (normalizarPerfil(req.user?.perfil) === "tecnico") {
    if (statusFinalizado(chamado.status)) return true;
    // Technicians may inspect the shared intake queue, but assigned tickets
    // remain private to their owner.
    return chamado.responsavel_id === req.user?.id || !chamado.responsavel_id;
  }
  const emailUsuario = normalizarEmail(req.user?.email);
  const emailChamado = normalizarEmail(chamado.email_solicitante);
  return chamado.usuario_id === req.user?.id
    || emailChamado === emailUsuario
    || usuarioPodeAvaliarChamado(chamado, req.user);
}

async function buscarChamadoAutorizado(req, id) {
  const result = await pool.query(
    `SELECT c.*,
            COALESCE(sol.id, sol_email.id, c.usuario_id) AS solicitante_id,
            COALESCE(sol.nome, sol_email.nome, c.solicitante) AS solicitante_nome,
            COALESCE(sol.email, sol_email.email, c.email_solicitante) AS solicitante_email,
            c.responsavel_id,
            COALESCE(resp.nome, c.responsavel) AS responsavel_nome,
            resp.email AS responsavel_email,
            COALESCE(sol.foto_perfil, sol_email.foto_perfil) AS solicitante_foto_perfil,
            resp.foto_perfil AS responsavel_foto_perfil
     FROM chamados c
     LEFT JOIN usuarios sol ON sol.id = c.usuario_id
     LEFT JOIN usuarios sol_email ON LOWER(sol_email.email) = LOWER(c.email_solicitante)
     LEFT JOIN usuarios resp ON resp.id = c.responsavel_id
     WHERE c.id = $1`,
    [id]
  );
  if (result.rows.length === 0) return { status: 404, erro: "Chamado não encontrado" };
  const chamado = result.rows[0];
  const autorizado = await podeAcessarChamado(req, chamado);
  if (!autorizado) return { status: 403, erro: "Você não tem permissão para acessar este chamado" };
  return { chamado };
}

// Monta a visão agregada consumida pela tela de detalhes e pelo PDF histórico.
async function carregarDetalhesChamado(req, chamado) {
  const [comentarios, anexos, movimentacoes, avaliacao, demandaDesenvolvimento] = await Promise.all([
    pool.query(
      `SELECT cc.id, cc.chamado_id, cc.usuario_id, cc.autor_nome, cc.autor_perfil,
              cc.mensagem, cc.criado_em, u.foto_perfil
       FROM chamado_comentarios cc
       LEFT JOIN usuarios u ON u.id = cc.usuario_id
       WHERE cc.chamado_id = $1
       ORDER BY cc.criado_em ASC`,
      [chamado.id]
    ),
    pool.query(
      `SELECT id, chamado_id, usuario_id, nome_original, nome_arquivo, mime_type, tamanho, caminho, criado_em
       FROM chamado_anexos WHERE chamado_id = $1 ORDER BY criado_em DESC`,
      [chamado.id]
    ),
    pool.query(
      `SELECT id, chamado_id, usuario_id, autor_nome, autor_perfil, tipo, descricao, criado_em
       FROM chamado_movimentacoes WHERE chamado_id = $1 ORDER BY criado_em ASC`,
      [chamado.id]
    ),
    pool.query(
      `SELECT id, ticket_id AS chamado_id, client_id AS usuario_id, overall_rating AS nota,
              comment AS comentario, created_at AS criado_em, updated_at AS atualizado_em
       FROM performance_ratings WHERE ticket_id = $1 AND client_id = $2 LIMIT 1`,
      [chamado.id, req.user.id]
    ),
    pool.query(
      `SELECT id, code, nature, status, current_process, problem, expected_result, frequency,
              executions_per_month, people_involved, current_time_minutes, systems,
              no_delivery_impact, expected_benefits, created_at, updated_at
       FROM development_requests WHERE ticket_id = $1 LIMIT 1`,
      [chamado.id]
    ).catch(() => ({ rows: [] })),
  ]);

  return {
    ...await adicionarFotosParticipantes(req, calcularIndicadoresSla(chamado)),
    comentarios: await Promise.all(comentarios.rows.map(async ({ foto_perfil, ...comentario }) => ({
      ...comentario,
      foto_url: comentario.usuario_id
        ? await montarUrlFotoPerfil(req, comentario.usuario_id, foto_perfil)
        : "",
    }))),
    anexos: anexos.rows.map((anexo) => ({ ...anexo, url: montarUrlAnexo(req, anexo) })),
    movimentacoes: movimentacoes.rows,
    avaliacao: avaliacao.rows[0] || null,
    demanda_desenvolvimento: demandaDesenvolvimento.rows[0] || null,
    pode_avaliar: !usuarioEhEquipe(req) && await usuarioPodeAvaliarChamado(chamado, req.user),
  };
}

function validarCamposCriacao({ titulo, descricao, usuario }) {
  const erros = [];
  if (!titulo || !normalizarTexto(titulo)) erros.push("Título é obrigatório");
  if (!descricao || !normalizarTexto(descricao)) erros.push("Descrição é obrigatória");
  if (!usuario?.nome) erros.push("Nome do usuário não encontrado");
  if (!usuario?.email) erros.push("E-mail do usuário não encontrado");
  if (!usuario?.departamento) erros.push("Atualize seu perfil com o departamento antes de abrir chamado");
  return erros;
}

async function gerarNumeroChamado() {
  const ano = new Date().getFullYear();
  const result = await pool.query("SELECT nextval(pg_get_serial_sequence('chamados','id')) AS proximo");
  const id = Number(result.rows[0].proximo);
  return { idReservado: id, numero: `#HD-${ano}-${String(id).padStart(4, "0")}` };
}

async function detectarDuplicidade({ setor, titulo, descricao, categoria }) {
  const palavras = normalizarTexto(`${titulo} ${descricao}`)
    .toLowerCase()
    .split(/\s+/)
    .filter((p) => p.length > 4)
    .slice(0, 8);

  const result = await pool.query(
    `SELECT id, numero_chamado, titulo, setor, categoria_ia, criado_em
     FROM chamados
     WHERE criado_em >= CURRENT_TIMESTAMP - INTERVAL '72 hours'
       AND status NOT IN ('RESOLVED', 'CLOSED', 'CANCELED')
       AND (LOWER(COALESCE(setor, '')) = LOWER($1) OR LOWER(COALESCE(categoria_ia, '')) = LOWER($2))
     ORDER BY criado_em DESC
     LIMIT 30`,
    [setor || "", categoria || ""]
  );

  for (const chamado of result.rows) {
    const base = normalizarTexto(`${chamado.titulo} ${chamado.setor} ${chamado.categoria_ia}`).toLowerCase();
    const matches = palavras.filter((p) => base.includes(p));
    if (matches.length >= 2 || (categoria && chamado.categoria_ia === categoria && chamado.setor === setor)) {
      return {
        chamadoId: chamado.id,
        motivo: `Possível duplicidade com ${chamado.numero_chamado || `#${chamado.id}`} (${chamado.titulo}). Termos semelhantes: ${matches.slice(0, 4).join(", ") || categoria}.`,
      };
    }
  }
  return null;
}

// Converte filtros da API em SQL parametrizado e limitado ao escopo do perfil.
function montarFiltrosChamados(query, req) {
  const params = [];
  const where = [];
  const consultaHistorico = query.historico === "true" || query.historico === true;
  const add = (sql, value) => {
    params.push(value);
    where.push(sql.replace(/\?/g, `$${params.length}`));
  };

  if (normalizarPerfil(req.user?.perfil) === "tecnico" && !consultaHistorico) {
    if (query.fila === "true" || query.fila === true) {
      where.push("c.responsavel_id IS NULL");
    } else {
      add("c.responsavel_id = ?", req.user.id);
    }
  }
  if (normalizarPerfil(req.user?.perfil) !== "tecnico" && (query.fila === "true" || query.fila === true)) {
    where.push("c.responsavel_id IS NULL");
  }
  if (query.fila === "true" || query.fila === true) {
    where.push(`LOWER(COALESCE(c.tipo_chamado, '')) NOT IN ('bug','melhoria','automação','automacao','integração','integracao','dashboard / relatório','dashboard / relatorio','novo sistema')`);
  }
  // Closed tickets are retained for audits and reports, but can leave the operational queue after a configured window.
  if (query.closed !== "true") {
    where.push(`(
      c.status NOT IN ('RESOLVED','CLOSED','CANCELED')
      OR COALESCE((SELECT valor FROM configuracoes_sistema WHERE chave = 'closedTicketsHideAfter'), 'never') = 'never'
      OR c.finalizado_em >= CURRENT_TIMESTAMP - CASE COALESCE((SELECT valor FROM configuracoes_sistema WHERE chave = 'closedTicketsHideAfter'), 'never')
        WHEN '24h' THEN INTERVAL '24 hours' WHEN '48h' THEN INTERVAL '48 hours'
        WHEN '7d' THEN INTERVAL '7 days' WHEN '30d' THEN INTERVAL '30 days' ELSE INTERVAL '100 years' END
    )`);
  }
  if (consultaHistorico) {
    where.push("c.status IN ('RESOLVED','CLOSED','CANCELED')");
  }
  if (query.status) add("c.status = ?", query.status);
  if (query.prioridade) add("c.prioridade = ?", query.prioridade);
  if (query.departamento) add("LOWER(COALESCE(c.setor, '')) LIKE LOWER(?)", `%${query.departamento}%`);
  if (query.municipio) add("LOWER(COALESCE(c.municipio_solicitante, '')) = LOWER(?)", query.municipio);
  if (query.unidade) add("LOWER(COALESCE(c.unidade_solicitante, '')) = LOWER(?)", query.unidade);
  if (query.regiao) add("LOWER(COALESCE(c.municipio_solicitante, c.ativo_municipio, '')) = LOWER(?)", query.regiao);
  if (query.ativo_id) add("c.ativo_id = ?", query.ativo_id);
  if (query.team_id) add("c.team_id = ?", query.team_id);
  if (query.usuario) {
    const qUsuario = `%${query.usuario}%`;
    params.push(qUsuario, qUsuario);
    where.push(`(LOWER(COALESCE(c.solicitante, '')) LIKE LOWER($${params.length - 1}) OR LOWER(COALESCE(c.email_solicitante, '')) LIKE LOWER($${params.length}))`);
  }
  if (query.responsavel) add("LOWER(COALESCE(c.responsavel, '')) LIKE LOWER(?)", `%${query.responsavel}%`);
  if (query.responsavel_id) add("c.responsavel_id = ?", query.responsavel_id);
  if (query.sem_responsavel === "true" || query.sem_responsavel === true) where.push("c.responsavel_id IS NULL");
  if (query.meus === "true" || query.meus === true) add("c.responsavel_id = ?", req.user.id);
  if (query.solicitante_me === "true" || query.solicitante_me === true) {
    params.push(req.user.id, req.user.email || "");
    where.push(`(c.usuario_id = $${params.length - 1} OR LOWER(COALESCE(c.email_solicitante, '')) = LOWER($${params.length}))`);
  }
  if (query.tipo_chamado) add("c.tipo_chamado = ?", query.tipo_chamado);
  if (query.categoria) add("c.categoria_ia = ?", query.categoria);
  if (query.data_inicio) add("c.criado_em >= ?", query.data_inicio);
  if (query.data_fim) {
    params.push(query.data_fim);
    where.push(`c.criado_em < ($${params.length}::date + INTERVAL '1 day')`);
  }
  if (query.vencidos === "true") where.push("c.status NOT IN ('RESOLVED','CLOSED','CANCELED','WAITING_USER') AND c.sla_limite_resolucao < CURRENT_TIMESTAMP");
  if (query.q) {
    const q = `%${query.q}%`;
    params.push(q, q, q, q, q, q, q, q);
    where.push(`(LOWER(COALESCE(c.numero_chamado, '')) LIKE LOWER($${params.length - 7}) OR LOWER(COALESCE(c.titulo, '')) LIKE LOWER($${params.length - 6}) OR LOWER(COALESCE(c.descricao, '')) LIKE LOWER($${params.length - 5}) OR LOWER(COALESCE(c.solicitante, '')) LIKE LOWER($${params.length - 4}) OR LOWER(COALESCE(c.setor, '')) LIKE LOWER($${params.length - 3}) OR LOWER(COALESCE(c.municipio_solicitante, '')) LIKE LOWER($${params.length - 2}) OR LOWER(COALESCE(c.ativo_hostname, '')) LIKE LOWER($${params.length - 1}) OR LOWER(COALESCE(c.ativo_patrimonio, '')) LIKE LOWER($${params.length}))`);
  }

  return { params, whereSql: where.length ? `WHERE ${where.join(" AND ")}` : "" };
}

async function consultarChamados(req) {
  await sincronizarSlaChamadosAtivosUmaVez();
  const { params, whereSql } = montarFiltrosChamados(req.query || {}, req);
  const result = await pool.query(
    `SELECT c.*,
            CASE WHEN c.status NOT IN ('RESOLVED','CLOSED','CANCELED','WAITING_USER') AND c.sla_limite_resolucao < CURRENT_TIMESTAMP THEN TRUE ELSE FALSE END AS vencido,
            COUNT(DISTINCT co.id)::int AS total_comentarios,
            (SELECT cc.autor_perfil FROM chamado_comentarios cc WHERE cc.chamado_id=c.id ORDER BY cc.criado_em DESC LIMIT 1) AS ultimo_comentario_perfil,
            (SELECT cc.criado_em FROM chamado_comentarios cc WHERE cc.chamado_id=c.id ORDER BY cc.criado_em DESC LIMIT 1) AS ultimo_comentario_em,
            COUNT(DISTINCT an.id)::int AS total_anexos,
            av.overall_rating AS avaliacao_nota,
            av.comment AS avaliacao_comentario,
            COALESCE(sol.id, sol_email.id, c.usuario_id) AS solicitante_id,
            COALESCE(sol.nome, sol_email.nome, c.solicitante) AS solicitante_nome,
            COALESCE(sol.email, sol_email.email, c.email_solicitante) AS solicitante_email,
            COALESCE(sol.foto_perfil, sol_email.foto_perfil) AS solicitante_foto_perfil,
            c.responsavel_id,
            COALESCE(u.nome, c.responsavel) AS responsavel_nome,
            u.email AS responsavel_email,
            u.foto_perfil AS responsavel_foto_perfil,
            COALESCE(t.name, 'Sem equipe') AS team_name
     FROM chamados c
     LEFT JOIN chamado_comentarios co ON co.chamado_id = c.id
     LEFT JOIN chamado_anexos an ON an.chamado_id = c.id
     LEFT JOIN performance_ratings av ON av.ticket_id = c.id
     LEFT JOIN usuarios sol ON sol.id = c.usuario_id
     LEFT JOIN usuarios sol_email ON LOWER(sol_email.email) = LOWER(c.email_solicitante)
     LEFT JOIN usuarios u ON u.id = c.responsavel_id
     LEFT JOIN teams t ON t.id = c.team_id
     ${whereSql}
     GROUP BY c.id, av.overall_rating, av.comment, sol.id, sol.nome, sol.email, sol.foto_perfil, sol_email.id, sol_email.nome, sol_email.email, sol_email.foto_perfil, u.id, u.nome, u.email, u.foto_perfil, t.id, t.name
     ORDER BY c.id DESC`,
    params
  );
  return Promise.all(result.rows.map((row) => adicionarFotosParticipantes(req, calcularIndicadoresSla(row))));
}

module.exports = {
  normalizarEmail,
  normalizarTexto,
  perfilAdmin,
  perfilEquipe,
  usuarioEhAdmin,
  usuarioEhEquipe,
  montarUrlAnexo,
  lerConteudoAnexo,
  assinaturaPermitida,
  podeModificarChamado,
  bloquearMutacaoNaoAutorizada,
  escolherResponsavelAutomatico,
  adicionarFotosParticipantes,
  notificarUsuarioVinculadoAoAtivo,
  obterUsuarioAtual,
  podeAcessarChamado,
  buscarChamadoAutorizado,
  carregarDetalhesChamado,
  validarCamposCriacao,
  gerarNumeroChamado,
  detectarDuplicidade,
  montarFiltrosChamados,
  consultarChamados,
};
