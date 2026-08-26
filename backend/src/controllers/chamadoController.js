const pool = require("../config/database");
const { decidirPrioridadeChamado } = require("../services/prioridadeIAService");
const { carregarConfiguracoesObjeto } = require("./settingsController");
const { enviarEmail } = require("../services/emailService");
const { montarUrlFotoPerfil } = require("../utils/profilePhoto");
const { enviarArquivo, baixarArquivo, removerArquivo, lerReferencia } = require("../utils/supabaseStorage");
const { usuarioPodeAvaliarChamado } = require("../services/ticketEvaluationAccessService");
const { normalizarPerfil, ehAdmin, ehEquipe, ehDesenvolvedor } = require("../utils/permissoes");
const { ACTIVE_STATUSES, TECHNICIAN_CAPACITY, distributeTicket } = require("../services/distributionService");
const { generateExcelReport, generatePdfReport } = require("../services/reportService");
const { buildReportMetrics } = require("../domain/reportMetrics");
const fs = require("fs");
const path = require("path");
const ticketPolicy = require("../policies/ticketPolicy");
const { STATUS, canonicalize: canonicalizeStatus, label: statusLabel, isFinal: statusFinalizado, canTransition } = require("../domain/ticketStatus");

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

function formatarPrazo(minutos) {
  const total = Number(minutos || 0);
  if (total < 60) return `${total}min`;
  if (total % 1440 === 0) return `${total / 1440}d`;
  if (total % 60 === 0) return `${total / 60}h`;
  return `${Math.floor(total / 60)}h${total % 60}min`;
}

async function calcularSLAConfiguravel(prioridade) {
  const config = await carregarConfiguracoesObjeto().catch(() => ({}));
  const normalizada = String(prioridade || "Media").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  const prefixo = normalizada === "critica" ? "critica" : normalizada === "alta" ? "alta" : normalizada === "baixa" ? "baixa" : "media";
  const defaults = {
    critica: { resposta: 15, resolucao: 120 },
    alta: { resposta: 60, resolucao: 480 },
    media: { resposta: 240, resolucao: 1440 },
    baixa: { resposta: 1440, resolucao: 2880 },
  };

  const respostaMinutos = Math.max(1, Number(config[`sla_${prefixo}_resposta`] || defaults[prefixo].resposta));
  const resolucaoMinutos = Math.max(1, Number(config[`sla_${prefixo}_resolucao`] || defaults[prefixo].resolucao));

  return {
    respostaMinutos,
    resolucaoMinutos,
    label: `Responder em até ${formatarPrazo(respostaMinutos)} / resolver em até ${formatarPrazo(resolucaoMinutos)}`,
  };
}


async function registrarAuditoria(req, entidade, entidadeId, acao, descricao, dados = null) {
  await pool.query(
    `INSERT INTO auditoria_sistema
     (usuario_id, autor_nome, autor_perfil, entidade, entidade_id, acao, descricao, dados)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [req.user?.id || null, req.user?.nome || "Sistema", req.user?.perfil || "sistema", entidade, entidadeId || null, acao, descricao, dados]
  ).catch((err) => console.error("Erro auditoria:", err.message));
}

async function criarNotificacao(usuarioId, titulo, mensagem, tipo = "info", link = null) {
  if (!usuarioId) return;
  await pool.query(
    `INSERT INTO notificacoes (usuario_id, titulo, mensagem, tipo, link)
     VALUES ($1, $2, $3, $4, $5)`,
    [usuarioId, titulo, mensagem, tipo, link]
  ).catch((err) => console.error("Erro notificação:", err.message));
}


function minutosRestantes(dataLimite, referencia = new Date()) {
  if (!dataLimite) return null;
  const diff = new Date(dataLimite).getTime() - new Date(referencia).getTime();
  return Math.round(diff / 60000);
}

function calcularIndicadoresSla(row) {
  const pausado = canonicalizeStatus(row.status) === STATUS.WAITING_USER;
  const restante = minutosRestantes(row.sla_limite_resolucao, pausado && row.sla_pausado_em ? row.sla_pausado_em : new Date());
  const resolucao = Number(row.sla_resolucao_minutos || 0);
  let sla_status = pausado ? "pausado" : "normal";
  if (!pausado && row.status && !statusFinalizado(row.status)) {
    if (restante !== null && restante < 0) sla_status = "vencido";
    else if (restante !== null && resolucao > 0 && restante <= Math.max(30, resolucao * 0.2)) sla_status = "alerta";
  }
  return { ...row, vencido: pausado ? false : row.vencido, sla_minutos_restantes: restante, sla_status };
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

async function verificarAlertasSla(req = null) {
  const sistemaReq = req || { user: { id: null, nome: "Sistema", perfil: "sistema" } };
  const result = await pool.query(
    `SELECT id, numero_chamado, titulo, usuario_id, responsavel_id, sla_limite_resolucao, sla_resolucao_minutos, status,
            COALESCE(sla_alerta_enviado, FALSE) AS sla_alerta_enviado,
            COALESCE(sla_escalado, FALSE) AS sla_escalado
     FROM chamados
     WHERE status NOT IN ('RESOLVED','CLOSED','CANCELED','WAITING_USER')
       AND sla_limite_resolucao IS NOT NULL
       AND (
         (COALESCE(sla_alerta_enviado, FALSE) = FALSE AND sla_limite_resolucao <= CURRENT_TIMESTAMP + INTERVAL '30 minutes')
         OR (COALESCE(sla_escalado, FALSE) = FALSE AND sla_limite_resolucao < CURRENT_TIMESTAMP)
       )
     LIMIT 50`
  ).catch(() => ({ rows: [] }));

  for (const chamado of result.rows) {
    if (!chamado.sla_alerta_enviado && new Date(chamado.sla_limite_resolucao) <= new Date(Date.now() + 30 * 60000)) {
      await criarNotificacao(chamado.responsavel_id, "SLA perto de vencer", `${chamado.numero_chamado || `#${chamado.id}`} vence em breve.`, "warning", `/chamados/${chamado.id}`);
      await criarNotificacao(chamado.usuario_id, "Chamado em acompanhamento", `${chamado.numero_chamado || `#${chamado.id}`} está próximo do prazo de resolução.`, "warning", `/chamados/${chamado.id}`);
      await notificarAdmins("SLA perto de vencer", `${chamado.numero_chamado || `#${chamado.id}`} vence em breve.`, "warning", `/chamados/${chamado.id}`);
      await pool.query("UPDATE chamados SET sla_alerta_enviado = TRUE WHERE id = $1", [chamado.id]).catch(() => {});
      await registrarMovimentacao(chamado.id, sistemaReq, "sla_alerta", "Alerta automático de SLA próximo do vencimento.").catch(() => {});
    }
    if (!chamado.sla_escalado && new Date(chamado.sla_limite_resolucao) < new Date()) {
      await notificarAdmins("SLA vencido", `${chamado.numero_chamado || `#${chamado.id}`} está vencido e precisa de atenção.`, "error", `/chamados/${chamado.id}`);
      await pool.query("UPDATE chamados SET sla_escalado = TRUE, vencido = TRUE WHERE id = $1", [chamado.id]).catch(() => {});
      await registrarMovimentacao(chamado.id, sistemaReq, "sla_escalonado", "Chamado escalonado automaticamente por vencimento de SLA.").catch(() => {});
    }
  }
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

async function notificarAdmins(titulo, mensagem, tipo = "info", link = null) {
  const admins = await pool.query(
    `SELECT id FROM usuarios WHERE perfil IN ('admin', 'desenvolvedor', 'super_admin') AND COALESCE(status, 'ativo') = 'ativo'`
  );
  await Promise.all(admins.rows.map((admin) => criarNotificacao(admin.id, titulo, mensagem, tipo, link)));
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
    await criarNotificacao(vinculado.rows[0].id, "Chamado do seu ativo concluído", `${chamado.numero_chamado} foi concluído. Avalie o atendimento.`, "success", `/chamados/${chamado.id}`);
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

async function registrarMovimentacao(chamadoId, req, tipo, descricao) {
  const autorNome = req.user?.nome || "Sistema";
  const autorPerfil = req.user?.perfil || "sistema";
  const usuarioId = req.user?.id || null;
  await pool.query(
    `INSERT INTO chamado_movimentacoes
     (chamado_id, usuario_id, autor_nome, autor_perfil, tipo, descricao)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [chamadoId, usuarioId, autorNome, autorPerfil, tipo, descricao]
  );
  await registrarAuditoria(req, "chamado", chamadoId, tipo, descricao);
}

