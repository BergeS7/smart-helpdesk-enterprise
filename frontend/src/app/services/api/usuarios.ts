/**
 * Responsabilidade: usuários, perfil próprio e permissões.
 */
import { ApiError, request } from "./http";
import type { ApiUsuario } from "./http";
import type { PermissionDefinition, PermissionKey } from "./types";

export function listarUsuariosAdmin(
  params: { status?: string; perfil?: string; q?: string } = {},
) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => v && qs.set(k, String(v)));
  return request<ApiUsuario[]>(`/usuarios${qs.toString() ? `?${qs}` : ""}`);
}

/** Quanto da faixa de técnicos do plano a empresa usa; a empresa principal vem como isenta. */
export type UsoPlano =
  | { isenta: true }
  | {
      isenta: false;
      plano: string;
      plano_nome: string;
      tecnicos: number;
      tecnicos_incluidos: number;
      tecnicos_extras: number;
      valor_tecnico_extra: number;
      mensalidade: number;
    };

export function obterUsoPlano() {
  return request<UsoPlano>("/usuarios/uso-plano");
}

/**
 * Executa a ação e, se o servidor avisar que ela cria um técnico além da faixa do plano (cobrado à parte),
 * pergunta ao admin e repete com a confirmação. Recusou: devolve null e nada muda.
 */
export async function comConfirmacaoDeTecnicoExtra<T>(
  acao: (confirmarExtra: boolean) => Promise<T>,
): Promise<T | null> {
  try {
    return await acao(false);
  } catch (error) {
    if (!(error instanceof ApiError) || error.dados?.codigo !== "TECNICO_EXTRA") throw error;
    const aviso = String(error.dados.erro ?? error.message);
    if (!window.confirm(`${aviso}\n\nO técnico extra entra na próxima cobrança. Confirmar?`)) return null;
    return acao(true);
  }
}

export function criarUsuarioAdmin(
  dados: Partial<ApiUsuario> & { senha: string },
  confirmarExtra = false,
) {
  return request<ApiUsuario>("/usuarios", {
    method: "POST",
    body: JSON.stringify({ ...dados, confirmar_extra: confirmarExtra }),
  });
}

export function atualizarUsuarioAdmin(
  id: number | string,
  dados: Partial<ApiUsuario>,
  confirmarExtra = false,
) {
  return request<ApiUsuario>(`/usuarios/${id}`, {
    method: "PUT",
    body: JSON.stringify({ ...dados, confirmar_extra: confirmarExtra }),
  });
}

export function aprovarUsuario(id: number, confirmarExtra = false) {
  return request<{ mensagem: string; usuario: ApiUsuario }>(
    `/usuarios/${id}/aprovar`,
    { method: "PATCH", body: JSON.stringify({ confirmar_extra: confirmarExtra }) },
  );
}

export function rejeitarUsuario(id: number) {
  return request<{ mensagem: string; usuario: ApiUsuario }>(
    `/usuarios/${id}/rejeitar`,
    { method: "PATCH" },
  );
}

export function excluirUsuarioAdmin(id: number | string) {
  return request<{ mensagem: string }>(`/usuarios/${id}`, { method: "DELETE" });
}

export function obterMeuPerfil() {
  return request<ApiUsuario>("/usuarios/me");
}

export function atualizarMeuPerfil(
  dados: Partial<Pick<ApiUsuario, "nome" | "telefone" | "departamento" | "municipio" | "unidade" | "cargo">>,
) {
  return request<ApiUsuario>("/usuarios/me", {
    method: "PUT",
    body: JSON.stringify(dados),
  });
}

export function atualizarMinhaFotoPerfil(arquivo: File) {
  const formData = new FormData();
  formData.append("foto", arquivo);
  return request<ApiUsuario>("/usuarios/me/foto", {
    method: "PATCH",
    body: formData,
    isFormData: true,
  });
}

export function removerMinhaFotoPerfil() {
  return request<ApiUsuario>("/usuarios/me/foto", { method: "DELETE" });
}

export function obterMinhasPermissoes() {
  return request<{ permissions: PermissionKey[] }>("/permissoes/me");
}

export function listarCatalogoPermissoes() {
  return request<PermissionDefinition[]>("/permissoes/catalog");
}

export function obterPermissoesUsuario(id: number | string) {
  return request<{ usuario: ApiUsuario; permissions: PermissionKey[] }>(
    `/permissoes/users/${id}`,
  );
}

export function atualizarPermissoesUsuario(
  id: number | string,
  permissions: PermissionKey[],
) {
  return request<{ usuario_id: number; permissions: PermissionKey[] }>(
    `/permissoes/users/${id}`,
    { method: "PUT", body: JSON.stringify({ permissions }) },
  );
}
