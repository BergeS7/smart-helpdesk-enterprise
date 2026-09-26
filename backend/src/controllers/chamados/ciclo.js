/**
 * Responsabilidade: ciclo de vida do chamado: abrir, listar, consultar, atualizar, assumir, encerrar, reabrir, avaliar e excluir.
 */
const pool = require("../../config/database");
const { decidirPrioridadeChamado } = require("../../services/prioridadeIAService");
const { enviarEmail } = require("../../services/emailService");
const { enviarEmailAvaliacao } = require("../../services/ticketRatingEmailService");
const { usuarioPodeAvaliarChamado } = require("../../services/ticketEvaluationAccessService");
const { normalizarPerfil, ehAdmin, ehEquipe, ehDesenvolvedor } = require("../../utils/permissoes");
const { ACTIVE_STATUSES, TECHNICIAN_CAPACITY, distributeTicket } = require("../../services/distributionService");
const { STATUS, canonicalize: canonicalizeStatus, label: statusLabel, isFinal: statusFinalizado, canTransition, REOPEN_WINDOW_DAYS, reopenDeadline, isReopenWindowOpen } = require("../../domain/ticketStatus");
const { criarNotificacao, notificarStatus, notificarAvaliacao, notificarInteracao } = require("../../services/ticketNotificationService");
const { registrarAuditoria, registrarMovimentacao } = require("./registro");
const { calcularSLAConfiguravel, sincronizarSlaChamadosAtivosUmaVez, verificarAlertasSla } = require("./sla");
const { adicionarFotosParticipantes, bloquearMutacaoNaoAutorizada, buscarChamadoAutorizado, carregarDetalhesChamado, consultarChamados, detectarDuplicidade, escolherResponsavelAutomatico, gerarNumeroChamado, normalizarEmail, normalizarTexto, notificarUsuarioVinculadoAoAtivo, obterUsuarioAtual, usuarioEhAdmin, usuarioEhEquipe, validarCamposCriacao } = require("./comum");

