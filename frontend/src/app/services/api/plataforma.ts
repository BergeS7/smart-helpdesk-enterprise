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

export type OperacaoEmpresa = {
  empresa: Pick<EmpresaPlataforma, "id" | "nome" | "slug" | "plano" | "status">;
  chamados: {
    abertos: number;
    sla_vencido: number;
    sem_responsavel: number;
    criados_30d: number;
    resolvidos_30d: number;
    horas_media_resolucao_30d: string | null;
    por_status: { status: string; total: number }[];
    recentes: {
      id: number; numero_chamado: string | null; titulo: string; status: string; prioridade: string | null;
      tipo_chamado: string | null; criado_em: string; sla_vencido: boolean; responsavel: string | null;
    }[];
  };
  usuarios: { perfil: string; ativos: number; pendentes: number }[];
  satisfacao_90d: { media: string | null; avaliacoes: number };
  ativos: { total: number; comunicando_24h: number };
  base: { publicados: number };
};

export type AcessoPlataforma = { id: number; usuario_email: string; recurso: string; ip: string | null; criado_em: string };

/** Só leitura; cada chamada fica registrada no histórico de acessos da empresa. */
export const consultarOperacaoEmpresa = (id: number) => request<OperacaoEmpresa>(`/plataforma/empresas/${id}/operacao`);

export const listarAcessosPlataforma = (id: number) => request<AcessoPlataforma[]>(`/plataforma/empresas/${id}/acessos`);

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
