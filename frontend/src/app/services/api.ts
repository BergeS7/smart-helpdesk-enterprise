/**
 * Responsabilidade: contrato único de comunicação do frontend com a API.
 * Centraliza tipos, sessão, autenticação, erros e operações de cada recurso.
 */
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

type RequestOptions = RequestInit & {
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
  localStorage.setItem("smart_helpdesk_token", dados.token);
  localStorage.setItem("smart_helpdesk_usuario", JSON.stringify(dados.usuario));
}

export function atualizarUsuarioLocal(usuario: UsuarioLogado) {
  localStorage.setItem("smart_helpdesk_usuario", JSON.stringify(usuario));
}

export function limparSessao() {
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

export type SystemDiagnostics = {
  ok:boolean;
  api:{status:string;uptimeSeconds:number;timestamp:string};
  database:{status:string;latencyMs:number};
  redis?:{status:string;latencyMs:number};
  agent:{status:string;total:number;current:number;stale:number;lastHeartbeat?:string|null};
  process?:{node:string;rssMb:number;heapUsedMb:number};
  requests?:{totalRequests:number;errors5xx:number;last5Minutes:{requests:number;errors5xx:number;latencyP50Ms:number;latencyP95Ms:number}};
  recentErrors:Array<{id:string;timestamp:string;source:string;level:string;message:string;requestId?:string|null;path?:string|null}>;
};

export function getSystemDiagnostics() { return request<SystemDiagnostics>("/system/diagnostics"); }

export async function reportFrontendError(error: Error, componentStack?: string) {
  if (!getToken()) return;
  const fingerprint = `${error.name}:${error.message}:${window.location.pathname}`;
  const now = Date.now();
  const previous = sessionStorage.getItem("smart_helpdesk_last_frontend_error");
  if (previous) {
    try {
      const parsed = JSON.parse(previous) as { fingerprint?: string; timestamp?: number };
      if (parsed.fingerprint === fingerprint && now - Number(parsed.timestamp || 0) < 60_000) return;
    } catch { /* Registro inválido não deve impedir o diagnóstico atual. */ }
  }
  sessionStorage.setItem("smart_helpdesk_last_frontend_error", JSON.stringify({ fingerprint, timestamp: now }));
  try {
    await request("/system/errors/frontend", { method:"POST", body:JSON.stringify({message:error.message,stack:`${error.stack||""}\n${componentStack||""}`,path:window.location.pathname}) });
  } catch { /* O registro de erro não pode provocar uma segunda falha na interface. */ }
}

// Executa JSON autenticado, normaliza falhas e encerra sessões expiradas.
async function request<T>(
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

export type ApiMovimentacao = {
  id: number;
  chamado_id: number;
  usuario_id?: number | null;
  autor_nome?: string;
  autor_perfil?: string;
  tipo: string;
  descricao: string;
  criado_em?: string;
};
export type ApiComentario = {
  id: number;
  chamado_id: number;
  usuario_id?: number | null;
  autor_nome?: string;
  autor_perfil?: string;
  foto_url?: string;
  mensagem: string;
  criado_em?: string;
};
export type ApiAnexo = {
  id: number;
  chamado_id: number;
  usuario_id?: number | null;
  nome_original: string;
  nome_arquivo: string;
  mime_type?: string;
  tamanho?: number;
  caminho: string;
  url?: string;
  criado_em?: string;
};
export type ApiAvaliacao = {
  id: number;
  chamado_id: number;
  usuario_id?: number | null;
  nota: number;
  comentario?: string;
  criado_em?: string;
  atualizado_em?: string;
};

export type ApiChamado = {
  id: number;
  numero_chamado?: string;
  titulo: string;
  descricao: string;
  tipo_chamado?: string;
  categoria_ia?: string;
  prioridade: string;
  prioridade_ia?: string;
  prioridade_ia_motivo?: string;
  prioridade_ia_confianca?: number;
  prioridade_ia_analise?: {
    pontuacao?: number;
    confianca?: number;
    dimensoes?: {
      impacto: number;
      urgencia: number;
      abrangencia: number;
      risco: number;
    };
    sinais?: string[];
    perguntas_pendentes?: string[];
    regra_decisiva?: string;
    requer_triagem?: boolean;
    negacao_detectada?: boolean;
  };
  prioridade_manual_motivo?: string;
  prioridade_alterada_por?: number | null;
  prioridade_alterada_em?: string | null;
  status: string;
  usuario_id?: number | null;
  solicitante?: string;
  solicitante_nome?: string;
  solicitante_email?: string;
  solicitante_foto_url?: string;
  solicitante_id?: number | null;
  email_solicitante?: string;
  telefone_solicitante?: string;
  cargo_solicitante?: string;
  setor?: string;
  responsavel_id?: number | null;
  team_id?: number | null;
  team_name?: string;
  municipio_solicitante?: string;
  unidade_solicitante?: string;
  ativo_id?: number | null;
  ativo_hostname?: string;
  ativo_patrimonio?: string;
  ativo_municipio?: string;
  ativo_unidade?: string;
  responsavel?: string;
  responsavel_nome?: string;
  responsavel_email?: string;
  responsavel_foto_url?: string;
  ia_responsavel_sugerido?: string;
  ia_resposta_inicial?: string;
  ia_duplicado_de?: number | null;
  ia_duplicidade_motivo?: string;
  sla?: string;
  sla_resposta_minutos?: number;
  sla_resolucao_minutos?: number;
  sla_limite_resposta?: string;
  sla_limite_resolucao?: string;
  primeira_resposta_em?: string | null;
  vencido?: boolean;
  sla_status?: "normal" | "alerta" | "vencido" | string;
  sla_minutos_restantes?: number | null;
  sla_pausado_em?: string | null;
  sla_tempo_pausado_segundos?: number;
  criado_em?: string;
  atualizado_em?: string;
  finalizado_em?: string;
  reaberto_em?: string;
  total_comentarios?: number;
  ultimo_comentario_perfil?: string | null;
  ultimo_comentario_em?: string | null;
  total_anexos?: number;
  avaliacao_nota?: number | null;
  comentarios?: ApiComentario[];
  anexos?: ApiAnexo[];
  movimentacoes?: ApiMovimentacao[];
  avaliacao?: ApiAvaliacao | null;
  pode_avaliar?: boolean;
  demanda_desenvolvimento?: {
    id: number;
    code?: string;
    nature?: string;
    status?: string;
    current_process?: string;
    problem?: string;
    expected_result?: string;
    frequency?: string;
    executions_per_month?: number;
    people_involved?: number;
    current_time_minutes?: number;
    systems?: string[];
    no_delivery_impact?: string;
    expected_benefits?: string[];
    created_at?: string;
    updated_at?: string;
  } | null;
  ia?: {
    prioridade: string;
    pontuacao: number;
    motivo: string;
    categoria?: string;
    responsavel_sugerido?: string;
    resposta_inicial?: string;
  };
};

export type NovoChamado = {
  titulo: string;
  descricao: string;
  tipo_chamado?: string;
  ativo_id?: string | number;
};
export type NovoCadastroUsuario = {
  nome: string;
  email: string;
  senha: string;
  telefone?: string;
  departamento?: string;
  municipio?: string;
  unidade?: string;
  regiao?: string;
  ativo_id?: string | number;
  cargo?: string;
};
export type FiltrosChamados = {
  q?: string;
  status?: string;
  prioridade?: string;
  departamento?: string;
  municipio?: string;
  unidade?: string;
  team_id?: string | number;
  usuario?: string;
  data_inicio?: string;
  data_fim?: string;
  responsavel?: string;
  responsavel_id?: string | number;
  tipo_chamado?: string;
  categoria?: string;
  vencidos?: boolean;
  sem_responsavel?: boolean;
  meus?: boolean;
  solicitante_me?: boolean;
  fila?: boolean;
  closed?: boolean;
  historico?: boolean;
};

export type DashboardResumo = {
  totalChamados: number;
  abertos: number;
  emAndamento: number;
  aguardandoUsuario?: number;
  aguardandoTerceiros?: number;
  concluidos: number;
  vencidos: number;
  semResponsavel?: number;
  altaPrioridadeAberta?: number;
  usuarios: number;
  usuariosPendentes: number;
  prioridadeAlta: number;
  prioridadeMedia: number;
  prioridadeBaixa: number;
  tempoMedioRespostaMinutos?: number;
  tempoMedioResolucaoMinutos?: number;
  satisfacaoMedia?: number;
  avaliacoesTotal?: number;
  porStatus: { status: string; total: number }[];
  porPrioridade: { prioridade: string; total: number }[];
  porDepartamento: { departamento: string; total: number }[];
  porTecnico?: { tecnico: string; total: number }[];
  chamadosRecentes?: Partial<ApiChamado>[];
  evolucao?: { data: string; recebidos: number; resolvidos: number }[];
  slaEmRisco?: number;
  ativos?: { total: number; online: number; offline: number };
  comparativo?: { atual: number; anterior: number };
  periodoDias?: number;
};

export type ReportDistribution = { label: string; total: number };
export type ReportMetrics = {
  received: number; concluded: number; open: number; overdue: number;
  unassigned: number; reopened: number; critical: number;
  firstResponseMinutes: number | null; firstResponseBase: number;
  resolutionMinutes: number | null; resolutionBase: number;
  slaRate: number | null; slaBase: number;
  satisfaction: number | null; ratings: number;
  byStatus: ReportDistribution[]; byPriority: ReportDistribution[];
  byDepartment: ReportDistribution[]; byTechnician: ReportDistribution[];
  byTeam: ReportDistribution[]; byMunicipality: ReportDistribution[]; byUnit: ReportDistribution[];
  methodology: Record<string, string>;
};

export type CatalogoItem = {
  id: number;
  nome: string;
  descricao?: string;
  ativo?: boolean;
  criado_em?: string;
};
export type ArtigoBase = {
  id: number;
  titulo: string;
  categoria?: string;
  palavras_chave?: string;
  conteudo: string;
  ativo?: boolean;
  visualizacoes?: number;
  util_total?: number;
  nao_util_total?: number;
  criado_em?: string;
  atualizado_em?: string;
};
export type RespostaRapida = {
  id: number;
  titulo: string;
  mensagem: string;
  categoria?: string;
  ativo?: boolean;
};
export type FiltroSalvo = {
  id: number;
  nome: string;
  filtros: FiltrosChamados;
  criado_em?: string;
};
export type ConfiguracoesSistema = Record<string, string | number | undefined>;
export type Notificacao = {
  id: number;
  usuario_id: number;
  titulo: string;
  mensagem: string;
  tipo: string;
  lida: boolean;
  link?: string;
  criado_em?: string;
};
export type ApiAvisoSistema = {
  id: number;
  titulo: string;
  mensagem: string;
  tipo: "info" | "warning" | "danger" | "success" | string;
  ativo: boolean;
  inicio_em?: string | null;
  fim_em?: string | null;
  criado_por?: number | null;
  criado_em?: string;
  atualizado_em?: string;
};
export type PerformanceRatingInput = {
  overall_rating: number;
  courtesy_rating: number;
  communication_rating: number;
  resolution_rating: number;
  speed_rating: number;
  nps_score: number;
  comment?: string;
};
export type PerformanceScore = {
  id?: number;
  name?: string;
  email?: string;
  departamento?: string;
  foto_url?: string;
  position?: number;
  technician_id?: number | null;
  team_id?: number | null;
  performance_score: number;
  average_rating: number;
  average_resolution_time: number;
  sla_rate: number;
  first_contact_resolution_rate: number;
  reopen_rate: number;
  productivity_score: number;
  total_closed_tickets: number;
  total_ratings: number;
  nps_average: number;
  courtesy_rating?: number;
  communication_rating?: number;
  resolution_rating?: number;
  speed_rating?: number;
};
export type PerformanceCompanyDashboard = {
  company: PerformanceScore;
  technicians: PerformanceScore[];
  teams: PerformanceScore[];
  rating_distribution: { rating: number; total: number }[];
  recent_comments: {
    comment: string;
    sentiment: string;
    created_at: string;
    client_name: string;
  }[];
  keywords: { keyword: string; total: number }[];
};
export type MyPerformanceDashboard = PerformanceScore & {
  rating_distribution: { rating: number; total: number }[];
  recent_ratings: {
    overall_rating: number;
    courtesy_rating: number;
    communication_rating: number;
    resolution_rating: number;
    speed_rating: number;
    nps_score: number;
    comment?: string | null;
    sentiment: string;
    created_at: string;
  }[];
};
export type TeamDistributionMode = "manual" | "round_robin" | "least_load";
export type ApiTeam = {
  id: number;
  name: string;
  description?: string | null;
  color: string;
  manager_id?: number | null;
  manager_name?: string | null;
  active: boolean;
  distribution_mode: TeamDistributionMode;
  members_count?: number;
  created_at?: string;
  updated_at?: string;
};
export type ApiTeamMember = Pick<
  ApiUsuario,
  "id" | "nome" | "email" | "perfil" | "departamento"
> & { created_at?: string };
export type PermissionKey =
  | "visualizar_dashboard"
  | "visualizar_relatorios"
  | "visualizar_ranking_satisfacao"
  | "exportar_dados"
  | "baixar_relatorios"
  | "visualizar_patrimonio"
  | "administrar_ativos"
  | "gerenciar_chamados"
  | "assumir_chamados"
  | "delegar_chamados"
  | "alterar_prioridade"
  | "encerrar_chamados"
  | "gerenciar_usuarios"
  | "alterar_configuracoes"
  | "gerenciar_base"
  | "desenvolvimento_visualizar"
  | "desenvolvimento_analisar"
  | "desenvolvimento_editar"
  | "desenvolvimento_implantar"
  | "desenvolvimento_converter_projeto";

export type DevelopmentRequest = {
  id:number; ticket_id:number; code:string; nature:string; status:string; titulo:string; descricao:string;
  current_process?:string; problem?:string; expected_result?:string; frequency?:string; executions_per_month?:number;
  people_involved?:number; current_time_minutes?:number; automated_time_minutes?:number; sectors?:string[]; systems?:string[];
  impact?:number; reach?:number; gain?:number; urgency?:number; score?:number; calculated_priority?:string; final_priority?:string;
  effort?:string; story_points?:number; developer_id?:number; developer_name?:string; team_id?:number; team_name?:string;
  no_delivery_impact?:string; expected_benefits?:string[]; priority_reason?:string; feasibility?:string;
  due_date?:string; requester_id?:number; solicitante_nome?:string; converted_project_id?:number; created_at:string; updated_at:string;
  savings?:{horas_mes:number;horas_ano:number}; history?:Array<Record<string,unknown>>;
};
export type DevelopmentProject = { id:number; code:string; name:string; description?:string; status:string; priority?:string; progress:number; developer_name?:string; planned_delivery?:string; task_count?:number; tasks?:Array<Record<string,unknown>> };
export type DevelopmentDashboard = { novas:number; em_analise:number; backlog:number; em_desenvolvimento:number; homologacao:number; concluidas_mes:number; horas_economizadas_mes:number; projetos_ativos:number };

export function listarDemandasDesenvolvimento(filters:Record<string,string|number|undefined>={}) { const q=new URLSearchParams(); Object.entries(filters).forEach(([k,v])=>{if(v!==undefined&&v!=="")q.set(k,String(v))}); return request<DevelopmentRequest[]>(`/development?${q}`); }
export function obterDemandaDesenvolvimento(id:number|string) { return request<DevelopmentRequest>(`/development/${id}`); }
export function criarDemandaDesenvolvimento(data:Record<string,unknown>) { return request<DevelopmentRequest>("/development",{method:"POST",body:JSON.stringify(data)}); }
export function atualizarDemandaDesenvolvimento(id:number|string,data:Record<string,unknown>) { return request<DevelopmentRequest>(`/development/${id}`,{method:"PUT",body:JSON.stringify(data)}); }
export function moverDemandaDesenvolvimento(id:number|string,status:string,comment?:string) { return request<DevelopmentRequest>(`/development/${id}/status`,{method:"PATCH",body:JSON.stringify({status,comment})}); }
export function decidirDemandaDesenvolvimento(id:number|string,data:Record<string,unknown>) { return request(`/development/${id}/decisions`,{method:"POST",body:JSON.stringify(data)}); }
export function converterDemandaEmProjeto(id:number|string,data:Record<string,unknown>={}) { return request<DevelopmentProject>(`/development/${id}/convert-project`,{method:"POST",body:JSON.stringify(data)}); }
export function listarProjetosDesenvolvimento() { return request<DevelopmentProject[]>("/development/projects"); }
export function criarProjetoDesenvolvimento(data:Record<string,unknown>) { return request<DevelopmentProject>("/development/projects",{method:"POST",body:JSON.stringify(data)}); }
export function obterDashboardDesenvolvimento() { return request<DevelopmentDashboard>("/development/dashboard"); }
export type PermissionDefinition = {
  key: PermissionKey;
  label: string;
  description: string;
};

export function login(email: string, senha: string) {
  return request<LoginResposta>("/auth/login", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ email, senha }),
  });
}
export function loginUsuario(email: string, senha: string) {
  return request<LoginResposta>("/auth/login/usuario", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ email, senha }),
  });
}
export function loginAdmin(email: string, senha: string) {
  return request<LoginResposta>("/auth/login/admin", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ email, senha }),
  });
}
export function solicitarRecuperacaoSenha(email: string) {
  return request<{ mensagem: string }>(
    "/auth/recuperar-senha",
    { method: "POST", auth: false, body: JSON.stringify({ email }) },
  );
}
export function redefinirSenha(
  email: string,
  codigo: string,
  novaSenha: string,
) {
  return request<{ mensagem: string }>("/auth/redefinir-senha", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ email, codigo, novaSenha }),
  });
}