async function carregarDetalhesChamado(req, chamado) {
  const [comentarios, anexos, movimentacoes, avaliacao] = await Promise.all([
    pool.query(
      `SELECT id, chamado_id, usuario_id, autor_nome, autor_perfil, mensagem, criado_em
       FROM chamado_comentarios WHERE chamado_id = $1 ORDER BY criado_em ASC`,
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
  ]);

  return {
    ...await adicionarFotosParticipantes(req, calcularIndicadoresSla(chamado)),
    vencido: canonicalizeStatus(chamado.status) === STATUS.WAITING_USER
      ? false
      : chamado.status && !statusFinalizado(chamado.status) && chamado.sla_limite_resolucao
        ? new Date(chamado.sla_limite_resolucao) < new Date()
        : Boolean(chamado.vencido),
    comentarios: comentarios.rows,
    anexos: anexos.rows.map((anexo) => ({ ...anexo, url: montarUrlAnexo(req, anexo) })),
    movimentacoes: movimentacoes.rows,
    avaliacao: avaliacao.rows[0] || null,
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

const criarChamado = async (req, res) => {
  try {
    const { titulo, descricao, tipo_chamado, ativo_id } = req.body;
    const usuario = await obterUsuarioAtual(req);
    if (!usuario) return res.status(404).json({ erro: "Usuário não encontrado" });

    const erros = validarCamposCriacao({ titulo, descricao, usuario });
    if (erros.length > 0) {
      return res.status(400).json({ erro: "Preencha todos os campos obrigatórios", detalhes: erros });
    }

    let ativo = null;
    if (ativo_id !== undefined && ativo_id !== null && ativo_id !== "") {
      const ativoResult = await pool.query(
        `SELECT id, hostname, COALESCE(patrimonio,serial_number,device_id) AS patrimonio, municipio, unidade
         FROM ativos WHERE id=$1`,
        [Number(ativo_id)]
      );
      ativo = ativoResult.rows[0] || null;
      if (!ativo) return res.status(404).json({ erro: "Ativo informado não foi encontrado" });
    }

    const analiseIA = decidirPrioridadeChamado({ setor: usuario.departamento, titulo, descricao });
    let responsavelAutomatico = await escolherResponsavelAutomatico({
      departamento: usuario.departamento,
      categoria: analiseIA.categoria,
    });
    const sla = await calcularSLAConfiguravel(analiseIA.prioridade);
    const duplicidade = await detectarDuplicidade({
      setor: usuario.departamento,
      titulo,
      descricao,
      categoria: analiseIA.categoria,
    });
    const numeroInfo = await gerarNumeroChamado();

    const result = await pool.query(
      `INSERT INTO chamados
       (id, numero_chamado, titulo, descricao, tipo_chamado, categoria_ia, prioridade, prioridade_ia,
        prioridade_ia_motivo, status, usuario_id, solicitante, email_solicitante, setor,
        telefone_solicitante, cargo_solicitante, municipio_solicitante, unidade_solicitante,
        responsavel_id, responsavel, ia_responsavel_sugerido, ia_resposta_inicial,
        ia_duplicado_de, ia_duplicidade_motivo, sla, sla_resposta_minutos, sla_resolucao_minutos,
        sla_limite_resposta, sla_limite_resolucao,
        ativo_id, ativo_hostname, ativo_patrimonio, ativo_municipio, ativo_unidade)
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $7, $8, 'OPEN',
        $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25,
        CURRENT_TIMESTAMP + ($24::integer * INTERVAL '1 minute'),
        CURRENT_TIMESTAMP + ($25::integer * INTERVAL '1 minute'),
        $26, $27, $28, $29, $30
      )
      RETURNING *`,
      [
        numeroInfo.idReservado,
        numeroInfo.numero,
        normalizarTexto(titulo),
        normalizarTexto(descricao),
        tipo_chamado || analiseIA.tipo_sugerido || "Incidente",
        analiseIA.categoria,
        analiseIA.prioridade,
        analiseIA.motivo,
        usuario.id,
        usuario.nome,
        normalizarEmail(usuario.email),
        usuario.departamento,
        usuario.telefone || null,
        usuario.cargo || null,
        usuario.municipio || null,
        usuario.unidade || null,
        responsavelAutomatico?.id || null,
        responsavelAutomatico?.nome || null,
        analiseIA.responsavel_sugerido,
        analiseIA.resposta_inicial,
        duplicidade?.chamadoId || null,
        duplicidade?.motivo || null,
        sla.label,
        sla.respostaMinutos,
        sla.resolucaoMinutos,
        ativo?.id || null,
        ativo?.hostname || null,
        ativo?.patrimonio || null,
        ativo?.municipio || null,
        ativo?.unidade || null,
      ]
    );

    let chamado = result.rows[0];
    const analisePersistida = await pool.query(
      `UPDATE chamados SET prioridade_ia_confianca=$1, prioridade_ia_analise=$2::jsonb WHERE id=$3 RETURNING *`,
      [analiseIA.confianca || 0, JSON.stringify(analiseIA.analise_explicavel || {}), chamado.id]
    );
    chamado = analisePersistida.rows[0];
    // Backwards-compatible routing: a department-named team wins over the legacy technician picker.
    const teamResult = await pool.query(
      `SELECT id, distribution_mode FROM teams
       WHERE active = TRUE AND (LOWER(name) = LOWER($1) OR LOWER(name) = 'geral')
       ORDER BY CASE WHEN LOWER(name) = LOWER($1) THEN 0 ELSE 1 END, id LIMIT 1`,
      [usuario.departamento || ""]
    );
    const team = teamResult.rows[0];
    if (team) {
      responsavelAutomatico = await distributeTicket({ teamId: team.id, distributionMode: team.distribution_mode });
      const routed = await pool.query(
        `UPDATE chamados SET team_id=$1, responsavel_id=$2, responsavel=$3, atualizado_em=CURRENT_TIMESTAMP
         WHERE id=$4 RETURNING *`,
        [team.id, responsavelAutomatico?.id || null, responsavelAutomatico?.nome || null, chamado.id]
      );
      chamado = routed.rows[0];
      await registrarMovimentacao(chamado.id, { user: { id: null, nome: "Roteamento", perfil: "sistema" } }, "equipe_atribuida", `Chamado enviado para a equipe ${team.id}.`);
    }
    await registrarMovimentacao(chamado.id, req, "criacao", `Chamado ${chamado.numero_chamado} criado por ${usuario.nome}.`);
    await registrarMovimentacao(chamado.id, { user: { id: null, nome: "IA Smart HelpDesk", perfil: "sistema" } }, "ia_prioridade", `Prioridade IA: ${analiseIA.prioridade}. Categoria: ${analiseIA.categoria}. Responsável sugerido: ${analiseIA.responsavel_sugerido}. Motivo: ${analiseIA.motivo}`);
    if (duplicidade) {
      await registrarMovimentacao(chamado.id, { user: { id: null, nome: "IA Smart HelpDesk", perfil: "sistema" } }, "ia_duplicidade", duplicidade.motivo);
    }
    if (responsavelAutomatico) {
      await registrarMovimentacao(chamado.id, { user: { id: null, nome: "IA Smart HelpDesk", perfil: "sistema" } }, "atribuicao_automatica", `Responsável atribuído automaticamente para ${responsavelAutomatico.nome}.`);
      await criarNotificacao(responsavelAutomatico.id, "Novo chamado atribuído", `${chamado.numero_chamado} foi atribuído automaticamente a você.`, "info", `/chamados/${chamado.id}`);
    }
    await criarNotificacao(usuario.id, "Chamado criado", `${chamado.numero_chamado} foi aberto com prioridade ${chamado.prioridade}.`, "success", `/chamados/${chamado.id}`);
    await notificarAdmins("Novo chamado", `${chamado.numero_chamado} - ${chamado.titulo}`, "info", `/chamados/${chamado.id}`);
    enviarEmail({ para: usuario.email, assunto: `Chamado criado ${chamado.numero_chamado}`, texto: `Seu chamado foi criado. Prioridade: ${chamado.prioridade}` }).catch(() => {});

    return res.status(201).json({ ...(await carregarDetalhesChamado(req, chamado)), ia: analiseIA });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ erro: "Erro ao criar chamado", detalhe: error.message });
  }
};

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

const listarChamados = async (req, res) => {
  try {
    if (!usuarioEhEquipe(req)) return res.status(403).json({ erro: "Acesso não autorizado" });
    const rows = await consultarChamados(req);
    return res.json(rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ erro: "Erro ao listar chamados", detalhe: error.message });
  }
};

