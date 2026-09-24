/**
 * Responsabilidade: limites da busca de artigos relacionados; ajuste aqui, não no código da busca.
 * Valores calibrados com test/fixtures/baseConhecimento.js.
 */
module.exports = Object.freeze({
  // Confiança de 0 a 1. Abaixo do mínimo o artigo nunca é apresentado (confiança baixa).
  CONFIANCA_MINIMA: 0.4,
  CONFIANCA_ALTA: 0.7,
  // Composição da confiança: termos do texto encontrados no artigo e semelhança com o título.
  PESO_TERMOS: 0.7,
  PESO_TITULO: 0.3,
  // Termo achado em título, palavras-chave, resumo, problema ou sintomas vale 1; no restante, isto.
  PESO_TERMO_SECUNDARIO: 0.5,
  // Quantos termos casados já bastam para cobertura total, para textos longos não diluírem a nota.
  TERMOS_REFERENCIA: 5,
  // Título parecido o bastante para entrar como candidato mesmo sem termo em comum (erro de digitação).
  SIMILARIDADE_TITULO_CANDIDATO: 0.5,
  MAX_RESULTADOS: 3,
  TEXTO_MIN_CARACTERES: 10,
  TEXTO_MAX_CARACTERES: 2000,
  // Enquanto o usuário digita, o mesmo artigo exibido de novo nesta janela reaproveita a recomendação.
  JANELA_RECOMENDACAO_MINUTOS: 30,
  // Efetividade: artigo muito recomendado que resolve pouco vira candidato a revisão.
  // Taxa de sucesso = resoluções por autoatendimento / recomendações exibidas.
  REVISAO_MIN_RECOMENDACOES: 10,
  REVISAO_TAXA_SUCESSO_MAXIMA: 0.2,
  // Problemas recorrentes: cada termo agrupa os chamados que o citam, e termos que dividem
  // boa parte dos mesmos chamados viram um só problema (ex.: "impressora" e "imprimir").
  RECORRENCIA_DIAS: 30,
  RECORRENCIA_MIN_CHAMADOS: 5,
  // Fração de chamados em comum (0 a 1) para dois termos contarem como o mesmo problema.
  RECORRENCIA_SOBREPOSICAO: 0.4,
  // Palavras comuns a qualquer chamado, que não indicam o assunto. Escritas por extenso:
  // o banco as reduz ao radical com a mesma configuração da busca.
  RECORRENCIA_PALAVRAS_GENERICAS: "erro problema consigo acesso ajuda urgente preciso favor bom dia tarde noite obrigado solicitação dúvida desde hoje ontem",
  RECORRENCIA_MAX_CHAMADOS: 2000,
  RECORRENCIA_MAX_GRUPOS: 10,
  // O dashboard recarrega a cada minuto: a análise fica em cache (Redis, quando configurado)
  // e é descartada sempre que um artigo é criado ou alterado.
  RECORRENCIA_CACHE_SEGUNDOS: 300,
});
