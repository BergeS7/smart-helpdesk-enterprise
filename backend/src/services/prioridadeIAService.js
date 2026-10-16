/**
 * Responsabilidade: classificação explicável de prioridade e categoria.
 * A decisão é determinística e combina texto, impacto, urgência, departamento
 * e casos empresariais, devolvendo justificativas auditáveis.
 */
function normalizarTexto(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function escaparRegex(valor) {
  return valor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const regexPorTermo = new Map();

// Casa o termo como palavra inteira (aceitando plural com "s"): "rede" não casa com "parede".
function contemTermo(texto, termo) {
  const alvo = normalizarTexto(termo);
  if (!alvo) return false;
  let regex = regexPorTermo.get(alvo);
  if (!regex) {
    regex = new RegExp(`(^|[^a-z0-9])${escaparRegex(alvo)}s?(?=[^a-z0-9]|$)`);
    regexPorTermo.set(alvo, regex);
  }
  return regex.test(texto);
}

const categoriasIA = [
  {
    categoria: "Segurança da informação",
    tipo: "Incidente",
    responsavel: "Segurança da Informação / TI",
    termos: ["virus", "malware", "ransomware", "phishing", "invasao", "invadida", "invadido", "hackeado", "hackeada", "vazamento", "senha vazada", "senha exposta", "acesso indevido"],
  },
  {
    categoria: "Problema de acesso",
    tipo: "Acesso",
    responsavel: "Suporte de Acessos / TI",
    termos: ["sem acesso", "acesso bloqueado", "login", "senha", "permissao", "usuario bloqueado", "nao consigo entrar"],
  },
  {
    categoria: "Problema financeiro",
    tipo: "Incidente",
    responsavel: "Suporte ERP / Financeiro",
    termos: ["nota fiscal", "nfe", "nf-e", "boleto", "pagamento", "pix", "cobranca", "faturamento", "financeiro"],
  },
  {
    categoria: "Problema de internet",
    tipo: "Incidente",
    responsavel: "Infraestrutura / Redes",
    termos: ["sem internet", "internet caiu", "rede", "wifi", "wi-fi", "conexao", "sem rede"],
  },
  {
    categoria: "Problema de sistema",
    tipo: "Incidente",
    responsavel: "Suporte de Sistemas",
    termos: ["sistema", "erro", "fora do ar", "travando", "lento", "erro 500", "bug", "falha"],
  },
  {
    categoria: "Solicitação de melhoria",
    tipo: "Melhoria",
    responsavel: "Analista de Sistemas / Produto",
    termos: ["melhoria", "sugestao", "nova funcionalidade", "poderia", "seria bom", "ajuste visual"],
  },
  {
    categoria: "Dúvida operacional",
    tipo: "Dúvida",
    responsavel: "Suporte Operacional",
    termos: ["duvida", "como faco", "como fazer", "orientacao", "explicar", "treinamento"],
  },
  {
    categoria: "Equipamento ou periférico",
    tipo: "Equipamento",
    responsavel: "Suporte de Hardware / TI",
    termos: ["impressora", "scanner", "toner", "monitor", "teclado", "mouse", "computador", "notebook"],
  },
];

const casosEmpresariais = [
  {
    codigo: "SISTEMA_CRITICO_FORA_DO_AR",
    nome: "Sistema crítico fora do ar",
    prioridade: "Alta",
    peso: 100,
    departamentos: ["ti", "sistemas", "tecnologia", "operacao", "atendimento", "comercial", "financeiro"],
    termos: ["fora do ar", "sistema caiu", "sistema parado", "sistema indisponivel", "indisponivel", "todos sem acesso", "ninguem acessa", "producao parada", "operacao parada", "atendimento parado", "erro geral", "erro 500", "erro no servidor"],
    motivo: "O chamado indica indisponibilidade de sistema crítico ou parada operacional.",
  },
  {
    codigo: "SEGURANCA_DADOS_LGPD",
    nome: "Incidente de segurança ou dados",
    prioridade: "Alta",
    peso: 95,
    departamentos: ["ti", "seguranca", "juridico", "compliance", "sistemas", "tecnologia"],
    termos: ["vazamento", "dados vazados", "lgpd", "senha exposta", "senha vazada", "invasao", "invadida", "invadido", "hackeado", "hackeada", "hacker", "virus", "malware", "ransomware", "phishing", "acesso indevido", "conta invadida"],
    motivo: "O chamado possui indícios de risco de segurança, vazamento de dados ou acesso indevido.",
  },
  {
    codigo: "FINANCEIRO_FATURAMENTO_PARADO",
    nome: "Financeiro, cobrança ou faturamento parado",
    prioridade: "Alta",
    peso: 85,
    departamentos: ["financeiro", "faturamento", "cobranca", "contabilidade", "comercial"],
    termos: ["nao consigo emitir nota", "nota fiscal", "nf-e", "nfe", "boleto", "pagamento", "pix", "cobranca", "faturamento parado", "financeiro parado", "sem emitir", "erro ao faturar", "cliente aguardando pagamento", "cliente aguardando boleto"],
    motivo: "O chamado impacta cobrança, faturamento, pagamento ou emissão de documentos fiscais.",
  },
  {
    codigo: "DIRETORIA_PRESIDENCIA",
    nome: "Chamado envolvendo diretoria ou presidência",
    prioridade: "Alta",
    peso: 75,
    departamentos: ["diretoria", "presidencia", "executivo", "gerencia", "administrativo"],
    termos: ["diretor", "diretoria", "presidente", "presidencia", "ceo", "urgente diretoria", "reuniao importante", "apresentacao para diretoria"],
    motivo: "O chamado envolve área executiva ou situação com impacto institucional.",
  },
  {
    codigo: "CLIENTE_SEM_ATENDIMENTO",
    nome: "Cliente sem atendimento ou operação comercial afetada",
    prioridade: "Alta",
    peso: 70,
    departamentos: ["atendimento", "comercial", "vendas", "suporte", "sac", "operacao"],
    termos: ["cliente aguardando", "cliente reclamando", "cliente sem atendimento", "fila parada", "nao consigo atender", "venda parada", "pedido parado", "sem vender", "perdendo venda", "impactando cliente"],
    motivo: "O chamado pode afetar diretamente clientes, vendas ou atendimento externo.",
  },
  {
    codigo: "INTERNET_REDE_GERAL",
    nome: "Internet ou rede parada para várias pessoas",
    prioridade: "Alta",
    peso: 70,
    departamentos: ["ti", "infraestrutura", "tecnologia", "operacao", "administrativo"],
    termos: ["sem internet", "internet caiu", "rede caiu", "sem rede", "wifi caiu", "wi-fi caiu", "todos sem internet", "todos sem rede", "rede parada", "internet parada"],
    motivo: "O chamado indica falha de rede ou internet com possível impacto coletivo.",
  },
  {
    codigo: "ACESSO_BLOQUEADO_SISTEMA_IMPORTANTE",
    nome: "Acesso bloqueado em sistema importante",
    prioridade: "Media",
    peso: 45,
    departamentos: ["ti", "sistemas", "financeiro", "comercial", "rh", "atendimento"],
    termos: ["sem acesso", "acesso bloqueado", "usuario bloqueado", "senha nao funciona", "login nao funciona", "nao consigo logar", "acesso negado", "permissao negada", "preciso de acesso"],
    motivo: "O chamado indica problema de acesso que pode impedir a execução de atividades.",
  },
  {
    codigo: "LENTIDAO_TRAVAMENTO",
    nome: "Lentidão ou travamento parcial",
    prioridade: "Media",
    peso: 35,
    departamentos: ["ti", "sistemas", "operacao", "financeiro", "comercial", "administrativo"],
    termos: ["lento", "lentidao", "travando", "demorando", "carregando muito", "sistema lento", "computador lento", "tela travando", "falhando as vezes"],
    motivo: "O chamado indica lentidão ou instabilidade parcial, mas não necessariamente parada total.",
  },
  {
    codigo: "EMAIL_PROBLEMA",
    nome: "Problema com e-mail corporativo",
    prioridade: "Media",
    peso: 30,
    departamentos: ["ti", "administrativo", "comercial", "financeiro", "rh", "atendimento"],
    termos: ["email", "e-mail", "outlook", "nao envia email", "nao recebe email", "caixa de entrada", "mensagem nao chega", "assinatura de email"],
    motivo: "O chamado envolve e-mail corporativo, podendo afetar comunicação de trabalho.",
  },
  {
    codigo: "IMPRESSORA_EQUIPAMENTO",
    nome: "Impressora ou equipamento local",
    prioridade: "Media",
    peso: 20,
    departamentos: ["administrativo", "financeiro", "rh", "operacao", "atendimento", "ti"],
    termos: ["impressora", "scanner", "toner", "papel preso", "nao imprime", "impressao", "mouse", "teclado", "monitor", "computador", "notebook"],
    motivo: "O chamado envolve equipamento local, geralmente com impacto individual ou de pequeno grupo.",
  },
  {
    codigo: "CRIACAO_USUARIO_ACESSO_NOVO",
    nome: "Criação de usuário ou liberação de acesso",
    prioridade: "Baixa",
    peso: -10,
    departamentos: ["rh", "administrativo", "ti", "sistemas", "financeiro", "comercial"],
    termos: ["criar usuario", "novo usuario", "liberar acesso", "novo colaborador", "admissao", "cadastro de usuario", "permissao nova", "acesso novo"],
    motivo: "O chamado parece ser uma solicitação administrativa de criação/liberação de acesso.",
  },
  {
    codigo: "INSTALACAO_CONFIGURACAO",
    nome: "Instalação ou configuração simples",
    prioridade: "Baixa",
    peso: -15,
    departamentos: ["ti", "administrativo", "rh", "comercial", "financeiro"],
    termos: ["instalar programa", "instalar software", "configurar", "configuracao", "atualizar programa", "formatar", "instalar impressora", "configurar assinatura"],
    motivo: "O chamado parece ser uma instalação, configuração ou ajuste programável.",
  },
  {
    codigo: "DUVIDA_ORIENTACAO",
    nome: "Dúvida ou orientação",
    prioridade: "Baixa",
    peso: -25,
    departamentos: ["administrativo", "rh", "financeiro", "comercial", "operacao", "ti"],
    termos: ["duvida", "orientacao", "como faco", "como fazer", "preciso de ajuda", "manual", "treinamento", "explicar", "me orientar"],
    motivo: "O chamado aparenta ser uma dúvida ou pedido de orientação, sem urgência operacional clara.",
  },
  {
    codigo: "MELHORIA_SEM_URGENCIA",
    nome: "Melhoria ou sugestão sem urgência",
    prioridade: "Baixa",
    peso: -30,
    departamentos: ["administrativo", "rh", "marketing", "comercial", "ti", "sistemas"],
    termos: ["melhoria", "sugestao", "quando puder", "sem urgencia", "ajuste visual", "nova funcionalidade", "seria bom", "poderia ter", "ideia"],
    motivo: "O chamado parece ser uma melhoria ou sugestão sem impacto imediato.",
  },
];

const pesosPorDepartamento = [
  { departamento: "financeiro", peso: 20, motivo: "Departamento financeiro possui maior sensibilidade operacional." },
  { departamento: "faturamento", peso: 20, motivo: "Departamento de faturamento pode impactar receita e emissão fiscal." },
  { departamento: "atendimento", peso: 18, motivo: "Departamento de atendimento pode impactar diretamente clientes." },
  { departamento: "comercial", peso: 18, motivo: "Departamento comercial pode impactar vendas e relacionamento com clientes." },
  { departamento: "operacao", peso: 18, motivo: "Departamento operacional pode indicar impacto no funcionamento da empresa." },
  { departamento: "diretoria", peso: 25, motivo: "Chamados da diretoria costumam ter maior impacto institucional." },
  { departamento: "presidencia", peso: 25, motivo: "Chamados da presidência costumam ter prioridade executiva." },
  { departamento: "ti", peso: 10, motivo: "Chamados de TI podem envolver sistemas internos importantes." },
  { departamento: "sistemas", peso: 10, motivo: "Chamados de sistemas podem afetar ferramentas corporativas." },
  { departamento: "rh", peso: 0, motivo: "Departamento RH sem indício crítico mantém prioridade padrão." },
  { departamento: "marketing", peso: -5, motivo: "Departamento marketing tende a ter menor urgência técnica, salvo casos críticos." },
];

const NIVEIS = ["Baixa", "Media", "Alta", "Crítica"];
// Faixa de pontuação de cada nível: a pontuação exibida sempre condiz com a prioridade final.
const FAIXAS = { Baixa: [0, 29], Media: [30, 64], Alta: [65, 84], "Crítica": [85, 100] };

// Trechos negados são removidos antes da análise para não disparar os termos que negam.
const negacoes = ["nao esta fora do ar", "nao caiu", "nao parou", "nao esta parado", "nao esta parada", "sem impacto", "nao e urgente", "nao tem urgencia", "sem urgencia", "nao e critico"];
const termosBaixaUrgencia = ["sem urgencia", "quando puder", "nao e urgente", "nao tem urgencia", "pode ser depois", "sem pressa"];
const termosUrgencia = ["urgente", "urgencia", "imediato", "emergencia", "critico", "critica", "agora"];
const termosParada = ["fora do ar", "parado", "parada", "parou", "caiu", "indisponivel", "nao funciona", "sem acesso", "sem internet", "sem rede", "producao parada"];
const termosColetivo = ["todos", "todas", "toda unidade", "toda a unidade", "empresa toda", "toda empresa", "toda a empresa", "varias pessoas", "varios usuarios", "equipe inteira", "setor inteiro", "filial inteira", "ninguem"];
const termosIndividual = ["somente eu", "so eu", "apenas eu", "um usuario", "apenas meu", "apenas minha", "somente meu", "somente minha"];
const termosAlternativa = ["sem alternativa", "sem contingencia", "nao ha alternativa", "nao tem como trabalhar", "nao temos como trabalhar"];
const termosFinanceiro = ["faturamento parado", "nao consigo emitir nota", "pagamento parado", "venda parada", "perdendo venda", "sem emitir", "erro ao faturar"];
const termosTempo = ["desde", "ha horas", "hoje", "ontem", "minutos"];
const termosSeguranca = ["ransomware", "vazamento", "dados vazados", "invasao", "invadida", "invadido", "malware", "virus", "phishing", "lgpd", "conta invadida", "senha vazada", "senha exposta", "hackeado", "hackeada", "hacker", "acesso indevido"];
// Indicam que o incidente de segurança já aconteceu, mesmo que o texto também traga uma dúvida.
const termosComprometimento = ["invadida", "invadido", "hackeado", "hackeada", "dados vazados", "senha vazada", "senha exposta", "acesso indevido", "cliquei", "infectado", "infectada", "criptografados", "ransomware"];
const termosSegurancaGrave = ["ransomware", "vazamento", "dados vazados", "invasao", "criptografados"];
// Pedidos de informação sobre segurança (política, treinamento) não são incidentes.
const termosInformativos = ["duvida", "gostaria de saber", "politica", "treinamento", "palestra", "orientacao", "como faco", "como fazer", "manual", "curso"];

function removerNegacoes(texto) {
  let resultado = texto;
  const encontradas = [];
  for (const negacao of negacoes) {
    if (!contemTermo(resultado, negacao)) continue;
    encontradas.push(negacao);
    resultado = resultado.replace(new RegExp(`${escaparRegex(negacao)}s?`, "g"), " ");
  }
  return { texto: resultado, negacoes: encontradas };
}

// Reconhece situações conhecidas que elevam impacto ou urgência operacional.
function analisarCasosEmpresariais({ setor, texto, segurancaReal }) {
  const textoSetor = normalizarTexto(setor);
  const casosEncontrados = [];

  for (const caso of casosEmpresariais) {
    if (caso.codigo === "SEGURANCA_DADOS_LGPD" && !segurancaReal) continue;
    const termosEncontrados = caso.termos.filter((termo) => contemTermo(texto, termo));
    if (termosEncontrados.length === 0) continue;
    const departamentoEncontrado = caso.departamentos.some((departamento) => contemTermo(textoSetor, departamento));
    casosEncontrados.push({
      codigo: caso.codigo,
      nome: caso.nome,
      prioridade: caso.prioridade,
      peso: caso.peso + (departamentoEncontrado ? 10 : 0),
      termos: termosEncontrados.slice(0, 5),
      motivo: caso.motivo,
    });
  }

  return casosEncontrados.sort((a, b) => b.peso - a.peso);
}

function calcularPesoDepartamento(setor) {
  const textoSetor = normalizarTexto(setor);
  return pesosPorDepartamento.filter((item) => contemTermo(textoSetor, item.departamento));
}

function classificarCategoria({ setor, titulo, descricao }) {
  const texto = normalizarTexto(`${setor} ${titulo} ${descricao}`);
  let melhor = null;

  for (const categoria of categoriasIA) {
    const termos = categoria.termos.filter((termo) => contemTermo(texto, termo));
    if (termos.length > 0 && (!melhor || termos.length > melhor.termos.length)) {
      melhor = { ...categoria, termos };
    }
  }

  if (!melhor) {
    return {
      categoria: "Não classificado",
      tipo: "Incidente",
      responsavel_sugerido: "Triagem de Suporte",
      termos: [],
    };
  }

  return {
    categoria: melhor.categoria,
    tipo: melhor.tipo,
    responsavel_sugerido: melhor.responsavel,
    termos: melhor.termos,
  };
}

function gerarRespostaInicial({ titulo, setor, categoria, prioridade }) {
  const area = setor || "sua área";
  if (categoria === "Segurança da informação") {
    return `Olá, recebemos seu chamado sobre segurança. Evite usar o equipamento ou a conta afetada até nossa orientação; vamos analisar o incidente com prioridade.`;
  }
  if (categoria === "Problema financeiro") {
    return `Olá, recebemos seu chamado sobre ${titulo}. Como envolve financeiro/faturamento, vamos priorizar a análise e verificar o impacto na emissão, cobrança ou pagamento.`;
  }
  if (categoria === "Problema de acesso") {
    return `Olá, recebemos seu chamado sobre acesso. Vamos verificar usuário, permissão e bloqueios para liberar o acesso com segurança.`;
  }
  if (categoria === "Problema de internet") {
    return `Olá, recebemos seu chamado sobre rede/internet. Vamos verificar se o impacto é individual ou geral e atuar na conexão.`;
  }
  if (categoria === "Solicitação de melhoria") {
    return `Olá, recebemos sua sugestão de melhoria. Ela será analisada e priorizada conforme impacto e esforço.`;
  }
  return `Olá, recebemos seu chamado da área ${area}. A prioridade inicial foi classificada como ${prioridade} e o suporte iniciará a triagem.`;
}

function calcularConfianca({ sinais, descricao, setor, perguntas }) {
  const confianca = 45
    + Math.min(20, sinais.length * 4)
    + (String(descricao || "").length >= 80 ? 15 : 0)
    + (setor ? 10 : 0)
    + (perguntas.length === 0 ? 10 : 0);
  return Math.min(98, confianca);
}

// Ponto de entrada público da classificação, com decisão e explicações.
// A prioridade parte do caso empresarial mais forte (ou Média) e cada regra abaixo
// sobe ou desce o nível, registrando o motivo; a pontuação apenas detalha a decisão.
function decidirPrioridadeChamado({ setor, titulo, descricao }) {
  const classificacao = classificarCategoria({ setor, titulo, descricao });

  if (!normalizarTexto(titulo) || !normalizarTexto(descricao)) {
    const perguntas = ["Descreva o problema com mais detalhes."];
    return {
      prioridade: "Media",
      pontuacao: 0,
      confianca: 45,
      analise_explicavel: { prioridade: "Media", pontuacao: 0, confianca: 45, dimensoes: { impacto: 0, urgencia: 0, abrangencia: 0, risco: 0 }, sinais: [], negacao_detectada: false, perguntas_pendentes: perguntas, regra_decisiva: "Informações insuficientes para análise completa.", requer_triagem: true },
      categoria: classificacao.categoria,
      tipo_sugerido: classificacao.tipo,
      responsavel_sugerido: classificacao.responsavel_sugerido,
      resposta_inicial: gerarRespostaInicial({ titulo, setor, categoria: classificacao.categoria, prioridade: "Media" }),
      casos_identificados: [],
      urgencia_exagerada: false,
      motivo: "Classificação padrão: informações insuficientes para análise completa.",
    };
  }

  const textoOriginal = normalizarTexto(`${titulo} ${descricao}`);
  const { texto, negacoes: negacoesEncontradas } = removerNegacoes(textoOriginal);
  const tem = (termos) => termos.filter((termo) => contemTermo(texto, termo));

  const parada = tem(termosParada);
  const coletivo = tem(termosColetivo);
  const individual = tem(termosIndividual);
  const alternativa = tem(termosAlternativa);
  const financeiro = tem(termosFinanceiro);
  const urgente = tem(termosUrgencia);
  const baixaUrgencia = termosBaixaUrgencia.filter((termo) => contemTermo(textoOriginal, termo));
  const seguranca = tem(termosSeguranca);
  const segurancaGrave = tem(termosSegurancaGrave);
  const segurancaReal = seguranca.length > 0 && (tem(termosInformativos).length === 0 || tem(termosComprometimento).length > 0);

  const casos = analisarCasosEmpresariais({ setor, texto, segurancaReal });
  const departamentos = calcularPesoDepartamento(setor);
  const casoPrincipal = casos[0];
  const existeCasoAlta = casos.some((caso) => caso.prioridade === "Alta");
  const temParada = parada.length > 0;
  const temColetivo = coletivo.length > 0;
  const motivos = [];

  let nivel = casoPrincipal ? NIVEIS.indexOf(casoPrincipal.prioridade) : 1;
  let regra = casoPrincipal ? `Caso empresarial: ${casoPrincipal.nome}.` : "Nenhum caso empresarial específico; prioridade média como ponto de partida.";
  for (const caso of casos) {
    motivos.push(`Caso empresarial identificado: ${caso.nome}. Termos encontrados: ${caso.termos.join(", ")}. ${caso.motivo}`);
  }

  if (segurancaReal && nivel < 2) {
    nivel = 2;
    regra = "Risco de segurança, dados ou LGPD.";
  }
  if (temParada && temColetivo && nivel < 2) {
    nivel = 2;
    regra = "Indisponibilidade com impacto coletivo.";
    motivos.push(`Parada com impacto coletivo: ${[...parada, ...coletivo].slice(0, 4).join(", ")}.`);
  }
  const departamentoSensivel = departamentos.find((item) => item.peso >= 18);
  if (temParada && departamentoSensivel && nivel === 1) {
    nivel = 2;
    regra = "Interrupção operacional em departamento sensível.";
    motivos.push(departamentoSensivel.motivo);
  }
  if (individual.length > 0 && !temColetivo && !temParada && !segurancaReal && nivel === 1) {
    nivel = 0;
    regra = "Impacto individual sem interrupção operacional.";
    motivos.push(`Impacto individual informado: ${individual.join(", ")}.`);
  }
  if (baixaUrgencia.length > 0 && !temParada && !segurancaReal && nivel > 0) {
    nivel = 0;
    regra = "Solicitante indicou que não há urgência.";
    motivos.push(`Usuário indicou baixa urgência: ${baixaUrgencia.slice(0, 3).join(", ")}.`);
  }
  if (negacoesEncontradas.length > 0 && !temParada && !segurancaReal && nivel > 0) {
    nivel -= 1;
    regra = "Solicitante negou indisponibilidade ou impacto.";
    motivos.push(`Negação detectada: ${negacoesEncontradas.join(", ")}.`);
  }

  const critico = (segurancaReal && (segurancaGrave.length > 0 || temColetivo))
    || (temParada && temColetivo && (alternativa.length > 0 || financeiro.length > 0));
  if (critico) {
    nivel = 3;
    regra = segurancaReal ? "Incidente de segurança grave ou com impacto coletivo." : "Indisponibilidade coletiva sem alternativa ou com impacto financeiro.";
  }

  // Urgência declarada só reforça o prazo quando há impacto real; sozinha, não muda o nível.
  const urgenciaExagerada = urgente.length > 0 && !temParada && !segurancaReal && !existeCasoAlta;
  if (urgente.length > 0) {
    motivos.push(urgenciaExagerada
      ? `Usuário indicou urgência (${urgente.slice(0, 3).join(", ")}), mas não há impacto que a justifique; nível mantido.`
      : `Usuário indicou urgência: ${urgente.slice(0, 3).join(", ")}.`);
  }

  const impacto = Math.min(40, (temParada ? 20 : 0) + (temColetivo ? 15 : 0) + (financeiro.length ? 12 : 0) + (existeCasoAlta ? 8 : 0));
  const urgencia = Math.min(25, (urgente.length && !urgenciaExagerada ? 8 : 0) + (alternativa.length ? 10 : 0) + (temParada ? 7 : 0));
  const abrangencia = temColetivo ? 20 : individual.length ? 3 : 8;
  const risco = Math.min(25, (segurancaReal ? 25 : 0) + (financeiro.length ? 10 : 0));
  const sinais = [...new Set([...parada, ...coletivo, ...alternativa, ...(segurancaReal ? seguranca : []), ...financeiro])].slice(0, 8);

  const perguntas = [];
  if (!temColetivo && individual.length === 0) perguntas.push("Quantas pessoas ou unidades estão afetadas?");
  if (alternativa.length === 0) perguntas.push("Existe alternativa temporária ou contingência?");
  if (tem(termosTempo).length === 0) perguntas.push("Há quanto tempo o problema começou?");
  const confianca = calcularConfianca({ sinais, descricao, setor, perguntas });

  if (nivel === 3 && confianca < 60) {
    nivel = 2;
    motivos.push("Indícios críticos com confiança baixa: mantida como Alta até a triagem.");
  }

  const prioridade = NIVEIS[nivel];
  const [minimo, maximo] = FAIXAS[prioridade];
  const pontuacao = Math.max(minimo, Math.min(maximo, impacto + urgencia + abrangencia + risco));
  const dimensoes = { impacto, urgencia, abrangencia, risco };
  const explicavel = {
    prioridade,
    pontuacao,
    confianca,
    dimensoes,
    sinais,
    negacao_detectada: negacoesEncontradas.length > 0,
    perguntas_pendentes: perguntas,
    regra_decisiva: regra,
    requer_triagem: confianca < 65,
  };

  motivos.unshift(`Regra decisiva: ${regra} Confiança: ${confianca}%. Dimensões — impacto ${impacto}, urgência ${urgencia}, abrangência ${abrangencia}, risco ${risco}.`);
  return {
    prioridade,
    pontuacao,
    confianca,
    analise_explicavel: explicavel,
    categoria: classificacao.categoria,
    tipo_sugerido: classificacao.tipo,
    responsavel_sugerido: classificacao.responsavel_sugerido,
    resposta_inicial: gerarRespostaInicial({ titulo, setor, categoria: classificacao.categoria, prioridade }),
    casos_identificados: casos.map((caso) => ({ codigo: caso.codigo, nome: caso.nome, prioridade_base: caso.prioridade, termos: caso.termos })),
    urgencia_exagerada: urgenciaExagerada,
    motivo: motivos.join(" | "),
  };
}

module.exports = {
  decidirPrioridadeChamado,
  casosEmpresariais,
  categoriasIA,
};
