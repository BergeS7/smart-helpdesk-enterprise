/**
 * Responsabilidade: decisões da IA de prioridade em cenários reais de abertura de chamado,
 * incluindo falsos positivos de texto, negações, urgência exagerada e segurança.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const { decidirPrioridadeChamado } = require("../src/services/prioridadeIAService");

const decidir = (setor, titulo, descricao) => decidirPrioridadeChamado({ setor, titulo, descricao });

const cenarios = [
  ["Crítica", "Financeiro", "Não consigo emitir nota fiscal", "O sistema de faturamento dá erro ao emitir NF-e desde hoje cedo, todos do setor parados, clientes aguardando boleto."],
  ["Crítica", "TI", "Sistema fora do ar", "O ERP está fora do ar para todos os usuários da empresa, não tem como trabalhar."],
  ["Crítica", "Operacao", "Produção parada", "A produção parada na filial inteira porque o sistema está indisponível. Sem alternativa."],
  ["Crítica", "TI", "Sem internet", "Internet caiu em toda unidade, todos sem rede, sem contingência."],
  ["Crítica", "", "Ransomware", "Todos os arquivos do servidor foram criptografados por ransomware, empresa toda parada."],
  ["Alta", "TI", "Possível vírus", "Recebi um e-mail de phishing e cliquei no link, acho que minha conta foi invadida."],
  ["Alta", "TI", "Senha vazada", "Minha senha vazada apareceu num site, preciso trocar."],
  ["Alta", "Financeiro", "Pix", "Pagamento via pix não aparece no sistema desde ontem, cliente aguardando pagamento confirmado."],
  ["Alta", "Diretoria", "Apresentação", "O diretor tem reunião importante em 1h e o projetor não liga."],
  ["Alta", "Financeiro", "Sistema parado", "O sistema de lançamentos parou e não consigo registrar as contas a pagar."],
  ["Media", "TI", "Lentidão", "O sistema está lento desde hoje de manhã, demorando para carregar telas."],
  ["Media", "TI", "Senha", "Esqueci minha senha e estou sem acesso ao e-mail."],
  ["Media", "Financeiro", "Erro", "Erro ao gerar relatório."],
  ["Media", "Comercial", "Apresentação", "Preciso de apresentação para cliente amanhã, PowerPoint não abre."],
  ["Baixa", "Marketing", "Sugestão", "Seria bom ter um botão de exportar em PDF na tela de relatórios, sem urgência."],
  ["Baixa", "RH", "Dúvida", "Como faço para cadastrar férias no sistema? Preciso de orientação."],
  ["Baixa", "Administrativo", "Impressora", "A impressora do 2º andar não imprime, papel preso. Só eu uso ela aqui no momento."],
  ["Baixa", "RH", "Novo colaborador", "Criar usuário para novo colaborador que inicia segunda."],
  ["Baixa", "Financeiro", "Ajuda", "Preciso de ajuda com uma planilha."],
  ["Baixa", "TI", "Não está fora do ar", "O sistema não está fora do ar, só um campo com erro de digitação, sem impacto."],
  ["Baixa", "RH", "Dúvida LGPD", "Gostaria de saber qual é a política de LGPD da empresa para arquivar currículos."],
  ["Baixa", "TI", "Treinamento de malware", "Quero agendar treinamento sobre malware para a equipe quando puder."],
];

for (const [esperada, setor, titulo, descricao] of cenarios) {
  test(`prioridade ${esperada}: ${setor || "sem setor"} — ${titulo}`, () => {
    const resultado = decidir(setor, titulo, descricao);
    assert.equal(resultado.prioridade, esperada, resultado.motivo);
  });
}

test("a pontuação sempre fica dentro da faixa da prioridade final", () => {
  const faixas = { Baixa: [0, 29], Media: [30, 64], Alta: [65, 84], "Crítica": [85, 100] };
  for (const [, setor, titulo, descricao] of cenarios) {
    const { prioridade, pontuacao, analise_explicavel } = decidir(setor, titulo, descricao);
    const [minimo, maximo] = faixas[prioridade];
    assert.ok(pontuacao >= minimo && pontuacao <= maximo, `${titulo}: ${pontuacao} fora de ${prioridade}`);
    assert.equal(analise_explicavel.prioridade, prioridade);
    assert.equal(analise_explicavel.pontuacao, pontuacao);
  }
});

test("termos só casam como palavra inteira: 'papel de parede' não é problema de rede", () => {
  const resultado = decidir("Comercial", "Papel de parede", "Preciso trocar o papel de parede do meu computador.");
  assert.notEqual(resultado.categoria, "Problema de internet");
});

test("setor Marketing não é tratado como TI por conter 'ti' no nome", () => {
  const resultado = decidir("Marketing", "Erro", "Sistema parado, não consigo publicar a campanha.");
  assert.ok(!resultado.motivo.includes("Chamados de TI"), resultado.motivo);
});

test("urgência sem impacto real é sinalizada e não eleva a prioridade", () => {
  const resultado = decidir("Comercial", "URGENTE", "Urgente!!! Preciso trocar meu papel de parede agora.");
  assert.equal(resultado.prioridade, "Media");
  assert.equal(resultado.urgencia_exagerada, true);
});

test("'sem urgência' não conta como urgência declarada", () => {
  const resultado = decidir("Marketing", "Sugestão", "Seria bom ter um botão de exportar em PDF, sem urgência.");
  assert.equal(resultado.urgencia_exagerada, false);
  assert.equal(resultado.analise_explicavel.dimensoes.urgencia, 0);
});

test("negação remove o sinal negado e fica registrada", () => {
  const resultado = decidir("TI", "Campo com erro", "O sistema não está fora do ar, só um campo com erro de digitação, sem impacto.");
  assert.equal(resultado.analise_explicavel.negacao_detectada, true);
  assert.ok(!resultado.analise_explicavel.sinais.includes("fora do ar"));
  assert.ok(!resultado.casos_identificados.some((caso) => caso.codigo === "SISTEMA_CRITICO_FORA_DO_AR"));
});

test("dúvida que relata comprometimento real ainda é tratada como incidente de segurança", () => {
  const resultado = decidir("RH", "Dúvida", "Tenho uma dúvida: cliquei num link de phishing e minha conta foi invadida.");
  assert.equal(resultado.prioridade, "Alta");
  assert.equal(resultado.categoria, "Segurança da informação");
});

test("chamado sem título ou descrição fica em Média e pede triagem", () => {
  const resultado = decidir("TI", "", "");
  assert.equal(resultado.prioridade, "Media");
  assert.equal(resultado.analise_explicavel.requer_triagem, true);
});

test("o motivo explica a regra decisiva e a confiança", () => {
  const resultado = decidir("TI", "Sistema fora do ar", "O ERP está fora do ar para todos os usuários da empresa, não tem como trabalhar.");
  assert.match(resultado.motivo, /^Regra decisiva: .+ Confiança: \d+%/);
  assert.ok(resultado.casos_identificados.length > 0);
});
