/**
 * Responsabilidade: catálogo de serviços e base de conhecimento.
 */
import { request } from "./http";
import type { ArtigoBase, ArtigoSugerido, CatalogoItem } from "./types";

export function listarCatalogo(tipo: "departamentos" | "tipos" | "cargos") {
  return request<CatalogoItem[]>(`/catalogos/${tipo}`);
}

export function criarCatalogo(
  tipo: "departamentos" | "tipos",
  dados: Pick<CatalogoItem, "nome" | "descricao">,
) {
  return request<CatalogoItem>(`/catalogos/${tipo}`, {
    method: "POST",
    body: JSON.stringify(dados),
  });
}

export function atualizarCatalogo(
  tipo: "departamentos" | "tipos",
  id: number | string,
  dados: Partial<CatalogoItem>,
) {
  return request<CatalogoItem>(`/catalogos/${tipo}/${id}`, {
    method: "PUT",
    body: JSON.stringify(dados),
  });
}

// "todos" traz também rascunhos e arquivados; o backend só atende quem gerencia a base.
export function listarBaseConhecimento(q?: string, { todos = false } = {}) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (todos) params.set("todos", "true");
  const query = params.toString();
  return request<ArtigoBase[]>(
    `/catalogos/base-conhecimento${query ? `?${query}` : ""}`,
  );
}

export function sugerirArtigosBase(texto: string) {
  return request<ArtigoSugerido[]>(
    `/catalogos/base-conhecimento/sugestoes?texto=${encodeURIComponent(texto)}`,
  );
}

export function registrarCliqueRecomendacao(id: number) {
  return request<null>(`/catalogos/base-conhecimento/recomendacoes/${id}/clique`, { method: "POST" });
}

export function responderRecomendacao(id: number, resolveu: boolean) {
  return request<null>(`/catalogos/base-conhecimento/recomendacoes/${id}/resposta`, {
    method: "POST",
    body: JSON.stringify({ resolveu }),
  });
}

export function obterArtigoBase(id: number | string) {
  return request<ArtigoBase>(`/catalogos/base-conhecimento/${id}`);
}

export function enviarImagemArtigo(arquivo: File) {
  const formData = new FormData();
  formData.append("imagem", arquivo);
  return request<{ imagem: string; imagem_url: string }>("/catalogos/base-conhecimento/imagens", {
    method: "POST",
    body: formData,
    isFormData: true,
  });
}

export function criarArtigoBase(dados: Partial<ArtigoBase>) {
  return request<ArtigoBase>("/catalogos/base-conhecimento", {
    method: "POST",
    body: JSON.stringify(dados),
  });
}

export function atualizarArtigoBase(
  id: number | string,
  dados: Partial<ArtigoBase>,
) {
  return request<ArtigoBase>(`/catalogos/base-conhecimento/${id}`, {
    method: "PUT",
    body: JSON.stringify(dados),
  });
}

export function registrarVisualizacaoArtigo(id: number | string) {
  return request<ArtigoBase>(`/catalogos/base-conhecimento/${id}/visualizar`, {
    method: "POST",
  });
}

export function avaliarArtigoBase(id: number | string, util: boolean) {
  return request<ArtigoBase>(`/catalogos/base-conhecimento/${id}/avaliar`, {
    method: "POST",
    body: JSON.stringify({ util }),
  });
}
