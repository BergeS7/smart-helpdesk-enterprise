/**
 * Responsabilidade: gerar o SQL dos dados de demonstração da base de conhecimento para teste local.
 * O script só imprime SQL; quem executa é o psql do container local, então nunca alcança outro banco.
 *
 *   node backend/scripts/seed-base-conhecimento-demo.js | docker exec -i smart-helpdesk-database psql -v ON_ERROR_STOP=1 -U smart_helpdesk -d smart_helpdesk
 *   node backend/scripts/seed-base-conhecimento-demo.js --remover | docker exec -i smart-helpdesk-database psql -v ON_ERROR_STOP=1 -U smart_helpdesk -d smart_helpdesk
 *
 * Tudo fica marcado ("[DEMO] " no título dos artigos, "DEMO-" no número dos chamados) para sair com --remover.
 */
const { ARTIGOS, CHAMADOS_RECORRENTES } = require("../test/fixtures/baseConhecimento");

const MARCA_ARTIGO = "[DEMO] ";
const PREFIXO_CHAMADO = "DEMO-";
// Mais um problema recorrente, já coberto pelo artigo do ERP.
const CHAMADOS_ERP = [
  ["ERP lento para abrir", "O sistema ERP demora muito para abrir as telas."],
  ["ERP travando", "O ERP trava ao gerar relatório de vendas."],
  ["Lentidão no ERP", "ERP lento desde a atualização de ontem."],
  ["ERP não responde", "A tela do ERP fica carregando sem parar."],
  ["ERP lento no faturamento", "Os relatórios do ERP demoram demais para gerar."],
];

const texto = (valor) => (valor == null ? "NULL" : `'${String(valor).replace(/'/g, "''")}'`);

const remover = `DELETE FROM base_conhecimento WHERE titulo LIKE '${MARCA_ARTIGO}%';
DELETE FROM chamados WHERE numero_chamado LIKE '${PREFIXO_CHAMADO}%';`;

function inserir() {
  const linhas = [];
  for (const a of ARTIGOS) {
    linhas.push(`INSERT INTO base_conhecimento (titulo, categoria, palavras_chave, resumo, problema, sintomas, solucao, passos, conteudo, status, visibilidade, ativo)
VALUES (${[MARCA_ARTIGO + a.titulo, a.categoria, a.palavras_chave, a.resumo, a.problema, a.sintomas, a.solucao].map(texto).join(", ")},
  ${texto(JSON.stringify(a.passos || []))}::jsonb, ${texto(a.conteudo)}, ${texto(a.status)}, ${texto(a.visibilidade)}, ${a.status === "publicado"});`);
  }

  // Chamados já encerrados, espalhados pelos últimos dias, para não entrarem na fila de atendimento.
  const chamados = [...Object.values(CHAMADOS_RECORRENTES).flat(), ...CHAMADOS_ERP];
  chamados.forEach(([titulo, descricao], i) => {
    linhas.push(`INSERT INTO chamados (numero_chamado, titulo, descricao, tipo_chamado, status, setor, criado_em, finalizado_em)
VALUES (${texto(`${PREFIXO_CHAMADO}${String(i + 1).padStart(3, "0")}`)}, ${texto(titulo)}, ${texto(descricao)}, 'Incidente', 'CLOSED', 'TI',
  NOW() - make_interval(hours => ${(i + 1) * 7}), NOW() - make_interval(hours => ${(i + 1) * 7 - 2}));`);
  });

  // Um chamado de VPN com a conversa do atendimento, para testar o rascunho a partir do chamado.
  const conversa = [
    ["usuario", "A VPN continua caindo toda hora."],
    ["tecnico", "Verifiquei os logs do FortiClient: a sessão está expirando."],
    ["tecnico", "Atualizei o FortiClient para a versão 7.2 e refiz o perfil da VPN. Conexão estável."],
  ];
  for (const [perfil, mensagem] of conversa) {
    linhas.push(`INSERT INTO chamado_comentarios (chamado_id, autor_nome, autor_perfil, mensagem)
SELECT id, ${texto(perfil === "tecnico" ? "Técnico (demo)" : "Usuário (demo)")}, ${texto(perfil)}, ${texto(mensagem)}
FROM chamados WHERE numero_chamado LIKE '${PREFIXO_CHAMADO}%' AND titulo = 'VPN caiu';`);
  }
  return linhas.join("\n");
}

const somenteRemover = process.argv.includes("--remover");
process.stdout.write(`BEGIN;\n${remover}\n${somenteRemover ? "" : `${inserir()}\n`}COMMIT;\n`);
