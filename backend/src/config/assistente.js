/**
 * Responsabilidade: limites do assistente da base de conhecimento; ajuste aqui, não no código.
 * Quase todos existem para gastar poucos tokens por pergunta.
 */
module.exports = Object.freeze({
  // Versão fixa, não "-latest": o alias muda de modelo sem aviso e os parâmetros aceitos mudam junto.
  MODELO: process.env.ASSISTENTE_MODELO || "gemini-3.5-flash-lite",
  // Respostas curtas: passo a passo de suporte, não redação.
  MAX_TOKENS: 1024,
  // Raciocínio mínimo: é o que mais consome tokens e não é preciso para seguir um artigo.
  // Nem todo modelo aceita "minimal" (o 3.8-flash exige "low"); ao trocar o modelo, confira aqui.
  NIVEL_RACIOCINIO: "minimal",
  // Na busca do chat, a IA decide se o artigo serve: aceita candidatos com confiança menor
  // que a do formulário de chamado, porque a pergunta de conversa tem muitas palavras soltas.
  CONFIANCA_MINIMA: 0.15,
  // O Gemini gratuito costuma responder em ~1 s, mas em horários de pico o serviço inteiro fica
  // lento (medido: 12 a 25 s em todos os modelos). Nova tentativa não ajuda nesse caso, então a
  // demora tem uma espera só; depois dela o chat mostra os artigos encontrados.
  TEMPO_LIMITE_MS: 15000,
  // Erro de sobrecarga (429/503) volta na hora: esse vale tentar de novo.
  TENTATIVAS_EXTRAS: 1,
  PERGUNTA_MAX_CARACTERES: 600,
  // Só as últimas mensagens vão para a IA, e cada uma cortada: o histórico é o que mais cresce.
  HISTORICO_MAX_MENSAGENS: 4,
  HISTORICO_MAX_CARACTERES: 400,
  // Artigos enviados como contexto por pergunta e o tamanho de cada trecho.
  MAX_ARTIGOS: 2,
  ARTIGO_MAX_CARACTERES: 1800,
  MAX_PASSOS: 12,
  // Perguntas por usuário na janela, para uma aba esquecida em loop não virar conta alta.
  LIMITE_PERGUNTAS: 20,
  JANELA_LIMITE_MINUTOS: 10,
  // Painel da equipe: perguntas que o assistente não resolveu, agrupadas por assunto.
  LACUNAS_DIAS: 30,
  LACUNAS_MAX_PERGUNTAS: 1000,
  LACUNAS_MAX_ITENS: 15,
  LACUNAS_EXEMPLOS: 3,
  // Fração de termos em comum para duas perguntas contarem como o mesmo assunto.
  LACUNAS_SOBREPOSICAO: 0.4,
  // Além das palavras genéricas dos chamados: o banco só descarta "não" com acento, e no chat
  // muita gente escreve sem. Escritas por extenso; o banco as reduz ao radical.
  LACUNAS_PALAVRAS_GENERICAS: "nao sistema consegue",
});
