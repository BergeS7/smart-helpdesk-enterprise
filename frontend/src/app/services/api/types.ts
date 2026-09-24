/**
 * Responsabilidade: tipos compartilhados das respostas e cargas da API (chamados, dashboard, catálogo, equipes...).
 */
import type { ApiUsuario } from "./http";

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
  departamento?: string;
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
  sla_pausa_motivo?: "aguardando_usuario" | "fora_expediente" | null;
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

export type PermissionDefinition = {
  key: PermissionKey;
  label: string;
  description: string;
};