const listarChamadosDoUsuario = async (req, res) => {
  try {
    await verificarAlertasSla(req);
    const email = normalizarEmail(req.user?.email);
    const result = await pool.query(
      `SELECT c.*,
              CASE WHEN c.status NOT IN ('RESOLVED','CLOSED','CANCELED','WAITING_USER') AND c.sla_limite_resolucao < CURRENT_TIMESTAMP THEN TRUE ELSE FALSE END AS vencido,
              COUNT(DISTINCT co.id)::int AS total_comentarios,
              (SELECT cc.autor_perfil FROM chamado_comentarios cc WHERE cc.chamado_id=c.id ORDER BY cc.criado_em DESC LIMIT 1) AS ultimo_comentario_perfil,
              (SELECT cc.criado_em FROM chamado_comentarios cc WHERE cc.chamado_id=c.id ORDER BY cc.criado_em DESC LIMIT 1) AS ultimo_comentario_em,
              COUNT(DISTINCT an.id)::int AS total_anexos,
              av.overall_rating AS avaliacao_nota,
              COALESCE(sol.id, sol_email.id, c.usuario_id) AS solicitante_id,
              COALESCE(sol.nome, sol_email.nome, c.solicitante) AS solicitante_nome,
              COALESCE(sol.email, sol_email.email, c.email_solicitante) AS solicitante_email,
              COALESCE(sol.foto_perfil, sol_email.foto_perfil) AS solicitante_foto_perfil,
              c.responsavel_id,
              COALESCE(u.nome, c.responsavel) AS responsavel_nome,
              u.email AS responsavel_email,
              u.foto_perfil AS responsavel_foto_perfil
       FROM chamados c
       LEFT JOIN chamado_comentarios co ON co.chamado_id = c.id
       LEFT JOIN chamado_anexos an ON an.chamado_id = c.id
       LEFT JOIN performance_ratings av ON av.ticket_id = c.id
       LEFT JOIN usuarios sol ON sol.id = c.usuario_id
       LEFT JOIN usuarios sol_email ON LOWER(sol_email.email) = LOWER(c.email_solicitante)
       LEFT JOIN usuarios u ON u.id = c.responsavel_id
       WHERE c.usuario_id = $1 OR LOWER(c.email_solicitante) = $2
          OR EXISTS (
            SELECT 1 FROM ativos a
             WHERE a.id = c.ativo_id
               AND (
                 a.usuario_id = $1
                 OR LOWER(COALESCE(a.usuario, '')) = $2
                 OR LOWER(COALESCE(a.usuario, '')) = LOWER($3)
                 OR LOWER(REGEXP_REPLACE(COALESCE(a.usuario, ''), '^.*[\\\\/]', '')) = SPLIT_PART($2, '@', 1)
               )
          )
       GROUP BY c.id, av.overall_rating, sol.id, sol.nome, sol.email, sol.foto_perfil, sol_email.id, sol_email.nome, sol_email.email, sol_email.foto_perfil, u.id, u.nome, u.email, u.foto_perfil
       ORDER BY c.id DESC`,
      [req.user.id, email, req.user.nome || ""]
    );
    return res.json(await Promise.all(result.rows.map((row) => adicionarFotosParticipantes(req, row))));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ erro: "Erro ao listar chamados do usuário", detalhe: error.message });
  }
};