// Criação transacional: classifica, calcula SLA, detecta duplicidade e distribui.
const criarChamado = async (req, res) => {
  let chamadoCriado = null;
  try {
    const { titulo, descricao, tipo_chamado, ativo_id } = req.body;
    const tipoDesenvolvimento = ["bug", "melhoria", "automação", "automacao", "integração", "integracao", "dashboard / relatório", "dashboard / relatorio", "novo sistema"].includes(normalizarTexto(tipo_chamado).toLowerCase());
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
        sla_add_business_seconds(CURRENT_TIMESTAMP::timestamp, $24::integer * 60.0),
        sla_add_business_seconds(CURRENT_TIMESTAMP::timestamp, $25::integer * 60.0),
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
    chamadoCriado = chamado;
    const analisePersistida = await pool.query(
      `UPDATE chamados SET prioridade_ia_confianca=$1, prioridade_ia_analise=$2::jsonb WHERE id=$3 RETURNING *`,
      [analiseIA.confianca || 0, JSON.stringify(analiseIA.analise_explicavel || {}), chamado.id]
    );
    chamado = analisePersistida.rows[0];
    chamadoCriado = chamado;
    if (tipoDesenvolvimento) {
      const semSlaOperacional = await pool.query(
        `UPDATE chamados SET sla=NULL,
          sla_limite_resposta=NULL, sla_limite_resolucao=NULL, vencido=FALSE,
          sla_alerta_enviado=FALSE, sla_escalado=FALSE,
          atualizado_em=CURRENT_TIMESTAMP WHERE id=$1 RETURNING *`,
        [chamado.id]
      );
      chamado = semSlaOperacional.rows[0];
      chamadoCriado = chamado;
    }
    // Backwards-compatible routing: a department-named team wins over the legacy technician picker.
    const teamResult = await pool.query(
      `SELECT id, distribution_mode FROM teams
       WHERE active = TRUE AND (LOWER(name) = LOWER($1) OR LOWER(name) = 'geral')
       ORDER BY CASE WHEN LOWER(name) = LOWER($1) THEN 0 ELSE 1 END, id LIMIT 1`,
      [usuario.departamento || ""]
    );
    const team = teamResult.rows[0];
    if (team && !tipoDesenvolvimento) {
      responsavelAutomatico = await distributeTicket({ teamId: team.id, distributionMode: team.distribution_mode });
      const routed = await pool.query(
        `UPDATE chamados SET team_id=$1, responsavel_id=$2, responsavel=$3, atualizado_em=CURRENT_TIMESTAMP
         WHERE id=$4 RETURNING *`,
        [team.id, responsavelAutomatico?.id || null, responsavelAutomatico?.nome || null, chamado.id]
      );
      chamado = routed.rows[0];
      chamadoCriado = chamado;
      await registrarMovimentacao(chamado.id, { user: { id: null, nome: "Roteamento", perfil: "sistema" } }, "equipe_atribuida", `Chamado enviado para a equipe ${team.id}.`);
    }
    await registrarMovimentacao(chamado.id, req, "criacao", `Chamado ${chamado.numero_chamado} criado por ${usuario.nome}.`);
    await registrarMovimentacao(chamado.id, { user: { id: null, nome: "IA Smart HelpDesk", perfil: "sistema" } }, "ia_prioridade", `Prioridade IA: ${analiseIA.prioridade}. Categoria: ${analiseIA.categoria}. Responsável sugerido: ${analiseIA.responsavel_sugerido}. Motivo: ${analiseIA.motivo}`);
    if (duplicidade) {
      await registrarMovimentacao(chamado.id, { user: { id: null, nome: "IA Smart HelpDesk", perfil: "sistema" } }, "ia_duplicidade", duplicidade.motivo);
    }
    if (responsavelAutomatico) {
      await registrarMovimentacao(chamado.id, { user: { id: null, nome: "IA Smart HelpDesk", perfil: "sistema" } }, "atribuicao_automatica", `Responsável atribuído automaticamente para ${responsavelAutomatico.nome}.`);
      await criarNotificacao(responsavelAutomatico.id, "Chamado atribuído a você", `${chamado.titulo} — ${chamado.numero_chamado}`, "info", `/chamados/${chamado.id}`);
      await criarNotificacao(chamado.usuario_id, "Chamado assumido", `${chamado.titulo} — Seu atendimento ficará com ${responsavelAutomatico.nome}.`, "info", `/chamados/${chamado.id}`);
    }
    if (!tipoDesenvolvimento && chamado.responsavel_id == null) {
      await require("../services/queueNotificationService").notificarNovoChamadoNaFila(chamado, criarNotificacao);
    }
    enviarEmail({ para: usuario.email, assunto: `Chamado criado ${chamado.numero_chamado}`, texto: `Seu chamado foi criado. Prioridade: ${chamado.prioridade}` }).catch(() => {});

    return res.status(201).json({ ...(await carregarDetalhesChamado(req, chamado)), ia: analiseIA });
  } catch (error) {
    console.error(error);
    if (chamadoCriado) {
      return res.status(201).json({
        ...chamadoCriado,
        aviso: "O chamado foi criado, mas uma etapa complementar não pôde ser concluída.",
      });
    }
    return res.status(500).json({ erro: "Erro ao criar chamado", detalhe: error.message });
  }
};

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
    await sincronizarSlaChamadosAtivosUmaVez();
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

