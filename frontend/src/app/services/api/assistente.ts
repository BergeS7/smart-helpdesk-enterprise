/**
 * Responsabilidade: chat do assistente da base de conhecimento.
 */
import { request } from "./http";

export type FalaAssistente = { papel: "usuario" | "assistente"; texto: string };

export type ArtigoAssistente = {
  id: number;
  titulo: string;
  resumo?: string | null;
  video_url?: string | null;
  recomendacao_id: number | null;
};

// sem_artigo: a base não tem nada parecido; sem_ia: a IA não respondeu e só os artigos voltaram.
export type SituacaoAssistente = "resolvido" | "esclarecer" | "sem_resposta" | "sem_artigo" | "sem_ia";

export type RespostaAssistente = {
  resposta: string;
  situacao: SituacaoAssistente;
  artigos: ArtigoAssistente[];
};

export function perguntarAssistente(pergunta: string, historico: FalaAssistente[]) {
  return request<RespostaAssistente>("/assistente/perguntar", {
    method: "POST",
    body: JSON.stringify({ pergunta, historico }),
  });
}

// Painel da equipe: perguntas que o assistente não respondeu, agrupadas por assunto.
export type LacunaAssistente = {
  pergunta: string;
  quantidade: number;
  usuarios: number;
  ultima_em: string;
  exemplos: string[];
  // Artigo publicado ou alterado depois da última pergunta: o assunto já foi tratado.
  artigo: { id: number; titulo: string } | null;
};

export type LacunasAssistente = {
  dias: number;
  resumo: { perguntas: number; resolvidas: number; sem_resposta: number; tokens_entrada: number; tokens_saida: number };
  itens: LacunaAssistente[];
};

export function listarLacunasAssistente() {
  return request<LacunasAssistente>("/assistente/sem-resposta");
}
