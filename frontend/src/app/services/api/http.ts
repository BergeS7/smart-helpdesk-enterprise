/**
 * Responsabilidade: cliente HTTP da API: URL base, sessão local e request autenticado com tratamento de erros.
 */
import { login } from "./auth";

export const API_URL =
  import.meta.env.VITE_API_URL ?? "http://localhost:3001/api";

export type PerfilUsuario =
  "usuario" | "tecnico" | "supervisor" | "admin" | "desenvolvedor" | "super_admin";

export type UsuarioLogado = {
  id: number;
  nome: string;
  email: string;
  perfil: PerfilUsuario;
  status?: string;
  telefone?: string;
  departamento?: string;
  municipio?: string;
  unidade?: string;
  cargo?: string;
  foto_perfil?: string | null;
  foto_url?: string;
};

export type ApiUsuario = UsuarioLogado & {
  criado_em?: string;
  aprovado_em?: string | null;
  aprovado_por?: number | null;
  ultimo_login_em?: string | null;
  bloqueado_ate?: string | null;
};

export type LoginResposta = { usuario: UsuarioLogado; token: string };

export type RequestOptions = RequestInit & {
  auth?: boolean;
  isFormData?: boolean;
  raw?: boolean;
};

export function getToken() {
  return localStorage.getItem("smart_helpdesk_token");
}

export function getUsuarioLogado(): UsuarioLogado | null {
  const raw = localStorage.getItem("smart_helpdesk_usuario");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UsuarioLogado;
  } catch {
    return null;
  }
}

export function salvarSessao(dados: LoginResposta) {
  if (getUsuarioLogado() && getUsuarioLogado()?.id !== dados.usuario.id) limparSessao();
  localStorage.setItem("smart_helpdesk_token", dados.token);
  localStorage.setItem("smart_helpdesk_usuario", JSON.stringify(dados.usuario));
}

export function atualizarUsuarioLocal(usuario: UsuarioLogado) {
  localStorage.setItem("smart_helpdesk_usuario", JSON.stringify(usuario));
}

export function limparSessao() {
  // Cancelar o endpoint também protege saídas offline e sessões expiradas.
  if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    void navigator.serviceWorker.getRegistration("/").then(async (registration) => {
      if (!registration) return;
      const subscription = await registration.pushManager?.getSubscription();
      if (subscription) await subscription.unsubscribe();
      const notifications = await registration.getNotifications();
      notifications.forEach((notification) => notification.close());
    }).catch(() => undefined);
  }
  localStorage.removeItem("smart_helpdesk_push_owner");
  localStorage.removeItem("smart_helpdesk_token");
  localStorage.removeItem("smart_helpdesk_usuario");
}

export function getSessaoPersistida(): LoginResposta | null {
  const token = getToken();
  const usuario = getUsuarioLogado();
  if (!token || !usuario) {
    if (token || usuario) limparSessao();
    return null;
  }
  return { token, usuario };
}

// Executa JSON autenticado, normaliza falhas e encerra sessões expiradas.
export async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!options.isFormData && !headers.has("Content-Type") && options.body)
    headers.set("Content-Type", "application/json");
  if (options.auth !== false) {
    const token = getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }
  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (options.raw) return response as unknown as T;
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const mensagem =
      `${data?.erro ?? "Erro ao comunicar com a API"} ${data?.detalhe ?? ""}`.toLowerCase();
    if (
      response.status === 401 &&
      (mensagem.includes("jwt") ||
        mensagem.includes("token") ||
        mensagem.includes("expir"))
    ) {
      limparSessao();
      if (typeof window !== "undefined") {
        window.setTimeout(() => {
          window.location.reload();
        }, 250);
      }
      throw new Error("Sua sessão expirou. Faça login novamente.");
    }
    const detalhe = data?.detalhe ? ` Detalhe: ${data.detalhe}` : "";
    const extras = data?.detalhes?.length
      ? ` ${data.detalhes.join(" | ")}`
      : "";
    const codigo = data?.requestId ? ` Código: ${data.requestId}` : "";
    throw new Error(
      `${data?.erro ?? "Erro ao comunicar com a API"}${detalhe}${extras}${codigo}`,
    );
  }
  return data as T;
}