// Atualiza atributos operacionais e registra mudanças relevantes no histórico.
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
    const prioridadeAlterada = Boolean(prioridade && prioridade !== anterior.prioridade);
    if (prioridadeAlterada && !normalizarTexto(prioridade_manual_motivo || "")) {
      return res.status(400).json({ erro: "Informe o motivo da alteração de prioridade" });
    }
    const novaRegraSla = prioridadeAlterada ? await calcularSLAConfiguravel(prioridade) : null;
    const statusCanonico = status == null ? null : canonicalizeStatus(status);
    if (status != null && !statusCanonico) return res.status(400).json({ erro: "Status de chamado inválido" });
    if (statusCanonico && !canTransition(anterior.status, statusCanonico)) {
      return res.status(409).json({ erro: `Transição de ${anterior.status} para ${statusCanonico} não permitida` });
    }
    // A única transição permitida para fora de um status concluído é REOPENED (ver TRANSITIONS em
    // domain/ticketStatus.js), então este editor genérico de status é uma segunda porta para reabrir
    // um chamado, além do botão dedicado "Reabrir". Sem esta checagem aqui, ela bypassava o prazo de
    // 7 dias por completo (sem motivo, sem data de referência, sem limite).
    if (statusCanonico === STATUS.REOPENED && statusFinalizado(anterior.status) && !usuarioEhAdmin(req)) {
      const referenciaConclusao = anterior.finalizado_em || anterior.atualizado_em;
      if (!isReopenWindowOpen(referenciaConclusao)) {
        const prazo = reopenDeadline(referenciaConclusao);
        const prazoTexto = prazo ? ` O prazo terminou em ${prazo.toLocaleDateString("pt-BR")}.` : "";
        return res.status(400).json({ erro: `O chamado só pode ser reaberto em até ${REOPEN_WINDOW_DAYS} dias após a conclusão.${prazoTexto} Abra um novo chamado.` });
      }
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
          -- Reabrir por aqui também cai direto em "Em andamento", igual ao botão dedicado (não fica
          -- parado em "Reaberto" esperando um segundo passo).
          status = CASE WHEN $1 = 'REOPENED' THEN 'IN_PROGRESS' ELSE COALESCE($1, status) END,
          prioridade = COALESCE($2, prioridade),
          prioridade_manual_motivo = CASE WHEN $2 IS NOT NULL AND $2 <> prioridade THEN $8 ELSE prioridade_manual_motivo END,
          prioridade_alterada_por = CASE WHEN $2 IS NOT NULL AND $2 <> prioridade THEN $9 ELSE prioridade_alterada_por END,
          prioridade_alterada_em = CASE WHEN $2 IS NOT NULL AND $2 <> prioridade THEN CURRENT_TIMESTAMP ELSE prioridade_alterada_em END,
          responsavel = CASE WHEN $11 THEN $3 ELSE responsavel END,
          responsavel_id = CASE WHEN $11 THEN $4 ELSE responsavel_id END,
          team_id = CASE WHEN $12 THEN $10 ELSE team_id END,
          sla = CASE WHEN $13::integer IS NOT NULL THEN $15 ELSE COALESCE($5, sla) END,
          sla_resposta_minutos = COALESCE($13::integer, sla_resposta_minutos),
          sla_resolucao_minutos = COALESCE($14::integer, sla_resolucao_minutos),
          tipo_chamado = COALESCE($6, tipo_chamado),
          -- Reabertura (status vira REOPENED; só é possível a partir de um status concluído, já
          -- validado acima) recomeça o SLA do zero a partir de agora, com a mesma fórmula da criação
          -- do chamado. Sem isso, o prazo antigo ficava valendo e o chamado voltava já vencido.
          primeira_resposta_em = CASE WHEN $1 = 'REOPENED' THEN NULL ELSE primeira_resposta_em END,
          sla_limite_resposta = CASE
            WHEN $1 = 'REOPENED' THEN sla_add_business_seconds(CURRENT_TIMESTAMP::timestamp, COALESCE($13::integer, sla_resposta_minutos) * 60.0)
            WHEN primeira_resposta_em IS NOT NULL THEN sla_limite_resposta
            ELSE sla_add_business_seconds(sla_limite_resposta,
              (COALESCE($13::integer, sla_resposta_minutos) - sla_resposta_minutos) * 60.0
              + CASE WHEN status = 'WAITING_USER' AND $1 IS NOT NULL AND $1 <> 'WAITING_USER' AND sla_pausado_em IS NOT NULL
                THEN sla_business_seconds(sla_pausado_em, CURRENT_TIMESTAMP::timestamp) ELSE 0 END) END,
          sla_limite_resolucao = CASE
            WHEN $1 = 'REOPENED' THEN sla_add_business_seconds(CURRENT_TIMESTAMP::timestamp, COALESCE($14::integer, sla_resolucao_minutos) * 60.0)
            WHEN sla_limite_resolucao IS NULL THEN NULL
            ELSE sla_add_business_seconds(sla_limite_resolucao,
              (COALESCE($14::integer, sla_resolucao_minutos) - sla_resolucao_minutos) * 60.0
              + CASE WHEN status = 'WAITING_USER' AND $1 IS NOT NULL AND $1 <> 'WAITING_USER' AND sla_pausado_em IS NOT NULL
                THEN sla_business_seconds(sla_pausado_em, CURRENT_TIMESTAMP::timestamp) ELSE 0 END) END,
          sla_tempo_pausado_segundos = CASE WHEN $1 = 'REOPENED' THEN 0 ELSE COALESCE(sla_tempo_pausado_segundos, 0) + CASE
            WHEN status = 'WAITING_USER' AND $1 IS NOT NULL AND $1 <> 'WAITING_USER' AND sla_pausado_em IS NOT NULL
              THEN GREATEST(0, EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - sla_pausado_em))::BIGINT)
            ELSE 0 END END,
          sla_pausado_em = CASE
            WHEN $1 = 'REOPENED' THEN NULL
            WHEN $1 = 'WAITING_USER' THEN COALESCE(sla_pausado_em, CURRENT_TIMESTAMP)
            WHEN status = 'WAITING_USER' AND $1 IS NOT NULL AND $1 <> 'WAITING_USER' THEN NULL
            ELSE sla_pausado_em END,
          vencido = CASE WHEN $13::integer IS NOT NULL OR $1 = 'WAITING_USER' OR $1 = 'REOPENED' OR (status = 'WAITING_USER' AND $1 IS NOT NULL AND $1 <> 'WAITING_USER') THEN FALSE ELSE vencido END,
          sla_alerta_enviado = CASE WHEN $13::integer IS NOT NULL OR $1 = 'WAITING_USER' OR $1 = 'REOPENED' OR (status = 'WAITING_USER' AND $1 IS NOT NULL AND $1 <> 'WAITING_USER') THEN FALSE ELSE sla_alerta_enviado END,
          sla_escalado = CASE WHEN $13::integer IS NOT NULL OR $1 = 'WAITING_USER' OR $1 = 'REOPENED' OR (status = 'WAITING_USER' AND $1 IS NOT NULL AND $1 <> 'WAITING_USER') THEN FALSE ELSE sla_escalado END,
          finalizado_em = CASE WHEN $1 IN ('RESOLVED','CLOSED','CANCELED') THEN CURRENT_TIMESTAMP WHEN $1 IN ('OPEN','REOPENED') THEN NULL ELSE finalizado_em END,
          atualizado_em = CURRENT_TIMESTAMP
       WHERE id = $7 RETURNING *`,
      [statusEfetivo, prioridade || null, responsavelNome, responsavelIdFinal, sla || null, tipo_chamado || null, id, prioridade_manual_motivo || null, req.user.id, teamIdFinal, alteraResponsavel, alteraEquipe, novaRegraSla?.respostaMinutos || null, novaRegraSla?.resolucaoMinutos || null, novaRegraSla?.label || null]
    );
    const atualizado = result.rows[0];

    if (statusEfetivo && statusEfetivo !== canonicalizeStatus(anterior.status)) {
      // status DB pode diferir de statusEfetivo quando reabrir cai direto em IN_PROGRESS (ver SQL acima).
      const statusResultante = canonicalizeStatus(atualizado.status);
      await registrarMovimentacao(id, req, "alteracao_status", `Status alterado de ${canonicalizeStatus(anterior.status)} para ${statusResultante}.`);
      await notificarStatus(atualizado, statusResultante, anterior.status);
      const concluiuAgora = ["RESOLVED", "CLOSED"].includes(statusResultante) && !["RESOLVED", "CLOSED"].includes(canonicalizeStatus(anterior.status));
      if (concluiuAgora) {
        void enviarEmailAvaliacao(atualizado);
        await notificarUsuarioVinculadoAoAtivo(atualizado);
      } else {
        enviarEmail({ para: atualizado.email_solicitante, assunto: `Status alterado ${atualizado.numero_chamado}`, texto: `Seu chamado agora está como ${statusLabel(statusResultante)}.` }).catch(() => {});
      }
    }
    if (prioridadeAlterada) {
      await registrarMovimentacao(id, req, "alteracao_prioridade", `Prioridade final alterada de ${anterior.prioridade} para ${prioridade}. Motivo: ${prioridade_manual_motivo || "não informado"}`);
    }
    if (prioridadeAlterada) {
      await pool.query(`INSERT INTO prioridade_ia_feedback(chamado_id,prioridade_sugerida,prioridade_final,motivo,corrigido_por) VALUES($1,$2,$3,$4,$5)`, [id, anterior.prioridade_ia || anterior.prioridade, prioridade, prioridade_manual_motivo || null, req.user.id]).catch(() => {});
    }
    if (alteraResponsavel && Number(responsavelIdFinal || 0) !== Number(anterior.responsavel_id || 0)) {
      await registrarMovimentacao(id, req, "responsavel", responsavelIdFinal ? `Responsável definido como ${responsavelNome}.` : "Chamado devolvido à fila sem responsável.");
      if (responsavelIdFinal) await criarNotificacao(responsavelIdFinal, "Chamado atribuído a você", `${atualizado.titulo} — ${atualizado.numero_chamado}`, "info", `/chamados/${id}`);
      if (responsavelIdFinal) await criarNotificacao(atualizado.usuario_id, "Chamado assumido", `${atualizado.titulo} — Seu atendimento ficará com ${responsavelNome}.`, "info", `/chamados/${id}`);
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
    await notificarStatus(result.rows[0], "CLOSED", acesso.chamado.status);
    if (!["RESOLVED", "CLOSED"].includes(canonicalizeStatus(acesso.chamado.status))) {
      await notificarUsuarioVinculadoAoAtivo(result.rows[0]);
      void enviarEmailAvaliacao(result.rows[0]);
    }
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
    // Prazo de reabertura: preserva o acesso já existente (solicitante, técnico responsável e admin);
    // admin mantém a atuação irrestrita que já tinha em outras ações do chamado.
    // Referência igual à exibida como "Encerrado em" nas telas (Histórico etc.): chamados antigos sem
    // finalizado_em gravado usam atualizado_em, para não liberar reabertura sem limite nesses casos.
    const referenciaConclusao = acesso.chamado.finalizado_em || acesso.chamado.atualizado_em;
    if (!usuarioEhAdmin(req) && !isReopenWindowOpen(referenciaConclusao)) {
      const prazo = reopenDeadline(referenciaConclusao);
      const prazoTexto = prazo ? ` O prazo terminou em ${prazo.toLocaleDateString("pt-BR")}.` : "";
      return res.status(400).json({ erro: `O chamado só pode ser reaberto em até ${REOPEN_WINDOW_DAYS} dias após a conclusão.${prazoTexto} Abra um novo chamado.` });
    }
    if (!normalizarTexto(motivo || "")) return res.status(400).json({ erro: "O motivo da reabertura é obrigatório" });
    // Reabrir já volta direto para "Em andamento" (não fica parado em "Reaberto"): cai na fila
    // de trabalho de quem já era responsável, sem precisar de um segundo passo para assumir.
    // O SLA também recomeça do zero a partir de agora (mesma fórmula da criação do chamado, só que
    // contando business time a partir de agora), senão o prazo antigo aparece vencido na hora.
    const result = await pool.query(
      `UPDATE chamados SET
         status = 'IN_PROGRESS',
         finalizado_em = NULL,
         reaberto_em = CURRENT_TIMESTAMP,
         primeira_resposta_em = NULL,
         sla_limite_resposta = sla_add_business_seconds(CURRENT_TIMESTAMP::timestamp, sla_resposta_minutos * 60.0),
         sla_limite_resolucao = sla_add_business_seconds(CURRENT_TIMESTAMP::timestamp, sla_resolucao_minutos * 60.0),
         sla_pausado_em = NULL,
         sla_tempo_pausado_segundos = 0,
         vencido = FALSE,
         sla_alerta_enviado = FALSE,
         sla_escalado = FALSE,
         atualizado_em = CURRENT_TIMESTAMP
       WHERE id = $1 RETURNING *`,
      [id]
    );
    const chamadoReaberto = result.rows[0];
    await registrarMovimentacao(id, req, "reabertura", motivo ? `Chamado reaberto e voltou para "Em andamento". Motivo: ${normalizarTexto(motivo)}` : "Chamado reaberto e voltou para \"Em andamento\".");
    await criarNotificacao(chamadoReaberto.responsavel_id, "Chamado reaberto", `${chamadoReaberto.numero_chamado} voltou para o seu trabalho.`, "warning", `/chamados/${chamadoReaberto.id}`);
    enviarEmail({ para: chamadoReaberto.email_solicitante, assunto: `Chamado reaberto ${chamadoReaberto.numero_chamado}`, texto: `Seu chamado foi reaberto e voltou para atendimento. Motivo: ${normalizarTexto(motivo)}` }).catch(() => {});
    return res.json(await carregarDetalhesChamado(req, chamadoReaberto));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ erro: "Erro ao reabrir chamado", detalhe: error.message });
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
    const comentarioFinal = normalizarTexto(comentario || "").trim();
    if (!comentarioFinal) return res.status(400).json({ erro: "O comentário da avaliação é obrigatório" });
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
      [id, acesso.chamado.responsavel_id || null, acesso.chamado.team_id || null, req.user.id, notaFinal, comentarioFinal]
    );
    if (!result.rows[0]) return res.status(409).json({ erro: "Este chamado já possui uma avaliação detalhada." });
    await notificarAvaliacao(acesso.chamado, notaFinal, comentarioFinal);
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
    await criarNotificacao(req.user.id, "Chamado atribuído a você", `${result.rows[0].titulo} — ${result.rows[0].numero_chamado}`, "info", `/chamados/${id}`);
    await criarNotificacao(result.rows[0].usuario_id, "Chamado assumido", `${result.rows[0].titulo} — Seu chamado foi assumido por ${req.user.nome}.`, "info", `/chamados/${id}`);
    return res.json(await carregarDetalhesChamado(req, result.rows[0]));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ erro: "Erro ao assumir chamado", detalhe: error.message });
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
  avaliarChamado,
  excluirChamado,
  assumirChamado,
};
