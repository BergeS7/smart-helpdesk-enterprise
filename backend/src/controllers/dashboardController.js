const pool = require("../config/database");

function whereEquipe(req) {
  const days = [1,7,30,90].includes(Number(req.query.periodo)) ? Number(req.query.periodo) : 30;
  if (req.user?.perfil === "tecnico") {
    return { sql: `WHERE c.responsavel_id = $1 AND c.criado_em >= NOW() - INTERVAL '${days} days'`, params: [req.user.id], days };
  }
  return { sql: `WHERE c.criado_em >= NOW() - INTERVAL '${days} days'`, params: [], days };
}

const obterDashboard = async (req, res) => {
  try {
    const filtro = whereEquipe(req);
    const wherePrefix = filtro.sql ? `${filtro.sql} AND` : "WHERE";
    const params = filtro.params;

    const [total, porStatus, porPrioridade, porDepartamento, vencidos, usuarios, pendentes, semResponsavel, alta, tempoResposta, tempoResolucao, satisfacao, porTecnico, recentes, evolucao, riscoSla, ativos, comparativo] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM chamados c ${filtro.sql}`, params),
      pool.query(`SELECT c.status, COUNT(*)::int AS total FROM chamados c ${filtro.sql} GROUP BY c.status ORDER BY c.status`, params),
      pool.query(`SELECT c.prioridade, COUNT(*)::int AS total FROM chamados c ${filtro.sql} GROUP BY c.prioridade ORDER BY c.prioridade`, params),
      pool.query(`SELECT COALESCE(c.setor, 'Sem departamento') AS departamento, COUNT(*)::int AS total FROM chamados c ${filtro.sql} GROUP BY COALESCE(c.setor, 'Sem departamento') ORDER BY total DESC`, params),
      pool.query(`SELECT COUNT(*) FROM chamados c ${wherePrefix} c.status NOT IN ('RESOLVED','CLOSED','CANCELED') AND c.sla_limite_resolucao < CURRENT_TIMESTAMP`, params),
      pool.query("SELECT COUNT(*) FROM usuarios"),
      pool.query("SELECT COUNT(*) FROM usuarios WHERE status = 'pendente'"),
      pool.query(`SELECT COUNT(*) FROM chamados c ${wherePrefix} c.status NOT IN ('RESOLVED','CLOSED','CANCELED') AND c.responsavel_id IS NULL`, params),
      pool.query(`SELECT COUNT(*) FROM chamados c ${wherePrefix} c.prioridade = 'Alta' AND c.status NOT IN ('RESOLVED','CLOSED','CANCELED')`, params),
      pool.query(`SELECT ROUND(AVG(EXTRACT(EPOCH FROM (c.primeira_resposta_em - c.criado_em)) / 60))::int AS minutos FROM chamados c ${wherePrefix} c.primeira_resposta_em IS NOT NULL`, params),
      pool.query(`SELECT ROUND(AVG(EXTRACT(EPOCH FROM (COALESCE(c.finalizado_em, c.atualizado_em) - c.criado_em)) / 60))::int AS minutos FROM chamados c ${wherePrefix} c.status IN ('RESOLVED','CLOSED')`, params),
      pool.query(`SELECT ROUND(AVG(av.overall_rating)::numeric, 1) AS media, COUNT(av.id)::int AS total FROM performance_ratings av JOIN chamados c ON c.id = av.ticket_id ${filtro.sql}`, params),
      pool.query(`SELECT COALESCE(u.nome, c.responsavel, 'Sem responsável') AS tecnico, COUNT(c.id)::int AS total
                  FROM chamados c LEFT JOIN usuarios u ON u.id = c.responsavel_id
                  ${filtro.sql}
                  GROUP BY COALESCE(u.nome, c.responsavel, 'Sem responsável')
                  ORDER BY total DESC LIMIT 10`, params),
      pool.query(`SELECT c.id, c.numero_chamado, c.titulo, c.status, c.prioridade, c.sla_limite_resolucao,
                         CASE WHEN c.status NOT IN ('RESOLVED','CLOSED','CANCELED') AND c.sla_limite_resolucao < CURRENT_TIMESTAMP THEN TRUE ELSE FALSE END AS vencido
                  FROM chamados c ${filtro.sql}
                  ORDER BY c.atualizado_em DESC NULLS LAST, c.id DESC LIMIT 8`, params),
      pool.query(`SELECT d::date AS data,
        COUNT(c.id)::int AS recebidos,
        COUNT(c.id) FILTER (WHERE c.status IN ('RESOLVED','CLOSED'))::int AS resolvidos
        FROM generate_series(CURRENT_DATE - ($1::int - 1), CURRENT_DATE, '1 day') d
        LEFT JOIN chamados c ON c.criado_em::date=d::date
        GROUP BY d ORDER BY d`, [filtro.days]),
      pool.query(`SELECT COUNT(*) FROM chamados c ${wherePrefix} c.status NOT IN ('RESOLVED','CLOSED','CANCELED') AND c.sla_limite_resolucao BETWEEN NOW() AND NOW()+INTERVAL '4 hours'`,params),
      pool.query(`SELECT COUNT(*)::int AS total,
        COUNT(*) FILTER(WHERE status = 'offline')::int AS offline,
        COUNT(*) FILTER(WHERE status IN ('online', 'warning') OR status IS NULL)::int AS online
        FROM ativos`).catch(()=>({rows:[{total:0,offline:0,online:0}]})),
      pool.query(`SELECT
        COUNT(*) FILTER(WHERE criado_em >= NOW()-($1::text||' days')::interval)::int AS atual,
        COUNT(*) FILTER(WHERE criado_em < NOW()-($1::text||' days')::interval AND criado_em >= NOW()-((($1::int)*2)::text||' days')::interval)::int AS anterior
        FROM chamados`,[filtro.days]),
    ]);

    const statusMap = Object.fromEntries(porStatus.rows.map((r) => [r.status, Number(r.total)]));
    const prioridadeMap = Object.fromEntries(porPrioridade.rows.map((r) => [r.prioridade, Number(r.total)]));

    return res.json({
      totalChamados: Number(total.rows[0].count),
      abertos: Number(statusMap.OPEN || 0) + Number(statusMap.REOPENED || 0),
      emAndamento: Number(statusMap.IN_PROGRESS || 0),
      aguardandoUsuario: Number(statusMap.WAITING_USER || 0),
      aguardandoTerceiros: Number(statusMap.WAITING_THIRD_PARTY || 0),
      concluidos: Number(statusMap.RESOLVED || 0) + Number(statusMap.CLOSED || 0),
      vencidos: Number(vencidos.rows[0].count),
      semResponsavel: Number(semResponsavel.rows[0].count),
      altaPrioridadeAberta: Number(alta.rows[0].count),
      usuarios: Number(usuarios.rows[0].count),
      usuariosPendentes: Number(pendentes.rows[0].count),
      tempoMedioRespostaMinutos: Number(tempoResposta.rows[0].minutos || 0),
      tempoMedioResolucaoMinutos: Number(tempoResolucao.rows[0].minutos || 0),
      satisfacaoMedia: satisfacao.rows[0].media ? Number(satisfacao.rows[0].media) : 0,
      avaliacoesTotal: Number(satisfacao.rows[0].total || 0),
      porStatus: porStatus.rows,
      porPrioridade: porPrioridade.rows,
      prioridadeAlta: Number(prioridadeMap["Alta"] || 0),
      prioridadeMedia: Number(prioridadeMap["Media"] || 0),
      prioridadeBaixa: Number(prioridadeMap["Baixa"] || 0),
      porDepartamento: porDepartamento.rows,
      porTecnico: porTecnico.rows,
      chamadosRecentes: recentes.rows,
      evolucao: evolucao.rows,
      slaEmRisco: Number(riscoSla.rows[0].count||0),
      ativos: ativos.rows[0],
      comparativo: comparativo.rows[0],
      periodoDias: filtro.days,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ erro: "Erro ao carregar dashboard", detalhe: error.message });
  }
};

module.exports = { obterDashboard };