export function cadastrarUsuarioPublico(dados: NovoCadastroUsuario) {
  return request<{ mensagem: string; usuario: ApiUsuario; requer_verificacao_email?: boolean }>(
    "/usuarios/cadastro",
    { method: "POST", auth: false, body: JSON.stringify(dados) },
  );
}
export function verificarEmailCadastro(email: string, codigo: string) {
  return request<{ mensagem: string }>("/usuarios/verificar-email", {
    method: "POST", auth: false, body: JSON.stringify({ email, codigo }),
  });
}
export function reenviarVerificacaoEmail(email: string) {
  return request<{ mensagem: string }>("/usuarios/reenviar-verificacao", {
    method: "POST", auth: false, body: JSON.stringify({ email }),
  });
}
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
export function enviarAvaliacaoPerformance(
  id: number | string,
  dados: PerformanceRatingInput,
) {
  return request(`/performance/tickets/${id}/rating`, {
    method: "POST",
    body: JSON.stringify(dados),
  });
}
export function obterDashboardPerformance(month?: number, year?: number) {
  const qs = new URLSearchParams();
  if (month) qs.set("month", String(month));
  if (year) qs.set("year", String(year));
  return request<PerformanceCompanyDashboard>(
    `/performance/company${qs.toString() ? `?${qs}` : ""}`,
  );
}
export function obterMinhaPerformance(month?: number, year?: number) {
  const qs = new URLSearchParams();
  if (month) qs.set("month", String(month));
  if (year) qs.set("year", String(year));
  return request<MyPerformanceDashboard>(
    `/performance/me${qs.toString() ? `?${qs}` : ""}`,
  );
}
export function obterRankingSatisfacao(month?: number, year?: number) {
  const qs = new URLSearchParams({ scope: "technicians" });
  if (month) qs.set("month", String(month));
  if (year) qs.set("year", String(year));
  return request<PerformanceScore[]>(`/performance/ranking?${qs}`);
}
export function urlRelatorio(
  formato: "csv" | "excel" | "pdf",
  filtros: FiltrosChamados = {},
) {
  const qs = new URLSearchParams();
  Object.entries(filtros).forEach(([k, v]) => {
    if (v !== undefined && v !== "" && v !== false) qs.set(k, String(v));
  });
  const token = getToken();
  if (token) qs.set("download_token_ignored", "1");
  return `${API_URL}/chamados/relatorios/${formato}${qs.toString() ? `?${qs}` : ""}`;
}
// Baixa relatórios autenticados e preserva o nome indicado pelo servidor.
export async function baixarRelatorio(
  formato: "csv" | "excel" | "pdf",
  filtros: FiltrosChamados = {},
) {
  const qs = new URLSearchParams();
  Object.entries(filtros).forEach(([k, v]) => {
    if (v !== undefined && v !== "" && v !== false) qs.set(k, String(v));
  });
  const response = await request<Response>(
    `/chamados/relatorios/${formato}${qs.toString() ? `?${qs}` : ""}`,
    { raw: true },
  );
  if (!response.ok) throw new Error("Erro ao baixar relatório");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const periodo = filtros.data_inicio?.slice(0, 7);
  a.download = `chamados${periodo ? `-${periodo}` : ""}.${formato === "excel" ? "xlsx" : formato}`;
  a.click();
  URL.revokeObjectURL(url);
}

