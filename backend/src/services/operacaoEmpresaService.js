/**
 * Responsabilidade: visão da operação de uma empresa para a administração da plataforma, só leitura.
 *
 * As consultas rodam dentro da empresa (mesma RLS das requisições dela) e numa transação READ ONLY:
 * mesmo que algo aqui tentasse gravar, o banco recusaria. Só dados de acompanhamento — nada de
 * descrição de chamado, mensagens ou anexos.
 */
const pool = require("../config/database");
const { executarComoEmpresa } = require("../config/tenantContext");

const FINAIS = "('RESOLVED','CLOSED','CANCELED')";

async function consultarOperacao(empresaId) {
  return executarComoEmpresa(empresaId, async () => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN READ ONLY");
      const resumo = await client.query(`
        SELECT
          COUNT(*) FILTER (WHERE status NOT IN ${FINAIS})::int AS abertos,
          COUNT(*) FILTER (WHERE status NOT IN ${FINAIS} AND status <> 'WAITING_USER'
                           AND (vencido OR sla_limite_resolucao < NOW()))::int AS sla_vencido,
          COUNT(*) FILTER (WHERE status NOT IN ${FINAIS} AND responsavel_id IS NULL)::int AS sem_responsavel,
          COUNT(*) FILTER (WHERE criado_em >= NOW() - INTERVAL '30 days')::int AS criados_30d,
          COUNT(*) FILTER (WHERE finalizado_em >= NOW() - INTERVAL '30 days')::int AS resolvidos_30d,
          ROUND((AVG(EXTRACT(EPOCH FROM (finalizado_em - criado_em)) / 3600)
            FILTER (WHERE finalizado_em >= NOW() - INTERVAL '30 days'))::numeric, 1) AS horas_media_resolucao_30d
        FROM chamados`);
      const porStatus = await client.query(`
        SELECT status, COUNT(*)::int AS total FROM chamados
         WHERE status NOT IN ${FINAIS} GROUP BY status ORDER BY total DESC`);
      const recentes = await client.query(`
        SELECT c.id, c.numero_chamado, c.titulo, c.status, c.prioridade, c.tipo_chamado, c.criado_em,
               c.sla_limite_resolucao, (c.status NOT IN ${FINAIS} AND c.status <> 'WAITING_USER'
                 AND (c.vencido OR c.sla_limite_resolucao < NOW())) AS sla_vencido,
               r.nome AS responsavel
          FROM chamados c LEFT JOIN usuarios r ON r.id = c.responsavel_id
         ORDER BY c.criado_em DESC LIMIT 15`);
      const usuarios = await client.query(`
        SELECT perfil,
               COUNT(*) FILTER (WHERE status = 'ativo')::int AS ativos,
               COUNT(*) FILTER (WHERE status = 'pendente')::int AS pendentes
          FROM usuarios GROUP BY perfil ORDER BY perfil`);
      const satisfacao = await client.query(`
        SELECT ROUND(AVG(overall_rating)::numeric, 2) AS media, COUNT(*)::int AS avaliacoes
          FROM performance_ratings WHERE created_at >= NOW() - INTERVAL '90 days'`);
      const ativos = await client.query(`
        SELECT COUNT(*)::int AS total,
               COUNT(*) FILTER (WHERE ultimo_heartbeat >= NOW() - INTERVAL '1 day')::int AS comunicando_24h
          FROM ativos`);
      const base = await client.query(`
        SELECT COUNT(*) FILTER (WHERE status = 'publicado')::int AS publicados FROM base_conhecimento`);
      await client.query("COMMIT");
      return {
        chamados: { ...resumo.rows[0], por_status: porStatus.rows, recentes: recentes.rows },
        usuarios: usuarios.rows,
        satisfacao_90d: satisfacao.rows[0],
        ativos: ativos.rows[0],
        base: base.rows[0],
      };
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  });
}

// Chamado em modo sistema (a tabela é da plataforma).
async function registrarAcesso({ empresaId, user, recurso, req }) {
  await pool.query(
    `INSERT INTO plataforma_acessos (empresa_id, usuario_id, usuario_email, recurso, ip, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [empresaId, user.id, user.email, recurso, String(req.ip || "").slice(0, 100), String(req.headers["user-agent"] || "").slice(0, 1000)]
  );
}

async function listarAcessos(empresaId, limite = 50) {
  const result = await pool.query(
    `SELECT id, usuario_email, recurso, ip, criado_em FROM plataforma_acessos
      WHERE empresa_id = $1 ORDER BY criado_em DESC LIMIT $2`,
    [empresaId, limite]
  );
  return result.rows;
}

module.exports = { consultarOperacao, registrarAcesso, listarAcessos };
