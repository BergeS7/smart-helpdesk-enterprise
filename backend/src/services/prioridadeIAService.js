function normalizarTexto(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function contemTermo(texto, termo) {
  return texto.includes(normalizarTexto(termo));
}

const categoriasIA = [
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
    termos: ["vazamento", "dados vazados", "lgpd", "senha exposta", "senha vazada", "invasao", "hackeado", "hacker", "virus", "malware", "ransomware", "phishing", "acesso indevido", "conta invadida"],
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
    termos: ["diretor", "diretoria", "presidente", "presidencia", "ceo", "gestor", "gerente", "urgente diretoria", "reuniao importante", "apresentacao para diretoria"],
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

function analisarCasosEmpresariais({ setor, titulo, descricao }) {
  const textoSetor = normalizarTexto(setor);
  const textoGeral = normalizarTexto(`${setor} ${titulo} ${descricao}`);

  const casosEncontrados = [];

  for (const caso of casosEmpresariais) {
    const termosEncontrados = caso.termos.filter((termo) => contemTermo(textoGeral, termo));
    const departamentoEncontrado = caso.departamentos.some((departamento) => contemTermo(textoSetor, departamento));

    if (termosEncontrados.length > 0) {
      let pesoFinal = caso.peso;
      if (departamentoEncontrado) pesoFinal += 10;
      casosEncontrados.push({
        codigo: caso.codigo,
        nome: caso.nome,
        prioridade: caso.prioridade,
        peso: pesoFinal,
        termos: termosEncontrados.slice(0, 5),
        motivo: caso.motivo,
      });
    }
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

function analisarDimensoes({ titulo, descricao, setor, casos }) {
  const texto=normalizarTexto(`${titulo} ${descricao}`), tem=(termos)=>termos.filter(t=>contemTermo(texto,t));
  const negacoes=["nao esta fora do ar","nao parou","sem impacto","nao e urgente","sem urgencia"];
  const negado=negacoes.some(t=>contemTermo(texto,t));
  const coletivo=tem(["todos","toda unidade","empresa toda","varias pessoas","equipe inteira","filial inteira"]);
  const individual=tem(["somente eu","so eu","um usuario","apenas meu"]);
  const parada=tem(["fora do ar","parado","indisponivel","nao funciona","sem acesso","producao parada"]);
  const alternativa=tem(["sem alternativa","sem contingencia","nao tem como trabalhar"]);
  const seguranca=tem(["ransomware","vazamento","dados vazados","invasao","malware","phishing","lgpd","conta invadida"]);
  const financeiro=tem(["faturamento parado","nao consigo emitir nota","pagamento parado","venda parada","perdendo venda"]);
  const urgente=tem(["urgente","imediato","emergencia","critico","agora"]);
  let impacto=Math.min(40,(parada.length?20:0)+(coletivo.length?15:0)+(financeiro.length?12:0)+(casos.some(c=>c.prioridade==="Alta")?8:0));
  let urgencia=Math.min(25,(urgente.length?8:0)+(alternativa.length?10:0)+(parada.length?7:0));
  let abrangencia=Math.min(20,(coletivo.length?20:individual.length?3:8));
  let risco=Math.min(25,(seguranca.length?25:0)+(financeiro.length?10:0));
  if(negado){impacto=Math.max(0,impacto-15);urgencia=Math.max(0,urgencia-10)}
  const pontuacao=Math.min(100,impacto+urgencia+abrangencia+risco);
  const sinais=[...new Set([...parada,...coletivo,...alternativa,...seguranca,...financeiro])].slice(0,8);
  const perguntas=[];if(!coletivo.length&&!individual.length)perguntas.push("Quantas pessoas ou unidades estão afetadas?");if(!alternativa.length)perguntas.push("Existe alternativa temporária ou contingência?");if(!tem(["desde","ha horas","hoje","minutos"]).length)perguntas.push("Há quanto tempo o problema começou?");
  let confianca=45+Math.min(20,sinais.length*4)+(String(descricao||"").length>=80?15:0)+(setor?10:0)+(perguntas.length===0?10:0);confianca=Math.min(98,confianca);
  const critico=seguranca.length>0||(parada.length>0&&coletivo.length>0&&(alternativa.length>0||financeiro.length>0));
  let prioridade=critico?"Crítica":pontuacao>=65?"Alta":pontuacao>=30?"Media":"Baixa";
  if(confianca<60&&prioridade==="Crítica")prioridade="Alta";
  const decisivo=seguranca.length?"Risco de segurança, dados ou LGPD.":parada.length&&coletivo.length?"Indisponibilidade com impacto coletivo.":financeiro.length?"Impacto financeiro ou comercial identificado.":parada.length?"Interrupção operacional identificada.":"Impacto limitado ou informações ainda incompletas.";
  return {prioridade,pontuacao,confianca,dimensoes:{impacto,urgencia,abrangencia,risco},sinais,negacao_detectada:negado,perguntas_pendentes:perguntas,regra_decisiva:decisivo,requer_triagem:confianca<65};
}

function decidirPrioridadeChamado({ setor, titulo, descricao }) {
  const motivos = [];
  const casos = analisarCasosEmpresariais({ setor, titulo, descricao });
  const departamentos = calcularPesoDepartamento(setor);
  const classificacao = classificarCategoria({ setor, titulo, descricao });
  let pontuacao = 0;

  for (const caso of casos) {
    pontuacao += caso.peso;
    motivos.push(`Caso empresarial identificado: ${caso.nome}. Termos encontrados: ${caso.termos.join(", ")}. ${caso.motivo}`);
  }

  for (const departamento of departamentos) {
    pontuacao += departamento.peso;
    motivos.push(departamento.motivo);
  }

  const textoDescricao = normalizarTexto(descricao);
  const textoTitulo = normalizarTexto(titulo);
  const textoCompleto = normalizarTexto(`${titulo} ${descricao}`);

  if (!titulo || !descricao || !setor) {
    const explicavelInsuficiente = analisarDimensoes({ titulo, descricao, setor, casos });
    return {
      prioridade: "Media",
      pontuacao: 0,
      confianca: Math.min(55, explicavelInsuficiente.confianca),
      analise_explicavel: { ...explicavelInsuficiente, prioridade: "Media", requer_triagem: true },
      categoria: classificacao.categoria,
      tipo_sugerido: classificacao.tipo,
      responsavel_sugerido: classificacao.responsavel_sugerido,
      resposta_inicial: gerarRespostaInicial({ titulo, setor, categoria: classificacao.categoria, prioridade: "Media" }),
      casos_identificados: [],
      urgencia_exagerada: false,
      motivo: "Classificação padrão: informações insuficientes para análise completa.",
    };
  }

  if (textoTitulo.length < 5 || textoDescricao.length < 15) {
    pontuacao -= 5;
    motivos.push("Título ou descrição muito curtos. A IA manteve cautela na classificação.");
  }

  if (textoDescricao.length > 350) {
    pontuacao += 8;
    motivos.push("Descrição longa e detalhada pode indicar maior complexidade do chamado.");
  }

  const termosUrgencia = ["urgente", "urgencia", "imediato", "emergencia", "critico", "critica", "agora", "rapido", "prioridade"];
  const encontrouUrgencia = termosUrgencia.filter((termo) => contemTermo(textoCompleto, termo));
  const termosBaixaUrgencia = ["sem urgencia", "quando puder", "nao e urgente", "pode ser depois", "melhoria", "sugestao"];
  const encontrouBaixaUrgencia = termosBaixaUrgencia.filter((termo) => contemTermo(textoCompleto, termo));

  if (encontrouUrgencia.length > 0) {
    pontuacao += 20;
    motivos.push(`Usuário indicou urgência: ${encontrouUrgencia.slice(0, 3).join(", ")}.`);
  }

  if (encontrouBaixaUrgencia.length > 0) {
    pontuacao -= 25;
    motivos.push(`Usuário indicou baixa urgência: ${encontrouBaixaUrgencia.slice(0, 3).join(", ")}.`);
  }

  let prioridade = "Media";
  if (pontuacao >= 70) prioridade = "Alta";
  else if (pontuacao <= 10) prioridade = "Baixa";

  const existeCasoAlta = casos.some((caso) => caso.prioridade === "Alta");
  const existeCasoBaixa = casos.some((caso) => caso.prioridade === "Baixa");
  if (existeCasoAlta && pontuacao >= 60) prioridade = "Alta";
  if (!existeCasoAlta && existeCasoBaixa && pontuacao <= 20) prioridade = "Baixa";

  const urgenciaExagerada = encontrouUrgencia.length > 0 && !existeCasoAlta && pontuacao <= 45;
  if (urgenciaExagerada) {
    motivos.push("A IA detectou possível urgência exagerada: o texto usa termos urgentes, mas os casos empresariais indicam impacto moderado/baixo.");
    if (prioridade === "Alta") prioridade = "Media";
  }

  if (casos.length === 0 && motivos.length === 0) {
    prioridade = "Media";
    motivos.push("Nenhum caso empresarial específico foi identificado. Classificação mantida como prioridade média.");
  }

  const explicavel=analisarDimensoes({titulo,descricao,setor,casos});
  prioridade=explicavel.prioridade;
  pontuacao=explicavel.pontuacao;
  motivos.unshift(`Regra decisiva: ${explicavel.regra_decisiva} Confiança: ${explicavel.confianca}%. Dimensões — impacto ${explicavel.dimensoes.impacto}, urgência ${explicavel.dimensoes.urgencia}, abrangência ${explicavel.dimensoes.abrangencia}, risco ${explicavel.dimensoes.risco}.`);
  return {
    prioridade,
    pontuacao,
    confianca: explicavel.confianca,
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

function calcularSLA(prioridade) {
  if (prioridade === "Crítica") return { respostaMinutos: 15, resolucaoMinutos: 120, label: "Responder em até 15min / resolver em até 2h" };
  if (prioridade === "Alta") return { respostaMinutos: 60, resolucaoMinutos: 480, label: "Responder em até 1h / resolver em até 8h" };
  if (prioridade === "Baixa") return { respostaMinutos: 1440, resolucaoMinutos: 2880, label: "Responder em até 24h / resolver em até 48h" };
  return { respostaMinutos: 240, resolucaoMinutos: 1440, label: "Responder em até 4h / resolver em até 24h" };
}

module.exports = {
  decidirPrioridadeChamado,
  calcularSLA,
  casosEmpresariais,
  categoriasIA,
};