export function obterMetricasRelatorio(filtros: FiltrosChamados = {}) {
  const qs = new URLSearchParams();
  Object.entries(filtros).forEach(([key, value]) => {
    if (value !== undefined && value !== "" && value !== false) qs.set(key, String(value));
  });
  return request<ReportMetrics>(`/chamados/relatorios/resumo/metricas${qs.toString() ? `?${qs}` : ""}`);
}

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
export function obterConfiguracoesSistema() {
  return request<ConfiguracoesSistema>("/configuracoes");
}
export function salvarConfiguracoesSistema(dados: ConfiguracoesSistema) {
  return request<ConfiguracoesSistema>("/configuracoes", {
    method: "PUT",
    body: JSON.stringify(dados),
  });
}
export function atualizarLogoSistema(arquivo: File) {
  const formData = new FormData();
  formData.append("logo", arquivo);
  return request<ConfiguracoesSistema>("/configuracoes/logo", {
    method: "PATCH",
    body: formData,
    isFormData: true,
  });
}
export function atualizarLogoSistema1(arquivo: File) {
  const formData = new FormData();
  formData.append("logo", arquivo);
  return request<ConfiguracoesSistema>("/configuracoes/logo1", {
    method: "PATCH",
    body: formData,
    isFormData: true,
  });
}

export function listarAvisosSistemaAtivos() {
  return request<ApiAvisoSistema[]>("/avisos/ativos", { auth: false });
}
export function listarAvisosSistemaAdmin() {
  return request<ApiAvisoSistema[]>("/avisos/admin");
}
export function criarAvisoSistema(dados: Partial<ApiAvisoSistema>) {
  return request<ApiAvisoSistema>("/avisos", {
    method: "POST",
    body: JSON.stringify(dados),
  });
}
export function atualizarAvisoSistema(
  id: number | string,
  dados: Partial<ApiAvisoSistema>,
) {
  return request<ApiAvisoSistema>(`/avisos/${id}`, {
    method: "PUT",
    body: JSON.stringify(dados),
  });
}
export function excluirAvisoSistema(id: number | string) {
  return request<{ mensagem: string }>(`/avisos/${id}`, { method: "DELETE" });
}

export function listarNotificacoes() {
  return request<Notificacao[]>("/notificacoes");
}
export function marcarNotificacoesLidas(id?: number | string) {
  return request<{ mensagem: string }>(
    id ? `/notificacoes/${id}/ler` : "/notificacoes/ler",
    { method: "PATCH" },
  );
}
