/**
 * Responsabilidade: usuários, perfil próprio e permissões.
 */
import { request } from "./http";
import type { ApiUsuario } from "./http";
import type { PermissionDefinition, PermissionKey } from "./types";

export function listarUsuariosAdmin(
  params: { status?: string; perfil?: string; q?: string } = {},
) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => v && qs.set(k, String(v)));
  return request<ApiUsuario[]>(`/usuarios${qs.toString() ? `?${qs}` : ""}`);
}

export function criarUsuarioAdmin(
  dados: Partial<ApiUsuario> & { senha: string },
) {
  return request<ApiUsuario>("/usuarios", {
    method: "POST",
    body: JSON.stringify(dados),
  });
}

export function atualizarUsuarioAdmin(
  id: number | string,
  dados: Partial<ApiUsuario>,
) {
  return request<ApiUsuario>(`/usuarios/${id}`, {
    method: "PUT",
    body: JSON.stringify(dados),
  });
}

export function aprovarUsuario(id: number) {
  return request<{ mensagem: string; usuario: ApiUsuario }>(
    `/usuarios/${id}/aprovar`,
    { method: "PATCH" },
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
