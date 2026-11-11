/**
 * Responsabilidade: regras que decidem se o usuário pode abrir um novo chamado pelo portal.
 *
 * 1. Um chamado por vez: enquanto houver um chamado dele ainda não finalizado, não abre outro.
 * 2. Avaliação obrigatória: chamado concluído (Resolvido/Concluído) precisa ser avaliado antes de
 *    abrir o próximo. Cancelado não exige avaliação, porque não houve atendimento para avaliar.
 *
 * Fora das regras, de propósito:
 * - a equipe (técnico, supervisor, admin), tanto abrindo para si quanto em nome de alguém: quem
 *   registra um atendimento por telefone não pode ser travado por um chamado anterior do usuário;
 * - chamados de desenvolvimento (Bug, Melhoria...): o módulo está oculto e eles duram semanas;
 * - chamados finalizados antes da data de corte da empresa (configuracoes_sistema, chave
 *   avaliacaoObrigatoriaDesde) e os antigos sem finalizado_em, para ninguém ser bloqueado pelo
 *   histórico de antes desta regra existir.
 *
 * O controller chama esta verificação antes de criar e o portal a consulta antes de mostrar o
 * formulário; a resposta do servidor é sempre a palavra final.
 */
const pool = require("../config/database");
const { label: statusLabel } = require("../domain/ticketStatus");
const { DEVELOPMENT_TICKET_TYPES } = require("../domain/development");

const CODIGOS = Object.freeze({
  CHAMADO_EM_ABERTO: "CHAMADO_EM_ABERTO",
  AVALIACAO_PENDENTE: "AVALIACAO_PENDENTE",
});

const CHAVE_DATA_CORTE = "avaliacaoObrigatoriaDesde";

// Mesmo critério de "chamado do usuário" usado na listagem do portal: pelo id ou pelo e-mail
// (chamados antigos foram gravados só com o e-mail do solicitante).
const FILTRO_DO_SOLICITANTE = `(c.usuario_id = $1 OR LOWER(COALESCE(c.email_solicitante, '')) = LOWER($2))
  AND LOWER(COALESCE(c.tipo_chamado, '')) <> ALL($3::text[])`;

function identificacao(chamado) {
  return chamado.numero_chamado || `#${chamado.id}`;
}

async function buscarChamadoEmAberto(usuario) {
  const result = await pool.query(
    `SELECT c.id, c.numero_chamado, c.status
       FROM chamados c
      WHERE ${FILTRO_DO_SOLICITANTE}
        AND c.status NOT IN ('RESOLVED', 'CLOSED', 'CANCELED')
      ORDER BY c.criado_em ASC
      LIMIT 1`,
    [usuario.id, usuario.email || "", DEVELOPMENT_TICKET_TYPES]
  );
  return result.rows[0] || null;
}

/**
 * Data a partir da qual a avaliação passa a ser obrigatória na empresa do usuário.
 * A migration 1791700000000 grava a data da implantação para as empresas existentes. Quando a chave
 * não existe (empresa criada depois, ou esta versão da API no ar antes da migration rodar), ela é
 * gravada agora: a regra começa a valer a partir deste momento e nunca alcança chamados antigos.
 * Devolve null só se não houver empresa para gravar; nesse caso a regra fica desligada.
 */
async function obterDataDeCorte(usuarioId) {
  const selecionar = () => pool.query(
    `SELECT valor FROM configuracoes_sistema
      WHERE chave = $2 AND empresa_id = (SELECT empresa_id FROM usuarios WHERE id = $1)
      LIMIT 1`,
    [usuarioId, CHAVE_DATA_CORTE]
  );
  const existente = await selecionar();
  if (existente.rows[0]) return existente.rows[0].valor;

  const gravada = await pool.query(
    `INSERT INTO configuracoes_sistema (empresa_id, chave, valor)
     SELECT u.empresa_id, $2, to_char(CURRENT_TIMESTAMP::timestamp, 'YYYY-MM-DD"T"HH24:MI:SS')
       FROM usuarios u
      WHERE u.id = $1 AND u.empresa_id IS NOT NULL
     ON CONFLICT (empresa_id, chave) DO NOTHING
     RETURNING valor`,
    [usuarioId, CHAVE_DATA_CORTE]
  );
  if (gravada.rows[0]) return gravada.rows[0].valor;
  // Outra requisição gravou ao mesmo tempo (ON CONFLICT): lê o valor dela.
  return (await selecionar()).rows[0]?.valor || null;
}

async function buscarAvaliacaoPendente(usuario) {
  const dataDeCorte = await obterDataDeCorte(usuario.id);
  if (!dataDeCorte) return null;
  const result = await pool.query(
    `SELECT c.id, c.numero_chamado, c.status
       FROM chamados c
      WHERE ${FILTRO_DO_SOLICITANTE}
        AND c.status IN ('RESOLVED', 'CLOSED')
        AND c.finalizado_em >= $4::timestamp
        AND NOT EXISTS (SELECT 1 FROM performance_ratings pr WHERE pr.ticket_id = c.id)
      ORDER BY c.finalizado_em ASC
      LIMIT 1`,
    [usuario.id, usuario.email || "", DEVELOPMENT_TICKET_TYPES, dataDeCorte]
  );
  return result.rows[0] || null;
}

/**
 * Devolve null quando pode abrir; senão o motivo, pronto para virar resposta HTTP 409:
 * { codigo, erro, chamado_id, numero_chamado }.
 */
async function verificarBloqueioAbertura(usuario) {
  const emAberto = await buscarChamadoEmAberto(usuario);
  if (emAberto) {
    return {
      codigo: CODIGOS.CHAMADO_EM_ABERTO,
      erro: `Você já tem o chamado ${identificacao(emAberto)} em andamento (${statusLabel(emAberto.status)}). `
        + "Só é possível ter um chamado aberto por vez: aguarde a conclusão dele ou use os comentários do chamado para complementar.",
      chamado_id: emAberto.id,
      numero_chamado: emAberto.numero_chamado || null,
    };
  }

  const pendente = await buscarAvaliacaoPendente(usuario);
  if (pendente) {
    return {
      codigo: CODIGOS.AVALIACAO_PENDENTE,
      erro: `Avalie o atendimento do chamado ${identificacao(pendente)} antes de abrir um novo. A sua avaliação ajuda a melhorar o suporte.`,
      chamado_id: pendente.id,
      numero_chamado: pendente.numero_chamado || null,
    };
  }

  return null;
}

module.exports = { CODIGOS, CHAVE_DATA_CORTE, verificarBloqueioAbertura };
