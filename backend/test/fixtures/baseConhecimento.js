/**
 * Responsabilidade: artigos e descrições de chamado usados para validar a busca da base de conhecimento.
 */
const ARTIGOS = [
  {
    chave: "impressora",
    titulo: "Impressora não imprime",
    categoria: "Equipamento",
    palavras_chave: "impressora, spooler, fila de impressão, documento preso",
    resumo: "Reiniciar o spooler resolve a maioria dos casos de documentos presos.",
    problema: "Documentos ficam presos na fila de impressão e nada sai da impressora.",
    sintomas: "Fila com status Erro. Impressora aparece online, mas não imprime.",
    solucao: "Reiniciar o serviço Spooler de Impressão e reenviar o documento.",
    passos: [{ texto: "Pressione Win+R e digite services.msc" }, { texto: "Reinicie o serviço Spooler de Impressão" }],
    conteudo: "Quando documentos ficam presos, o spooler precisa ser reiniciado.",
    status: "publicado",
    visibilidade: "publico",
  },
  {
    chave: "email_celular",
    titulo: "Configurar e-mail corporativo no celular",
    categoria: "E-mail",
    palavras_chave: "email, outlook, celular, android, iphone",
    resumo: "Como adicionar a conta de e-mail da empresa no aplicativo Outlook do celular.",
    problema: "Usuário não recebe os e-mails da empresa no celular.",
    sintomas: "Aplicativo pede senha repetidamente ou não sincroniza a caixa de entrada.",
    solucao: "Remover a conta e adicioná-la novamente pelo aplicativo Outlook.",
    passos: [{ texto: "Instale o Outlook" }, { texto: "Adicione a conta com o e-mail corporativo" }],
    conteudo: "Configuração do e-mail corporativo em dispositivos móveis.",
    status: "publicado",
    visibilidade: "publico",
  },
  {
    chave: "erp_lento",
    titulo: "Sistema ERP lento ou travando",
    categoria: "Sistemas",
    palavras_chave: "erp, lentidão, travamento, sistema lento",
    resumo: "Limpar o cache do ERP e verificar a conexão com o servidor.",
    problema: "O ERP demora para abrir telas e trava ao emitir relatórios.",
    sintomas: "Telas carregando por muito tempo, sistema não responde.",
    solucao: "Limpar o cache local do ERP e reiniciar a aplicação.",
    passos: [{ texto: "Feche o ERP" }, { texto: "Apague a pasta de cache" }, { texto: "Abra o ERP novamente" }],
    conteudo: "Procedimento para lentidão no sistema ERP.",
    status: "publicado",
    visibilidade: "publico",
  },
  {
    chave: "senha_ad",
    titulo: "Desbloquear conta e redefinir senha no Active Directory",
    categoria: "Acesso",
    palavras_chave: "senha, conta bloqueada, active directory, login",
    resumo: "Procedimento interno da equipe para desbloquear usuários no AD.",
    problema: "Usuário com a conta bloqueada por tentativas de senha.",
    sintomas: "Mensagem de conta bloqueada ao entrar no computador.",
    solucao: "Desbloquear a conta no console do AD e forçar a troca de senha.",
    passos: [{ texto: "Abra Usuários e Computadores do AD" }, { texto: "Desbloqueie a conta e redefina a senha" }],
    conteudo: "Uso exclusivo da equipe técnica.",
    status: "publicado",
    visibilidade: "interno",
  },
  {
    chave: "boleto_rascunho",
    titulo: "Emitir segunda via de boleto",
    categoria: "Financeiro",
    palavras_chave: "boleto, segunda via, financeiro",
    resumo: "Rascunho ainda não revisado.",
    conteudo: "Em elaboração.",
    status: "rascunho",
    visibilidade: "publico",
  },
];

// Casos do item 23: texto digitado pelo usuário e o que se espera da recomendação.
const CONSULTAS = {
  altaRelacao: "Minha impressora não imprime nada, os documentos ficam presos na fila de impressão",
  parcial: "O sistema está demorando para gerar relatório",
  textoLongo: "Bom dia, desde ontem a impressora do financeiro não imprime, já reiniciei o computador e continua igual, por favor ajudem",
  semRelacao: "Preciso de uma cadeira nova para a recepção",
  interno: "Esqueci minha senha e a conta do computador está bloqueada",
  comErroDeDigitacao: "impresora nao imprime",
  rascunho: "Preciso da segunda via do boleto",
};

module.exports = { ARTIGOS, CONSULTAS };