const buscarChamadoPorId = async (req, res) => {
  try {
    const acesso = await buscarChamadoAutorizado(req, req.params.id);
    if (acesso.erro) return res.status(acesso.status).json({ erro: acesso.erro });
    return res.json(await carregarDetalhesChamado(req, acesso.chamado));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ erro: "Erro ao buscar chamado", detalhe: error.message });
  }
};

const atualizarChamado = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, prioridade, responsavel_id, team_id, sla, tipo_chamado, prioridade_manual_motivo } = req.body;
    const alteraResponsavel = Object.prototype.hasOwnProperty.call(req.body, "responsavel_id");
    const alteraEquipe = Object.prototype.hasOwnProperty.call(req.body, "team_id");
    const acesso = await buscarChamadoAutorizado(req, id);
    if (acesso.erro) return res.status(acesso.status).json({ erro: acesso.erro });
    if (!usuarioEhEquipe(req)) return res.status(403).json({ erro: "Somente equipe de suporte pode atualizar chamado" });

    if (normalizarPerfil(req.user?.perfil) === "tecnico") {
      if (acesso.chamado.responsavel_id !== req.user.id) {
        return res.status(403).json({ erro: "Assuma o chamado antes de alterá-lo" });
      }
      if (alteraResponsavel && responsavel_id && Number(responsavel_id) !== Number(req.user.id)) {
        return res.status(403).json({ erro: "Somente administradores podem delegar chamados" });
      }
    }

    const anterior = acesso.chamado;
    if (prioridade && prioridade !== anterior.prioridade && !normalizarTexto(prioridade_manual_motivo || "")) {
      return res.status(400).json({ erro: "Informe o motivo da alteração de prioridade" });
    }
    const statusCanonico = status == null ? null : canonicalizeStatus(status);
    if (status != null && !statusCanonico) return res.status(400).json({ erro: "Status de chamado inválido" });
    if (statusCanonico && !canTransition(anterior.status, statusCanonico)) {
      return res.status(409).json({ erro: `Transição de ${anterior.status} para ${statusCanonico} não permitida` });
    }
    let responsavelNome = alteraResponsavel ? null : anterior.responsavel;
    const responsavelIdFinal = alteraResponsavel ? (responsavel_id ? Number(responsavel_id) : null) : anterior.responsavel_id;
    const teamIdFinal = alteraEquipe ? (team_id ? Number(team_id) : null) : anterior.team_id;
    // Assumir ou delegar inicia o fluxo na coluna "Em aberto".
    const statusEfetivo = alteraResponsavel && responsavelIdFinal ? STATUS.OPEN : statusCanonico;
    if (responsavelIdFinal) {
      const user = await pool.query("SELECT nome, email FROM usuarios WHERE id = $1 AND COALESCE(status,'ativo')='ativo' AND perfil IN ('tecnico','admin','desenvolvedor','super_admin')", [responsavelIdFinal]);
      if (user.rows.length === 0) return res.status(400).json({ erro: "Responsável não encontrado ou não é atendente" });
      responsavelNome = user.rows[0].nome;
      if (alteraResponsavel && Number(responsavelIdFinal) !== Number(anterior.responsavel_id || 0)) {
        const capacity = await pool.query("SELECT COUNT(*)::int AS total FROM chamados WHERE responsavel_id=$1 AND id<>$2 AND status=ANY($3::text[])",[responsavelIdFinal,id,ACTIVE_STATUSES]);
        if (Number(capacity.rows[0].total) >= TECHNICIAN_CAPACITY) {
          const suggestion = await pool.query(`SELECT u.id,u.nome,COUNT(c.id) FILTER (WHERE c.status=ANY($1::text[]))::int AS carga FROM usuarios u LEFT JOIN chamados c ON c.responsavel_id=u.id WHERE COALESCE(u.status,'ativo')='ativo' AND COALESCE(u.disponivel_atendimento,TRUE)=TRUE AND u.perfil IN ('tecnico','admin','desenvolvedor','super_admin') AND u.id<>$2 GROUP BY u.id,u.nome HAVING COUNT(c.id) FILTER (WHERE c.status=ANY($1::text[])) < $3 ORDER BY carga,u.nome LIMIT 1`,[ACTIVE_STATUSES,responsavelIdFinal,TECHNICIAN_CAPACITY]);
          const recommended=suggestion.rows[0];
          return res.status(409).json({erro:`${responsavelNome} atingiu a capacidade de ${TECHNICIAN_CAPACITY} chamados ativos.${recommended?` Sugestão: atribua para ${recommended.nome} (${recommended.carga}/${TECHNICIAN_CAPACITY}).`:" Nenhum técnico disponível no momento."}`,codigo:"TECHNICIAN_CAPACITY_REACHED",capacidade:TECHNICIAN_CAPACITY,recomendado:recommended||null});
        }
      }
      if (teamIdFinal) {
        const member = await pool.query("SELECT 1 FROM team_users WHERE team_id=$1 AND user_id=$2", [teamIdFinal, responsavelIdFinal]);
        if (!member.rowCount) return res.status(400).json({ erro: "O responsável deve ser membro da equipe selecionada" });
      }
    }
    if (teamIdFinal) {
      const team = await pool.query("SELECT 1 FROM teams WHERE id=$1 AND active=TRUE", [teamIdFinal]);
      if (!team.rowCount) return res.status(400).json({ erro: "Equipe inexistente ou inativa" });
    }

    const result = await pool.query(
      `UPDATE chamados SET
          status = COALESCE($1, status),
          prioridade = COALESCE($2, prioridade),
          prioridade_manual_motivo = CASE WHEN $2 IS NOT NULL AND $2 <> prioridade THEN $8 ELSE prioridade_manual_motivo END,
          prioridade_alterada_por = CASE WHEN $2 IS NOT NULL AND $2 <> prioridade THEN $9 ELSE prioridade_alterada_por END,
          prioridade_alterada_em = CASE WHEN $2 IS NOT NULL AND $2 <> prioridade THEN CURRENT_TIMESTAMP ELSE prioridade_alterada_em END,
          responsavel = CASE WHEN $11 THEN $3 ELSE responsavel END,
          responsavel_id = CASE WHEN $11 THEN $4 ELSE responsavel_id END,
          team_id = CASE WHEN $12 THEN $10 ELSE team_id END,
          sla = COALESCE($5, sla),
          tipo_chamado = COALESCE($6, tipo_chamado),
          sla_limite_resposta = CASE
            WHEN status = 'WAITING_USER' AND $1 IS NOT NULL AND $1 <> 'WAITING_USER' AND sla_pausado_em IS NOT NULL AND primeira_resposta_em IS NULL
              THEN sla_limite_resposta + (CURRENT_TIMESTAMP - sla_pausado_em)
            ELSE sla_limite_resposta END,
          sla_limite_resolucao = CASE
            WHEN status = 'WAITING_USER' AND $1 IS NOT NULL AND $1 <> 'WAITING_USER' AND sla_pausado_em IS NOT NULL
              THEN sla_limite_resolucao + (CURRENT_TIMESTAMP - sla_pausado_em)
            ELSE sla_limite_resolucao END,
          sla_tempo_pausado_segundos = COALESCE(sla_tempo_pausado_segundos, 0) + CASE
            WHEN status = 'WAITING_USER' AND $1 IS NOT NULL AND $1 <> 'WAITING_USER' AND sla_pausado_em IS NOT NULL
              THEN GREATEST(0, EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - sla_pausado_em))::BIGINT)
            ELSE 0 END,
          sla_pausado_em = CASE
            WHEN $1 = 'WAITING_USER' THEN COALESCE(sla_pausado_em, CURRENT_TIMESTAMP)
            WHEN status = 'WAITING_USER' AND $1 IS NOT NULL AND $1 <> 'WAITING_USER' THEN NULL
            ELSE sla_pausado_em END,
          vencido = CASE WHEN $1 = 'WAITING_USER' OR (status = 'WAITING_USER' AND $1 IS NOT NULL AND $1 <> 'WAITING_USER') THEN FALSE ELSE vencido END,
          sla_alerta_enviado = CASE WHEN $1 = 'WAITING_USER' OR (status = 'WAITING_USER' AND $1 IS NOT NULL AND $1 <> 'WAITING_USER') THEN FALSE ELSE sla_alerta_enviado END,
          sla_escalado = CASE WHEN $1 = 'WAITING_USER' OR (status = 'WAITING_USER' AND $1 IS NOT NULL AND $1 <> 'WAITING_USER') THEN FALSE ELSE sla_escalado END,
          finalizado_em = CASE WHEN $1 IN ('RESOLVED','CLOSED','CANCELED') THEN CURRENT_TIMESTAMP WHEN $1 IN ('OPEN','REOPENED') THEN NULL ELSE finalizado_em END,
          atualizado_em = CURRENT_TIMESTAMP
       WHERE id = $7 RETURNING *`,
      [statusEfetivo, prioridade || null, responsavelNome, responsavelIdFinal, sla || null, tipo_chamado || null, id, prioridade_manual_motivo || null, req.user.id, teamIdFinal, alteraResponsavel, alteraEquipe]
    );
    const atualizado = result.rows[0];

    if (statusEfetivo && statusEfetivo !== canonicalizeStatus(anterior.status)) {
      await registrarMovimentacao(id, req, "alteracao_status", `Status alterado de ${canonicalizeStatus(anterior.status)} para ${statusEfetivo}.`);
      await criarNotificacao(atualizado.usuario_id, "Status do chamado alterado", `${atualizado.numero_chamado} agora está como ${statusLabel(statusEfetivo)}.`, "info", `/chamados/${id}`);
      enviarEmail({ para: atualizado.email_solicitante, assunto: `Status alterado ${atualizado.numero_chamado}`, texto: `Seu chamado agora está como ${statusLabel(statusEfetivo)}.` }).catch(() => {});
      if (statusFinalizado(statusEfetivo)) await notificarUsuarioVinculadoAoAtivo(atualizado);
    }
    if (prioridade && prioridade !== anterior.prioridade) {
      await registrarMovimentacao(id, req, "alteracao_prioridade", `Prioridade final alterada de ${anterior.prioridade} para ${prioridade}. Motivo: ${prioridade_manual_motivo || "não informado"}`);
    }
    if (prioridade && prioridade !== anterior.prioridade) {
      await pool.query(`INSERT INTO prioridade_ia_feedback(chamado_id,prioridade_sugerida,prioridade_final,motivo,corrigido_por) VALUES($1,$2,$3,$4,$5)`, [id, anterior.prioridade_ia || anterior.prioridade, prioridade, prioridade_manual_motivo || null, req.user.id]).catch(() => {});
    }
    if (alteraResponsavel && Number(responsavelIdFinal || 0) !== Number(anterior.responsavel_id || 0)) {
      await registrarMovimentacao(id, req, "responsavel", responsavelIdFinal ? `Responsável definido como ${responsavelNome}.` : "Chamado devolvido à fila sem responsável.");
      if (responsavelIdFinal) await criarNotificacao(responsavelIdFinal, "Chamado atribuído", `${atualizado.numero_chamado} foi atribuído a você.`, "info", `/chamados/${id}`);
    }

    return res.json(await carregarDetalhesChamado(req, atualizado));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ erro: "Erro ao atualizar chamado", detalhe: error.message });
  }
};

