/**
 * Responsabilidade: chamados: listagem, criação, atualização, comentários, anexos, respostas rápidas, filtros e avaliação.
 */
import { API_URL, getToken, request } from "./http";
import type { ApiAnexo, ApiAvaliacao, ApiChamado, ApiComentario, DashboardResumo, FiltroSalvo, FiltrosChamados, NovoChamado, RespostaRapida } from "./types";

export function obterDashboard(periodo?: number) {
  return request<DashboardResumo>(
    `/dashboard${periodo ? `?periodo=${periodo}` : ""}`,
  );
}

export function listarChamados(filtros: FiltrosChamados = {}) {
  const qs = new URLSearchParams();
  Object.entries(filtros).forEach(([k, v]) => {
    if (v !== undefined && v !== "" && v !== false) qs.set(k, String(v));
  });
  return request<ApiChamado[]>(`/chamados${qs.toString() ? `?${qs}` : ""}`);
}

export function listarChamadosDoUsuario() {
  return request<ApiChamado[]>("/chamados/usuario/me");
}

export function buscarChamado(id: number | string) {
  return request<ApiChamado>(`/chamados/${id}`);
}

export function criarChamado(chamado: NovoChamado) {
  return request<ApiChamado>("/chamados", {
    method: "POST",
    body: JSON.stringify(chamado),
  });
}

export function atualizarChamado(
  id: number | string,
  dados: Partial<ApiChamado>,
) {
  return request<ApiChamado>(`/chamados/${id}`, {
    method: "PATCH",
    body: JSON.stringify(dados),
  });
}

export function excluirChamado(id: number | string) {
  return request<{ mensagem: string }>(`/chamados/${id}`, { method: "DELETE" });
}

export function atualizarChamadoStatus(id: number | string, status: string) {
  return atualizarChamado(id, { status });
}

export function assumirChamado(id: number | string) {
  return request<ApiChamado>(`/chamados/${id}/assumir`, { method: "PATCH" });
}

export function listarRespostasRapidas() {
  return request<RespostaRapida[]>("/chamados/respostas-rapidas/lista");
}

export function criarRespostaRapida(
  dados: Pick<RespostaRapida, "titulo" | "mensagem" | "categoria">,
) {
  return request<RespostaRapida>("/chamados/respostas-rapidas", {
    method: "POST",
    body: JSON.stringify(dados),
  });
}

export function listarFiltrosSalvos() {
  return request<FiltroSalvo[]>("/chamados/filtros-salvos/lista");
}

export function salvarFiltroChamados(nome: string, filtros: FiltrosChamados) {
  return request<FiltroSalvo>("/chamados/filtros-salvos", {
    method: "POST",
    body: JSON.stringify({ nome, filtros }),
  });
}

export function excluirFiltroChamados(id: number | string) {
  return request<{ mensagem: string }>(`/chamados/filtros-salvos/${id}`, {
    method: "DELETE",
  });
}

export function encerrarChamado(id: number | string) {
  return request<ApiChamado>(`/chamados/${id}/encerrar`, { method: "PATCH" });
}

export function reabrirChamado(id: number | string, motivo: string) {
  return request<ApiChamado>(`/chamados/${id}/reabrir`, {
    method: "PATCH",
    body: JSON.stringify({ motivo }),
  });
}

export function adicionarComentario(id: number | string, mensagem: string) {
  return request<ApiComentario>(`/chamados/${id}/comentarios`, {
    method: "POST",
    body: JSON.stringify({ mensagem }),
  });
}

export function anexarArquivos(
  id: number | string,
  arquivos: FileList | File[],
) {
  const formData = new FormData();
  Array.from(arquivos).forEach((arquivo) =>
    formData.append("arquivos", arquivo),
  );
  return request<ApiAnexo[]>(`/chamados/${id}/anexos`, {
    method: "POST",
    body: formData,
    isFormData: true,
  });
}

// Usa Blob para baixar conteúdo protegido sem colocar o token na URL.
export async function baixarAnexoChamado(
  chamadoId: number | string,
  anexo: ApiAnexo,
) {
  const response = await fetch(
    `${API_URL}/chamados/${chamadoId}/anexos/${anexo.id}/download`,
    { headers: { Authorization: `Bearer ${getToken() || ""}` } },
  );
  if (!response.ok) throw new Error("Não foi possível baixar o anexo.");
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = anexo.nome_original;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function obterBlobAnexoChamado(
  chamadoId: number | string,
  anexo: ApiAnexo,
) {
  const response = await fetch(
    `${API_URL}/chamados/${chamadoId}/anexos/${anexo.id}/download`,
    { headers: { Authorization: `Bearer ${getToken() || ""}` } },
  );
  if (!response.ok) throw new Error("Não foi possível carregar a prévia do anexo.");
  return response.blob();
}

export async function baixarHistoricoChamadoPdf(chamado: ApiChamado) {
  const response = await fetch(`${API_URL}/chamados/${chamado.id}/historico.pdf`, {
    headers: { Authorization: `Bearer ${getToken() || ""}` },
  });
  if (!response.ok) throw new Error("Não foi possível gerar o PDF do chamado.");
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = `historico-${chamado.numero_chamado || chamado.id}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function avaliarChamado(
  id: number | string,
  nota: number,
  comentario?: string,
) {
  return request<ApiAvaliacao>(`/chamados/${id}/avaliar`, {
    method: "POST",
    body: JSON.stringify({ nota, comentario }),
  });
}
