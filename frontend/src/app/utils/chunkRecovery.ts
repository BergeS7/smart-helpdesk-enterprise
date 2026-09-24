/**
 * Responsabilidade: Recuperação de chunks antigos após deploy; recarrega a página uma vez quando um módulo não é encontrado.
 */
const CHUNK_RECOVERY_KEY = "smart-helpdesk:chunk-recovery";

export const isStaleChunkError = (error: Error) =>
  /dynamically imported module|failed to fetch.*module|importing a module script|loading chunk/i.test(error.message);

// Depois de um deploy, a aba aberta pode pedir um chunk que não existe mais: recarrega
// buscando a versão nova, no máximo uma vez a cada 30s para não entrar em loop.
export function recoverFromStaleChunk() {
  const lastRecovery = Number(sessionStorage.getItem(CHUNK_RECOVERY_KEY) || 0);
  if (Date.now() - lastRecovery < 30_000) return;
  sessionStorage.setItem(CHUNK_RECOVERY_KEY, String(Date.now()));
  const url = new URL(window.location.href);
  url.searchParams.set("app-update", String(Date.now()));
  window.location.replace(url.toString());
}