const encerrarChamado = async (req, res) => {
  try {
    const { id } = req.params;
    const acesso = await buscarChamadoAutorizado(req, id);
    if (acesso.erro) return res.status(acesso.status).json({ erro: acesso.erro });
    if (!usuarioEhEquipe(req)) return res.status(403).json({ erro: "Somente equipe pode encerrar chamado" });
    if (bloquearMutacaoNaoAutorizada(req, res, acesso.chamado)) return;
    const result = await pool.query(
      `UPDATE chamados SET status = 'CLOSED', finalizado_em = CURRENT_TIMESTAMP, atualizado_em = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id]
    );
    await registrarMovimentacao(id, req, "conclusao", "Chamado finalizado.");
    await criarNotificacao(result.rows[0].usuario_id, "Chamado concluído", `${result.rows[0].numero_chamado} foi concluído. Avalie o atendimento.`, "success", `/chamados/${id}`);
    await notificarUsuarioVinculadoAoAtivo(result.rows[0]);
    enviarEmail({ para: result.rows[0].email_solicitante, assunto: `Chamado concluído ${result.rows[0].numero_chamado}`, texto: "Seu chamado foi concluído. Acesse o portal para avaliar." }).catch(() => {});
    return res.json(await carregarDetalhesChamado(req, result.rows[0]));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ erro: "Erro ao encerrar chamado", detalhe: error.message });
  }
};

const reabrirChamado = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;
    const acesso = await buscarChamadoAutorizado(req, id);
    if (acesso.erro) return res.status(acesso.status).json({ erro: acesso.erro });
    if (bloquearMutacaoNaoAutorizada(req, res, acesso.chamado)) return;
    if (!statusFinalizado(acesso.chamado.status)) return res.status(400).json({ erro: "Somente chamados concluídos ou cancelados podem ser reabertos" });
    if (!normalizarTexto(motivo || "")) return res.status(400).json({ erro: "O motivo da reabertura é obrigatório" });
    const result = await pool.query(
      `UPDATE chamados SET status = 'REOPENED', finalizado_em = NULL, reaberto_em = CURRENT_TIMESTAMP, atualizado_em = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id]
    );
    await registrarMovimentacao(id, req, "reabertura", motivo ? `Chamado reaberto. Motivo: ${normalizarTexto(motivo)}` : "Chamado reaberto pelo usuário.");
    await notificarAdmins("Chamado reaberto", `${result.rows[0].numero_chamado} foi reaberto.`, "warning", `/chamados/${id}`);
    enviarEmail({ para: result.rows[0].email_solicitante, assunto: `Chamado reaberto ${result.rows[0].numero_chamado}`, texto: `Seu chamado foi reaberto e voltou para atendimento. Motivo: ${normalizarTexto(motivo)}` }).catch(() => {});
    return res.json(await carregarDetalhesChamado(req, result.rows[0]));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ erro: "Erro ao reabrir chamado", detalhe: error.message });
  }
};

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
           sla_limite_resposta = CASE WHEN primeira_resposta_em IS NULL AND sla_pausado_em IS NOT NULL THEN sla_limite_resposta + (CURRENT_TIMESTAMP - sla_pausado_em) ELSE sla_limite_resposta END,
           sla_limite_resolucao = CASE WHEN sla_pausado_em IS NOT NULL THEN sla_limite_resolucao + (CURRENT_TIMESTAMP - sla_pausado_em) ELSE sla_limite_resolucao END,
           sla_tempo_pausado_segundos = COALESCE(sla_tempo_pausado_segundos, 0) + CASE WHEN sla_pausado_em IS NOT NULL THEN GREATEST(0, EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - sla_pausado_em))::BIGINT) ELSE 0 END,
           sla_pausado_em = NULL, vencido = FALSE, sla_alerta_enviado = FALSE, sla_escalado = FALSE,
           atualizado_em = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [id]
      );
      await registrarMovimentacao(id, req, "sla_retomado", "SLA retomado automaticamente após resposta do usuário. Status alterado para Em andamento.");
    } else if (usuarioEhEquipe(req) && !acesso.chamado.primeira_resposta_em) {
      await pool.query("UPDATE chamados SET primeira_resposta_em = CURRENT_TIMESTAMP, atualizado_em = CURRENT_TIMESTAMP WHERE id = $1", [id]);
    } else {
      await pool.query("UPDATE chamados SET atualizado_em = CURRENT_TIMESTAMP WHERE id = $1", [id]);
    }

    await registrarMovimentacao(id, req, "comentario", `${usuarioEhEquipe(req) ? "Atendente" : "Usuário"} ${req.user.nome} adicionou um comentário.`);
    if (usuarioEhEquipe(req)) {
      await criarNotificacao(acesso.chamado.usuario_id, "Nova resposta no chamado", `${acesso.chamado.numero_chamado || `#${id}`} recebeu uma resposta.`, "info", `/chamados/${id}`);
    } else {
      await notificarAdmins("Novo comentário", `${acesso.chamado.numero_chamado || `#${id}`} recebeu comentário do usuário.`, "info", `/chamados/${id}`);
    }
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
    const result = await pool.query("SELECT * FROM chamado_comentarios WHERE chamado_id = $1 ORDER BY criado_em ASC", [req.params.id]);
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
    let conteudo = null;
    let arquivo = "";
    if (lerReferencia(anexo.caminho) || lerReferencia(anexo.nome_arquivo)) {
      conteudo = await baixarArquivo(anexo.caminho || anexo.nome_arquivo);
    } else {
      const base = path.resolve(__dirname, "../../uploads/chamados");
      arquivo = path.resolve(base, path.basename(anexo.nome_arquivo));
      if (!arquivo.startsWith(`${base}${path.sep}`) || !fs.existsSync(arquivo)) return res.status(404).json({ erro: "Arquivo não encontrado" });
    }
    await registrarAuditoria(req, "anexo", anexo.id, "download", `Download do anexo do chamado ${req.params.id}`);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Content-Type", anexo.mime_type || "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(anexo.nome_original)}`);
    return conteudo ? res.send(conteudo) : res.sendFile(arquivo);
  } catch (error) { return next(error); }
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

const avaliarChamado = async (req, res) => {
  try {
    const { id } = req.params;
    const { nota, comentario } = req.body;
    const acesso = await buscarChamadoAutorizado(req, id);
    if (acesso.erro) return res.status(acesso.status).json({ erro: acesso.erro });
    if (bloquearMutacaoNaoAutorizada(req, res, acesso.chamado)) return;
    if (usuarioEhEquipe(req) || !(await usuarioPodeAvaliarChamado(acesso.chamado, req.user))) return res.status(403).json({ erro: "Somente o solicitante ou o usuário vinculado ao ativo pode avaliar este atendimento." });
    if (!statusFinalizado(acesso.chamado.status)) return res.status(400).json({ erro: "Só é possível avaliar chamados concluídos" });
    const notaFinal = Number(nota);
    if (!Number.isInteger(notaFinal) || notaFinal < 1 || notaFinal > 5) return res.status(400).json({ erro: "Nota deve ser entre 1 e 5" });
    const result = await pool.query(
      `INSERT INTO performance_ratings
       (ticket_id,technician_id,team_id,client_id,overall_rating,courtesy_rating,communication_rating,resolution_rating,speed_rating,nps_score,comment,source)
       VALUES ($1::integer,$2::integer,$3::integer,$4::integer,$5::smallint,$5::smallint,$5::smallint,$5::smallint,$5::smallint,
         CASE $5::smallint WHEN 1 THEN 0 WHEN 2 THEN 3 WHEN 3 THEN 5 WHEN 4 THEN 8 ELSE 10 END,$6::text,'simple')
       ON CONFLICT (ticket_id) DO UPDATE SET
         overall_rating=EXCLUDED.overall_rating,courtesy_rating=EXCLUDED.courtesy_rating,
         communication_rating=EXCLUDED.communication_rating,resolution_rating=EXCLUDED.resolution_rating,
         speed_rating=EXCLUDED.speed_rating,nps_score=EXCLUDED.nps_score,comment=EXCLUDED.comment,
         client_id=EXCLUDED.client_id,source='simple',updated_at=CURRENT_TIMESTAMP
       WHERE performance_ratings.source IN ('simple','legacy_migration')
       RETURNING id,ticket_id AS chamado_id,client_id AS usuario_id,overall_rating AS nota,comment AS comentario,created_at AS criado_em,updated_at AS atualizado_em`,
      [id, acesso.chamado.responsavel_id || null, acesso.chamado.team_id || null, req.user.id, notaFinal, comentario ? normalizarTexto(comentario) : null]
    );
    if (!result.rows[0]) return res.status(409).json({ erro: "Este chamado já possui uma avaliação detalhada." });
    await registrarMovimentacao(id, req, "avaliacao", `Atendimento avaliado com ${notaFinal} estrela(s).`);
    return res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ erro: "Erro ao avaliar chamado", detalhe: error.message });
  }
};

const excluirChamado = async (req, res) => {
  try {
    if (!usuarioEhAdmin(req)) return res.status(403).json({ erro: "Somente admin pode excluir chamado" });
    const result = await pool.query("DELETE FROM chamados WHERE id = $1 RETURNING id", [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ erro: "Chamado não encontrado" });
    await registrarAuditoria(req, "chamado", req.params.id, "exclusao", "Chamado excluído");
    return res.json({ mensagem: "Chamado excluído com sucesso" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ erro: "Erro ao excluir chamado", detalhe: error.message });
  }
};


const assumirChamado = async (req, res) => {
  try {
    const { id } = req.params;
    const acesso = await buscarChamadoAutorizado(req, id);
    if (acesso.erro) return res.status(acesso.status).json({ erro: acesso.erro });
    if (!usuarioEhEquipe(req)) return res.status(403).json({ erro: "Somente equipe de suporte pode assumir chamado" });
    if (acesso.chamado.team_id) {
      const member = await pool.query("SELECT 1 FROM team_users WHERE team_id=$1 AND user_id=$2", [acesso.chamado.team_id, req.user.id]);
      if (!member.rowCount && !usuarioEhAdmin(req)) return res.status(403).json({ erro: "Somente membros da equipe responsável podem assumir este chamado" });
    }
    const capacity = await pool.query("SELECT COUNT(*)::int AS total FROM chamados WHERE responsavel_id=$1 AND status=ANY($2::text[])",[req.user.id,ACTIVE_STATUSES]);
    if (Number(capacity.rows[0].total) >= TECHNICIAN_CAPACITY) {
      return res.status(409).json({erro:`Sua capacidade de ${TECHNICIAN_CAPACITY} chamados ativos foi atingida. Conclua ou redistribua um chamado antes de assumir outro.`,codigo:"TECHNICIAN_CAPACITY_REACHED",capacidade:TECHNICIAN_CAPACITY});
    }

    const result = await pool.query(
      `UPDATE chamados
       SET responsavel_id = $1,
           responsavel = $2,
           status = 'OPEN',
           finalizado_em = NULL,
           atualizado_em = CURRENT_TIMESTAMP
       WHERE id = $3 AND responsavel_id IS NULL
       RETURNING *`,
      [req.user.id, req.user.nome, id]
    );

    if (result.rows.length === 0) {
      const atual = await pool.query(
        `SELECT COALESCE(u.nome, c.responsavel, 'outro atendente') AS responsavel_nome
         FROM chamados c LEFT JOIN usuarios u ON u.id = c.responsavel_id WHERE c.id = $1`,
        [id]
      );
      return res.status(409).json({ erro: `Este chamado já foi assumido por ${atual.rows[0]?.responsavel_nome || "outro atendente"}` });
    }

    await registrarMovimentacao(id, req, "assumir_chamado", `${req.user.nome} assumiu o chamado.`);
    await criarNotificacao(result.rows[0].usuario_id, "Chamado assumido", `${result.rows[0].numero_chamado || `#${id}`} será atendido por ${req.user.nome}.`, "info", `/chamados/${id}`);
    return res.json(await carregarDetalhesChamado(req, result.rows[0]));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ erro: "Erro ao assumir chamado", detalhe: error.message });
  }
};

const listarRespostasRapidas = async (req, res) => {
  try {
    if (!usuarioEhEquipe(req)) return res.status(403).json({ erro: "Acesso não autorizado" });
    const result = await pool.query(
      `SELECT id, titulo, mensagem, categoria, ativo
       FROM respostas_rapidas
       WHERE ativo = TRUE
       ORDER BY categoria NULLS LAST, titulo ASC`
    );
    return res.json(result.rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ erro: "Erro ao listar respostas rápidas", detalhe: error.message });
  }
};

const criarRespostaRapida = async (req, res) => {
  try {
    if (!usuarioEhEquipe(req)) return res.status(403).json({ erro: "Acesso não autorizado" });
    const { titulo, mensagem, categoria } = req.body;
    if (!titulo || !mensagem) return res.status(400).json({ erro: "Título e mensagem são obrigatórios" });
    const result = await pool.query(
      `INSERT INTO respostas_rapidas (titulo, mensagem, categoria, criado_por)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [normalizarTexto(titulo), normalizarTexto(mensagem), categoria || null, req.user.id]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ erro: "Erro ao criar resposta rápida", detalhe: error.message });
  }
};

