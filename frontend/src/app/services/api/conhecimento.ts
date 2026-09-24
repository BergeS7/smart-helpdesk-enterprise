/**
 * Responsabilidade: catálogo de serviços e base de conhecimento.
 */
import { request } from "./http";
import type { ArtigoBase, CatalogoItem } from "./types";

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

export function listarBaseConhecimento(q?: string) {
  return request<ArtigoBase[]>(
    `/catalogos/base-conhecimento${q ? `?q=${encodeURIComponent(q)}` : ""}`,
  );
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
