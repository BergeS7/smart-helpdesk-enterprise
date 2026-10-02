/**
 * Responsabilidade: páginas públicas das empresas (link de liberação do admin e link de cadastro da equipe)
 * e as unidades da empresa. A gestão das empresas fica no Console BergeS7.
 */
import { request } from "./http";

export const consultarConviteEmpresa = (token: string) =>
  request<{ empresa: { nome: string; slug: string }; email: string }>(`/empresas/convites/${encodeURIComponent(token)}`, { auth: false });

export const ativarConviteEmpresa = (token: string, dados: { nome: string; senha: string; telefone?: string; cargo?: string; aceitaTermos: boolean }) =>
  request<{ mensagem: string; email: string; empresa: { nome: string; slug: string } }>(
    `/empresas/convites/${encodeURIComponent(token)}/ativar`,
    { method: "POST", auth: false, body: JSON.stringify(dados) },
  );

export const obterEmpresaPublica = (slug: string) =>
  request<{ nome: string; slug: string }>(`/empresas/publico/${encodeURIComponent(slug)}`, { auth: false });

/** Unidade onde a pessoa trabalha; o conjunto delas é a área de atuação da empresa. */
export type Localidade = { id: number; nome: string; municipio: string; latitude: number | null; longitude: number | null };

/** Com sessão, as da empresa do usuário; sem sessão, as da empresa do link de cadastro ou da principal. */
export const listarLocalidades = (empresaSlug?: string) =>
  request<Localidade[]>(`/empresas/localidades${empresaSlug ? `?empresa=${encodeURIComponent(empresaSlug)}` : ""}`);
