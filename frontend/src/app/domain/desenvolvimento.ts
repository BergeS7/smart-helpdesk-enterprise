/**
 * Responsabilidade: liga e desliga, sem apagar nada, tudo o que é de demandas de desenvolvimento
 * (Bug, Melhoria, Automação, Integração, Dashboard / Relatório, Novo Sistema) e os projetos da TI.
 *
 * Oculto por padrão enquanto o fluxo é redefinido. Código, telas, rotas da API e dados continuam
 * no lugar; para voltar a exibir, defina VITE_MODULO_DESENVOLVIMENTO=true no ambiente do build
 * (no Vercel: Settings → Environment Variables) e publique de novo.
 */
export const MODULO_DESENVOLVIMENTO_ATIVO = import.meta.env.VITE_MODULO_DESENVOLVIMENTO === "true";

/** Rótulos dos tipos de chamado que viram demanda de desenvolvimento (mesma lista do backend). */
export const TIPOS_CHAMADO_DESENVOLVIMENTO = ["Bug", "Melhoria", "Automação", "Integração", "Dashboard / Relatório", "Novo Sistema"] as const;

const TIPOS_NORMALIZADOS = new Set([
  ...TIPOS_CHAMADO_DESENVOLVIMENTO.map((tipo) => tipo.toLowerCase()),
  "automacao", "integracao", "dashboard / relatorio",
]);

export function ehTipoDesenvolvimento(tipo?: string | null) {
  return TIPOS_NORMALIZADOS.has(String(tipo || "").trim().toLowerCase());
}

/**
 * Tipos oferecidos no formulário de abertura do portal. Com o módulo oculto, os tipos de
 * desenvolvimento somem também quando vêm do catálogo da empresa (ex.: "Melhoria" cadastrada lá),
 * porque um chamado desses sairia da fila de atendimento sem ninguém ver.
 */
export function tiposParaAbertura(tiposDoCatalogo: string[], moduloAtivo = MODULO_DESENVOLVIMENTO_ATIVO) {
  if (moduloAtivo) return Array.from(new Set([...tiposDoCatalogo, ...TIPOS_CHAMADO_DESENVOLVIMENTO]));
  return tiposDoCatalogo.filter((tipo) => !ehTipoDesenvolvimento(tipo));
}
