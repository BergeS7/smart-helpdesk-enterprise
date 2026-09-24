/**
 * Responsabilidade: configurações, logos, avisos, notificações, push e diagnóstico do sistema.
 */
import { getToken, request } from "./http";
import type { ApiAvisoSistema, ConfiguracoesSistema, Notificacao } from "./types";

export const obterPushConfig = () => request<{ publicKey: string }>("/notificacoes/push/config");

export const obterPushStatus = (endpoint: string) => request<{ enabled: boolean }>("/notificacoes/push/status", { method: "POST", body: JSON.stringify({ endpoint }) });

export const registrarPush = (subscription: PushSubscriptionJSON) => request("/notificacoes/push/subscribe", { method: "POST", body: JSON.stringify(subscription) });

export const removerPush = (endpoint: string) => request("/notificacoes/push/unsubscribe", { method: "POST", body: JSON.stringify({ endpoint }) });

export const testarPush = (endpoint: string) => request<{ mensagem: string }>("/notificacoes/push/test", { method: "POST", body: JSON.stringify({ endpoint }) });

export type SystemDiagnostics = {
  ok:boolean;
  api:{status:string;uptimeSeconds:number;timestamp:string};
  database:{status:string;latencyMs:number};
  redis?:{status:string;latencyMs:number};
  agent:{status:string;total:number;current:number;stale:number;lastHeartbeat?:string|null};
  process?:{node:string;rssMb:number;heapUsedMb:number};
  requests?:{totalRequests:number;errors5xx:number;last5Minutes:{requests:number;errors5xx:number;latencyP50Ms:number;latencyP95Ms:number}};
  recentErrors:Array<{id:string;timestamp:string;source:string;level:string;message:string;requestId?:string|null;path?:string|null}>;
};

export function getSystemDiagnostics() { return request<SystemDiagnostics>("/system/diagnostics"); }

export async function reportFrontendError(error: Error, componentStack?: string) {
  if (!getToken()) return;
  const fingerprint = `${error.name}:${error.message}:${window.location.pathname}`;
  const now = Date.now();
  const previous = sessionStorage.getItem("smart_helpdesk_last_frontend_error");
  if (previous) {
    try {
      const parsed = JSON.parse(previous) as { fingerprint?: string; timestamp?: number };
      if (parsed.fingerprint === fingerprint && now - Number(parsed.timestamp || 0) < 60_000) return;
    } catch { /* Registro inválido não deve impedir o diagnóstico atual. */ }
  }
  sessionStorage.setItem("smart_helpdesk_last_frontend_error", JSON.stringify({ fingerprint, timestamp: now }));
  try {
    await request("/system/errors/frontend", { method:"POST", body:JSON.stringify({message:error.message,stack:`${error.stack||""}\n${componentStack||""}`,path:window.location.pathname}) });
  } catch { /* O registro de erro não pode provocar uma segunda falha na interface. */ }
}

export function obterConfiguracoesSistema() {
  return request<ConfiguracoesSistema>("/configuracoes");
}

export function salvarConfiguracoesSistema(dados: ConfiguracoesSistema) {
  return request<ConfiguracoesSistema>("/configuracoes", {
    method: "PUT",
    body: JSON.stringify(dados),
  });
}

export function atualizarLogoSistema(arquivo: File) {
  const formData = new FormData();
  formData.append("logo", arquivo);
  return request<ConfiguracoesSistema>("/configuracoes/logo", {
    method: "PATCH",
    body: formData,
    isFormData: true,
  });
}

export function atualizarLogoSistema1(arquivo: File) {
  const formData = new FormData();
  formData.append("logo", arquivo);
  return request<ConfiguracoesSistema>("/configuracoes/logo1", {
    method: "PATCH",
    body: formData,
    isFormData: true,
  });
}

export function listarAvisosSistemaAtivos() {
  return request<ApiAvisoSistema[]>("/avisos/ativos", { auth: false });
}

export function listarAvisosSistemaAdmin() {
  return request<ApiAvisoSistema[]>("/avisos/admin");
}

export function criarAvisoSistema(dados: Partial<ApiAvisoSistema>) {
  return request<ApiAvisoSistema>("/avisos", {
    method: "POST",
    body: JSON.stringify(dados),
  });
}

export function atualizarAvisoSistema(
  id: number | string,
  dados: Partial<ApiAvisoSistema>,
) {
  return request<ApiAvisoSistema>(`/avisos/${id}`, {
    method: "PUT",
    body: JSON.stringify(dados),
  });
}

export function excluirAvisoSistema(id: number | string) {
  return request<{ mensagem: string }>(`/avisos/${id}`, { method: "DELETE" });
}

export function listarNotificacoes() {
  return request<Notificacao[]>("/notificacoes");
}

export function marcarNotificacoesLidas(id?: number | string) {
  return request<{ mensagem: string }>(
    id ? `/notificacoes/${id}/ler` : "/notificacoes/ler",
    { method: "PATCH" },
  );
}
