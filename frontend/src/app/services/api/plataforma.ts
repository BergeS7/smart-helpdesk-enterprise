/**
 * Responsabilidade: administração da plataforma SaaS (empresas clientes) e as páginas públicas de liberação e cadastro.
 */
import { request } from "./http";

export type PlanoEmpresa = "essencial" | "profissional" | "enterprise";
export type StatusEmpresa = "ativa" | "suspensa" | "cancelada";

export type EmpresaPlataforma = {
  id: number;
  nome: string;
  slug: string;
  cnpj: string | null;
  plano: PlanoEmpresa;
  status: StatusEmpresa;
  email_responsavel: string | null;
  criado_em: string;
  atualizado_em: string;
  usuarios_ativos?: number;
  admins?: number;
  tecnicos?: number;
  chamados_abertos?: number;
  ativos?: number;
  convite_pendente_ate?: string | null;
};

export type ConviteEmpresa = { token: string; expira_em: string; email: string };

export type NovaEmpresa = { nome: string; cnpj?: string; plano: PlanoEmpresa; email_responsavel: string };

export const listarEmpresasPlataforma = () => request<EmpresaPlataforma[]>("/plataforma/empresas");

export const criarEmpresaPlataforma = (dados: NovaEmpresa) =>
  request<{ empresa: EmpresaPlataforma; convite: ConviteEmpresa }>("/plataforma/empresas", { method: "POST", body: JSON.stringify(dados) });

export const atualizarEmpresaPlataforma = (id: number, dados: Partial<Pick<EmpresaPlataforma, "nome" | "cnpj" | "plano" | "status" | "email_responsavel">>) =>
  request<EmpresaPlataforma>(`/plataforma/empresas/${id}`, { method: "PATCH", body: JSON.stringify(dados) });

export const gerarConviteEmpresa = (id: number) =>
  request<{ convite: ConviteEmpresa }>(`/plataforma/empresas/${id}/convite`, { method: "POST" });

export const consultarConviteEmpresa = (token: string) =>
  request<{ empresa: { nome: string; slug: string }; email: string }>(`/empresas/convites/${encodeURIComponent(token)}`, { auth: false });

export const ativarConviteEmpresa = (token: string, dados: { nome: string; senha: string; telefone?: string; cargo?: string; aceitaTermos: boolean }) =>
  request<{ mensagem: string; email: string; empresa: { nome: string; slug: string } }>(
    `/empresas/convites/${encodeURIComponent(token)}/ativar`,
    { method: "POST", auth: false, body: JSON.stringify(dados) },
  );

export const obterEmpresaPublica = (slug: string) =>
  request<{ nome: string; slug: string }>(`/empresas/publico/${encodeURIComponent(slug)}`, { auth: false });

/** Links montados no endereço em que o sistema está aberto (o mesmo que o cliente vai usar). */
export const linkAtivacaoEmpresa = (token: string) => `${window.location.origin}/ativar/${token}`;
export const linkCadastroEmpresa = (slug: string) => `${window.location.origin}/cadastro/${slug}`;