const listarFiltrosSalvos = async (req, res) => {
  try {
    if (!usuarioEhEquipe(req)) return res.status(403).json({ erro: "Acesso não autorizado" });
    const result = await pool.query(
      `SELECT id, nome, filtros, criado_em
       FROM filtros_salvos
       WHERE usuario_id = $1
       ORDER BY criado_em DESC`,
      [req.user.id]
    ).catch(() => ({ rows: [] }));
    return res.json(result.rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ erro: "Erro ao listar filtros salvos", detalhe: error.message });
  }
};

const salvarFiltro = async (req, res) => {
  try {
    if (!usuarioEhEquipe(req)) return res.status(403).json({ erro: "Acesso não autorizado" });
    const { nome, filtros } = req.body;
    if (!nome) return res.status(400).json({ erro: "Nome do filtro é obrigatório" });
    const result = await pool.query(
      `INSERT INTO filtros_salvos (usuario_id, nome, filtros)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [req.user.id, normalizarTexto(nome), filtros || {}]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ erro: "Erro ao salvar filtro", detalhe: error.message });
  }
};

const excluirFiltro = async (req, res) => {
  try {
    if (!usuarioEhEquipe(req)) return res.status(403).json({ erro: "Acesso não autorizado" });
    await pool.query("DELETE FROM filtros_salvos WHERE id = $1 AND usuario_id = $2", [req.params.id, req.user.id]);
    return res.json({ mensagem: "Filtro removido" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ erro: "Erro ao excluir filtro", detalhe: error.message });
  }
};

const exportarRelatorio = async (req, res) => {
  try {
    if (!usuarioEhEquipe(req)) return res.status(403).json({ erro: "Acesso não autorizado" });
    const formato = String(req.params.formato || "csv").toLowerCase();
    const chamados = await consultarChamados(req);
    const nomeBase = `chamados-${new Date().toISOString().slice(0, 10)}`;
    const ids = chamados.map((chamado) => Number(chamado.id)).filter(Number.isFinite);
    const performanceResult = ids.length ? await pool.query(
      `SELECT pr.*, c.numero_chamado,
              COALESCE(u.nome, c.responsavel, 'Não identificado') AS technician_name,
              COALESCE(t.name, 'Sem equipe') AS team_name
       FROM performance_ratings pr
       JOIN chamados c ON c.id = pr.ticket_id
       LEFT JOIN usuarios u ON u.id = pr.technician_id
       LEFT JOIN teams t ON t.id = pr.team_id
       WHERE pr.ticket_id = ANY($1::int[])
       ORDER BY pr.created_at DESC`,
      [ids]
    ).catch(() => ({ rows: [] })) : { rows: [] };
    const ratings = performanceResult.rows;
    const linhas = chamados.map((c) => ({
      Número: c.numero_chamado || c.id,
      Título: c.titulo,
      Status: c.status,
      Prioridade: c.prioridade,
      "Prioridade IA": c.prioridade_ia,
      Categoria: c.categoria_ia,
      Tipo: c.tipo_chamado,
      Departamento: c.setor,
      Município: c.municipio_solicitante || "Não informado",
      Unidade: c.unidade_solicitante || "Não informada",
      Equipe: c.team_name || "Sem equipe",
      Solicitante: c.solicitante,
      "E-mail": c.email_solicitante,
      Responsável: c.responsavel,
      Vencido: c.vencido ? "Sim" : "Não",
      Criado: c.criado_em,
      Atualizado: c.atualizado_em,
    }));

    await registrarAuditoria(req, "relatorio", null, "exportacao", `Exportou relatório em ${formato}`, { filtros: req.query });

    if (formato === "csv") {
      const headers = Object.keys(linhas[0] || { Número: "" });
      const csv = [headers.join(";"), ...linhas.map((r) => headers.map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(";"))].join("\n");
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${nomeBase}.csv"`);
      return res.send("\ufeff" + csv);
    }

    if (formato === "excel" || formato === "xlsx") {
      const buffer = await generateExcelReport({ chamados, ratings, filters: req.query, generatedBy: req.user.nome || req.user.email || "Usuário" });
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${nomeBase}.xlsx"`);
      res.setHeader("Content-Length", buffer.length);
      return res.send(Buffer.from(buffer));
    }

    if (formato === "pdf") {
      const buffer = await generatePdfReport({ chamados, ratings, filters: req.query, generatedBy: req.user.nome || req.user.email || "Usuário" });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${nomeBase}.pdf"`);
      res.setHeader("Content-Length", buffer.length);
      return res.send(buffer);
    }

    return res.status(400).json({ erro: "Formato inválido. Use csv, excel ou pdf." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ erro: "Erro ao exportar relatório", detalhe: error.message });
  }
};

const obterResumoRelatorio = async (req, res) => {
  try {
    if (!usuarioEhEquipe(req)) return res.status(403).json({ erro: "Acesso não autorizado" });
    const chamados = await consultarChamados(req);
    return res.json(buildReportMetrics(chamados));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ erro: "Erro ao calcular relatório", detalhe: error.message });
  }
};

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
