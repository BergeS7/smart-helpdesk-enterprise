/**
 * Responsabilidade: equipes e seus membros.
 */
import { request } from "./http";
import type { ApiTeam, ApiTeamMember } from "./types";

export function listarTeams() {
  return request<ApiTeam[]>("/teams");
}

export function buscarTeam(id: number | string) {
  return request<ApiTeam>(`/teams/${id}`);
}

export function criarTeam(
  dados: Pick<
    ApiTeam,
    "name" | "description" | "color" | "manager_id" | "distribution_mode"
  >,
) {
  return request<ApiTeam>("/teams", {
    method: "POST",
    body: JSON.stringify(dados),
  });
}

export function atualizarTeam(id: number | string, dados: Partial<ApiTeam>) {
  return request<ApiTeam>(`/teams/${id}`, {
    method: "PATCH",
    body: JSON.stringify(dados),
  });
}

export function excluirTeam(id: number | string) {
  return request<void>(`/teams/${id}`, { method: "DELETE" });
}

export function listarMembrosTeam(id: number | string) {
  return request<ApiTeamMember[]>(`/teams/${id}/members`);
}

export function adicionarMembroTeam(id: number | string, user_id: number) {
  return request<{ mensagem: string }>(`/teams/${id}/members`, {
    method: "POST",
    body: JSON.stringify({ user_id }),
  });
}

export function removerMembroTeam(
  id: number | string,
  userId: number | string,
) {
  return request<void>(`/teams/${id}/members/${userId}`, { method: "DELETE" });
}

export function trocarGerenteTeam(id: number | string, user_id: number) {
  return request<ApiTeam>(`/teams/${id}/manager`, {
    method: "PUT",
    body: JSON.stringify({ user_id }),
  });
}
