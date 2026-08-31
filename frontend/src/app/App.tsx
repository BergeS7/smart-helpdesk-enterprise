/**
 * Responsabilidade: composição principal da aplicação Smart HelpDesk.
 * Mantém o shell e as jornadas históricas de login, portal do solicitante,
 * painel da equipe e detalhe; módulos recentes são carregados sob demanda.
 */
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import type {
  CSSProperties,
  Dispatch,
  FormEvent,
  ReactNode,
  SetStateAction,
} from "react";
import { GlobalCommandPalette } from "./components/GlobalCommandPalette";
import { ProfileCenter } from "./components/ProfileCenter";
import { PermissionDialog } from "./components/PermissionDialog";
import {
  LegalComplianceLayer,
  openLegalDocument,
} from "./components/LegalComplianceLayer";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";
import { LoginMotorcycleLoader } from "./components/LoginMotorcycleLoader";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  BrainCircuit,
  Building2,
  Calendar,
  Camera,
  CheckCircle2,
  CircleDot,
  Columns3,
  Clock3,
  Download,
  Eye,
  EyeOff,
  FileText,
  Filter,
  History,
  Headphones,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  List,
  Phone,
  LockKeyhole,
  LogOut,
  Mail,
  MapPinned,
  Menu,
  MessageSquare,
  Moon,
  Paperclip,
  PauseCircle,
  Plus,
  RefreshCw,
  Rows3,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  Star,
  Sun,
  Ticket,
  Trash2,
  Upload,
  User,
  UserCheck,
  UserCog,
  UserPlus,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { Toaster, toast } from "sonner";
import smartHelpdeskLogo from "../assets/smart-helpdesk-logo.png";
import { PerformanceRatingCard } from "./components/PerformanceRatingCard";
import { municipiosMaranhao } from "./data/municipiosMaranhao";
import { TICKET_STATUS, canonicalTicketStatus, ticketStatusLabel, type TicketStatus } from "./domain/ticketStatus";
import { PORTAL_ROUTES, useModuleRoute } from "./routes/useModuleRoute";
import { ADMIN_ROUTES, buildAdminNavigation, type AdminRouteKey } from "./navigation/adminNavigation";
import { WorkspaceNavigation } from "./components/WorkspaceNavigation";
import { TicketWorkspaceToolbar } from "./components/TicketWorkspaceToolbar";
import { Badge, Button, Card, Field, Input, Modal, Select, Textarea } from "./components/shared/FormPrimitives";

const PatrimonioMapPage = lazy(() =>
  import("./pages/PatrimonioMap/PatrimonioMapPage").then((module) => ({
    default: module.PatrimonioMapPage,
  })),
);
const SatisfactionAnalyticsPage = lazy(() =>
  import("./components/TeamSatisfactionDrawer").then((module) => ({
    default: module.SatisfactionAnalyticsPage,
  })),
);
const MySatisfactionPage = lazy(
  () => import("./components/MySatisfactionPage"),
);
const OperationalDashboard = lazy(() => import("./pages/Dashboard/OperationalDashboard").then(module => ({ default:module.OperationalDashboard })));
const ReportsWorkspace = lazy(() => import("./components/ReportsWorkspace").then(module => ({ default:module.ReportsWorkspace })));
const SettingsWorkspace = lazy(() => import("./pages/Settings/SettingsWorkspace").then(module => ({ default:module.SettingsWorkspace })));
const PermissionMatrixPage = lazy(() => import("./components/PermissionMatrixPage").then(module => ({ default:module.PermissionMatrixPage })));
const FilaChamadosView = lazy(() => import("./modules/fila/FilaChamadosView").then(module => ({ default:module.FilaChamadosView })));
const KanbanWorkspace = lazy(() => import("./modules/kanban/KanbanWorkspace").then(module => ({ default:module.KanbanWorkspace })));
const ChamadosListModule = lazy(() => import("./modules/chamados/ChamadosListModule").then(module => ({ default:module.ChamadosListModule })));
const UsersModule = lazy(() => import("./modules/usuarios/UsersModule").then(module => ({ default:module.UsersModule })));
const IndicatorsWorkspace = lazy(() => import("./modules/indicadores/IndicatorsWorkspace").then(module => ({ default:module.IndicatorsWorkspace })));
const DevelopmentWorkspace = lazy(() => import("./modules/desenvolvimento/DevelopmentWorkspace").then(module => ({ default:module.DevelopmentWorkspace })));
const SystemDiagnosticsPage = lazy(() =>
  import("./components/SystemDiagnosticsPage").then((module) => ({ default: module.SystemDiagnosticsPage })),
);

import {
  adicionarComentario,
  anexarArquivos,
  aprovarUsuario,
  assumirChamado,
  atualizarChamado,
  atualizarMeuPerfil,
  atualizarUsuarioAdmin,
  atualizarMinhaFotoPerfil,
  atualizarUsuarioLocal,
  atualizarAvisoSistema,
  baixarRelatorio,
  baixarAnexoChamado,
  baixarHistoricoChamadoPdf,
  buscarChamado,
  cadastrarUsuarioPublico,
  verificarEmailCadastro,
  reenviarVerificacaoEmail,
  criarArtigoBase,
  criarAvisoSistema,
  criarCatalogo,
  criarRespostaRapida,
  criarChamado,
  criarDemandaDesenvolvimento,
  criarTeam,
  criarUsuarioAdmin,
  encerrarChamado,
  enviarAvaliacaoPerformance,
  excluirAvisoSistema,
  excluirChamado,
  excluirUsuarioAdmin,
  listarAvisosSistemaAdmin,
  listarAvisosSistemaAtivos,
  listarBaseConhecimento,
  listarCatalogo,
  listarFiltrosSalvos,
  listarChamados,
  listarChamadosDoUsuario,
  listarNotificacoes,
  listarRespostasRapidas,
  listarTeams,
  listarUsuariosAdmin,
  login,
  loginAdmin,
  loginUsuario,
  marcarNotificacoesLidas,
  obterDashboard,
  obterMeuPerfil,
  obterMinhasPermissoes,
  API_URL,
  obterConfiguracoesSistema,
  obterBlobAnexoChamado,
  salvarConfiguracoesSistema,
  atualizarLogoSistema1,
  salvarFiltroChamados,
  reabrirChamado,
  redefinirSenha,
  removerMinhaFotoPerfil,
  rejeitarUsuario,
  salvarSessao,
  solicitarRecuperacaoSenha,
  type ApiAvisoSistema,
  type ApiChamado,
  type ApiUsuario,
  type ArtigoBase,
  type CatalogoItem,
  type DashboardResumo,
  type FiltrosChamados,
  type Notificacao,
  type RespostaRapida,
  type FiltroSalvo,
  type ConfiguracoesSistema,
  type ApiTeam,
  type UsuarioLogado,
  type PermissionKey,
} from "./services/api";
import { useSmartHelpDeskSession } from "./hooks/useSmartHelpDeskSession";

type LoginMode = "usuario" | "admin";
type TelaAuth = "login" | "cadastro" | "verificar" | "recuperar";
type AdminTab = AdminRouteKey;
type UsuarioTab =
  "home" | "chamados" | "base" | "avisos" | "dashboard" | "relatorios";

// Restaura filtros compartilháveis diretamente da URL do navegador.
function ticketFiltersFromUrl():FiltrosChamados{
  const params=new URLSearchParams(window.location.search),result:FiltrosChamados={};
  const textKeys=(['q','status','prioridade','departamento','municipio','unidade','team_id','usuario','data_inicio','data_fim','responsavel','responsavel_id','tipo_chamado','categoria'] as const);
  textKeys.forEach(key=>{const value=params.get(key);if(value)result[key]=value});
  (['vencidos','sem_responsavel','meus','fila','closed','historico'] as const).forEach(key=>{if(params.get(key)==='true')result[key]=true});
  return result;
}

type AdminStatus = TicketStatus;

const STATUS_COLUNAS: {
  status: AdminStatus;
  titulo: string;
  icon: ReactNode;
  border: string;
  accent: string;
  tone: string;
  count: string;
}[] = [
  {
    status: TICKET_STATUS.OPEN,
    titulo: "Em aberto",
    icon: <CircleDot size={16} />,
    border: "border-blue-300",
    accent: "bg-blue-500",
    tone: "text-blue-600",
    count: "bg-blue-50 text-blue-700",
  },
  {
    status: TICKET_STATUS.IN_PROGRESS,
    titulo: "Em andamento",
    icon: <RefreshCw size={16} />,
    border: "border-amber-300",
    accent: "bg-amber-500",
    tone: "text-amber-600",
    count: "bg-amber-50 text-amber-700",
  },
  {
    status: TICKET_STATUS.WAITING_USER,
    titulo: "Aguardando usuário",
    icon: <PauseCircle size={16} />,
    border: "border-violet-300",
    accent: "bg-violet-500",
    tone: "text-violet-600",
    count: "bg-violet-50 text-violet-700",
  },
  {
    status: TICKET_STATUS.CLOSED,
    titulo: "Concluído",
    icon: <CheckCircle2 size={16} />,
    border: "border-emerald-300",
    accent: "bg-emerald-500",
    tone: "text-emerald-600",
    count: "bg-emerald-50 text-emerald-700",
  },
];

const STATUS_OPCOES = [
  TICKET_STATUS.OPEN,
  TICKET_STATUS.IN_PROGRESS,
  TICKET_STATUS.WAITING_USER,
  TICKET_STATUS.WAITING_THIRD_PARTY,
  TICKET_STATUS.RESOLVED,
  TICKET_STATUS.CLOSED,
  TICKET_STATUS.CANCELED,
  TICKET_STATUS.REOPENED,
];
const PRIORIDADES = ["Crítica", "Alta", "Media", "Baixa"];
const PERFIS = ["usuario", "tecnico", "admin", "desenvolvedor"];
const PERFIL_LABEL: Record<string, string> = {
  usuario: "Usuário comum",
  tecnico: "Técnico",
  admin: "Administrador",
  desenvolvedor: "Desenvolvedor",
  super_admin: "Desenvolvedor",
};

function normalizarPerfilApp(perfil?: string) {
  const valor = String(perfil || "usuario")
    .trim()
    .toLowerCase();
  if (["super_admin", "dev", "developer"].includes(valor))
    return "desenvolvedor";
  if (["usuario", "tecnico", "admin", "desenvolvedor"].includes(valor))
    return valor;
  return "usuario";
}

function perfilLabel(perfil?: string) {
  return PERFIL_LABEL[normalizarPerfilApp(perfil)] || "Usuário comum";
}

function isEquipeApp(perfil?: string) {
  return ["tecnico", "admin", "desenvolvedor"].includes(
    normalizarPerfilApp(perfil),
  );
}

function isAdminApp(perfil?: string) {
  return ["admin", "desenvolvedor"].includes(normalizarPerfilApp(perfil));
}

function isDevApp(perfil?: string) {
  return normalizarPerfilApp(perfil) === "desenvolvedor";
}

const CONFIG_SISTEMA_PADRAO: ConfiguracoesSistema = {
  nome_sistema: "Smart HelpDesk",
  email_suporte: "",
  cor_principal: "#17a9d4",
  logo_url: "",
  logo_1_url: "",
  sla_alta_resposta: 60,
  sla_critica_resposta: 15,
  sla_critica_resolucao: 120,
  sla_alta_resolucao: 480,
  sla_media_resposta: 240,
  sla_media_resolucao: 1440,
  sla_baixa_resposta: 1440,
  sla_baixa_resolucao: 2880,
};

function valorConfig(
  config: ConfiguracoesSistema | null | undefined,
  chave: string,
  fallback: string,
) {
  const valor = config?.[chave];
  return valor === undefined || valor === null || String(valor).trim() === ""
    ? fallback
    : String(valor);
}

function nomeSistema(config: ConfiguracoesSistema | null | undefined) {
  return valorConfig(config, "nome_sistema", "Smart HelpDesk");
}

function emailSuporteSistema(config: ConfiguracoesSistema | null | undefined) {
  return valorConfig(config, "email_suporte", "");
}

function corPrincipalSistema(config: ConfiguracoesSistema | null | undefined) {
  const cor = valorConfig(config, "cor_principal", "#17a9d4").trim();
  return /^#[0-9a-fA-F]{6}$/.test(cor) ? cor : "#17a9d4";
}

function ajustarCor(hex: string, amount: number) {
  const cor = corPrincipalSistema({ cor_principal: hex });
  const num = parseInt(cor.slice(1), 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amount));
  const b = Math.max(0, Math.min(255, (num & 0xff) + amount));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function rgbaHex(hex: string, alpha: number) {
  const cor = corPrincipalSistema({ cor_principal: hex });
  const num = parseInt(cor.slice(1), 16);
  const r = num >> 16;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function resolverLogoUrl(logoBruta: string) {
  const logo = String(logoBruta || "").trim();
  if (!logo) return smartHelpdeskLogo;
  if (/^https?:\/\//i.test(logo) || logo.startsWith("data:")) return logo;
  if (logo.startsWith("/uploads"))
    return `${API_URL.replace(/\/api\/?$/, "")}${logo}`;
  return logo;
}

function logoSistema1(config: ConfiguracoesSistema | null | undefined) {
  return resolverLogoUrl(
    valorConfig(config, "logo_1_url", valorConfig(config, "logo_url", "")),
  );
}

function logoSistema(config: ConfiguracoesSistema | null | undefined) {
  return logoSistema1(config);
}

function variaveisTemaSistema(
  config: ConfiguracoesSistema | null | undefined,
): CSSProperties {
  const principal = corPrincipalSistema(config);
  return {
    "--shd-primary": principal,
    "--shd-primary-hover": ajustarCor(principal, -18),
    "--shd-primary-soft": rgbaHex(principal, 0.1),
    "--shd-primary-ring": rgbaHex(principal, 0.18),
    "--shd-primary-border": rgbaHex(principal, 0.28),
    "--shd-accent": "#ffd52a",
    "--shd-accent-hover": "#f4bd16",
    "--shd-deep": "#073b66",
    "--shd-ink": "#091923",
  } as CSSProperties;
}

// Converte a identidade configurada no backend em variáveis CSS globais.
function SystemThemeStyle() {
  return (
    <style>{`
      .smart-helpdesk-config-theme .bg-blue-500,
      .smart-helpdesk-config-theme .bg-blue-600,
      .smart-helpdesk-config-theme .bg-blue-700 { background-color: var(--shd-primary) !important; }
      .smart-helpdesk-config-theme .hover\\:bg-blue-500:hover,
      .smart-helpdesk-config-theme .hover\\:bg-blue-600:hover,
      .smart-helpdesk-config-theme .hover\\:bg-blue-700:hover { background-color: var(--shd-primary-hover) !important; }
      .smart-helpdesk-config-theme .text-blue-500,
      .smart-helpdesk-config-theme .text-blue-600,
      .smart-helpdesk-config-theme .text-blue-700,
      .smart-helpdesk-config-theme .hover\\:text-blue-600:hover,
      .smart-helpdesk-config-theme .hover\\:text-blue-700:hover,
      .smart-helpdesk-config-theme .hover\\:text-blue-900:hover { color: var(--shd-primary) !important; }
      .smart-helpdesk-config-theme .border-blue-100,
      .smart-helpdesk-config-theme .border-blue-200,
      .smart-helpdesk-config-theme .border-blue-300,
      .smart-helpdesk-config-theme .focus\\:border-blue-500:focus,
      .smart-helpdesk-config-theme .focus-within\\:border-blue-300:focus-within { border-color: var(--shd-primary-border) !important; }
      .smart-helpdesk-config-theme .bg-blue-50,
      .smart-helpdesk-config-theme .hover\\:bg-blue-50:hover { background-color: var(--shd-primary-soft) !important; }
      .smart-helpdesk-config-theme .focus\\:ring-blue-100:focus,
      .smart-helpdesk-config-theme .focus\\:ring-blue-500\\/10:focus,
      .smart-helpdesk-config-theme .focus-within\\:ring-blue-500\\/10:focus-within { box-shadow: 0 0 0 4px var(--shd-primary-ring) !important; }
      .smart-helpdesk-config-theme .shadow-blue-100,
      .smart-helpdesk-config-theme .shadow-blue-200,
      .smart-helpdesk-config-theme .shadow-blue-500\\/30,
      .smart-helpdesk-config-theme .shadow-blue-900\\/30,
      .smart-helpdesk-config-theme .shadow-blue-950\\/30 { box-shadow: 0 16px 35px var(--shd-primary-ring) !important; }
    `}</style>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return "-";
  }
}

function prioridadeClass(p?: string) {
  if (p === "Crítica" || p === "Critica")
    return "border-rose-300 bg-rose-600 text-white shadow-sm shadow-rose-200";
  if (p === "Alta") return "border-red-200 bg-red-50 text-red-700";
  if (p === "Baixa") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function statusClass(status?: string) {
  const canonical = canonicalTicketStatus(status);
  if (canonical === TICKET_STATUS.CLOSED || canonical === TICKET_STATUS.RESOLVED)
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (canonical === TICKET_STATUS.IN_PROGRESS)
    return "border-amber-200 bg-amber-50 text-amber-700";
  if (canonical === TICKET_STATUS.WAITING_USER || canonical === TICKET_STATUS.WAITING_THIRD_PARTY)
    return "border-orange-200 bg-orange-50 text-orange-700";
  if (canonical === TICKET_STATUS.REOPENED)
    return "border-purple-200 bg-purple-50 text-purple-700";
  if (canonical === TICKET_STATUS.CANCELED)
    return "border-zinc-200 bg-zinc-100 text-zinc-600";
  return "border-blue-200 bg-blue-50 text-blue-700";
}

function slaBadgeClass(status?: string) {
  if (status === "vencido") return "border-red-200 bg-red-50 text-red-700";
  if (status === "alerta") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function formatarMinutos(minutos?: number | null) {
  if (minutos === null || minutos === undefined) return "-";
  const abs = Math.abs(minutos);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const texto = h > 0 ? `${h}h ${m}min` : `${m}min`;
  return minutos < 0 ? `Vencido há ${texto}` : `${texto} restantes`;
}

function notificacaoClass(tipo?: string) {
  if (tipo === "success")
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (tipo === "warning") return "border-amber-200 bg-amber-50 text-amber-700";
  if (tipo === "error" || tipo === "danger")
    return "border-red-200 bg-red-50 text-red-700";
  return "border-blue-200 bg-blue-50 text-blue-700";
}

function notificacaoIcone(tipo?: string) {
  if (tipo === "success") return <CheckCircle2 size={16} />;
  if (tipo === "warning") return <AlertTriangle size={16} />;
  if (tipo === "error" || tipo === "danger") return <XCircle size={16} />;
  return <Bell size={16} />;
}

function chamadoIdFromNotification(link?: string | null) {
  const match = String(link || "").match(/\/chamados\/(\d+)/);
  return match ? Number(match[1]) : null;
}

function normalizeStatus(status?: string): AdminStatus {
  const canonical = canonicalTicketStatus(status);
  if (canonical === TICKET_STATUS.RESOLVED || canonical === TICKET_STATUS.CANCELED) return TICKET_STATUS.CLOSED;
  if (canonical === TICKET_STATUS.WAITING_THIRD_PARTY) return TICKET_STATUS.WAITING_USER;
  return canonical;
}

function iniciaisPessoa(nome?: string | null) {
  const partes = String(nome || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (partes.length === 0) return "?";
  return partes
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join("");
}

function nomeSolicitanteChamado(chamado: ApiChamado) {
  return (
    chamado.solicitante_nome ||
    chamado.solicitante ||
    chamado.email_solicitante ||
    "Solicitante"
  );
}

function SolicitanteAvatar({
  chamado,
  size = "md",
}: {
  chamado: ApiChamado;
  size?: "sm" | "md" | "lg";
}) {
  const nome = nomeSolicitanteChamado(chamado);
  const tamanho = {
    sm: "h-7 w-7 text-[10px]",
    md: "h-9 w-9 text-xs",
    lg: "h-10 w-10 text-sm",
  }[size];

  return (
    <span
      title={`Enviado por ${nome}`}
      className={`grid shrink-0 place-items-center overflow-hidden rounded-full border border-zinc-200 bg-gradient-to-br from-blue-500 to-sky-400 font-black text-white shadow-sm ${tamanho}`}
    >
      {chamado.solicitante_foto_url ? (
        <img
          src={chamado.solicitante_foto_url}
          alt={nome}
          className="h-full w-full object-cover"
        />
      ) : (
        iniciaisPessoa(nome)
      )}
    </span>
  );
}

function nomeResponsavelChamado(chamado: ApiChamado) {
  return chamado.responsavel_nome || chamado.responsavel || "";
}

function ResponsavelAvatar({
  chamado,
  size = "md",
}: {
  chamado: ApiChamado;
  size?: "sm" | "md" | "lg";
}) {
  const nome = nomeResponsavelChamado(chamado);
  const tamanho = {
    sm: "h-7 w-7 text-[10px]",
    md: "h-9 w-9 text-xs",
    lg: "h-11 w-11 text-sm",
  }[size];

  if (!nome) {
    return (
      <span
        title="Sem responsável"
        className={`grid shrink-0 place-items-center overflow-hidden rounded-full border border-dashed border-zinc-300 bg-zinc-50 font-black text-zinc-400 shadow-sm ${tamanho}`}
      >
        <UserCog size={size === "lg" ? 20 : 15} />
      </span>
    );
  }

  return (
    <span
      title={`Responsável: ${nome}`}
      className={`grid shrink-0 place-items-center overflow-hidden rounded-full border border-zinc-200 bg-gradient-to-br from-slate-700 to-blue-600 font-black text-white shadow-sm ${tamanho}`}
    >
      {chamado.responsavel_foto_url ? (
        <img
          src={chamado.responsavel_foto_url}
          alt={nome}
          className="h-full w-full object-cover"
        />
      ) : (
        iniciaisPessoa(nome)
      )}
    </span>
  );
}

function UsuarioSistemaAvatar({
  usuario,
  size = "md",
  dark = false,
}: {
  usuario: ApiUsuario | UsuarioLogado;
  size?: "sm" | "md" | "lg";
  dark?: boolean;
}) {
  const tamanho = {
    sm: "h-9 w-9 text-xs",
    md: "h-12 w-12 text-sm",
    lg: "h-16 w-16 text-lg",
  }[size];

  return (
    <span
      title={usuario.nome || usuario.email}
      className={`grid shrink-0 place-items-center overflow-hidden rounded-full border font-black shadow-sm ${tamanho} ${
        dark
          ? "border-white/10 bg-gradient-to-br from-blue-500 to-sky-400 text-white"
          : "border-zinc-200 bg-gradient-to-br from-blue-500 to-sky-400 text-white"
      }`}
    >
      {usuario.foto_url ? (
        <img
          src={usuario.foto_url}
          alt={usuario.nome || usuario.email}
          className="h-full w-full object-cover"
        />
      ) : (
        iniciaisPessoa(usuario.nome || usuario.email)
      )}
    </span>
  );
}

function ResponsavelAtendimentoCard({
  chamado,
  onAbrir,
}: {
  chamado?: ApiChamado | null;
  onAbrir?: (id: number) => void;
}) {
  const nome = chamado ? nomeResponsavelChamado(chamado) : "";

  return (
    <button
      type="button"
      disabled={!chamado}
      onClick={() => chamado && onAbrir?.(chamado.id)}
      className="mt-3 flex w-full items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-3 text-left shadow-sm transition hover:border-blue-200 hover:bg-blue-50/40 disabled:cursor-default disabled:hover:border-zinc-200 disabled:hover:bg-white"
    >
      {chamado ? (
        <ResponsavelAvatar chamado={chamado} size="lg" />
      ) : (
        <ResponsavelAvatar
          chamado={
            {
              id: 0,
              titulo: "",
              descricao: "",
              prioridade: "",
              status: "",
            } as ApiChamado
          }
          size="lg"
        />
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-bold text-zinc-500">
          Responsável pelo atendimento
        </span>
        <span className="mt-0.5 block truncate text-sm font-black text-zinc-900">
          {nome || "Sem responsável definido"}
        </span>
        <span className="mt-0.5 block truncate text-[11px] font-semibold text-zinc-400">
          {chamado
            ? `${chamado.numero_chamado || `#${chamado.id}`} • ${ticketStatusLabel(chamado.status)}`
            : "Assim que alguém assumir, a foto aparecerá aqui."}
        </span>
      </span>
      {chamado && <ArrowRight size={16} className="shrink-0 text-zinc-400" />}
    </button>
  );
}

function AvisosSistemaBanner({
  avisos,
  dark = false,
}: {
  avisos: ApiAvisoSistema[];
  dark?: boolean;
}) {
  if (!avisos?.length) return null;
  const classes: Record<string, string> = {
    info: dark
      ? "border-blue-400/30 bg-blue-500/10 text-blue-100"
      : "border-blue-200 bg-blue-50 text-blue-900",
    warning: dark
      ? "border-amber-400/30 bg-amber-500/10 text-amber-100"
      : "border-amber-200 bg-amber-50 text-amber-900",
    danger: dark
      ? "border-red-400/30 bg-red-500/10 text-red-100"
      : "border-red-200 bg-red-50 text-red-900",
    success: dark
      ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
      : "border-emerald-200 bg-emerald-50 text-emerald-900",
  };

  return (
    <div className="space-y-2">
      {avisos.map((aviso) => (
        <div
          key={aviso.id}
          className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm shadow-sm ${classes[aviso.tipo] || classes.info}`}
        >
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="font-black">{aviso.titulo}</p>
            <p className="mt-0.5 leading-5 opacity-90">{aviso.mensagem}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const { usuario, setUsuario, usuarioEntrando, sessaoVerificada, logout, authenticated } = useSmartHelpDeskSession();
  const [configSistemaGlobal, setConfigSistemaGlobal] =
    useState<ConfiguracoesSistema>(CONFIG_SISTEMA_PADRAO);
  const [avisosSistemaGlobal, setAvisosSistemaGlobal] = useState<
    ApiAvisoSistema[]
  >([]);

  useEffect(() => {
    obterConfiguracoesSistema()
      .then((config) =>
        setConfigSistemaGlobal({ ...CONFIG_SISTEMA_PADRAO, ...config }),
      )
      .catch(() => {});
    listarAvisosSistemaAtivos()
      .then(setAvisosSistemaGlobal)
      .catch(() => {});
  }, []);

  const content = !sessaoVerificada ? (
    <div className="grid min-h-screen place-items-center bg-zinc-50 text-zinc-900">
      <div className="flex items-center gap-3 text-sm font-bold">
        <RefreshCw size={20} className="animate-spin text-blue-600" />
        Validando sessão…
      </div>
    </div>
  ) : !usuario ? (
    <LoginScreen
      onLogin={authenticated}
      configSistema={configSistemaGlobal}
      avisosSistema={avisosSistemaGlobal}
    />
  ) : isEquipeApp(usuario.perfil) ? (
    <AdminPanel
      usuario={usuario}
      setUsuario={setUsuario}
      onLogout={logout}
      configSistemaInicial={configSistemaGlobal}
      onConfigSistemaChange={setConfigSistemaGlobal}
      avisosSistema={avisosSistemaGlobal}
      onAvisosSistemaChange={setAvisosSistemaGlobal}
    />
  ) : (
    <UserPortal
      usuario={usuario}
      setUsuario={setUsuario}
      onLogout={logout}
      configSistema={configSistemaGlobal}
      avisosSistema={avisosSistemaGlobal}
    />
  );
  return (
    <>
      {content}
      {usuarioEntrando && <LoginMotorcycleLoader name={usuarioEntrando.nome} />}
      <PWAInstallPrompt />
      <LegalComplianceLayer />
    </>
  );
}

// Jornada pública de autenticação, recuperação e primeiro acesso.
function LoginScreen({
  onLogin,
  configSistema,
  avisosSistema,
}: {
  onLogin: (usuario: UsuarioLogado) => void;
  configSistema: ConfiguracoesSistema;
  avisosSistema: ApiAvisoSistema[];
}) {
  const [mode, setMode] = useState<LoginMode>("usuario");
  const [tela, setTela] = useState<TelaAuth>("login");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [cadastro, setCadastro] = useState({
    nome: "",
    email: "",
    senha: "",
    telefone: "",
    departamento: "",
    municipio: "",
    unidade: "",
    cargo: "",
    aceitaTermos: false,
  });
  const [recuperar, setRecuperar] = useState({
    email: "",
    codigo: "",
    novaSenha: "",
  });
  const [verificacao, setVerificacao] = useState({ email: "", codigo: "" });

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setLoading(true);

    try {
      const resposta = await login(email, senha);

      const usuarioNormalizado = {
        ...resposta.usuario,
        perfil: normalizarPerfilApp(
          resposta.usuario.perfil,
        ) as UsuarioLogado["perfil"],
      };

      const sessaoNormalizada = {
        ...resposta,
        usuario: usuarioNormalizado,
      };

      salvarSessao(sessaoNormalizada);
      toast.success("Login realizado com sucesso.");
      onLogin(usuarioNormalizado);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao fazer login.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCadastro(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const resposta = await cadastrarUsuarioPublico(cadastro);
      toast.success(resposta.mensagem);
      setVerificacao({ email: cadastro.email, codigo: "" });
      setTela("verificar");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao solicitar cadastro.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleVerificarEmail(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const resposta = await verificarEmailCadastro(verificacao.email, verificacao.codigo);
      toast.success(resposta.mensagem);
      setEmail(verificacao.email);
      setTela("login");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao confirmar e-mail.");
    } finally { setLoading(false); }
  }

  async function handleReenviarVerificacao() {
    setLoading(true);
    try {
      const resposta = await reenviarVerificacaoEmail(verificacao.email);
      toast.success(resposta.mensagem);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao reenviar código.");
    } finally { setLoading(false); }
  }

  async function handleRecuperar(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      if (!recuperar.codigo) {
        const resp = await solicitarRecuperacaoSenha(recuperar.email);
        toast.success(resp.mensagem);
      } else {
        await redefinirSenha(
          recuperar.email,
          recuperar.codigo,
          recuperar.novaSenha,
        );
        toast.success("Senha redefinida. Faça login novamente.");
        setTela("login");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro na recuperação.",
      );
    } finally {
      setLoading(false);
    }
  }

  const isAdmin = mode === "admin";
  const sistemaNome = nomeSistema(configSistema);
  const sistemaLogo = logoSistema1(configSistema);

  return (
    <div
      className="smart-helpdesk-config-theme min-h-screen overflow-x-hidden bg-gradient-to-br from-[#073b66] via-[#087fa8] to-[#17a9d4]"
      style={variaveisTemaSistema(configSistema)}
    >
      <SystemThemeStyle />
      <Toaster position="top-right" richColors />
      <div className="fixed inset-x-0 top-4 z-40 mx-auto w-[min(920px,calc(100vw-32px))]">
        <AvisosSistemaBanner avisos={avisosSistema} />
      </div>
      <div className="grid min-h-screen w-full grid-cols-1 lg:h-screen lg:grid-cols-[46%_54%] lg:overflow-hidden lg:bg-white">
        <section className="relative z-10 order-2 -mt-10 flex min-h-[calc(100vh-270px)] items-start justify-center rounded-t-[42px] bg-white px-6 pb-10 pt-12 shadow-[0_-18px_45px_rgba(21,42,100,.16)] sm:px-10 lg:mt-0 lg:min-h-0 lg:items-center lg:overflow-y-auto lg:rounded-none lg:px-16 lg:py-10 lg:shadow-none">
          <div className="w-full max-w-[440px]">
            <div className="mb-7 flex items-center justify-center gap-3 text-center lg:mb-10">
              <div className="flex h-12 w-12 items-center justify-center">
                <img
                  src={sistemaLogo}
                  alt={sistemaNome}
                  className="h-full w-full object-contain"
                />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900">
                  {sistemaNome}
                </h1>
                <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">
                  Central de atendimento
                </p>
              </div>
            </div>

            {tela === "login" && (
              <>
                <div className="mb-7 text-center">
                  <h2 className="text-[28px] font-black tracking-tight text-slate-950 sm:text-3xl">
                    Olá, seja bem-vindo!
                  </h2>
                  <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                    {isAdmin
                      ? "Entre com suas credenciais para acessar a administração."
                      : "Entre com suas credenciais para acompanhar seus chamados."}
                  </p>
                </div>
                <form onSubmit={handleLogin} className="space-y-5">
                  <Field label="E-mail">
                    <div className="relative">
                      <Mail
                        className="absolute left-3 top-3 text-zinc-400"
                        size={18}
                      />
                      <Input
                        required
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={
                          isAdmin ? "admin@empresa.com" : "voce@empresa.com"
                        }
                        className="pl-10"
                      />
                    </div>
                  </Field>
                  <Field label="Senha">
                    <div className="relative">
                      <KeyRound
                        className="absolute left-3 top-3 text-zinc-400"
                        size={18}
                      />
                      <Input
                        required
                        type={mostrarSenha ? "text" : "password"}
                        value={senha}
                        onChange={(e) => setSenha(e.target.value)}
                        placeholder="Digite sua senha"
                        className="pl-10 pr-11"
                      />
                      <button
                        type="button"
                        onClick={() => setMostrarSenha((visivel) => !visivel)}
                        onMouseDown={(event) => event.preventDefault()}
                        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-zinc-400 transition hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                        title={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                        aria-pressed={mostrarSenha}
                      >
                        {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </Field>
                  <Button disabled={loading} className="h-14 w-full rounded-2xl text-base shadow-[0_12px_25px_rgba(37,99,235,.22)]">
                    {loading ? "Entrando..." : "Avançar"}
                    <ArrowRight size={18} />
                  </Button>
                </form>
                <div className="mt-6 grid gap-3 text-center">
                  <button
                    onClick={() => setTela("cadastro")}
                    className="text-sm font-bold text-slate-800 transition hover:text-slate-500"
                  >
                    Ainda não tenho conta. Solicitar cadastro
                  </button>
                  <button
                    onClick={() => setTela("recuperar")}
                    className="text-sm font-semibold text-slate-500 transition hover:text-slate-900"
                  >
                    Esqueci minha senha
                  </button>
                </div>
                <div className="my-8 flex items-center gap-4">
                  <div className="h-px flex-1 bg-zinc-300" />
                  <span className="text-sm text-zinc-400">ou</span>
                  <div className="h-px flex-1 bg-zinc-300" />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setMode((prev) => (prev === "admin" ? "usuario" : "admin"))
                  }
                  className={`mx-auto flex items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-semibold transition ${isAdmin ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-900"}`}
                >
                  {isAdmin ? <User size={17} /> : <ShieldCheck size={17} />}
                  {isAdmin
                    ? "Voltar para login de usuário"
                    : "Entrar como administrador"}
                </button>
              </>
            )}

            {tela === "cadastro" && (
              <form onSubmit={handleCadastro} className="space-y-4">
                <h2 className="text-center text-2xl font-black text-zinc-800">
                  Solicitar cadastro
                </h2>
                <Field label="Nome">
                  <Input
                    required
                    value={cadastro.nome}
                    onChange={(e) =>
                      setCadastro({ ...cadastro, nome: e.target.value })
                    }
                  />
                </Field>
                <Field label="E-mail">
                  <Input
                    required
                    type="email"
                    value={cadastro.email}
                    onChange={(e) =>
                      setCadastro({ ...cadastro, email: e.target.value })
                    }
                  />
                </Field>
                <Field label="Senha">
                  <Input
                    required
                    type="password"
                    value={cadastro.senha}
                    onChange={(e) =>
                      setCadastro({ ...cadastro, senha: e.target.value })
                    }
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Telefone">
                    <Input
                      value={cadastro.telefone}
                      onChange={(e) =>
                        setCadastro({ ...cadastro, telefone: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Cargo">
                    <Input
                      value={cadastro.cargo}
                      onChange={(e) =>
                        setCadastro({ ...cadastro, cargo: e.target.value })
                      }
                    />
                  </Field>
                </div>
                <Field label="Departamento">
                  <Input
                    value={cadastro.departamento}
                    onChange={(e) =>
                      setCadastro({ ...cadastro, departamento: e.target.value })
                    }
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Município">
                    <select required value={cadastro.municipio} onChange={(e) => { const municipio = e.target.value; setCadastro({ ...cadastro, municipio, unidade: municipio ? `Maranhão Motos - ${municipio}` : "" }); }} className="h-10 w-full rounded-md border border-input bg-input-background px-3 text-sm">
                      <option value="">Selecione</option>{municipiosMaranhao.map((item) => <option key={item.nome} value={item.nome}>{item.nome}</option>)}
                    </select>
                  </Field>
                  <Field label="Unidade"><Input readOnly value={cadastro.unidade} placeholder="Definida pelo município" /></Field>
                </div>
                <label className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-zinc-700">
                  <input
                    required
                    type="checkbox"
                    checked={cadastro.aceitaTermos}
                    onChange={(e) =>
                      setCadastro({
                        ...cadastro,
                        aceitaTermos: e.target.checked,
                      })
                    }
                    className="mt-1"
                  />
                  <span>
                    Li e aceito os{" "}
                    <button
                      type="button"
                      onClick={() => openLegalDocument("terms")}
                      className="font-black text-blue-700 underline"
                    >
                      Termos de Uso
                    </button>{" "}
                    e a{" "}
                    <button
                      type="button"
                      onClick={() => openLegalDocument("privacy")}
                      className="font-black text-blue-700 underline"
                    >
                      Política de Privacidade
                    </button>
                    .
                  </span>
                </label>
                <Button disabled={loading} className="w-full">
                  Enviar solicitação
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setTela("login")}
                  className="w-full"
                >
                  Voltar
                </Button>
              </form>
            )}

            {tela === "recuperar" && (
              <form onSubmit={handleRecuperar} className="space-y-4">
                <h2 className="text-center text-2xl font-black text-zinc-800">
                  Recuperar senha
                </h2>
                <Field label="E-mail">
                  <Input
                    required
                    type="email"
                    value={recuperar.email}
                    onChange={(e) =>
                      setRecuperar({ ...recuperar, email: e.target.value })
                    }
                  />
                </Field>
                <Field label="Código recebido">
                  <Input
                    value={recuperar.codigo}
                    onChange={(e) =>
                      setRecuperar({ ...recuperar, codigo: e.target.value })
                    }
                    placeholder="Preencha depois de solicitar"
                  />
                </Field>
                <Field label="Nova senha">
                  <Input
                    type="password"
                    value={recuperar.novaSenha}
                    onChange={(e) =>
                      setRecuperar({ ...recuperar, novaSenha: e.target.value })
                    }
                  />
                </Field>
                <Button disabled={loading} className="w-full">
                  {recuperar.codigo ? "Redefinir senha" : "Solicitar código"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setTela("login")}
                  className="w-full"
                >
                  Voltar
                </Button>
              </form>
            )}
            {tela === "verificar" && (
              <form onSubmit={handleVerificarEmail} className="space-y-4">
                <h2 className="text-center text-2xl font-black text-zinc-800">Confirmar e-mail</h2>
                <p className="text-center text-sm leading-6 text-zinc-500">Enviamos um código de 6 dígitos para <strong>{verificacao.email}</strong>.</p>
                <Field label="Código de confirmação">
                  <Input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={verificacao.codigo} onChange={(e) => setVerificacao({ ...verificacao, codigo: e.target.value.replace(/\D/g, "") })} placeholder="000000" />
                </Field>
                <Button disabled={loading || verificacao.codigo.length !== 6} className="w-full">Confirmar e-mail</Button>
                <Button type="button" variant="secondary" disabled={loading} onClick={handleReenviarVerificacao} className="w-full">Reenviar código</Button>
                <button type="button" onClick={() => setTela("login")} className="w-full text-sm font-semibold text-zinc-500">Voltar ao login</button>
              </form>
            )}
            <p className="mt-12 text-center text-[11px] font-medium text-slate-400">
              Acesso seguro e restrito a usuários autorizados.
            </p>
          </div>
        </section>
        <section className="relative order-1 flex min-h-[310px] items-center justify-center overflow-hidden bg-gradient-to-br from-[#073b66] via-[#087fa8] to-[#17a9d4] px-7 pb-20 pt-10 text-white lg:min-h-0 lg:px-12 lg:py-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle at 14% 18%, rgba(255,255,255,.9) 0 1px, transparent 2px), radial-gradient(circle at 72% 13%, rgba(255,255,255,.75) 0 1px, transparent 2px), radial-gradient(circle at 84% 31%, rgba(255,255,255,.7) 0 1.5px, transparent 2.5px), radial-gradient(circle at 44% 28%, rgba(255,255,255,.65) 0 1px, transparent 2px)",
              backgroundSize:
                "190px 170px, 230px 210px, 260px 230px, 310px 260px",
            }}
          />
          <div className="absolute right-[11%] top-[12%] h-px w-28 rotate-[-28deg] bg-gradient-to-r from-transparent via-white to-white shadow-[0_0_12px_white]" />
          <svg
            aria-hidden="true"
            viewBox="0 0 600 430"
            preserveAspectRatio="none"
            className="absolute inset-x-0 bottom-0 h-[72%] w-full"
          >
            <path
              d="M0 190 L75 135 L150 190 L235 100 L330 192 L420 125 L510 180 L600 110 L600 430 L0 430 Z"
              fill="#315eac"
            />
            <path
              d="M0 250 L90 170 L175 245 L275 145 L360 245 L460 175 L600 250 L600 430 L0 430 Z"
              fill="#214886"
            />
            <path
              d="M0 305 L95 220 L205 310 L320 205 L415 302 L525 230 L600 285 L600 430 L0 430 Z"
              fill="#142f69"
            />
            <path
              d="M0 330 C100 300 180 355 285 325 C390 295 475 340 600 310 L600 430 L0 430 Z"
              fill="#0c2257"
            />
            <path
              d="M0 352 C120 320 200 382 315 346 C425 312 505 370 600 340"
              fill="none"
              stroke="rgba(106,153,226,.35)"
              strokeWidth="4"
            />
          </svg>
          <div className="relative z-10 -mt-8 flex max-w-md flex-col items-center text-center lg:-mt-16">
            <p className="text-xl font-medium tracking-tight text-white/95 lg:text-3xl">A plataforma</p>
            <h2 className="mt-1 text-4xl font-black tracking-tight lg:text-6xl">ALL IN ONE</h2>
            <p className="mt-1 text-xl font-medium tracking-tight text-white/95 lg:text-3xl">de atendimento e suporte</p>
            <div className="mt-7 hidden max-w-sm rounded-2xl border border-white/20 bg-white/10 p-5 text-sm leading-6 text-blue-50 backdrop-blur-sm lg:block">Abra chamados, acompanhe cada etapa e converse com a equipe em um único ambiente.</div>
          </div>
        </section>
      </div>
    </div>
  );
}

// Área do solicitante: abertura, consulta, comentários e acompanhamento.
function UserPortal({
  usuario,
  setUsuario,
  onLogout,
  configSistema,
  avisosSistema,
}: {
  usuario: UsuarioLogado;
  setUsuario: (u: UsuarioLogado) => void;
  onLogout: () => void;
  configSistema: ConfiguracoesSistema;
  avisosSistema: ApiAvisoSistema[];
}) {
  const [tab, setTab] = useModuleRoute<UsuarioTab>(PORTAL_ROUTES, "home");
  const [chamados, setChamados] = useState<ApiChamado[]>([]);
  const [perfil, setPerfil] = useState<ApiUsuario | null>(null);
  const [tipos, setTipos] = useState<CatalogoItem[]>([]);
  const [base, setBase] = useState<ArtigoBase[]>([]);
  const [artigosBase, setArtigosBase] = useState<ArtigoBase[]>([]);
  const [novo, setNovo] = useState({
    titulo: "",
    descricao: "",
    tipo_chamado: "Incidente",
    processo_atual: "",
    problema: "",
    resultado_esperado: "",
    frequencia: "",
    pessoas: "",
    tempo_minutos: "",
    sistemas: "",
    impacto_nao_execucao: "",
    beneficios: "",
  });
  const [selecionado, setSelecionado] = useState<ApiChamado | null>(null);
  const chamadoSelecionadoUsuarioRef = useRef<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalChamadoAberto, setModalChamadoAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [notificacoesAberta, setNotificacoesAberta] = useState(false);
  const [carregandoNotificacoes, setCarregandoNotificacoes] = useState(false);
  const [mostrarPerfil, setMostrarPerfil] = useState(false);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);
  const [temaEscuroUsuario, setTemaEscuroUsuario] = useState(
    () => localStorage.getItem("smart_helpdesk_user_theme") === "dark",
  );
  const [menuMaisUsuario, setMenuMaisUsuario] = useState(false);
  const [permissoesUsuario, setPermissoesUsuario] = useState<PermissionKey[]>(
    [],
  );
  const [dashboardPermitido, setDashboardPermitido] =
    useState<DashboardResumo | null>(null);

  const usuarioAtual = perfil || usuario;
  const sistemaNome = nomeSistema(configSistema);
  const sistemaLogo1 = logoSistema1(configSistema);
  const suporteEmail = emailSuporteSistema(configSistema);
  const fotoPerfil = usuarioAtual.foto_url || "";
  const inicialPerfil = String(usuarioAtual.nome || "U")
    .slice(0, 1)
    .toUpperCase();
  const unread = notificacoes.filter((n) => !n.lida).length;

  const resumoUsuario = useMemo(() => {
    const normalizar = (status?: string) => String(status || "").toLowerCase();

    const abertos = chamados.filter((c) =>
      ["em aberto", "aberto", "reaberto"].includes(normalizar(c.status)),
    ).length;
    const andamento = chamados.filter(
      (c) => normalizar(c.status) === "em andamento",
    ).length;
    const concluidos = chamados.filter((c) =>
      ["concluido", "concluído", "resolvido"].includes(normalizar(c.status)),
    ).length;
    const atrasados = chamados.filter((c) => Boolean(c.vencido)).length;

    return { abertos, andamento, concluidos, atrasados };
  }, [chamados]);

  const chamadosFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return chamados;
    return chamados.filter((c) =>
      [
        c.numero_chamado,
        c.titulo,
        c.descricao,
        c.status,
        c.prioridade,
        c.tipo_chamado,
        c.responsavel_nome,
        c.responsavel,
      ].some((valor) =>
        String(valor || "")
          .toLowerCase()
          .includes(q),
      ),
    );
  }, [busca, chamados]);

  const chamadosRecentes = useMemo(() => {
    return [...chamadosFiltrados]
      .sort(
        (a, b) =>
          new Date(b.criado_em || 0).getTime() -
          new Date(a.criado_em || 0).getTime(),
      )
      .slice(0, 8);
  }, [chamadosFiltrados]);

  const chamadosPorStatus = useMemo(() => {
    return STATUS_COLUNAS.map((coluna) => ({
      ...coluna,
      chamados: chamadosFiltrados.filter(
        (chamado) => normalizeStatus(chamado.status) === coluna.status,
      ),
    }));
  }, [chamadosFiltrados]);

  const chamadosBoardUsuario = useMemo(() => {
    const colunaAberta = chamadosFiltrados.filter(
      (chamado) => normalizeStatus(chamado.status) === TICKET_STATUS.OPEN,
    );
    const colunaAndamento = chamadosFiltrados.filter((chamado) => {
      const status = normalizeStatus(chamado.status);
      return status === TICKET_STATUS.IN_PROGRESS || status === TICKET_STATUS.WAITING_USER;
    });
    const colunaResolvida = chamadosFiltrados.filter(
      (chamado) => normalizeStatus(chamado.status) === TICKET_STATUS.CLOSED,
    );

    return [
      {
        id: "abertos",
        titulo: "Abertos",
        resumo: "Aguardando atendimento",
        border: "border-blue-300",
        accent: "bg-blue-500",
        badge: "bg-blue-50 text-blue-700",
        chamados: colunaAberta,
      },
      {
        id: "andamento",
        titulo: "Em andamento",
        resumo: "Sendo tratados",
        border: "border-amber-300",
        accent: "bg-amber-500",
        badge: "bg-amber-50 text-amber-700",
        chamados: colunaAndamento,
      },
      {
        id: "resolvidos",
        titulo: "Resolvidos",
        resumo: "Últimos 30 dias",
        border: "border-emerald-300",
        accent: "bg-emerald-500",
        badge: "bg-emerald-50 text-emerald-700",
        chamados: colunaResolvida,
      },
    ];
  }, [chamadosFiltrados]);

  const artigosSugeridos = useMemo(
    () => artigosBase.slice(0, 3),
    [artigosBase],
  );

  const chamadoComResponsavelDestaque = useMemo(() => {
    const ativoComResponsavel = chamadosFiltrados.find((chamado) => {
      const status = normalizeStatus(chamado.status);
      return (
        status !== TICKET_STATUS.CLOSED &&
        (chamado.responsavel_id || nomeResponsavelChamado(chamado))
      );
    });

    return (
      ativoComResponsavel ||
      chamadosFiltrados.find(
        (chamado) => chamado.responsavel_id || nomeResponsavelChamado(chamado),
      ) ||
      chamadosFiltrados.find(
        (chamado) => normalizeStatus(chamado.status) !== TICKET_STATUS.CLOSED,
      ) ||
      chamadosFiltrados[0] ||
      null
    );
  }, [chamadosFiltrados]);

  const usuarioTabs = [
    {
      key: "home" as UsuarioTab,
      icon: LayoutDashboard,
      label: "Início",
      title: "Início",
    },
    {
      key: "chamados" as UsuarioTab,
      icon: Ticket,
      label: "Meus Chamados",
      title: "Meus chamados",
    },
    {
      key: "base" as UsuarioTab,
      icon: BookOpen,
      label: "Base de Conhecimento",
      title: "Base de conhecimento",
    },
    {
      key: "avisos" as UsuarioTab,
      icon: Bell,
      label: "Notificações",
      title: "Notificações",
    },
    ...(permissoesUsuario.includes("visualizar_dashboard")
      ? [
          {
            key: "dashboard" as UsuarioTab,
            icon: BarChart3,
            label: "Dashboard",
            title: "Dashboard",
          },
        ]
      : []),
    ...(permissoesUsuario.includes("visualizar_relatorios") || permissoesUsuario.includes("baixar_relatorios")
      ? [
          {
            key: "relatorios" as UsuarioTab,
            icon: Download,
            label: "Relatórios",
            title: "Relatórios",
          },
        ]
      : []),
  ];

  const activeTab =
    usuarioTabs.find((item) => item.key === tab) ?? usuarioTabs[0];

  function abrirSuporteUsuario() {
    const email = suporteEmail.trim();
    if (email && email.includes("@")) {
      window.location.href = `mailto:${email}?subject=${encodeURIComponent(`Suporte - ${sistemaNome}`)}`;
      return;
    }
    setModalChamadoAberto(true);
  }

  async function carregarNotificacoesUsuario() {
    setCarregandoNotificacoes(true);
    try {
      const lista = await listarNotificacoes();
      setNotificacoes(lista);
    } catch {
      // Notificações não devem bloquear o portal do usuário.
    } finally {
      setCarregandoNotificacoes(false);
    }
  }

  async function carregar() {
    const [me, lista, notificacoesLista] =
      await Promise.all([
        obterMeuPerfil(),
        listarChamadosDoUsuario(),
        listarNotificacoes().catch(() => []),
      ]);

    setPerfil(me);
    setChamados(lista);
    setNotificacoes(notificacoesLista);
    setUsuario(me);
  }

  function sincronizarChamadoUsuario(atualizado: ApiChamado) {
    setChamados((atuais) => atuais.map((item) => Number(item.id) === Number(atualizado.id) ? { ...item, ...atualizado } : item));
    setSelecionado((atual) => atual && Number(atual.id) === Number(atualizado.id) ? { ...atual, ...atualizado } : atual);
  }

  async function sincronizarChamadosUsuario() {
    setChamados(await listarChamadosDoUsuario());
    const selecionadoId = chamadoSelecionadoUsuarioRef.current;
    if (selecionadoId) buscarChamado(selecionadoId).then(sincronizarChamadoUsuario).catch(() => {});
  }

  function sincronizarFotoSolicitanteLocal(usuarioAtualizado: ApiUsuario) {
    const emailAtualizado = String(usuarioAtualizado.email || "").toLowerCase();
    const fotoAtualizada = usuarioAtualizado.foto_url || "";
    const atualizarChamado = (chamado: ApiChamado) => {
      const mesmoUsuario =
        Number(chamado.solicitante_id || chamado.usuario_id || 0) ===
        Number(usuarioAtualizado.id);
      const mesmoEmail =
        emailAtualizado &&
        [chamado.solicitante_email, chamado.email_solicitante].some(
          (email) => String(email || "").toLowerCase() === emailAtualizado,
        );
      if (!mesmoUsuario && !mesmoEmail) return chamado;
      return {
        ...chamado,
        solicitante_id:
          chamado.solicitante_id || chamado.usuario_id || usuarioAtualizado.id,
        solicitante_nome:
          usuarioAtualizado.nome ||
          chamado.solicitante_nome ||
          chamado.solicitante,
        solicitante_email:
          usuarioAtualizado.email ||
          chamado.solicitante_email ||
          chamado.email_solicitante,
        solicitante_foto_url: fotoAtualizada,
      };
    };

    setChamados((atuais) => atuais.map(atualizarChamado));
    setSelecionado((atual) => (atual ? atualizarChamado(atual) : atual));
  }

  useEffect(() => {
    carregar().catch((e) => toast.error(e.message));
    obterMinhasPermissoes()
      .then(async ({ permissions }) => {
        setPermissoesUsuario(permissions);
        if (permissions.includes("visualizar_dashboard"))
          setDashboardPermitido(await obterDashboard().catch(() => null));
      })
      .catch(() => setPermissoesUsuario([]));
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "smart_helpdesk_user_theme",
      temaEscuroUsuario ? "dark" : "light",
    );
  }, [temaEscuroUsuario]);

  useEffect(() => {
    const intervalo = window.setInterval(() => {
      carregarNotificacoesUsuario().catch(() => {});
    }, 30000);
    return () => window.clearInterval(intervalo);
  }, []);

  useEffect(() => {
    if (tab === "base" && !artigosBase.length) listarBaseConhecimento().then(setArtigosBase).catch(() => {});
  }, [tab, artigosBase.length]);

  useEffect(() => {
    if (modalChamadoAberto && !tipos.length) listarCatalogo("tipos").then(setTipos).catch(() => {});
  }, [modalChamadoAberto, tipos.length]);

  useEffect(() => { chamadoSelecionadoUsuarioRef.current = selecionado?.id || null; }, [selecionado?.id]);

  useEffect(() => {
    const sincronizarSeVisivel = () => { if (document.visibilityState === "visible") void sincronizarChamadosUsuario(); };
    const intervalo = window.setInterval(sincronizarSeVisivel, 60000);
    document.addEventListener("visibilitychange", sincronizarSeVisivel);
    window.addEventListener("focus", sincronizarSeVisivel);
    return () => { window.clearInterval(intervalo); document.removeEventListener("visibilitychange", sincronizarSeVisivel); window.removeEventListener("focus", sincronizarSeVisivel); };
  }, []);

  useEffect(() => {
    const q = `${novo.titulo} ${novo.descricao}`.trim();
    if (q.length > 4)
      listarBaseConhecimento(q)
        .then(setBase)
        .catch(() => {});
    else setBase([]);
  }, [novo.titulo, novo.descricao]);

  async function salvarPerfil(event: FormEvent) {
    event.preventDefault();
    if (!perfil) return;

    setSalvandoPerfil(true);
    try {
      const atual = await atualizarMeuPerfil({
        nome: perfil.nome,
        telefone: perfil.telefone || "",
        departamento: perfil.departamento || "",
        municipio: perfil.municipio || "",
        unidade: perfil.unidade || "",
        cargo: perfil.cargo || "",
      });
      setPerfil(atual);
      atualizarUsuarioLocal(atual);
      setUsuario(atual);
      toast.success("Perfil atualizado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao atualizar perfil.");
    } finally {
      setSalvandoPerfil(false);
    }
  }

  async function trocarFotoPerfil(event: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0];
    event.target.value = "";
    if (!arquivo) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(arquivo.type)) {
      toast.error("Envie uma imagem PNG, JPG ou WEBP.");
      return;
    }
    if (arquivo.size > 5 * 1024 * 1024) {
      toast.error("A imagem precisa ter até 5 MB.");
      return;
    }

    setEnviandoFoto(true);
    try {
      const atual = await atualizarMinhaFotoPerfil(arquivo);
      setPerfil(atual);
      atualizarUsuarioLocal(atual);
      setUsuario(atual);
      sincronizarFotoSolicitanteLocal(atual);
      toast.success("Foto do perfil atualizada.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao atualizar foto.");
    } finally {
      setEnviandoFoto(false);
    }
  }

  async function removerFotoPerfil() {
    setEnviandoFoto(true);
    try {
      const atual = await removerMinhaFotoPerfil();
      setPerfil(atual);
      atualizarUsuarioLocal(atual);
      setUsuario(atual);
      sincronizarFotoSolicitanteLocal(atual);
      toast.success("Foto removida.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao remover foto.");
    } finally {
      setEnviandoFoto(false);
    }
  }

  async function marcarTodasComoLidasUsuario() {
    try {
      await marcarNotificacoesLidas();
      setNotificacoes((lista) =>
        lista.map((item) => ({ ...item, lida: true })),
      );
      toast.success("Notificações marcadas como lidas.");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Erro ao marcar notificações.",
      );
    }
  }

  async function abrirNotificacaoUsuario(notificacao: Notificacao) {
    try {
      if (!notificacao.lida) {
        await marcarNotificacoesLidas(notificacao.id);
        setNotificacoes((lista) =>
          lista.map((item) =>
            item.id === notificacao.id ? { ...item, lida: true } : item,
          ),
        );
      }

      setNotificacoesAberta(false);
      const chamadoId = chamadoIdFromNotification(notificacao.link);
      if (chamadoId) await abrirDetalhe(chamadoId);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Erro ao abrir notificação.",
      );
    }
  }

  async function abrirChamado(event: FormEvent) {
    event.preventDefault();
    setLoading(true);

    try {
      const criado = await criarChamado(novo);
      const developmentNature:Record<string,string>={"Bug":"bug","Melhoria":"melhoria","Automação":"automacao","Integração":"integracao","Dashboard / Relatório":"dashboard_relatorio","Novo Sistema":"novo_sistema"};
      const nature=developmentNature[novo.tipo_chamado];
      if(nature) await criarDemandaDesenvolvimento({ticket_id:criado.id,nature,current_process:novo.processo_atual,problem:novo.problema||novo.descricao,expected_result:novo.resultado_esperado,frequency:novo.frequencia,people_involved:novo.pessoas?Number(novo.pessoas):undefined,current_time_minutes:novo.tempo_minutos?Number(novo.tempo_minutos):undefined,systems:novo.sistemas.split(",").map(v=>v.trim()).filter(Boolean),no_delivery_impact:novo.impacto_nao_execucao,expected_benefits:novo.beneficios.split(",").map(v=>v.trim()).filter(Boolean)});
      setChamados((atuais) => [criado, ...atuais.filter((item) => Number(item.id) !== Number(criado.id))]);
      setNovo({ titulo: "", descricao: "", tipo_chamado: "Incidente", processo_atual:"", problema:"", resultado_esperado:"", frequencia:"", pessoas:"", tempo_minutos:"", sistemas:"", impacto_nao_execucao:"", beneficios:"" });
      setBase([]);
      setModalChamadoAberto(false);
      setTab("chamados");
      toast.success("Chamado criado com sucesso.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar chamado.");
    } finally {
      setLoading(false);
    }
  }

  async function abrirDetalhe(id: number) {
    const resumo = chamados.find((item) => Number(item.id) === Number(id));
    if (resumo) setSelecionado(resumo);
    try {
      const detalhe = await buscarChamado(id);
      setSelecionado((atual) => Number(atual?.id) === Number(id) ? detalhe : atual);
    } catch (e) {
      setSelecionado((atual) => Number(atual?.id) === Number(id) ? null : atual);
      toast.error(e instanceof Error ? e.message : "Erro ao buscar chamado.");
    }
  }

  function executarPesquisa(event: FormEvent) {
    event.preventDefault();
    setTab("chamados");
    setNotificacoesAberta(false);
  }

  function limparPesquisa() {
    setBusca("");
  }

  const renderConteudo = () => {
    if (
      tab === "dashboard" &&
      permissoesUsuario.includes("visualizar_dashboard")
    ) {
      return dashboardPermitido ? (
        <Suspense fallback={<div className="ds-empty-state"><RefreshCw className="ds-empty-state__icon animate-spin"/><strong>Carregando dashboard…</strong></div>}><OperationalDashboard
          initial={dashboardPermitido}
          dark={temaEscuroUsuario}
          onNavigate={() => {}}
          onOpenTicket={(id) => abrirDetalhe(id)}
        /></Suspense>
      ) : (
        <Card>
          <p className="p-8 text-center text-sm text-zinc-500">
            Carregando dashboard...
          </p>
        </Card>
      );
    }
    if (
      tab === "relatorios" &&
      (permissoesUsuario.includes("visualizar_relatorios") || permissoesUsuario.includes("baixar_relatorios"))
    ) {
      return (
        <Card>
          <h3 className="flex items-center gap-2 text-lg font-black">
            <Download size={19} />
            Relatórios autorizados
          </h3>
          <p className="mt-1 text-sm text-zinc-500">
            Exporte os seus chamados nos formatos disponíveis.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button onClick={() => baixarRelatorio("csv", { meus: true })}>
              Baixar CSV
            </Button>
            <Button onClick={() => baixarRelatorio("excel", { meus: true })}>
              Baixar Excel
            </Button>
            <Button onClick={() => baixarRelatorio("pdf", { meus: true })}>
              Baixar PDF
            </Button>
          </div>
        </Card>
      );
    }
    if (tab === "base") {
      return (
        <UsuarioBaseConhecimento
          artigos={artigosBase}
          busca={busca}
          setBusca={setBusca}
        />
      );
    }

    if (tab === "avisos") {
      return (
        <UsuarioAvisosPanel
          notificacoes={notificacoes}
          carregando={carregandoNotificacoes}
          onAbrir={abrirNotificacaoUsuario}
          onMarcarTodas={marcarTodasComoLidasUsuario}
          onAtualizar={carregarNotificacoesUsuario}
        />
      );
    }

    if (tab === "chamados") {
      return (
        <UsuarioChamadoLista
          chamados={chamadosFiltrados}
          onAbrir={abrirDetalhe}
          busca={busca}
        />
      );
    }

    return (
      <div className="min-h-full lg:flex lg:h-full lg:flex-col lg:overflow-hidden">
        <section className="mb-4 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Central do solicitante</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-zinc-900">Olá, {String(usuarioAtual.nome || "Usuário").split(" ")[0]}</h2>
            <p className="mt-1 text-sm text-zinc-500">Acompanhe seus atendimentos e encontre soluções em um só lugar.</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-500">
            <span className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 shadow-sm"><span className="h-2 w-2 rounded-full bg-emerald-500"/>Central online</span>
            <span className="hidden rounded-xl border border-zinc-200 bg-white px-3 py-2 shadow-sm sm:inline-flex">{usuarioAtual.departamento || "Seu departamento"}</span>
          </div>
        </section>
        <section className="grid min-h-full flex-1 gap-4 lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_280px] 2xl:grid-cols-[minmax(0,1fr)_310px]">
          <div className="flex min-w-0 flex-col gap-4 lg:min-h-0">
            <section className="grid shrink-0 gap-3 md:grid-cols-3">
              <UsuarioResumoCard
                icon={<MessageSquare size={22} />}
                valor={resumoUsuario.abertos}
                titulo="Abertos"
                subtitulo="Aguardando atendimento"
                tom="blue"
              />
              <UsuarioResumoCard
                icon={<Clock3 size={22} />}
                valor={resumoUsuario.andamento}
                titulo="Em andamento"
                subtitulo="Sendo tratados"
                tom="amber"
              />
              <UsuarioResumoCard
                icon={<CheckCircle2 size={22} />}
                valor={resumoUsuario.concluidos}
                titulo="Resolvidos"
                subtitulo="Últimos 30 dias"
                tom="emerald"
              />
            </section>

            <UsuarioKanbanLeitura
              colunas={chamadosBoardUsuario}
              onAbrir={abrirDetalhe}
              onVerTodos={() => setTab("chamados")}
            />
          </div>

          <aside className="flex min-h-0 flex-col gap-4">
            <div className="rounded-[20px] border border-zinc-200 bg-white p-4 text-center shadow-sm shadow-slate-200/60">
              <button
                type="button"
                onClick={() => setMostrarPerfil(true)}
                className="relative mx-auto grid h-20 w-20 place-items-center overflow-visible rounded-full border border-zinc-100 bg-zinc-50 shadow-sm transition hover:ring-4 hover:ring-blue-500/10"
                title="Editar perfil"
              >
                <span className="grid h-full w-full place-items-center overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-sky-400 text-2xl font-black text-white">
                  {fotoPerfil ? (
                    <img
                      src={fotoPerfil}
                      alt={usuarioAtual.nome}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    inicialPerfil
                  )}
                </span>
                <span className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full border border-zinc-200 bg-white text-zinc-600 shadow-md">
                  <Camera size={16} />
                </span>
              </button>
              <h3 className="mt-3 text-base font-black text-zinc-900">
                Olá, {usuarioAtual.nome || "Usuário"}! 👋
              </h3>
              <p className="mt-1 text-xs font-medium text-zinc-500">
                Como podemos te ajudar hoje?
              </p>

              <div className="user-open-summary mt-3 flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 p-3 text-left">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white text-blue-700 shadow-sm">
                  <Clock3 size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-500">
                    Chamados em aberto
                  </p>
                  <p className="text-base font-black text-zinc-900">
                    {resumoUsuario.abertos} aguardando
                  </p>
                </div>
              </div>

              <ResponsavelAtendimentoCard
                chamado={chamadoComResponsavelDestaque}
                onAbrir={abrirDetalhe}
              />
            </div>

            <div className="min-h-0 flex-1 overflow-hidden rounded-[20px] border border-zinc-200 bg-white p-4 shadow-sm shadow-slate-200/60">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="font-black text-zinc-900">Artigos sugeridos</h3>
                <BookOpen size={18} className="text-blue-600" />
              </div>

              <div className="divide-y divide-zinc-100">
                {artigosSugeridos.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => setTab("base")}
                    className="flex w-full items-center gap-3 rounded-2xl bg-zinc-50 p-4 text-left transition hover:bg-blue-50"
                  >
                    <FileText size={19} className="text-blue-600" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-black text-zinc-900">
                        Consultar base de conhecimento
                      </span>
                      <span className="mt-1 block text-xs font-medium text-zinc-500">
                        Soluções e tutoriais
                      </span>
                    </span>
                    <ArrowRight size={16} className="text-zinc-400" />
                  </button>
                ) : (
                  artigosSugeridos.map((artigo) => (
                    <button
                      key={artigo.id}
                      type="button"
                      onClick={() => setTab("base")}
                      className="flex w-full items-center gap-3 py-4 text-left transition hover:text-blue-700"
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700">
                        <FileText size={18} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 text-sm font-black text-zinc-900">
                          {artigo.titulo}
                        </span>
                        <span className="mt-1 block truncate text-xs font-medium text-zinc-500">
                          {artigo.categoria || "Solução"}
                        </span>
                      </span>
                      <ArrowRight
                        size={16}
                        className="shrink-0 text-zinc-400"
                      />
                    </button>
                  ))
                )}
              </div>

              <button
                type="button"
                onClick={() => setTab("base")}
                className="mt-4 flex items-center gap-2 text-sm font-black text-blue-700 transition hover:text-blue-900"
              >
                Ver todos os artigos <ArrowRight size={16} />
              </button>
            </div>
          </aside>
        </section>
      </div>
    );
  };

  return (
    <div
      className={`smart-helpdesk-config-theme h-screen overflow-hidden ${temaEscuroUsuario ? "usuario-theme-dark bg-[#0b1220] text-zinc-100" : "bg-[#f7f9fc] text-[#17212b]"}`}
      style={variaveisTemaSistema(configSistema)}
    >
      <SystemThemeStyle />
      <style>{`
        .usuario-theme-dark .bg-white { background-color: #111827 !important; }
        .usuario-theme-dark .bg-zinc-50,
        .usuario-theme-dark .bg-zinc-100 { background-color: #0f172a !important; }
        .usuario-theme-dark .border-zinc-100,
        .usuario-theme-dark .border-zinc-200 { border-color: #334155 !important; }
        .usuario-theme-dark .text-zinc-900,
        .usuario-theme-dark .text-zinc-800,
        .usuario-theme-dark .text-zinc-700 { color: #f8fafc !important; }
        .usuario-theme-dark .text-zinc-600,
        .usuario-theme-dark .text-zinc-500,
        .usuario-theme-dark .text-zinc-400 { color: #94a3b8 !important; }
        .usuario-theme-dark input,
        .usuario-theme-dark textarea,
        .usuario-theme-dark select { background-color: #0f172a !important; color: #e5e7eb !important; border-color: #334155 !important; }
        .usuario-theme-dark input::placeholder,
        .usuario-theme-dark textarea::placeholder { color: #64748b !important; }
        .usuario-theme-dark .shadow-sm,
        .usuario-theme-dark .shadow-md,
        .usuario-theme-dark .shadow-lg,
        .usuario-theme-dark .shadow-2xl { box-shadow: 0 18px 45px rgba(0,0,0,.22) !important; }
      `}</style>
      <Toaster position="top-right" richColors />
      <div className="fixed inset-x-0 top-3 z-50 mx-auto w-[min(920px,calc(100vw-32px))]">
        <AvisosSistemaBanner avisos={avisosSistema} dark={temaEscuroUsuario} />
      </div>
      <div className="flex h-screen overflow-hidden">
        <aside className="hidden w-[256px] shrink-0 flex-col border-r border-white/5 bg-gradient-to-b from-[#101c29] via-[#0d1925] to-[#08131d] text-white shadow-2xl lg:flex">
          <div className="flex items-center gap-3 border-b border-white/8 px-4 py-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white/95 p-1 shadow-xl shadow-black/20">
              <img
                src={sistemaLogo1}
                alt={sistemaNome}
                className="h-full w-full object-contain"
              />
            </div>
            <div className="min-w-0"><h1 className="truncate text-sm font-black tracking-tight">{sistemaNome}</h1><p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">Portal do usuário</p></div>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-4">
            <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-white/35">Atendimento</p>
            <UsuarioSidebarButton
              ativo={tab === "home"}
              icon={<LayoutDashboard size={22} />}
              label="Início"
              onClick={() => {
                setTab("home");
                setNotificacoesAberta(false);
              }}
            />
            <UsuarioSidebarButton
              ativo={tab === "avisos"}
              icon={<Bell size={22} />}
              label="Notificações"
              badge={unread > 0 ? String(unread) : undefined}
              onClick={() => { setTab("avisos"); setNotificacoesAberta(false); }}
            />
            <UsuarioSidebarButton
              ativo={tab === "chamados"}
              icon={<Ticket size={22} />}
              label="Meus Chamados"
              onClick={() => {
                setTab("chamados");
                setNotificacoesAberta(false);
              }}
            />
            <UsuarioSidebarButton
              ativo={tab === "base"}
              icon={<BookOpen size={22} />}
              label="Base de Conhecimento"
              onClick={() => {
                setTab("base");
                setNotificacoesAberta(false);
              }}
            />
            {permissoesUsuario.includes("visualizar_dashboard") && (
              <UsuarioSidebarButton
                ativo={tab === "dashboard"}
                icon={<BarChart3 size={22} />}
                label="Dashboard"
                onClick={() => setTab("dashboard")}
              />
            )}
            {permissoesUsuario.includes("baixar_relatorios") && (
              <UsuarioSidebarButton
                ativo={tab === "relatorios"}
                icon={<Download size={22} />}
                label="Relatórios"
                onClick={() => setTab("relatorios")}
              />
            )}

            <div className="my-4 border-t border-white/10" />
            <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-white/35">Preferências</p>

            <UsuarioSidebarButton
              icon={temaEscuroUsuario ? <Sun size={22} /> : <Moon size={22} />}
              label={temaEscuroUsuario ? "Tema claro" : "Tema escuro"}
              title="Alternar tema"
              onClick={() => setTemaEscuroUsuario((valor) => !valor)}
            />
          </nav>

          <div className="space-y-2 border-t border-white/8 px-3 pb-4 pt-3">
            <button type="button" onClick={()=>setMostrarPerfil(true)} className="mb-2 flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-white/5"><span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-sky-400 text-sm font-black">{fotoPerfil?<img src={fotoPerfil} alt={usuarioAtual.nome} className="h-full w-full object-cover"/>:inicialPerfil}</span><span className="min-w-0"><span className="block truncate text-xs font-black">{usuarioAtual.nome}</span><span className="block truncate text-[10px] text-white/45">{usuarioAtual.departamento||"Solicitante"}</span></span></button>
            <button
              type="button"
              onClick={onLogout}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 text-xs font-black text-white/80 transition hover:border-red-300/30 hover:bg-red-500/15 hover:text-red-100"
              title="Sair do site"
            >
              <LogOut size={17} />
              Sair do site
            </button>
            <button
              type="button"
              onClick={() => {
                abrirSuporteUsuario();
                setNotificacoesAberta(false);
              }}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-xs font-black text-white shadow-lg shadow-blue-900/30 transition hover:bg-blue-500"
              title={`Falar com o suporte: ${suporteEmail}`}
            >
              <Phone size={17} />
              <span className="flex flex-col leading-tight">
                <span>Suporte</span>
                <span className="max-w-[150px] truncate text-[10px] font-semibold opacity-80">
                  {suporteEmail}
                </span>
              </span>
            </button>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/95 shadow-sm backdrop-blur">
            <div className="relative flex h-14 items-center gap-3 px-4 lg:px-5">
              <div className="flex min-w-0 items-center gap-3 lg:hidden">
                <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200">
                  <img
                    src={sistemaLogo1}
                    alt={sistemaNome}
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                  <h1 className="truncate text-base font-black tracking-tight">
                    {sistemaNome}
                  </h1>
                  <p className="text-xs text-zinc-500">{activeTab.title}</p>
                </div>
              </div>

              <div className="pointer-events-none absolute left-1/2 hidden -translate-x-1/2 lg:block"><p className="text-sm font-black text-zinc-800">{activeTab.title}</p></div>
              <form
                onSubmit={executarPesquisa}
                className="hidden min-w-[240px] max-w-[430px] flex-1 md:flex lg:max-w-[360px] xl:max-w-[430px]"
              >
                <div className="ds-search flex h-10 w-full items-center overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm shadow-slate-200/50 transition focus-within:border-blue-300 focus-within:ring-4 focus-within:ring-blue-500/10">
                  <button
                    type="submit"
                    className="grid h-full w-14 shrink-0 place-items-center text-zinc-400 transition hover:text-blue-600"
                    title="Pesquisar"
                    aria-label="Pesquisar chamados"
                  >
                    <Search size={18} />
                  </button>
                  <input
                    aria-label="Pesquisar chamados"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Pesquisar chamados..."
                    className="h-full min-w-0 flex-1 border-0 bg-transparent pr-2 text-sm font-semibold text-zinc-800 outline-none placeholder:font-medium placeholder:text-zinc-400"
                  />
                  {busca && (
                    <button
                      type="button"
                      onClick={limparPesquisa}
                      className="mr-2 grid h-8 w-8 shrink-0 place-items-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
                      title="Limpar pesquisa"
                      aria-label="Limpar pesquisa"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>
              </form>

              <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setModalChamadoAberto(true)}
                  className="hidden h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-black text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700 sm:flex"
                  title="Abrir chamado"
                >
                  <Plus size={17} />
                  Abrir Chamado
                </button>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setNotificacoesAberta((valor) => !valor);
                      setMostrarPerfil(false);
                    }}
                    className={`relative grid h-10 w-10 place-items-center rounded-xl transition ${notificacoesAberta ? "bg-blue-50 text-blue-700" : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"}`}
                    title="Notificações"
                    aria-label="Abrir notificações"
                  >
                    <Bell size={19} />
                    {unread > 0 && (
                      <span className="absolute right-2 top-2 grid min-h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-black leading-none text-white">
                        {unread}
                      </span>
                    )}
                  </button>

                  {notificacoesAberta && (
                    <div className="absolute right-0 top-14 z-50 w-[360px] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl shadow-slate-200/70">
                      <div className="flex items-start justify-between gap-3 border-b border-zinc-100 p-4">
                        <div>
                          <p className="font-black text-zinc-900">
                            Notificações
                          </p>
                          <p className="text-xs text-zinc-500">
                            {unread} não lida(s)
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={marcarTodasComoLidasUsuario}
                          disabled={unread === 0}
                          className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-black text-zinc-600 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Marcar lidas
                        </button>
                      </div>

                      <div className="max-h-[430px] overflow-auto p-2">
                        {carregandoNotificacoes &&
                          notificacoes.length === 0 && (
                            <div className="p-6 text-center text-sm text-zinc-500">
                              Carregando notificações...
                            </div>
                          )}
                        {!carregandoNotificacoes &&
                          notificacoes.length === 0 && (
                            <div className="p-6 text-center text-sm text-zinc-500">
                              Nenhuma notificação por enquanto.
                            </div>
                          )}
                        {notificacoes.map((notificacao) => {
                          const chamadoId = chamadoIdFromNotification(
                            notificacao.link,
                          );
                          return (
                            <button
                              type="button"
                              key={notificacao.id}
                              onClick={() =>
                                abrirNotificacaoUsuario(notificacao)
                              }
                              className={`mb-2 flex w-full gap-3 rounded-xl border p-3 text-left transition ${notificacao.lida ? "border-zinc-100 bg-white hover:bg-zinc-50" : "border-blue-100 bg-blue-50 hover:bg-blue-100"}`}
                            >
                              <span
                                className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border ${notificacaoClass(notificacao.tipo)}`}
                              >
                                {notificacaoIcone(notificacao.tipo)}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="flex items-start justify-between gap-2">
                                  <span className="line-clamp-1 text-sm font-black text-zinc-900">
                                    {notificacao.titulo}
                                  </span>
                                  {!notificacao.lida && (
                                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                                  )}
                                </span>
                                <span className="mt-1 block line-clamp-2 text-xs leading-5 text-zinc-500">
                                  {notificacao.mensagem}
                                </span>
                                <span className="mt-2 flex items-center justify-between gap-2 text-[11px] font-bold text-zinc-400">
                                  <span>
                                    {formatDate(notificacao.criado_em)}
                                  </span>
                                  {chamadoId && (
                                    <span>Chamado #{chamadoId}</span>
                                  )}
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setMostrarPerfil(true);
                    setNotificacoesAberta(false);
                  }}
                  className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-full border border-zinc-200 bg-white shadow-sm transition hover:ring-4 hover:ring-blue-500/10"
                  title="Meu perfil"
                  aria-label="Abrir meu perfil"
                >
                  {fotoPerfil ? (
                    <img
                      src={fotoPerfil}
                      alt={usuarioAtual.nome}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="grid h-full w-full place-items-center bg-gradient-to-br from-blue-500 to-sky-400 text-base font-black text-white">
                      {inicialPerfil}
                    </span>
                  )}
                  <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500" />
                </button>
              </div>
            </div>
          </header>

          <div className="border-b border-zinc-200 bg-white px-4 py-3 md:hidden">
            <form
              onSubmit={executarPesquisa}
              className="ds-search flex h-10 items-center overflow-hidden rounded-full border border-zinc-200 bg-white shadow-sm"
            >
              <button
                type="submit"
                className="grid h-full w-11 place-items-center text-zinc-400"
              >
                <Search size={17} />
              </button>
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Pesquisar chamado..."
                className="h-full min-w-0 flex-1 border-0 bg-transparent text-sm font-semibold outline-none"
              />
              {busca && (
                <button
                  type="button"
                  onClick={limparPesquisa}
                  className="grid h-8 w-8 place-items-center text-zinc-400"
                >
                  <X size={15} />
                </button>
              )}
            </form>
          </div>

          <main className="h-[calc(100vh-56px)] overflow-auto px-4 pb-24 pt-4 lg:overflow-hidden lg:px-5 lg:pb-5 lg:pt-4">
            {renderConteudo()}
          </main>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 px-2 pb-[calc(env(safe-area-inset-bottom)+6px)] pt-2 shadow-[0_-10px_28px_rgba(15,23,42,0.12)] backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 items-end gap-1">
          <MobileNavButton
            icon={<LayoutDashboard size={21} />}
            label="Início"
            active={tab === "home"}
            onClick={() => {
              setTab("home");
              setMenuMaisUsuario(false);
              setNotificacoesAberta(false);
            }}
          />
          <MobileNavButton
            icon={<Ticket size={21} />}
            label="Chamados"
            active={tab === "chamados"}
            onClick={() => {
              setTab("chamados");
              setMenuMaisUsuario(false);
              setNotificacoesAberta(false);
            }}
          />
          <button
            type="button"
            onClick={() => {
              setModalChamadoAberto(true);
              setMenuMaisUsuario(false);
              setNotificacoesAberta(false);
            }}
            className="-mt-7 flex flex-col items-center gap-1 text-[11px] font-black text-blue-700"
            aria-label="Abrir chamado"
          >
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-500/30 ring-4 ring-white">
              <Plus size={26} />
            </span>
            <span>Abrir</span>
          </button>
          <MobileNavButton
            icon={<BookOpen size={21} />}
            label="Base"
            active={tab === "base"}
            onClick={() => {
              setTab("base");
              setMenuMaisUsuario(false);
              setNotificacoesAberta(false);
            }}
          />
          <MobileNavButton
            icon={<Menu size={21} />}
            label="Mais"
            active={menuMaisUsuario || tab === "avisos"}
            onClick={() => {
              setMenuMaisUsuario(true);
              setNotificacoesAberta(false);
            }}
            badge={unread > 0 ? String(unread) : undefined}
          />
        </div>
      </nav>

      {menuMaisUsuario && (
        <MobileMoreSheet
          title="Mais opções"
          onClose={() => setMenuMaisUsuario(false)}
        >
          <MobileMoreAction
            icon={<User size={18} />}
            label="Perfil"
            onClick={() => {
              setMostrarPerfil(true);
              setMenuMaisUsuario(false);
            }}
          />
          <MobileMoreAction
            icon={<Bell size={18} />}
            label="Notificações"
            badge={unread > 0 ? `${unread} nova(s)` : undefined}
            onClick={() => {
              setTab("avisos");
              setMenuMaisUsuario(false);
            }}
          />
          <MobileMoreAction
            icon={temaEscuroUsuario ? <Sun size={18} /> : <Moon size={18} />}
            label={temaEscuroUsuario ? "Tema claro" : "Tema escuro"}
            onClick={() => setTemaEscuroUsuario((valor) => !valor)}
          />
          <MobileMoreAction
            icon={<Phone size={18} />}
            label="Suporte"
            badge={suporteEmail}
            onClick={() => {
              abrirSuporteUsuario();
              setMenuMaisUsuario(false);
            }}
          />
          <MobileMoreAction
            icon={<LogOut size={18} />}
            label="Sair do site"
            danger
            onClick={() => {
              setMenuMaisUsuario(false);
              onLogout();
            }}
          />
        </MobileMoreSheet>
      )}

      {mostrarPerfil && perfil && (
        <ProfileCenter
          profile={perfil}
          draft={perfil}
          setDraft={(draft) => setPerfil({ ...perfil, ...draft })}
          photo={fotoPerfil}
          initials={inicialPerfil}
          uploading={enviandoFoto}
          saving={salvandoPerfil}
          stats={resumoUsuario}
          onSave={salvarPerfil}
          onPhoto={trocarFotoPerfil}
          onRemovePhoto={removerFotoPerfil}
          onClose={() => setMostrarPerfil(false)}
          onLogout={onLogout}
        />
      )}

      {modalChamadoAberto && (
        <UsuarioNovoChamadoModal
          perfil={usuarioAtual}
          tipos={tipos}
          novo={novo}
          setNovo={setNovo}
          base={base}
          loading={loading}
          onClose={() => setModalChamadoAberto(false)}
          onSubmit={abrirChamado}
        />
      )}

      {selecionado && (
        <ChamadoDetalhe
          chamado={selecionado}
          usuario={usuarioAtual}
          onClose={() => setSelecionado(null)}
          onRefresh={async () => {
            const atualizado = await buscarChamado(selecionado.id);
            sincronizarChamadoUsuario(atualizado);
          }}
        />
      )}
    </div>
  );
}

function MobileNavButton({
  icon,
  label,
  active,
  badge,
  dark = false,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  active?: boolean;
  badge?: string;
  dark?: boolean;
  onClick: () => void;
}) {
  const activeClass = active
    ? "text-blue-600"
    : dark
      ? "text-white/62"
      : "text-zinc-500";
  const iconClass = active
    ? "bg-blue-50 text-blue-600"
    : dark
      ? "text-white/70"
      : "text-zinc-500";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-1.5 text-[11px] font-black transition ${activeClass}`}
      title={label}
    >
      <span
        className={`relative grid h-8 w-10 place-items-center rounded-2xl transition ${iconClass}`}
      >
        {icon}
        {badge && (
          <span className="absolute -right-0.5 -top-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[9px] leading-none text-white">
            {badge}
          </span>
        )}
      </span>
      <span className="max-w-full truncate leading-none">{label}</span>
    </button>
  );
}

function MobileMoreSheet({
  title,
  children,
  dark = false,
  onClose,
}: {
  title: string;
  children: ReactNode;
  dark?: boolean;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label="Fechar menu"
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <section
        className={`absolute inset-x-0 bottom-0 rounded-t-[28px] border-t p-4 pb-[calc(env(safe-area-inset-bottom)+18px)] shadow-2xl ${dark ? "border-white/10 bg-[#101827] text-white" : "border-zinc-200 bg-white text-zinc-900"}`}
      >
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-zinc-300/80" />
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-base font-black">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className={`rounded-xl p-2 transition ${dark ? "text-white/60 hover:bg-white/10 hover:text-white" : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"}`}
          >
            <X size={18} />
          </button>
        </div>
        <div className="grid gap-2">{children}</div>
      </section>
    </div>
  );
}

function MobileMoreAction({
  icon,
  label,
  badge,
  danger = false,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  badge?: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-12 items-center gap-3 rounded-2xl border px-3 text-sm font-black transition ${danger ? "border-red-100 bg-red-50 text-red-700 hover:bg-red-100" : "border-zinc-200 bg-white text-zinc-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"}`}
    >
      <span
        className={`grid h-9 w-9 place-items-center rounded-xl ${danger ? "bg-red-100 text-red-700" : "bg-blue-50 text-blue-700"}`}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate text-left">{label}</span>
      {badge && (
        <span className="rounded-full bg-blue-100 px-2 py-1 text-[11px] font-black text-blue-700">
          {badge}
        </span>
      )}
    </button>
  );
}

function UsuarioSidebarButton({
  icon,
  label,
  ativo = false,
  badge,
  onClick,
  title,
}: {
  icon: ReactNode;
  label: string;
  ativo?: boolean;
  badge?: string;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title || label}
      onClick={onClick}
      className={`relative flex h-12 w-full items-center gap-3 rounded-xl px-3 text-sm font-bold transition ${ativo ? "bg-white/10 text-white shadow-lg shadow-black/10" : "text-white/72 hover:bg-white/7 hover:text-white"}`}
    >
      {ativo && (
        <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-blue-500" />
      )}
      <span className="grid h-8 w-8 place-items-center shrink-0">{icon}</span>
      <span className="min-w-0 flex-1 truncate text-left">{label}</span>
      {badge && (
        <span className="grid min-h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-black leading-none text-white">
          {badge}
        </span>
      )}
    </button>
  );
}

function UsuarioResumoCard({
  icon,
  valor,
  titulo,
  subtitulo,
  destaque = false,
  tom = "blue",
}: {
  icon: ReactNode;
  valor: number | string;
  titulo: string;
  subtitulo: string;
  destaque?: boolean;
  tom?: "blue" | "amber" | "emerald";
}) {
  const tons = {
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
    emerald: "bg-emerald-50 text-emerald-700",
  }[tom];

  return (
    <button
      type="button"
      className={`user-summary-card w-full rounded-[18px] border bg-white p-3 text-left shadow-sm shadow-slate-200/60 transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md ${destaque ? "border-red-200" : "border-zinc-200"}`}
    >
      <div className="flex items-center justify-between gap-4">
        <div
          className={`grid h-10 w-10 place-items-center rounded-full ${tons}`}
        >
          {icon}
        </div>
        {destaque ? (
          <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-black text-red-700">
            Atenção
          </span>
        ) : (
          <ArrowRight size={20} className="text-zinc-400" />
        )}
      </div>
      <div className="mt-2 flex items-end gap-2">
        <p className="text-2xl font-black text-zinc-900">{valor}</p>
        <p className="pb-0.5 text-xs font-black text-zinc-700">{titulo}</p>
      </div>
      <p className="mt-0.5 text-xs font-medium text-zinc-500">{subtitulo}</p>
    </button>
  );
}

function UsuarioMiniChamadoCard({
  chamado,
  onAbrir,
  resolvido = false,
}: {
  chamado: ApiChamado;
  onAbrir: (id: number) => void;
  resolvido?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onAbrir(chamado.id)}
      className="user-ticket-card w-full rounded-xl border border-zinc-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
    >
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <span className="truncate text-xs font-black text-blue-700">
          {chamado.numero_chamado || `#${chamado.id}`}
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          <ResponsavelAvatar chamado={chamado} size="sm" />
          {resolvido ? (
            <CheckCircle2 size={20} className="shrink-0 text-emerald-500" />
          ) : (
            <span className="text-lg leading-none text-zinc-400">•••</span>
          )}
        </span>
      </div>
      <p className="line-clamp-1 text-sm font-black text-zinc-900">
        {chamado.titulo}
      </p>
      <p className="mt-1 line-clamp-1 text-xs leading-5 text-zinc-500">
        {chamado.descricao}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] font-bold text-zinc-500">
        <span
          className={`h-2 w-2 rounded-full ${chamado.prioridade === "Alta" ? "bg-red-500" : chamado.prioridade === "Baixa" ? "bg-emerald-500" : "bg-amber-500"}`}
        />
        <span>{chamado.prioridade || "Média"}</span>
        <span className="h-4 w-px bg-zinc-200" />
        <span className="truncate">{chamado.tipo_chamado || "Suporte"}</span>
        <span className="h-4 w-px bg-zinc-200" />
        <span className="min-w-0 truncate">
          {nomeResponsavelChamado(chamado) || "Sem responsável"}
        </span>
        <span className="ml-auto text-zinc-400">
          {resolvido
            ? `Resolvido em ${formatDate(chamado.atualizado_em || chamado.criado_em)}`
            : `Atualizado em ${formatDate(chamado.atualizado_em || chamado.criado_em)}`}
        </span>
      </div>
      {chamado.vencido && (
        <Badge className="mt-3 border-red-200 bg-red-50 text-red-700">
          SLA vencido
        </Badge>
      )}
    </button>
  );
}

type UsuarioBoardColuna = {
  id: string;
  titulo: string;
  resumo: string;
  border: string;
  accent: string;
  badge: string;
  chamados: ApiChamado[];
};

function UsuarioKanbanLeitura({
  colunas,
  onAbrir,
  onVerTodos,
}: {
  colunas: UsuarioBoardColuna[];
  onAbrir: (id: number) => void;
  onVerTodos?: () => void;
}) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="mb-2 flex shrink-0 items-center justify-between gap-3">
        <h2 className="text-xl font-black tracking-tight text-zinc-900">
          Meus chamados
        </h2>
        {onVerTodos && (
          <button
            type="button"
            onClick={onVerTodos}
            className="hidden items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-black text-blue-700 shadow-sm transition hover:bg-blue-50 sm:flex"
          >
            Ver todos <ArrowRight size={16} />
          </button>
        )}
      </div>
      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-3">
        {colunas.map((coluna) => (
          <div
            key={coluna.id}
            className={`user-kanban-column flex min-h-0 flex-col overflow-hidden rounded-[18px] border border-zinc-200 border-t-4 ${coluna.border} bg-white/80 p-3 shadow-sm shadow-slate-200/50`}
          >
            <div className="mb-2 flex shrink-0 items-center justify-between gap-2 px-1 py-1">
              <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                <h4 className="truncate text-sm font-black text-zinc-900">
                  {coluna.titulo}
                </h4>
                <p className="mt-0.5 text-[11px] font-medium text-zinc-500">
                  {coluna.resumo}
                </p>
              </div>
              <span
                className={`grid h-7 min-w-7 place-items-center rounded-full px-2 text-xs font-black ${coluna.badge}`}
              >
                {coluna.chamados.length}
              </span>
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-hidden">
              {coluna.chamados.slice(0, 3).map((chamado) => (
                <UsuarioMiniChamadoCard
                  key={chamado.id}
                  chamado={chamado}
                  onAbrir={onAbrir}
                  resolvido={coluna.id === "resolvidos"}
                />
              ))}
              {onVerTodos && coluna.chamados.length > 3 && (
                <button
                  type="button"
                  onClick={onVerTodos}
                  className="w-full rounded-xl border border-dashed border-blue-200 bg-blue-50/70 px-3 py-2 text-xs font-black text-blue-700 transition hover:bg-blue-100"
                >
                  +{coluna.chamados.length - 3} chamado(s)
                </button>
              )}
              {coluna.chamados.length === 0 && (
                <div className="user-kanban-empty rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/70 p-6 text-center text-xs font-semibold text-zinc-400">
                  Nenhum chamado aqui
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function UsuarioChamadoLista({
  chamados,
  onAbrir,
  titulo = "Meus chamados",
  compacto = false,
  busca,
}: {
  chamados: ApiChamado[];
  onAbrir: (id: number) => void;
  titulo?: string;
  compacto?: boolean;
  busca?: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-base font-black text-zinc-900">{titulo}</h3>
          <p className="text-xs font-medium text-zinc-500">
            {busca
              ? `Resultado para “${busca}”`
              : "Acompanhe status, prioridade, comentários e anexos."}
          </p>
        </div>
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-black text-zinc-600">
          {chamados.length} chamado(s)
        </span>
      </div>

      <div className="divide-y divide-zinc-100">
        {chamados.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-8 text-center">
            <FileText className="mx-auto mb-3 text-zinc-400" size={34} />
            <p className="font-bold text-zinc-700">Nenhum chamado encontrado</p>
            <p className="mt-1 text-sm text-zinc-500">
              Abra um novo chamado ou limpe a pesquisa atual.
            </p>
          </div>
        ) : (
          chamados.map((c) => (
            <button
              key={c.id}
              onClick={() => onAbrir(c.id)}
              className="user-ticket-list-item w-full rounded-xl px-2 py-4 text-left transition hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-h-0 min-w-0 flex-1 items-start gap-3">
                  <ResponsavelAvatar chamado={c} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-blue-700">
                      {c.numero_chamado || `#${c.id}`}
                    </p>
                    <p className="mt-1 font-bold text-zinc-800">{c.titulo}</p>
                    {!compacto && (
                      <p className="mt-1 line-clamp-2 text-sm text-zinc-500">
                        {c.descricao}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-zinc-400">
                      {c.tipo_chamado || "Chamado"} • Criado em{" "}
                      {formatDate(c.criado_em)} • {c.total_comentarios || 0}{" "}
                      comentários • {c.total_anexos || 0} anexos
                    </p>
                    <p className="mt-1 text-xs font-semibold text-zinc-500">
                      Responsável:{" "}
                      {nomeResponsavelChamado(c) || "Sem responsável definido"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <Badge className={statusClass(c.status)}>{ticketStatusLabel(c.status)}</Badge>
                  <Badge className={prioridadeClass(c.prioridade)}>
                    {c.prioridade}
                  </Badge>
                  {c.vencido && (
                    <Badge className="border-red-200 bg-red-50 text-red-700">
                      SLA vencido
                    </Badge>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function UsuarioBaseConhecimento({
  artigos,
  busca,
  setBusca,
}: {
  artigos: ArtigoBase[];
  busca: string;
  setBusca: (value: string) => void;
}) {
  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return artigos;
    return artigos.filter((artigo) =>
      [
        artigo.titulo,
        artigo.categoria,
        artigo.palavras_chave,
        artigo.conteudo,
      ].some((valor) =>
        String(valor || "")
          .toLowerCase()
          .includes(q),
      ),
    );
  }, [artigos, busca]);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-black text-zinc-900">
              Base de conhecimento
            </h3>
            <p className="text-sm text-zinc-500">
              Pesquise soluções antes de abrir um chamado.
            </p>
          </div>
          <div className="ds-search flex h-10 min-w-[280px] items-center overflow-hidden rounded-full border border-zinc-200 bg-white shadow-sm">
            <Search size={17} className="ml-4 text-zinc-400" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar solução..."
              className="h-full min-w-0 flex-1 border-0 bg-transparent px-3 text-sm font-semibold outline-none"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtrados.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500 md:col-span-2 xl:col-span-3">
            Nenhuma solução encontrada.
          </div>
        ) : (
          filtrados.map((artigo) => (
            <div
              key={artigo.id}
              className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
            >
              <div className="mb-3 flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-700">
                  <BookOpen size={17} />
                </div>
                <Badge className="border-zinc-200 bg-zinc-50 text-zinc-600">
                  {artigo.categoria || "Solução"}
                </Badge>
              </div>
              <h4 className="font-black text-zinc-900">{artigo.titulo}</h4>
              <p className="mt-2 line-clamp-5 text-sm leading-6 text-zinc-500">
                {artigo.conteudo}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function UsuarioAvisosPanel({
  notificacoes,
  carregando,
  onAbrir,
  onMarcarTodas,
  onAtualizar,
}: {
  notificacoes: Notificacao[];
  carregando: boolean;
  onAbrir: (notificacao: Notificacao) => void;
  onMarcarTodas: () => void;
  onAtualizar: () => Promise<void>;
}) {
  const unread = notificacoes.filter((n) => !n.lida).length;
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-black text-zinc-900">Notificações</h3>
          <p className="text-sm text-zinc-500">{unread} não lida(s)</p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => onAtualizar()}
          >
            <RefreshCw size={16} />
            Atualizar
          </Button>
          <Button type="button" disabled={unread === 0} onClick={onMarcarTodas}>
            <CheckCircle2 size={16} />
            Marcar lidas
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {carregando && notificacoes.length === 0 && (
          <div className="rounded-2xl bg-zinc-50 p-8 text-center text-sm text-zinc-500">
            Carregando notificações...
          </div>
        )}
        {!carregando && notificacoes.length === 0 && (
          <div className="rounded-2xl bg-zinc-50 p-8 text-center text-sm text-zinc-500">
            Nenhuma notificação por enquanto.
          </div>
        )}
        {notificacoes.map((notificacao) => (
          <button
            key={notificacao.id}
            type="button"
            onClick={() => onAbrir(notificacao)}
            className={`flex w-full gap-3 rounded-2xl border p-4 text-left transition ${notificacao.lida ? "border-zinc-200 bg-white hover:bg-zinc-50" : "border-blue-100 bg-blue-50 hover:bg-blue-100"}`}
          >
            <span
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${notificacaoClass(notificacao.tipo)}`}
            >
              {notificacaoIcone(notificacao.tipo)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-start justify-between gap-2">
                <span className="font-black text-zinc-900">
                  {notificacao.titulo}
                </span>
                {!notificacao.lida && (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                )}
              </span>
              <span className="mt-1 block text-sm leading-6 text-zinc-500">
                {notificacao.mensagem}
              </span>
              <span className="mt-2 block text-xs font-bold text-zinc-400">
                {formatDate(notificacao.criado_em)}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function UsuarioPerfilDrawer({
  perfil,
  fotoPerfil,
  inicialPerfil,
  enviandoFoto,
  salvandoPerfil,
  setPerfil,
  onSalvar,
  onTrocarFoto,
  onRemoverFoto,
  onClose,
  onLogout,
}: {
  perfil: ApiUsuario;
  fotoPerfil: string;
  inicialPerfil: string;
  enviandoFoto: boolean;
  salvandoPerfil: boolean;
  setPerfil: (perfil: ApiUsuario) => void;
  onSalvar: (event: FormEvent) => void;
  onTrocarFoto: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoverFoto: () => void;
  onClose: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Fechar perfil"
        className="absolute inset-0 bg-slate-950/35 backdrop-blur-[1px]"
        onClick={onClose}
      />

      <aside className="relative z-10 flex h-full w-full max-w-[430px] flex-col border-l border-zinc-200 bg-white text-zinc-900 shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div>
            <p className="flex items-center gap-2 text-base font-black">
              <UserCog size={18} />
              Meu perfil
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Foto, dados pessoais e informações para triagem.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
            title="Fechar perfil"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-5 py-5">
          <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5 text-center">
            <div className="mx-auto mb-3 grid h-28 w-28 place-items-center overflow-hidden rounded-full border-4 border-white bg-gradient-to-br from-blue-500 to-sky-400 text-4xl font-black text-white shadow-xl">
              {fotoPerfil ? (
                <img
                  src={fotoPerfil}
                  alt={perfil.nome}
                  className="h-full w-full object-cover"
                />
              ) : (
                inicialPerfil
              )}
            </div>
            <h3 className="text-lg font-black">{perfil.nome}</h3>
            <p className="text-sm text-zinc-500">{perfil.email}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <Badge className="border-blue-200 bg-blue-50 text-blue-700">
                {perfilLabel(perfil.perfil)}
              </Badge>
              {perfil.departamento && (
                <Badge className="border-zinc-200 bg-white text-zinc-600">
                  {perfil.departamento}
                </Badge>
              )}
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <label
                className={`inline-flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700 ${enviandoFoto ? "pointer-events-none opacity-60" : ""}`}
              >
                <Camera size={16} />
                {enviandoFoto
                  ? "Enviando..."
                  : fotoPerfil
                    ? "Trocar foto"
                    : "Adicionar foto"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  onChange={onTrocarFoto}
                />
              </label>
              {fotoPerfil && (
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  disabled={enviandoFoto}
                  onClick={onRemoverFoto}
                >
                  <Trash2 size={16} />
                  Remover
                </Button>
              )}
            </div>
            <p className="mt-3 text-xs text-zinc-500">
              Use PNG, JPG, JPEG ou WEBP até 3 MB.
            </p>
          </div>

          <form onSubmit={onSalvar} className="mt-5 space-y-4">
            <Field label="Nome">
              <Input
                required
                value={perfil.nome}
                onChange={(e) => setPerfil({ ...perfil, nome: e.target.value })}
              />
            </Field>
            <Field label="E-mail">
              <Input
                value={perfil.email}
                disabled
                className="cursor-not-allowed bg-zinc-100 text-zinc-500"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Telefone">
                <Input
                  value={perfil.telefone || ""}
                  onChange={(e) =>
                    setPerfil({ ...perfil, telefone: e.target.value })
                  }
                  placeholder="(00) 00000-0000"
                />
              </Field>
              <Field label="Cargo">
                <Input
                  value={perfil.cargo || ""}
                  onChange={(e) =>
                    setPerfil({ ...perfil, cargo: e.target.value })
                  }
                  placeholder="Seu cargo"
                />
              </Field>
            </div>
            <Field label="Departamento">
              <Input
                value={perfil.departamento || ""}
                onChange={(e) =>
                  setPerfil({ ...perfil, departamento: e.target.value })
                }
                placeholder="TI, Financeiro, Operações..."
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Município">
                <select value={perfil.municipio || ""} onChange={(e) => { const municipio = e.target.value; setPerfil({ ...perfil, municipio, unidade: municipio ? `Maranhão Motos - ${municipio}` : "" }); }} className="h-10 w-full rounded-md border border-input bg-input-background px-3 text-sm">
                  <option value="">Selecione</option>{municipiosMaranhao.map((item) => <option key={item.nome} value={item.nome}>{item.nome}</option>)}
                </select>
              </Field>
              <Field label="Unidade"><Input readOnly value={perfil.unidade || ""} placeholder="Definida pelo município" /></Field>
            </div>
            <Button className="w-full" disabled={salvandoPerfil}>
              <UserCheck size={16} />
              {salvandoPerfil ? "Salvando..." : "Salvar perfil"}
            </Button>
          </form>
        </div>

        <div className="border-t border-zinc-100 p-5">
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={onLogout}
          >
            <LogOut size={16} />
            Sair da conta
          </Button>
        </div>
      </aside>
    </div>
  );
}

function UsuarioNovoChamadoModal({
  perfil,
  tipos,
  novo,
  setNovo,
  base,
  loading,
  onClose,
  onSubmit,
}: {
  perfil: UsuarioLogado | ApiUsuario;
  tipos: CatalogoItem[];
  novo: { titulo: string; descricao: string; tipo_chamado: string; processo_atual:string; problema:string; resultado_esperado:string; frequencia:string; pessoas:string; tempo_minutos:string; sistemas:string; impacto_nao_execucao:string; beneficios:string };
  setNovo: Dispatch<
    SetStateAction<{ titulo: string; descricao: string; tipo_chamado: string; processo_atual:string; problema:string; resultado_esperado:string; frequencia:string; pessoas:string; tempo_minutos:string; sistemas:string; impacto_nao_execucao:string; beneficios:string }>
  >;
  base: ArtigoBase[];
  loading: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  const tiposDisponiveis =
    tipos.length > 0
      ? tipos.map((tipo) => tipo.nome)
      : [
          "Incidente",
          "Solicitação",
          "Dúvida",
          "Melhoria",
          "Acesso",
          "Equipamento",
        ];
  const allTypes=Array.from(new Set([...tiposDisponiveis,"Bug","Melhoria","Automação","Integração","Dashboard / Relatório","Novo Sistema"]));
  const developmentType=["Bug","Melhoria","Automação","Integração","Dashboard / Relatório","Novo Sistema"].includes(novo.tipo_chamado);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-4xl overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-zinc-100 px-6 py-5">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
              <FileText size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-zinc-800">
                Abrir novo chamado
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Preencha as informações abaixo para abrir um novo chamado
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-2xl p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800"
          >
            <X size={22} />
          </button>
        </div>

        <form
          onSubmit={onSubmit}
          className="max-h-[78vh] overflow-auto px-6 py-6"
        >
          <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <UsuarioCampoReadOnly label="Nome" value={perfil.nome || "-"} />
            <UsuarioCampoReadOnly label="E-mail" value={perfil.email || "-"} />
            <UsuarioCampoReadOnly
              label="Telefone"
              value={perfil.telefone || "-"}
            />
            <UsuarioCampoReadOnly label="Cargo" value={perfil.cargo || "-"} />
            <UsuarioCampoReadOnly label="Cidade / área de atuação" value={perfil.municipio || "Atualize seu perfil"} />
            <UsuarioCampoReadOnly label="Unidade / local padrão" value={perfil.unidade || "Atualize seu perfil"} />
          </div>

          <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Tipo do chamado">
              <Select
                value={novo.tipo_chamado}
                onChange={(e) =>
                  setNovo((prev) => ({ ...prev, tipo_chamado: e.target.value }))
                }
              >
                {allTypes.map((tipo) => (
                  <option key={tipo}>{tipo}</option>
                ))}
              </Select>
            </Field>
            <UsuarioCampoReadOnly
              label="Departamento"
              value={
                perfil.departamento ||
                "Atualize seu perfil antes de abrir chamado"
              }
            />
          </div>

          <div className="space-y-4">
            <Field label="Título">
              <Input
                required
                value={novo.titulo}
                onChange={(e) =>
                  setNovo((prev) => ({ ...prev, titulo: e.target.value }))
                }
                placeholder="Ex.: Não consigo acessar o sistema"
              />
            </Field>
            <Field label="Descrição">
              <Textarea
                required
                value={novo.descricao}
                onChange={(e) =>
                  setNovo((prev) => ({ ...prev, descricao: e.target.value }))
                }
                placeholder="Descreva com detalhes o problema ou sua solicitação..."
                className="min-h-[150px]"
              />
            </Field>
            {developmentType && <div className="grid gap-4 rounded-2xl border border-violet-200 bg-violet-50/50 p-4 md:grid-cols-2">
              <div className="md:col-span-2"><p className="font-black text-violet-900">Conte-nos sobre o resultado que você precisa</p><p className="text-sm text-violet-700">Não é necessário conhecer a solução técnica. A equipe de TI fará essa análise.</p></div>
              <Field label="Como o processo funciona atualmente?"><Textarea required value={novo.processo_atual} onChange={e=>setNovo(prev=>({...prev,processo_atual:e.target.value}))} className="min-h-24"/></Field>
              <Field label="Qual problema você quer resolver?"><Textarea required value={novo.problema} onChange={e=>setNovo(prev=>({...prev,problema:e.target.value}))} className="min-h-24"/></Field>
              <Field label="Resultado esperado"><Textarea value={novo.resultado_esperado} onChange={e=>setNovo(prev=>({...prev,resultado_esperado:e.target.value}))}/></Field>
              <Field label="Frequência"><Select value={novo.frequencia} onChange={e=>setNovo(prev=>({...prev,frequencia:e.target.value}))}><option value="">Selecione</option><option value="varias_dia">Várias vezes ao dia</option><option value="diaria">Diariamente</option><option value="semanal">Semanalmente</option><option value="mensal">Mensalmente</option><option value="ocasional">Ocasionalmente</option><option value="outro">Outro</option></Select></Field>
              <Field label="Pessoas envolvidas"><Input type="number" min="0" value={novo.pessoas} onChange={e=>setNovo(prev=>({...prev,pessoas:e.target.value}))}/></Field>
              <Field label="Tempo atual por execução (minutos)"><Input type="number" min="0" value={novo.tempo_minutos} onChange={e=>setNovo(prev=>({...prev,tempo_minutos:e.target.value}))}/></Field>
              <Field label="Sistemas envolvidos"><Input value={novo.sistemas} onChange={e=>setNovo(prev=>({...prev,sistemas:e.target.value}))} placeholder="ERP, Excel, Power BI"/></Field>
              <Field label="Impacto se não for executada"><Textarea value={novo.impacto_nao_execucao} onChange={e=>setNovo(prev=>({...prev,impacto_nao_execucao:e.target.value}))}/></Field>
              <Field label="Benefícios esperados"><Input value={novo.beneficios} onChange={e=>setNovo(prev=>({...prev,beneficios:e.target.value}))} placeholder="Redução de tempo, erros, retrabalho"/></Field>
            </div>}
          </div>

          {base.length > 0 && (
            <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <div className="mb-3 flex items-center gap-2 text-blue-800">
                <BookOpen size={18} />
                <p className="font-black">Sugestões da base de conhecimento</p>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {base.slice(0, 3).map((artigo) => (
                  <div
                    key={artigo.id}
                    className="rounded-2xl bg-white p-3 shadow-sm"
                  >
                    <p className="text-sm font-black text-zinc-800">
                      {artigo.titulo}
                    </p>
                    <p className="mt-1 line-clamp-3 text-xs leading-5 text-zinc-500">
                      {artigo.conteudo}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center justify-end gap-3 border-t border-zinc-100 pt-5">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button disabled={loading}>
              {loading ? "Criando..." : "Criar chamado"}
              {!loading && <ArrowRight size={17} />}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function UsuarioCampoReadOnly({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-zinc-500">
        {label}
      </span>
      <div className="flex h-11 items-center rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm font-semibold text-zinc-700">
        {value}
      </div>
    </div>
  );
}

// Shell autenticado da equipe, responsável por navegação e dados operacionais.
function AdminPanel({
  usuario,
  setUsuario,
  onLogout,
  configSistemaInicial,
  onConfigSistemaChange,
  avisosSistema,
  onAvisosSistemaChange,
}: {
  usuario: UsuarioLogado;
  setUsuario: (u: UsuarioLogado) => void;
  onLogout: () => void;
  configSistemaInicial: ConfiguracoesSistema;
  onConfigSistemaChange: (config: ConfiguracoesSistema) => void;
  avisosSistema: ApiAvisoSistema[];
  onAvisosSistemaChange: (avisos: ApiAvisoSistema[]) => void;
}) {
  const [tab, setTab] = useModuleRoute<AdminTab>(ADMIN_ROUTES, "fila");
  const [dark, setDark] = useState(
    () => localStorage.getItem("smart_helpdesk_admin_theme") === "dark",
  );
  const [modoCompacto, setModoCompacto] = useState(
    () => localStorage.getItem("smart_helpdesk_compact_mode_v2") !== "off",
  );
  const [dashboard, setDashboard] = useState<DashboardResumo | null>(null);
  const [chamados, setChamados] = useState<ApiChamado[]>([]);
  const [filaChamados, setFilaChamados] = useState<ApiChamado[]>([]);
  const [carteiraEquipe, setCarteiraEquipe] = useState<ApiChamado[]>([]);
  const [historicoEquipe, setHistoricoEquipe] = useState<ApiChamado[]>([]);
  const [chamadosRelatorio, setChamadosRelatorio] = useState<ApiChamado[]>([]);
  const [usuarios, setUsuarios] = useState<ApiUsuario[]>([]);
  const [teams, setTeams] = useState<ApiTeam[]>([]);
  const [novaTeam, setNovaTeam] = useState({
    name: "",
    description: "",
    manager_id: "",
    color: "#2563eb",
    distribution_mode: "manual" as ApiTeam["distribution_mode"],
  });
  const [departamentos, setDepartamentos] = useState<CatalogoItem[]>([]);
  const [tipos, setTipos] = useState<CatalogoItem[]>([]);
  const [base, setBase] = useState<ArtigoBase[]>([]);
  const [respostasRapidas, setRespostasRapidas] = useState<RespostaRapida[]>(
    [],
  );
  const [avisosAdmin, setAvisosAdmin] = useState<ApiAvisoSistema[]>([]);
  const [filtrosSalvos, setFiltrosSalvos] = useState<FiltroSalvo[]>([]);
  const [novoFiltroNome, setNovoFiltroNome] = useState("");
  const [novaResposta, setNovaResposta] = useState({
    titulo: "",
    mensagem: "",
    categoria: "Atendimento",
  });
  const [novoAviso, setNovoAviso] = useState({
    titulo: "Manutenção programada",
    mensagem: "O sistema passará por manutenção em breve.",
    tipo: "warning",
    ativo: true,
    inicio_em: "",
    fim_em: "",
  });
  const [configSistema, setConfigSistema] = useState<ConfiguracoesSistema>({
    ...CONFIG_SISTEMA_PADRAO,
    ...configSistemaInicial,
  });
  const [enviandoLogoSistema, setEnviandoLogoSistema] = useState<
    "" | "logo1" | "logo2"
  >("");
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [notificacoesAberta, setNotificacoesAberta] = useState(false);
  const [carregandoNotificacoes, setCarregandoNotificacoes] = useState(false);
  const [filtros, setFiltros] = useState<FiltrosChamados>(ticketFiltersFromUrl);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [selecionado, setSelecionado] = useState<ApiChamado | null>(null);
  const [detalheSomenteLeitura, setDetalheSomenteLeitura] = useState(false);
  const [dragId, setDragId] = useState<number | null>(null);
  const [usuarioEditando, setUsuarioEditando] = useState<ApiUsuario | null>(
    null,
  );
  const [usuarioForm, setUsuarioForm] = useState({
    nome: "",
    email: "",
    perfil: "usuario",
    status: "ativo",
    telefone: "",
    departamento: "",
    municipio: "",
    unidade: "",
    cargo: "",
    senha: "",
  });
  const [salvandoUsuarioAdmin, setSalvandoUsuarioAdmin] = useState(false);
  const [novoCatalogo, setNovoCatalogo] = useState({
    nome: "",
    descricao: "",
    tipo: "departamentos" as "departamentos" | "tipos",
  });
  const [novoArtigo, setNovoArtigo] = useState({
    titulo: "",
    categoria: "",
    palavras_chave: "",
    conteudo: "",
  });
  const [mostrarPerfil, setMostrarPerfil] = useState(false);
  const [menuMaisAdmin, setMenuMaisAdmin] = useState(false);
  const [buscaGlobalAberta, setBuscaGlobalAberta] = useState(false);
  const atalhoG = useRef(false);
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [perfilForm, setPerfilForm] = useState({
    nome: usuario.nome || "",
    telefone: usuario.telefone || "",
    departamento: usuario.departamento || "",
    cargo: usuario.cargo || "",
  });
  const [permissoesAtuais, setPermissoesAtuais] = useState<PermissionKey[]>([]);
  const [permissoesCarregadas, setPermissoesCarregadas] = useState(false);
  const [usuarioPermissoes, setUsuarioPermissoes] = useState<ApiUsuario | null>(
    null,
  );
  const sincronizandoTelaRef = useRef(false);
  const abaPendenteRef = useRef<AdminTab | null>(null);

  const perfilAtual = normalizarPerfilApp(usuario.perfil);
  const desenvolvedor = isDevApp(usuario.perfil);
  const administrador = isAdminApp(usuario.perfil);
  const tecnico = perfilAtual === "tecnico";

  const equipe = useMemo(
    () => usuarios.filter((u) => isEquipeApp(u.perfil) && u.status === "ativo"),
    [usuarios],
  );
  const pendentes = useMemo(
    () => usuarios.filter((u) => u.status === "pendente"),
    [usuarios],
  );
  const dadosRelatorio = useMemo(() => {
    const registros = [...chamadosRelatorio, ...historicoEquipe];
    return Array.from(
      new Map(registros.map((chamado) => [chamado.id, chamado])).values(),
    );
  }, [chamadosRelatorio, historicoEquipe]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const editing = ["INPUT", "TEXTAREA", "SELECT"].includes(
        (event.target as HTMLElement)?.tagName,
      );
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setBuscaGlobalAberta(true);
        return;
      }
      if (event.key === "Escape") {
        setBuscaGlobalAberta(false);
        setMostrarFiltros(false);
        return;
      }
      if (editing) return;
      const key = event.key.toLowerCase();
      if (key === "g") {
        atalhoG.current = true;
        window.setTimeout(() => {
          atalhoG.current = false;
        }, 1200);
        return;
      }
      if (atalhoG.current && key === "d") {
        setTab("dashboard");
        atalhoG.current = false;
      } else if (atalhoG.current && key === "f") {
        setTab("fila");
        atalhoG.current = false;
      } else if (key === "n") setTab("chamados");
      else if (key === "/") {
        event.preventDefault();
        setMostrarFiltros(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    setPerfilForm({
      nome: usuario.nome || "",
      telefone: usuario.telefone || "",
      departamento: usuario.departamento || "",
      cargo: usuario.cargo || "",
    });
  }, [usuario.nome, usuario.telefone, usuario.departamento, usuario.cargo]);

  useEffect(() => {
    setConfigSistema((atual) => ({
      ...CONFIG_SISTEMA_PADRAO,
      ...atual,
      ...configSistemaInicial,
    }));
  }, [configSistemaInicial]);

  function sincronizarUsuario(atualizado: UsuarioLogado | ApiUsuario) {
    atualizarUsuarioLocal(atualizado);
    setUsuario(atualizado);
  }

  function sincronizarChamadoEquipe(atualizado: ApiChamado) {
    const substituir = (lista: ApiChamado[]) => lista.map((item) => Number(item.id) === Number(atualizado.id) ? { ...item, ...atualizado } : item);
    setChamados(substituir);
    setFilaChamados(substituir);
    setCarteiraEquipe(substituir);
    setHistoricoEquipe(substituir);
    setChamadosRelatorio(substituir);
    setSelecionado((atual) => atual && Number(atual.id) === Number(atualizado.id) ? { ...atual, ...atualizado } : atual);
  }

  async function carregar(aba: AdminTab = tab, filtrosAtuais: FiltrosChamados = filtros) {
    if (sincronizandoTelaRef.current) { abaPendenteRef.current = aba; return; }
    sincronizandoTelaRef.current = true;
    try {
      if (aba === "dashboard") {
        setDashboard(await obterDashboard().catch(() => null));
        return;
      }
      if (aba === "fila") {
        const [fila, carteira, users, teamsLista, respostas] = await Promise.all([
          listarChamados({ ...filtrosAtuais, fila: true }),
          administrador ? listarChamados(filtrosAtuais) : Promise.resolve([]),
          listarUsuariosAdmin().catch(() => []),
          listarTeams().catch(() => []),
          listarRespostasRapidas().catch(() => []),
        ]);
        setFilaChamados(fila); setCarteiraEquipe(carteira); setUsuarios(users); setTeams(teamsLista); setRespostasRapidas(respostas);
        return;
      }
      if (["kanban", "chamados"].includes(aba)) {
        const [lista, salvos] = await Promise.all([
          listarChamados({ ...filtrosAtuais, meus: true }),
          listarFiltrosSalvos().catch(() => []),
        ]);
        setChamados(lista); setFiltrosSalvos(salvos);
        return;
      }
      if (aba === "historico") { setHistoricoEquipe(await listarChamados({ ...filtrosAtuais, historico: true, closed: true })); return; }
      if (aba === "carteira") {
        const [lista, users] = await Promise.all([listarChamados(filtrosAtuais), listarUsuariosAdmin().catch(() => [])]);
        setCarteiraEquipe(lista); setUsuarios(users); return;
      }
      if (["usuarios", "acessos"].includes(aba)) { setUsuarios(await listarUsuariosAdmin().catch(() => [])); return; }
      if (aba === "teams") {
        const [users, teamsLista] = await Promise.all([listarUsuariosAdmin().catch(() => []), listarTeams().catch(() => [])]);
        setUsuarios(users); setTeams(teamsLista); return;
      }
      if (aba === "catalogos") {
        const [deps, tiposLista] = await Promise.all([listarCatalogo("departamentos").catch(() => []), listarCatalogo("tipos").catch(() => [])]);
        setDepartamentos(deps); setTipos(tiposLista); return;
      }
      if (aba === "base") { setBase(await listarBaseConhecimento().catch(() => [])); return; }
      if (["configuracoes", "config_sla", "config_integracoes"].includes(aba)) {
        const [configLista, respostas] = await Promise.all([obterConfiguracoesSistema().catch(() => null), listarRespostasRapidas().catch(() => [])]);
        setRespostasRapidas(respostas);
        if (configLista) { const completo = { ...CONFIG_SISTEMA_PADRAO, ...configLista }; setConfigSistema(completo); onConfigSistemaChange(completo); }
        return;
      }
      if (aba === "manutencao") { setAvisosAdmin(await listarAvisosSistemaAdmin().catch(() => []) as ApiAvisoSistema[]); return; }
      if (["indicadores_operacao", "indicadores_sla", "indicadores_tecnicos", "indicadores_ativos", "relatorios"].includes(aba)) {
        const [relatorio, historico] = await Promise.all([listarChamados({ closed: true }), listarChamados({ ...filtrosAtuais, historico: true, closed: true })]);
        setChamadosRelatorio(relatorio); setHistoricoEquipe(historico);
      }
    } finally {
      sincronizandoTelaRef.current = false;
      const pendente = abaPendenteRef.current;
      abaPendenteRef.current = null;
      if (pendente) void carregar(pendente);
    }
  }

  async function criarNovaTeam(event: FormEvent) {
    event.preventDefault();
    try {
      await criarTeam({
        ...novaTeam,
        manager_id: novaTeam.manager_id
          ? Number(novaTeam.manager_id)
          : undefined,
      });
      setNovaTeam({
        name: "",
        description: "",
        manager_id: "",
        color: "#2563eb",
        distribution_mode: "manual",
      });
      toast.success("Equipe criada.");
      await carregar();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao criar equipe.",
      );
    }
  }

  async function carregarNotificacoes(silencioso = true) {
    if (!silencioso) setCarregandoNotificacoes(true);
    try {
      setNotificacoes(await listarNotificacoes());
    } catch (e) {
      if (!silencioso)
        toast.error(
          e instanceof Error ? e.message : "Erro ao carregar notificações.",
        );
    } finally {
      if (!silencioso) setCarregandoNotificacoes(false);
    }
  }

  useEffect(() => {
    carregar(tab).catch((e) => toast.error(e.message));
  }, [tab]);
  useEffect(() => {
    obterMinhasPermissoes()
      .then(({ permissions }) => setPermissoesAtuais(permissions))
      .catch(() => setPermissoesAtuais([]))
      .finally(() => setPermissoesCarregadas(true));
  }, []);
  useEffect(() => {
    if(!permissoesCarregadas)return;
    const teamTabs:AdminTab[]=["usuarios","acessos","carteira","teams"];
    const developerTabs:AdminTab[]=["configuracoes","config_sla","config_integracoes","manutencao","diagnostico"];
    const analyticsTabs:AdminTab[]=["indicadores_operacao","indicadores_sla","indicadores_tecnicos","indicadores_ativos","relatorios"];
    const deniedDashboard=tab==="dashboard"&&!permissoesAtuais.includes("visualizar_dashboard");
    const deniedTeam=teamTabs.includes(tab)&&!administrador;
    const deniedDeveloper=developerTabs.includes(tab)&&!desenvolvedor;
    const deniedCatalog=tab==="catalogos"&&!administrador;
    const deniedAnalytics=analyticsTabs.includes(tab)&&!administrador&&!permissoesAtuais.includes("visualizar_relatorios")&&!permissoesAtuais.includes("baixar_relatorios");
    const deniedAssets=tab==="patrimonio"&&!permissoesAtuais.includes("visualizar_patrimonio");
    const deniedKnowledge=tab==="base"&&!permissoesAtuais.includes("gerenciar_base");
    const deniedDevelopment=["desenvolvimento","projetos"].includes(tab)&&!administrador&&!desenvolvedor&&!permissoesAtuais.includes("desenvolvimento_visualizar");
    if(deniedDashboard||deniedTeam||deniedDeveloper||deniedCatalog||deniedAnalytics||deniedAssets||deniedKnowledge||deniedDevelopment)setTab("fila");
  }, [administrador,desenvolvedor,permissoesAtuais,permissoesCarregadas,tab]);

  useEffect(() => {
    carregarNotificacoes().catch(() => {});
    const timer = window.setInterval(() => carregarNotificacoes(), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const sincronizavel = ["dashboard", "fila", "kanban", "chamados", "historico", "carteira"].includes(tab);
    if (!sincronizavel) return;
    const sincronizarSeVisivel = () => { if (document.visibilityState === "visible") void carregar(tab); };
    const timer = window.setInterval(sincronizarSeVisivel, 60000);
    document.addEventListener("visibilitychange", sincronizarSeVisivel);
    window.addEventListener("focus", sincronizarSeVisivel);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", sincronizarSeVisivel); window.removeEventListener("focus", sincronizarSeVisivel); };
  },[tab]);

  useEffect(() => {
    localStorage.setItem("smart_helpdesk_admin_theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    localStorage.setItem(
      "smart_helpdesk_compact_mode_v2",
      modoCompacto ? "on" : "off",
    );
  }, [modoCompacto]);

  useEffect(()=>{
    if(!["fila","kanban","chamados","historico"].includes(tab))return;
    const params=new URLSearchParams();
    Object.entries(filtros).forEach(([key,value])=>{if(value!==undefined&&value!==null&&value!==""&&value!==false)params.set(key,String(value))});
    const search=params.toString();
    window.history.replaceState(window.history.state,"",`${window.location.pathname}${search?`?${search}`:""}`);
  },[filtros,tab]);

  async function aplicarFiltros(event?: FormEvent,override?:FiltrosChamados) {
    event?.preventDefault();
    const applied=override??filtros;
    try {
      setFiltros(applied);
      await carregar(tab, applied);
      setMostrarFiltros(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao filtrar.");
    }
  }

  async function executarPesquisa(event?: FormEvent) {
    event?.preventDefault();
    const termo = String(filtros.q || "").trim();
    const novosFiltros = { ...filtros, q: termo };
    if (!termo) delete novosFiltros.q;
    try {
      setTab("kanban");
      setFiltros(novosFiltros);
      await carregar("kanban", novosFiltros);
      toast.success(termo ? "Pesquisa aplicada." : "Pesquisa limpa.");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Erro ao pesquisar chamados.",
      );
    }
  }

  async function limparPesquisa() {
    const { q: _q, ...novosFiltros } = filtros;
    try {
      setFiltros(novosFiltros);
      await carregar(tab, novosFiltros);
      toast.success("Pesquisa limpa.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao limpar pesquisa.");
    }
  }

  async function limparFiltros() {
    try {
      setFiltros({});
      await carregar(tab, {});
      setMostrarFiltros(false);
      toast.success("Filtros limpos.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao limpar filtros.");
    }
  }

  async function salvarFiltroAtual() {
    const nome =
      novoFiltroNome.trim() ||
      `Filtro ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
    try {
      await salvarFiltroChamados(nome, filtros);
      setNovoFiltroNome("");
      setFiltrosSalvos(await listarFiltrosSalvos());
      toast.success("Filtro salvo.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar filtro.");
    }
  }

  async function aplicarFiltroSalvo(filtro: FiltroSalvo) {
    const filtrosDoBanco = filtro.filtros || {};
    setFiltros(filtrosDoBanco);
    setChamados(await listarChamados({ ...filtrosDoBanco, meus: true }));
    setMostrarFiltros(false);
    toast.success(`Filtro aplicado: ${filtro.nome}`);
  }

  async function assumirChamadoAdmin(id: number) {
    try {
      const atualizado = await assumirChamado(id);
      sincronizarChamadoEquipe(atualizado);
      toast.success("Chamado assumido.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao assumir chamado.");
    }
  }

  async function criarRespostaRapidaAdmin(event: FormEvent) {
    event.preventDefault();
    if (!novaResposta.titulo.trim() || !novaResposta.mensagem.trim()) return;
    try {
      await criarRespostaRapida(novaResposta);
      setNovaResposta({ titulo: "", mensagem: "", categoria: "Atendimento" });
      setRespostasRapidas(await listarRespostasRapidas());
      toast.success("Resposta rápida criada.");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Erro ao criar resposta rápida.",
      );
    }
  }

  async function salvarConfiguracoesAdmin(event: FormEvent) {
    event.preventDefault();
    try {
      const atualizado = {
        ...CONFIG_SISTEMA_PADRAO,
        ...(await salvarConfiguracoesSistema(configSistema)),
      };
      setConfigSistema(atualizado);
      onConfigSistemaChange(atualizado);
      toast.success("Configurações salvas e aplicadas no sistema.");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Erro ao salvar configurações.",
      );
    }
  }

  async function trocarLogoSistema(
    event: React.ChangeEvent<HTMLInputElement>,
    logo: "logo1" | "logo2",
  ) {
    const arquivo = event.target.files?.[0];
    event.target.value = "";
    if (!arquivo) return;
    if (logo !== "logo1") return;
    if (!arquivo.type.startsWith("image/")) {
      toast.error("Envie uma logo em PNG, JPG, JPEG ou WEBP.");
      return;
    }
    if (arquivo.size > 3 * 1024 * 1024) {
      toast.error("A logo precisa ter até 3 MB.");
      return;
    }
    try {
      setEnviandoLogoSistema(logo);
      const atualizado = {
        ...CONFIG_SISTEMA_PADRAO,
        ...(await atualizarLogoSistema1(arquivo)),
      };
      setConfigSistema(atualizado);
      onConfigSistemaChange(atualizado);
      toast.success("Logo atualizada e aplicada no sistema.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao atualizar logo.");
    } finally {
      setEnviandoLogoSistema("");
    }
  }

  async function salvarPerfilAdmin(event: FormEvent) {
    event.preventDefault();
    try {
      setSalvandoPerfil(true);
      const atualizado = await atualizarMeuPerfil(perfilForm);
      sincronizarUsuario(atualizado);
      toast.success("Perfil atualizado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao atualizar perfil.");
    } finally {
      setSalvandoPerfil(false);
    }
  }

  async function trocarFotoPerfil(event: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0];
    event.target.value = "";
    if (!arquivo) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(arquivo.type)) {
      toast.error("Envie uma imagem PNG, JPG ou WEBP.");
      return;
    }
    if (arquivo.size > 5 * 1024 * 1024) {
      toast.error("A imagem precisa ter até 5 MB.");
      return;
    }

    try {
      setEnviandoFoto(true);
      const atualizado = await atualizarMinhaFotoPerfil(arquivo);
      sincronizarUsuario(atualizado);
      toast.success("Foto do perfil atualizada.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao atualizar foto.");
    } finally {
      setEnviandoFoto(false);
    }
  }

  async function removerFotoPerfil() {
    try {
      setEnviandoFoto(true);
      const atualizado = await removerMinhaFotoPerfil();
      sincronizarUsuario(atualizado);
      toast.success("Foto removida.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao remover foto.");
    } finally {
      setEnviandoFoto(false);
    }
  }

  async function abrirDetalhe(id: number, somenteLeitura = false) {
    const resumo = [chamados, filaChamados, carteiraEquipe, historicoEquipe]
      .flat()
      .find((item) => Number(item.id) === Number(id));
    setDetalheSomenteLeitura(somenteLeitura);
    if (resumo) setSelecionado(resumo);
    if (!usuarios.length) listarUsuariosAdmin().then(setUsuarios).catch(() => {});
    if (!respostasRapidas.length) listarRespostasRapidas().then(setRespostasRapidas).catch(() => {});
    try {
      const detalhe = await buscarChamado(id);
      setSelecionado((atual) => Number(atual?.id) === Number(id) ? detalhe : atual);
    } catch (e) {
      setSelecionado((atual) => Number(atual?.id) === Number(id) ? null : atual);
      toast.error(e instanceof Error ? e.message : "Erro ao abrir chamado.");
    }
  }
  async function moverChamado(id: number, status: string) {
    const anterior = chamados.find((chamado) => Number(chamado.id) === Number(id));
    if (!anterior || canonicalTicketStatus(anterior.status) === canonicalTicketStatus(status)) return;

    const otimista: ApiChamado = {
      ...anterior,
      status: canonicalTicketStatus(status),
      atualizado_em: new Date().toISOString(),
      ...(canonicalTicketStatus(status) === TICKET_STATUS.CLOSED
        ? { finalizado_em: new Date().toISOString() }
        : {}),
    };
    setChamados((atuais) => atuais.map((chamado) => Number(chamado.id) === Number(id) ? otimista : chamado));
    setSelecionado((atual) => atual && Number(atual.id) === Number(id) ? { ...atual, ...otimista } : atual);

    try {
      const atualizado = await atualizarChamado(id, { status: canonicalTicketStatus(status) });
      setChamados((atuais) => atuais.map((chamado) => Number(chamado.id) === Number(id) ? { ...chamado, ...atualizado } : chamado));
      setSelecionado((atual) => atual && Number(atual.id) === Number(id) ? { ...atual, ...atualizado } : atual);
      toast.success("Status atualizado.");
      obterDashboard().then(setDashboard).catch(() => {});
    } catch (e) {
      setChamados((atuais) => atuais.map((chamado) =>
        Number(chamado.id) === Number(id) && canonicalTicketStatus(chamado.status) === canonicalTicketStatus(status)
          ? anterior
          : chamado,
      ));
      setSelecionado((atual) => atual && Number(atual.id) === Number(id) ? anterior : atual);
      toast.error(e instanceof Error ? e.message : "Erro ao mover chamado.");
    }
  }

  async function abrirPainelNotificacoes() {
    const proximoEstado = !notificacoesAberta;
    setMostrarPerfil(false);
    setNotificacoesAberta(proximoEstado);
    if (proximoEstado) await carregarNotificacoes(false);
  }

  async function marcarTodasComoLidas() {
    try {
      await marcarNotificacoesLidas();
      setNotificacoes((lista) =>
        lista.map((item) => ({ ...item, lida: true })),
      );
      toast.success("Notificações marcadas como lidas.");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Erro ao marcar notificações.",
      );
    }
  }

  async function abrirNotificacao(notificacao: Notificacao) {
    try {
      if (!notificacao.lida) {
        await marcarNotificacoesLidas(notificacao.id);
        setNotificacoes((lista) =>
          lista.map((item) =>
            item.id === notificacao.id ? { ...item, lida: true } : item,
          ),
        );
      }
      setNotificacoesAberta(false);
      const chamadoId = chamadoIdFromNotification(notificacao.link);
      if (chamadoId) {
        setTab("kanban");
        await abrirDetalhe(chamadoId);
      }
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Erro ao abrir notificação.",
      );
    }
  }

  function abrirEdicaoUsuario(u: ApiUsuario) {
    setUsuarioEditando(u);
    setUsuarioForm({
      nome: u.nome || "",
      email: u.email || "",
      perfil: normalizarPerfilApp(u.perfil),
      status: u.status || "ativo",
      telefone: u.telefone || "",
      departamento: u.departamento || "",
      municipio: u.municipio || "",
      unidade: u.unidade || "",
      cargo: u.cargo || "",
      senha: "",
    });
  }

  async function salvarEdicaoUsuario(event: FormEvent) {
    event.preventDefault();
    if (!usuarioEditando) return;
    setSalvandoUsuarioAdmin(true);
    try {
      const payload: Partial<ApiUsuario> & { senha?: string } = {
        nome: usuarioForm.nome,
        email: usuarioForm.email,
        perfil: usuarioForm.perfil as ApiUsuario["perfil"],
        status: usuarioForm.status,
        telefone: usuarioForm.telefone,
        departamento: usuarioForm.departamento,
        municipio: usuarioForm.municipio,
        unidade: usuarioForm.unidade,
        cargo: usuarioForm.cargo,
      };
      if (usuarioForm.senha.trim()) payload.senha = usuarioForm.senha.trim();

      const atualizado = await atualizarUsuarioAdmin(
        usuarioEditando.id,
        payload,
      );
      setUsuarios((lista) =>
        lista.map((item) =>
          Number(item.id) === Number(atualizado.id) ? atualizado : item,
        ),
      );
      setUsuarioEditando(null);
      toast.success("Dados do usuário atualizados.");
      await carregar();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Erro ao atualizar usuário.",
      );
    } finally {
      setSalvandoUsuarioAdmin(false);
    }
  }

  async function criarItemCatalogo(event: FormEvent) {
    event.preventDefault();
    try {
      await criarCatalogo(novoCatalogo.tipo, {
        nome: novoCatalogo.nome,
        descricao: novoCatalogo.descricao,
      });
      toast.success("Item criado.");
      setNovoCatalogo({ ...novoCatalogo, nome: "", descricao: "" });
      await carregar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar item.");
    }
  }

  async function criarArtigo(event: FormEvent) {
    event.preventDefault();
    try {
      await criarArtigoBase(novoArtigo);
      toast.success("Artigo criado.");
      setNovoArtigo({
        titulo: "",
        categoria: "",
        palavras_chave: "",
        conteudo: "",
      });
      await carregar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar artigo.");
    }
  }

  async function criarAvisoManutencao(event: FormEvent) {
    event.preventDefault();
    try {
      const criado = await criarAvisoSistema(novoAviso);
      toast.success("Aviso de manutenção criado.");
      setNovoAviso({
        titulo: "Manutenção programada",
        mensagem: "O sistema passará por manutenção em breve.",
        tipo: "warning",
        ativo: true,
        inicio_em: "",
        fim_em: "",
      });
      const lista = await listarAvisosSistemaAdmin().catch(() => [criado]);
      setAvisosAdmin(lista);
      const ativos = await listarAvisosSistemaAtivos().catch(
        () => avisosSistema,
      );
      onAvisosSistemaChange(ativos);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar aviso.");
    }
  }

  async function alternarAvisoManutencao(aviso: ApiAvisoSistema) {
    try {
      await atualizarAvisoSistema(aviso.id, { ativo: !aviso.ativo });
      const [lista, ativos] = await Promise.all([
        listarAvisosSistemaAdmin().catch(() => []),
        listarAvisosSistemaAtivos().catch(() => avisosSistema),
      ]);
      setAvisosAdmin(lista);
      onAvisosSistemaChange(ativos);
      toast.success(!aviso.ativo ? "Aviso ativado." : "Aviso desativado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao atualizar aviso.");
    }
  }

  async function removerAvisoManutencao(id: number) {
    if (!confirm("Apagar este aviso de manutenção?")) return;
    try {
      await excluirAvisoSistema(id);
      const [lista, ativos] = await Promise.all([
        listarAvisosSistemaAdmin().catch(() => []),
        listarAvisosSistemaAtivos().catch(() => avisosSistema),
      ]);
      setAvisosAdmin(lista);
      onAvisosSistemaChange(ativos);
      toast.success("Aviso apagado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao apagar aviso.");
    }
  }

  const adminTabs = [
    {
      key: "desenvolvimento" as AdminTab,
      icon: BrainCircuit,
      label: "Demandas",
      title: "Desenvolvimento",
      show: administrador || desenvolvedor || permissoesAtuais.includes("desenvolvimento_visualizar"),
    },
    {
      key: "projetos" as AdminTab,
      icon: ListChecks,
      label: "Projetos",
      title: "Projetos de desenvolvimento",
      show: administrador || desenvolvedor || permissoesAtuais.includes("desenvolvimento_visualizar"),
    },
    ...(["indicadores_operacao","indicadores_sla","indicadores_tecnicos","indicadores_ativos"] as AdminTab[]).map((key)=>({
      key,
      icon: BarChart3,
      label: key.replace("indicadores_", ""),
      title: "Indicadores",
      show: administrador || permissoesAtuais.includes("visualizar_relatorios"),
    })),
    {
      key: "satisfacao" as AdminTab,
      icon: Star,
      label: tecnico ? "Minha avaliação" : "Satisfação",
      title: tecnico ? "Minha avaliação" : "Satisfação do cliente interno",
      show: administrador || tecnico,
    },
    {
      key: "dashboard" as AdminTab,
      icon: LayoutDashboard,
      label: "Início",
      title: "Dashboard",
      show: permissoesAtuais.includes("visualizar_dashboard"),
    },
    {
      key: "fila" as AdminTab,
      icon: Bell,
      label: "Fila",
      title: "Novos chamados",
      show: true,
    },
    {
      key: "kanban" as AdminTab,
      icon: ListChecks,
      label: "Meu Kanban",
      title: "Meus chamados",
      show: true,
    },
    {
      key: "carteira" as AdminTab,
      icon: Users,
      label: "Técnicos",
      title: "Chamados por técnico",
      show: administrador,
    },
    {
      key: "chamados" as AdminTab,
      icon: Ticket,
      label: "Chamados",
      title: "Chamados",
      show: true,
    },
    {
      key: "historico" as AdminTab,
      icon: History,
      label: "Histórico",
      title: "Histórico da equipe",
      show: true,
    },
    {
      key: "usuarios" as AdminTab,
      icon: Users,
      label: "Usuários",
      title: "Usuários e atendentes",
      show: administrador,
    },
    {
      key: "acessos" as AdminTab,
      icon: ShieldCheck,
      label: "Acessos",
      title: "Matriz de acessos",
      show: administrador,
    },
    {
      key: "teams" as AdminTab,
      icon: Users,
      label: "Equipes",
      title: "Equipes de atendimento",
      show: administrador,
    },
    {
      key: "catalogos" as AdminTab,
      icon: Building2,
      label: "Catálogos",
      title: "Departamentos e tipos",
      show: administrador,
    },
    {
      key: "base" as AdminTab,
      icon: BookOpen,
      label: "Base",
      title: "Base de conhecimento",
      show: permissoesAtuais.includes("gerenciar_base"),
    },
    {
      key: "relatorios" as AdminTab,
      icon: Download,
      label: "Relatórios",
      title: "Relatórios",
      show: permissoesAtuais.includes("visualizar_relatorios") || permissoesAtuais.includes("baixar_relatorios"),
    },
    {
      key: "patrimonio" as AdminTab,
      icon: MapPinned,
      label: "Ativos",
      title: "Monitoramento de ativos",
      show: permissoesAtuais.includes("visualizar_patrimonio"),
    },
    {
      key: "diagnostico" as AdminTab,
      icon: Activity,
      label: "Diagnóstico",
      title: "Saúde do sistema",
      show: desenvolvedor,
    },
    {
      key: "configuracoes" as AdminTab,
      icon: Settings,
      label: "Ajustes",
      title: "Configurações",
      show: desenvolvedor,
    },
    {
      key: "config_sla" as AdminTab,
      icon: Clock3,
      label: "SLA",
      title: "SLA e prioridades",
      show: desenvolvedor,
    },
    {
      key: "config_integracoes" as AdminTab,
      icon: Settings,
      label: "Integrações",
      title: "Integrações",
      show: desenvolvedor,
    },
    {
      key: "manutencao" as AdminTab,
      icon: AlertTriangle,
      label: "Manutenção",
      title: "Avisos de manutenção",
      show: desenvolvedor,
    },
  ].filter((item) => item.show);

  const navigationAreas = buildAdminNavigation({
    administrador,
    desenvolvedor,
    tecnico,
    permissions: permissoesAtuais,
  });
  const activeArea = navigationAreas.find((area) => area.tabs.includes(tab));

  const activeTab = adminTabs.find((item) => item.key === tab) ?? adminTabs[1];
  const sistemaNome = nomeSistema(configSistema);
  const sistemaLogo1 = logoSistema1(configSistema);
  // Alias somente para o renderer antigo já oculto; a aplicação possui uma única logo configurável.
  const sistemaLogo2 = sistemaLogo1;
  const ActiveIcon = activeArea?.icon ?? activeTab.icon;
  const unread = notificacoes.filter((n) => !n.lida).length;
  const filtrosAtivos = useMemo(
    () =>
      Object.values(filtros).filter(
        (valor) =>
          valor !== undefined &&
          valor !== null &&
          valor !== "" &&
          valor !== false,
      ).length,
    [filtros],
  );
  const rootClass = `${dark ? "admin-theme-dark min-h-screen bg-[#0b1120] text-white" : "min-h-screen bg-[#f4f6f8] text-[#202a33]"} ${modoCompacto ? "app-compact" : ""}`;
  const headerClass = dark
    ? "border-white/10 bg-[#101827] text-white"
    : "border-zinc-200 bg-white text-[#202a33]";
  const mutedText = dark ? "text-white/55" : "text-zinc-500";
  const fotoPerfil = usuario.foto_url || "";
  const inicialPerfil = String(usuario.nome || "A")
    .slice(0, 1)
    .toUpperCase();

  return (
    <div
      className={`shd-app nectar-shell smart-helpdesk-config-theme ${rootClass}`}
      style={variaveisTemaSistema(configSistema)}
    >
      <SystemThemeStyle />
      <Toaster position="top-right" richColors />
      <GlobalCommandPalette
        open={buscaGlobalAberta}
        onClose={() => setBuscaGlobalAberta(false)}
        chamados={[...chamados, ...filaChamados, ...carteiraEquipe]}
        usuarios={usuarios}
        artigos={base}
        onTicket={abrirDetalhe}
        onNavigate={(next) => setTab(next as AdminTab)}
        dark={dark}
      />
      <div className="fixed inset-x-0 top-3 z-50 mx-auto w-[min(920px,calc(100vw-32px))]">
        <AvisosSistemaBanner avisos={avisosSistema} dark={dark} />
      </div>
      <div className="flex h-screen overflow-hidden">
        <aside className="nectar-sidebar hidden w-14 shrink-0 flex-col border-r lg:flex">
          <div className="grid h-14 shrink-0 place-items-center border-b">
            <img
              src={sistemaLogo1}
              alt={sistemaNome}
              className="h-11 w-12 object-contain"
            />
          </div>

          <nav className="min-h-0 flex-1 overflow-y-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {navigationAreas.map((item) => {
              const Icon = item.icon;
              const ativo = item.tabs.includes(tab);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.defaultTab)}
                  title={item.title}
                  className={`nectar-nav-button relative flex h-12 min-h-12 w-full items-center justify-center transition ${ativo ? "is-active" : ""}`}
                >
                  {ativo && (
                    <span className="absolute left-0 top-0 h-full w-[3px] bg-blue-500" />
                  )}
                  <Icon size={19} strokeWidth={2.1} />
                  <span className="sr-only">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="shrink-0 border-t border-white/10 py-1">
            <button
              onClick={() => setDark(!dark)}
              className="nectar-nav-button flex h-10 w-full items-center justify-center transition"
              title={dark ? "Tema claro" : "Tema escuro"}
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              onClick={onLogout}
              className="nectar-nav-button flex h-10 w-full items-center justify-center transition hover:!text-red-500"
              title="Sair"
            >
              <LogOut size={18} />
            </button>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header
            className={`nectar-topbar sticky top-0 z-[60] h-14 overflow-visible border-b ${headerClass}`}
          >
            <div className="relative flex h-full items-center gap-4 px-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                  <h1 className="truncate text-sm font-bold tracking-tight">
                    {sistemaNome}
                  </h1>
                  <p className={`hidden text-xs ${mutedText}`}>
                    Painel administrativo
                  </p>
                </div>
              </div>

              <div className="pointer-events-none absolute left-1/2 hidden -translate-x-1/2 text-sm font-semibold text-sky-500 lg:block">
                {activeArea?.title || "Dashboard"}
              </div>

              <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-3">
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    setBuscaGlobalAberta(true);
                  }}
                  className={`${["service","assets"].includes(activeArea?.id||"") ? "hidden" : "hidden md:flex"} w-[430px] max-w-[42vw] items-center`}
                >
                  <div
                    className={`ds-search flex h-10 w-full items-center overflow-hidden rounded-full border shadow-sm transition focus-within:border-blue-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/10 ${dark ? "border-white/10 bg-white/5" : "border-zinc-200 bg-white"}`}
                  >
                    <button
                      type="submit"
                      className={`grid h-full w-11 shrink-0 place-items-center transition ${dark ? "text-white/45 hover:text-white" : "text-zinc-400 hover:text-blue-600"}`}
                      title="Pesquisar"
                      aria-label="Pesquisar chamados"
                    >
                      <Search size={18} />
                    </button>
                    <input
                      aria-label="Pesquisar chamados"
                      onFocus={() => setBuscaGlobalAberta(true)}
                      value={filtros.q || ""}
                      onChange={(e) =>
                        setFiltros({ ...filtros, q: e.target.value })
                      }
                      placeholder="Buscar em todo o sistema...  Ctrl K"
                      className={`h-full min-w-0 flex-1 border-0 bg-transparent pr-2 text-sm font-semibold outline-none placeholder:font-medium ${dark ? "text-white placeholder:text-white/35" : "text-zinc-800 placeholder:text-zinc-400"}`}
                    />
                    {filtros.q && (
                      <button
                        type="button"
                        onClick={limparPesquisa}
                        className={`mr-1 grid h-8 w-8 shrink-0 place-items-center rounded-full transition ${dark ? "text-white/45 hover:bg-white/10 hover:text-white" : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"}`}
                        title="Limpar pesquisa"
                        aria-label="Limpar pesquisa"
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>
                </form>

                <div className="nectar-top-actions flex shrink-0 items-center gap-1.5 sm:gap-2">
                  {!["service","assets"].includes(activeArea?.id||"") && <button
                    type="button"
                    onClick={() => {
                      setTab("kanban");
                      setNotificacoesAberta(false);
                      setMostrarPerfil(false);
                      setMostrarFiltros(true);
                    }}
                    className={`relative rounded-xl p-2.5 transition ${mostrarFiltros ? "bg-blue-50 text-blue-700" : dark ? "text-white/70 hover:bg-white/10 hover:text-white" : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"}`}
                    title="Filtros"
                    aria-label="Abrir filtros"
                  >
                    <Filter size={20} />
                    {filtrosAtivos > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-blue-600 px-1 text-[10px] font-black text-white">
                        {filtrosAtivos}
                      </span>
                    )}
                  </button>}
                  {!["service","assets"].includes(activeArea?.id||"") && <button
                    onClick={() => carregar()}
                    className={`rounded-xl p-2.5 transition ${dark ? "text-white/70 hover:bg-white/10 hover:text-white" : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"}`}
                    title="Atualizar"
                  >
                    <RefreshCw size={20} />
                  </button>}
                  <button
                    onClick={() => setModoCompacto((valor) => !valor)}
                    className={`hidden rounded-xl p-2.5 transition sm:grid ${modoCompacto ? "bg-blue-50 text-blue-700" : dark ? "text-white/70 hover:bg-white/10 hover:text-white" : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"}`}
                    title={
                      modoCompacto ? "Visual confortável" : "Visual compacto"
                    }
                  >
                    <ListChecks size={20} />
                  </button>
                  <div className="relative">
                    {notificacoesAberta && (
                      <button
                        type="button"
                        aria-label="Fechar notificações"
                        className="notification-dismiss fixed inset-0 z-[61] cursor-default bg-slate-950/5"
                        onClick={() => setNotificacoesAberta(false)}
                      />
                    )}
                    <button
                      onClick={abrirPainelNotificacoes}
                      className={`relative z-[63] rounded-xl p-2.5 transition ${notificacoesAberta ? "bg-blue-50 text-blue-700" : dark ? "text-white/70 hover:bg-white/10 hover:text-white" : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"}`}
                      title="Notificações"
                    >
                      <Bell size={20} />
                      {unread > 0 && (
                        <span className="absolute -right-0.5 -top-0.5 rounded-full bg-red-500 px-1.5 text-[10px] font-black text-white">
                          {unread}
                        </span>
                      )}
                    </button>

                    {notificacoesAberta && (
                      <div
                        className={`notification-popover absolute right-0 top-[calc(100%+8px)] z-[63] w-[min(400px,calc(100vw-24px))] overflow-hidden rounded-2xl border shadow-2xl ${dark ? "border-white/10 bg-[#101827] text-white" : "border-zinc-200 bg-white text-zinc-900"}`}
                      >
                        <div
                          className={`flex items-center justify-between gap-3 border-b p-4 ${dark ? "border-white/10" : "border-zinc-100"}`}
                        >
                          <div>
                            <p className="text-sm font-black">Notificações</p>
                            <p className={`text-xs ${mutedText}`}>
                              {unread > 0
                                ? `${unread} não lida(s)`
                                : "Tudo em dia"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={marcarTodasComoLidas}
                              disabled={unread === 0}
                              className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-black text-zinc-600 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Marcar lidas
                            </button>
                          </div>
                        </div>

                        <div className="max-h-[min(520px,calc(100vh-88px))] overflow-auto overscroll-contain p-2">
                          {carregandoNotificacoes &&
                            notificacoes.length === 0 && (
                              <div
                                className={`p-6 text-center text-sm ${mutedText}`}
                              >
                                Carregando notificações...
                              </div>
                            )}
                          {!carregandoNotificacoes &&
                            notificacoes.length === 0 && (
                              <div
                                className={`p-6 text-center text-sm ${mutedText}`}
                              >
                                Nenhuma notificação por enquanto.
                              </div>
                            )}
                          {notificacoes.map((notificacao) => {
                            const chamadoId = chamadoIdFromNotification(
                              notificacao.link,
                            );
                            return (
                              <button
                                type="button"
                                key={notificacao.id}
                                onClick={() => abrirNotificacao(notificacao)}
                                className={`mb-2 flex w-full gap-3 rounded-xl border p-3 text-left transition ${notificacao.lida ? (dark ? "border-white/10 bg-white/5 hover:bg-white/10" : "border-zinc-100 bg-white hover:bg-zinc-50") : dark ? "border-blue-400/30 bg-blue-500/10 hover:bg-blue-500/15" : "border-blue-100 bg-blue-50 hover:bg-blue-100"}`}
                              >
                                <span
                                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border ${notificacaoClass(notificacao.tipo)}`}
                                >
                                  {notificacaoIcone(notificacao.tipo)}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="flex items-start justify-between gap-2">
                                    <span className="line-clamp-1 text-sm font-black">
                                      {notificacao.titulo}
                                    </span>
                                    {!notificacao.lida && (
                                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                                    )}
                                  </span>
                                  <span
                                    className={`mt-1 block line-clamp-2 text-xs leading-5 ${mutedText}`}
                                  >
                                    {notificacao.mensagem}
                                  </span>
                                  <span
                                    className={`mt-2 flex items-center justify-between gap-2 text-[11px] font-bold ${mutedText}`}
                                  >
                                    <span>
                                      {formatDate(notificacao.criado_em)}
                                    </span>
                                    {chamadoId && (
                                      <span>Chamado #{chamadoId}</span>
                                    )}
                                  </span>
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMostrarPerfil((aberto) => !aberto);
                      setMostrarFiltros(false);
                      setNotificacoesAberta(false);
                    }}
                    className={`ml-1 grid h-10 w-10 place-items-center overflow-hidden rounded-full border shadow-sm transition ${dark ? "border-white/10 bg-white/10 hover:ring-4 hover:ring-white/10" : "border-zinc-200 bg-white hover:ring-4 hover:ring-blue-500/10"}`}
                    title="Perfil do administrador"
                    aria-label="Abrir perfil do administrador"
                  >
                    {fotoPerfil ? (
                      <img
                        src={fotoPerfil}
                        alt={usuario.nome}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="grid h-full w-full place-items-center bg-gradient-to-br from-blue-500 to-sky-400 text-sm font-black text-white">
                        {inicialPerfil}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </header>

          <main
            className={`h-[calc(100vh-56px)] overflow-auto px-4 pb-24 pt-0 lg:pb-5 ${["configuracoes","config_sla"].includes(tab) ? "settings-workspace" : ""}`}
          >
            {activeArea && (
              <WorkspaceNavigation
                area={activeArea}
                current={tab}
                onNavigate={setTab}
                onRefresh={activeArea.id === "service" ? ()=>void carregar() : undefined}
                tools={activeArea.id === "service" ? <TicketWorkspaceToolbar filters={filtros} onChange={setFiltros} onApply={next=>void aplicarFiltros(undefined,next)} dark={dark} embedded/> : activeArea.id === "assets" ? <div className="flex items-center justify-end gap-2"><button type="button" onClick={()=>window.dispatchEvent(new Event("assets-invite"))} className="ds-button ds-button--primary whitespace-nowrap">Gerar convite do agente</button><button type="button" onClick={()=>window.dispatchEvent(new Event("assets-filters"))} className="ds-button ds-button--secondary inline-flex items-center gap-2 whitespace-nowrap"><Filter size={16}/>Filtros</button><button type="button" onClick={()=>window.dispatchEvent(new Event("assets-refresh"))} className="ds-button ds-button--secondary grid !w-10 place-items-center !px-0" title="Atualizar ativos" aria-label="Atualizar ativos"><RefreshCw size={16}/></button></div> : undefined}
                dark={dark}
              />
            )}

            {filtrosAtivos > 0 &&
              ["kanban", "fila", "chamados", "carteira"].includes(tab) && (
                <div
                  className="mb-3 flex flex-wrap items-center gap-2"
                  aria-label="Filtros ativos"
                >
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    Filtros
                  </span>
                  {Object.entries(filtros)
                    .filter(
                      ([, value]) =>
                        value !== undefined &&
                        value !== null &&
                        value !== "" &&
                        value !== false,
                    )
                    .map(([key, value]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() =>
                          setFiltros((current) => ({
                            ...current,
                            [key]: undefined,
                          }))
                        }
                        className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-black text-blue-700"
                        title="Remover filtro"
                      >
                        {key.replaceAll("_", " ")}: {String(value)}{" "}
                        <X size={12} />
                      </button>
                    ))}
                  <button
                    type="button"
                    onClick={() => setFiltros({})}
                    className="text-[11px] font-black text-zinc-500 hover:text-red-600"
                  >
                    Limpar todos
                  </button>
                </div>
              )}

            {tab === "dashboard" && dashboard && (
              <Suspense fallback={<div className="ds-empty-state"><RefreshCw className="ds-empty-state__icon animate-spin"/><strong>Carregando dashboard…</strong></div>}><OperationalDashboard
                initial={dashboard}
                dark={dark}
                onNavigate={setTab}
                onOpenTicket={abrirDetalhe}
              /></Suspense>
            )}

            {tab === "satisfacao" && (
              <Suspense
                fallback={
                  <div className="grid min-h-[420px] place-items-center">
                    <RefreshCw className="animate-spin text-blue-600" />
                  </div>
                }
              >
                {tecnico ? (
                  <MySatisfactionPage
                    dark={dark}
                    onBack={() => setTab("fila")}
                  />
                ) : (
                  <SatisfactionAnalyticsPage
                    dark={dark}
                    onBack={() => setTab("dashboard")}
                  />
                )}
              </Suspense>
            )}

            {["indicadores_operacao","indicadores_sla","indicadores_tecnicos","indicadores_ativos"].includes(tab) && (
              <Suspense fallback={<div className="ds-empty-state"><RefreshCw className="ds-empty-state__icon animate-spin"/><strong>Carregando indicadores…</strong></div>}>
                <IndicatorsWorkspace
                  section={tab==="indicadores_sla"?"sla":tab==="indicadores_tecnicos"?"technicians":tab==="indicadores_ativos"?"assets":"operation"}
                  chamados={dadosRelatorio}
                  onOpen={abrirDetalhe}
                />
              </Suspense>
            )}

            {tab === "patrimonio" && (
              <Suspense
                fallback={
                  <div className="grid min-h-[520px] place-items-center rounded-2xl border border-zinc-200 bg-white">
                    <div className="text-center">
                      <RefreshCw className="mx-auto animate-spin text-blue-600" />
                      <p className="mt-3 text-sm font-bold text-zinc-500">
                        Carregando mapa de ativos...
                      </p>
                    </div>
                  </div>
                }
              >
                <PatrimonioMapPage dark={dark} />
              </Suspense>
            )}

            {desenvolvedor &&
              ["teams", "catalogos", "manutencao"].includes(tab) && (
                <div
                  className={`mb-4 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${dark ? "border-white/10 bg-white/5" : "border-zinc-200 bg-white"}`}
                >
                  <button
                    type="button"
                    onClick={() => setTab("configuracoes")}
                    className="flex items-center gap-2 font-black text-blue-600"
                  >
                    <Settings size={16} />
                    Configurações
                  </button>
                  <span className="text-zinc-300">/</span>
                  <span className="font-bold text-zinc-500">
                    {activeTab.title}
                  </span>
                </div>
              )}

            {tab === "configuracoes" && (
              <div
                className={`mb-5 rounded-2xl border p-2 shadow-sm ${dark ? "border-white/10 bg-white/5" : "border-zinc-200 bg-white"}`}
              >
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  <button
                    type="button"
                    className="flex items-center gap-3 rounded-xl bg-blue-600 p-3 text-left text-white shadow-lg shadow-blue-100"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/15">
                      <Settings size={19} />
                    </span>
                    <span>
                      <b className="block text-sm">Sistema</b>
                      <span className="text-xs text-white/70">
                        Identidade, SLA e respostas
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab("teams")}
                    className={`flex items-center gap-3 rounded-xl p-3 text-left transition ${dark ? "hover:bg-white/10" : "hover:bg-zinc-50"}`}
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-700">
                      <Users size={19} />
                    </span>
                    <span>
                      <b className="block text-sm">Equipes</b>
                      <span className="text-xs text-zinc-500">
                        Estrutura e distribuição
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab("catalogos")}
                    className={`flex items-center gap-3 rounded-xl p-3 text-left transition ${dark ? "hover:bg-white/10" : "hover:bg-zinc-50"}`}
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                      <Building2 size={19} />
                    </span>
                    <span>
                      <b className="block text-sm">Catálogos</b>
                      <span className="text-xs text-zinc-500">
                        Departamentos e tipos
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab("manutencao")}
                    className={`flex items-center gap-3 rounded-xl p-3 text-left transition ${dark ? "hover:bg-white/10" : "hover:bg-zinc-50"}`}
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-700">
                      <AlertTriangle size={19} />
                    </span>
                    <span>
                      <b className="block text-sm">Manutenção</b>
                      <span className="text-xs text-zinc-500">
                        Avisos e comunicados
                      </span>
                    </span>
                  </button>
                </div>
              </div>
            )}

            {tab === "fila" && (
              <Suspense fallback={<div className="ds-empty-state"><RefreshCw className="ds-empty-state__icon animate-spin"/><strong>Carregando fila…</strong></div>}><FilaChamadosView
                chamados={filaChamados}
                carteira={carteiraEquipe}
                equipe={equipe}
                teams={teams}
                dark={dark}
                administrador={administrador}
                onAbrir={abrirDetalhe}
                onAssumir={assumirChamadoAdmin}
                onAtualizar={() => carregar()}
              /></Suspense>
            )}

            {tab === "carteira" && administrador && (
              <CarteiraEquipeView
                equipe={equipe}
                chamados={carteiraEquipe}
                dark={dark}
                onAbrir={abrirDetalhe}
                onRedistribuir={async (chamadoId, tecnicoId) => {
                  const atualizado = await atualizarChamado(chamadoId, {
                    responsavel_id: tecnicoId,
                  });
                  sincronizarChamadoEquipe(atualizado);
                  toast.success("Chamado redistribuído.");
                }}
              />
            )}

            {tab === "teams" && (
              <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
                <Card>
                  <h3 className="mb-4 font-black">Nova equipe</h3>
                  <form onSubmit={criarNovaTeam} className="space-y-3">
                    <Field label="Nome">
                      <Input
                        required
                        value={novaTeam.name}
                        onChange={(e) =>
                          setNovaTeam({ ...novaTeam, name: e.target.value })
                        }
                        placeholder="Ex.: Infraestrutura"
                      />
                    </Field>
                    <Field label="Descrição">
                      <Textarea
                        value={novaTeam.description}
                        onChange={(e) =>
                          setNovaTeam({
                            ...novaTeam,
                            description: e.target.value,
                          })
                        }
                      />
                    </Field>
                    <Field label="Gerente">
                      <Select
                        value={novaTeam.manager_id}
                        onChange={(e) =>
                          setNovaTeam({
                            ...novaTeam,
                            manager_id: e.target.value,
                          })
                        }
                      >
                        <option value="">Definir depois</option>
                        {equipe.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.nome}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Distribuição">
                      <Select
                        value={novaTeam.distribution_mode}
                        onChange={(e) =>
                          setNovaTeam({
                            ...novaTeam,
                            distribution_mode: e.target
                              .value as ApiTeam["distribution_mode"],
                          })
                        }
                      >
                        <option value="manual">Manual</option>
                        <option value="round_robin">Round robin</option>
                        <option value="least_load">Menor carga</option>
                      </Select>
                    </Field>
                    <Field label="Cor">
                      <Input
                        type="color"
                        value={novaTeam.color}
                        onChange={(e) =>
                          setNovaTeam({ ...novaTeam, color: e.target.value })
                        }
                      />
                    </Field>
                    <Button>Criar equipe</Button>
                  </form>
                </Card>
                <Card>
                  <h3 className="mb-4 font-black">Equipes cadastradas</h3>
                  <div className="space-y-3">
                    {teams.map((team) => (
                      <div key={team.id} className="rounded-2xl border p-4">
                        <div className="flex items-center gap-3">
                          <span
                            className="h-4 w-4 rounded-full"
                            style={{ backgroundColor: team.color }}
                          />
                          <div>
                            <p className="font-black">{team.name}</p>
                            <p className="text-sm text-zinc-500">
                              {team.manager_name || "Sem gerente"} ·{" "}
                              {team.members_count || 0} membro(s)
                            </p>
                          </div>
                        </div>
                        <p className="mt-2 text-sm text-zinc-600">
                          {team.description || "Sem descrição"}
                        </p>
                        <Badge className="mt-3">
                          {team.distribution_mode.replace("_", " ")}
                        </Badge>
                      </div>
                    ))}
                    {teams.length === 0 && (
                      <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-zinc-500">
                        Nenhuma equipe cadastrada.
                      </p>
                    )}
                  </div>
                </Card>
              </div>
            )}

            {tab === "kanban" && (
              <Suspense fallback={<div className="ds-empty-state"><RefreshCw className="ds-empty-state__icon animate-spin"/><strong>Carregando Kanban…</strong></div>}><KanbanWorkspace
                chamados={chamados}
                dark={dark}
                dragId={dragId}
                setDragId={setDragId}
                onMover={moverChamado}
                onAbrir={abrirDetalhe}
              /></Suspense>
            )}

            {tab === "chamados" && <Suspense fallback={<div className="ds-empty-state"><RefreshCw className="ds-empty-state__icon animate-spin"/><strong>Carregando chamados…</strong></div>}><ChamadosListModule chamados={chamados} onOpen={abrirDetalhe} dark={dark}/></Suspense>}
            {["desenvolvimento","projetos"].includes(tab) && <Suspense fallback={<div className="ds-empty-state"><RefreshCw className="ds-empty-state__icon animate-spin"/><strong>Carregando desenvolvimento…</strong></div>}><DevelopmentWorkspace dark={dark}/></Suspense>}
            {tab === "historico" && (
              <HistoricoEquipeView
                chamados={historicoEquipe}
                dark={dark}
                onAbrir={(id) => abrirDetalhe(id, true)}
              />
            )}

            {["usuarios","acessos"].includes(tab) && administrador && <Suspense fallback={<div className="ds-empty-state"><RefreshCw className="ds-empty-state__icon animate-spin"/><strong>Carregando usuários…</strong></div>}><UsersModule users={usuarios} currentUser={usuario} developer={desenvolvedor} initialMode={tab==="acessos"?"access":"list"} onModeChange={mode=>setTab(mode==="access"?"acessos":"usuarios")} onRefresh={carregar} onEdit={abrirEdicaoUsuario} onPermissions={setUsuarioPermissoes} onApprove={async id=>{await aprovarUsuario(id);await carregar()}} onReject={async id=>{await rejeitarUsuario(id);await carregar()}} onDelete={async id=>{await excluirUsuarioAdmin(id);await carregar();toast.success("Usuário apagado.")}}/></Suspense>}
            {tab === "catalogos" && (
              <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
                <Card>
                  <h3 className="mb-4 font-black">Novo item</h3>
                  <form onSubmit={criarItemCatalogo} className="space-y-3">
                    <Field label="Catálogo">
                      <Select
                        value={novoCatalogo.tipo}
                        onChange={(e) =>
                          setNovoCatalogo({
                            ...novoCatalogo,
                            tipo: e.target.value as "departamentos" | "tipos",
                          })
                        }
                      >
                        <option value="departamentos">Departamentos</option>
                        <option value="tipos">Tipos de chamados</option>
                      </Select>
                    </Field>
                    <Field label="Nome">
                      <Input
                        required
                        value={novoCatalogo.nome}
                        onChange={(e) =>
                          setNovoCatalogo({
                            ...novoCatalogo,
                            nome: e.target.value,
                          })
                        }
                      />
                    </Field>
                    <Field label="Descrição">
                      <Textarea
                        value={novoCatalogo.descricao}
                        onChange={(e) =>
                          setNovoCatalogo({
                            ...novoCatalogo,
                            descricao: e.target.value,
                          })
                        }
                      />
                    </Field>
                    <Button>Criar</Button>
                  </form>
                </Card>
                <div className="grid gap-6 lg:grid-cols-2">
                  <Card>
                    <h3 className="mb-3 font-black">Departamentos</h3>
                    {departamentos.map((d) => (
                      <p key={d.id} className="mb-2 rounded-xl border p-3">
                        <b>{d.nome}</b>
                        <br />
                        <span className="text-sm text-zinc-500">
                          {d.descricao}
                        </span>
                      </p>
                    ))}
                  </Card>
                  <Card>
                    <h3 className="mb-3 font-black">Tipos</h3>
                    {tipos.map((t) => (
                      <p key={t.id} className="mb-2 rounded-xl border p-3">
                        <b>{t.nome}</b>
                        <br />
                        <span className="text-sm text-zinc-500">
                          {t.descricao}
                        </span>
                      </p>
                    ))}
                  </Card>
                </div>
              </div>
            )}

            {tab === "base" && (
              <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
                <Card>
                  <h3 className="mb-4 font-black">Novo artigo</h3>
                  <form onSubmit={criarArtigo} className="space-y-3">
                    <Field label="Título">
                      <Input
                        required
                        value={novoArtigo.titulo}
                        onChange={(e) =>
                          setNovoArtigo({
                            ...novoArtigo,
                            titulo: e.target.value,
                          })
                        }
                      />
                    </Field>
                    <Field label="Categoria">
                      <Input
                        value={novoArtigo.categoria}
                        onChange={(e) =>
                          setNovoArtigo({
                            ...novoArtigo,
                            categoria: e.target.value,
                          })
                        }
                      />
                    </Field>
                    <Field label="Palavras-chave">
                      <Input
                        value={novoArtigo.palavras_chave}
                        onChange={(e) =>
                          setNovoArtigo({
                            ...novoArtigo,
                            palavras_chave: e.target.value,
                          })
                        }
                      />
                    </Field>
                    <Field label="Conteúdo">
                      <Textarea
                        required
                        value={novoArtigo.conteudo}
                        onChange={(e) =>
                          setNovoArtigo({
                            ...novoArtigo,
                            conteudo: e.target.value,
                          })
                        }
                      />
                    </Field>
                    <Button>Criar artigo</Button>
                  </form>
                </Card>
                <Card>
                  <h3 className="mb-4 font-black">Artigos cadastrados</h3>
                  <div className="space-y-3">
                    {base.map((a) => (
                      <div key={a.id} className="rounded-2xl border p-4">
                        <p className="font-black">{a.titulo}</p>
                        <p className="text-sm text-zinc-500">
                          {a.categoria} • {a.palavras_chave}
                        </p>
                        <p className="mt-2 text-sm">{a.conteudo}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {tab === "configuracoes" && (
              <div className="grid gap-6 xl:grid-cols-[440px_1fr]">
                <div className="space-y-6">
                  <Card>
                    <h3 className="mb-4 flex items-center gap-2 font-black">
                      <UserCog size={18} />
                      Configurações do sistema
                    </h3>
                    <form
                      onSubmit={salvarConfiguracoesAdmin}
                      className="space-y-3"
                    >
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="flex items-center gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                          <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white p-1 ring-1 ring-zinc-200">
                            <img
                              src={sistemaLogo1}
                              alt={`${sistemaNome} - logo 1`}
                              className="h-full w-full object-contain"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-black">Logo 1</p>
                            <p className="truncate text-xs text-zinc-500">
                              Usada na lateral esquerda.
                            </p>
                            <label className="mt-2 inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-black text-zinc-700 transition hover:border-blue-200 hover:text-blue-700">
                              <Upload size={15} />
                              {enviandoLogoSistema === "logo1"
                                ? "Enviando..."
                                : "Trocar logo 1"}
                              <input
                                type="file"
                                accept="image/png,image/jpeg,image/jpg,image/webp"
                                className="hidden"
                                onChange={(event) =>
                                  trocarLogoSistema(event, "logo1")
                                }
                                disabled={Boolean(enviandoLogoSistema)}
                              />
                            </label>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                          <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white p-1 ring-1 ring-zinc-200">
                            <img
                              src={sistemaLogo2}
                              alt={`${sistemaNome} - logo 2`}
                              className="h-full w-full object-contain"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-black">Logo 2</p>
                            <p className="truncate text-xs text-zinc-500">
                              Usada ao lado do nome do sistema.
                            </p>
                            <label className="mt-2 inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-black text-zinc-700 transition hover:border-blue-200 hover:text-blue-700">
                              <Upload size={15} />
                              {enviandoLogoSistema === "logo2"
                                ? "Enviando..."
                                : "Trocar logo 2"}
                              <input
                                type="file"
                                accept="image/png,image/jpeg,image/jpg,image/webp"
                                className="hidden"
                                onChange={(event) =>
                                  trocarLogoSistema(event, "logo2")
                                }
                                disabled={Boolean(enviandoLogoSistema)}
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                      <Field label="Nome do sistema">
                        <Input
                          value={String(configSistema.nome_sistema || "")}
                          onChange={(e) =>
                            setConfigSistema({
                              ...configSistema,
                              nome_sistema: e.target.value,
                            })
                          }
                        />
                      </Field>
                      <Field label="E-mail de suporte">
                        <Input
                          type="email"
                          value={String(configSistema.email_suporte || "")}
                          onChange={(e) =>
                            setConfigSistema({
                              ...configSistema,
                              email_suporte: e.target.value,
                            })
                          }
                        />
                      </Field>
                      <Field label="Cor principal">
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={corPrincipalSistema(configSistema)}
                            onChange={(e) =>
                              setConfigSistema({
                                ...configSistema,
                                cor_principal: e.target.value,
                              })
                            }
                            className="w-16 p-1"
                          />
                          <Input
                            value={String(
                              configSistema.cor_principal || "#2563eb",
                            )}
                            onChange={(e) =>
                              setConfigSistema({
                                ...configSistema,
                                cor_principal: e.target.value,
                              })
                            }
                          />
                        </div>
                      </Field>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="SLA alta resposta">
                          <Input
                            type="number"
                            min="1"
                            value={String(
                              configSistema.sla_alta_resposta || 60,
                            )}
                            onChange={(e) =>
                              setConfigSistema({
                                ...configSistema,
                                sla_alta_resposta: e.target.value,
                              })
                            }
                          />
                        </Field>
                        <Field label="SLA alta resolução">
                          <Input
                            type="number"
                            min="1"
                            value={String(
                              configSistema.sla_alta_resolucao || 480,
                            )}
                            onChange={(e) =>
                              setConfigSistema({
                                ...configSistema,
                                sla_alta_resolucao: e.target.value,
                              })
                            }
                          />
                        </Field>
                        <Field label="SLA média resposta">
                          <Input
                            type="number"
                            min="1"
                            value={String(
                              configSistema.sla_media_resposta || 240,
                            )}
                            onChange={(e) =>
                              setConfigSistema({
                                ...configSistema,
                                sla_media_resposta: e.target.value,
                              })
                            }
                          />
                        </Field>
                        <Field label="SLA média resolução">
                          <Input
                            type="number"
                            min="1"
                            value={String(
                              configSistema.sla_media_resolucao || 1440,
                            )}
                            onChange={(e) =>
                              setConfigSistema({
                                ...configSistema,
                                sla_media_resolucao: e.target.value,
                              })
                            }
                          />
                        </Field>
                        <Field label="SLA baixa resposta">
                          <Input
                            type="number"
                            min="1"
                            value={String(
                              configSistema.sla_baixa_resposta || 1440,
                            )}
                            onChange={(e) =>
                              setConfigSistema({
                                ...configSistema,
                                sla_baixa_resposta: e.target.value,
                              })
                            }
                          />
                        </Field>
                        <Field label="SLA baixa resolução">
                          <Input
                            type="number"
                            min="1"
                            value={String(
                              configSistema.sla_baixa_resolucao || 2880,
                            )}
                            onChange={(e) =>
                              setConfigSistema({
                                ...configSistema,
                                sla_baixa_resolucao: e.target.value,
                              })
                            }
                          />
                        </Field>
                      </div>
                      <Button>Salvar e aplicar</Button>
                    </form>
                  </Card>
                  <Card>
                    <h3 className="mb-4 flex items-center gap-2 font-black">
                      <MessageSquare size={18} />
                      Nova resposta rápida
                    </h3>
                    <form
                      onSubmit={criarRespostaRapidaAdmin}
                      className="space-y-3"
                    >
                      <Field label="Título">
                        <Input
                          value={novaResposta.titulo}
                          onChange={(e) =>
                            setNovaResposta({
                              ...novaResposta,
                              titulo: e.target.value,
                            })
                          }
                          placeholder="Ex.: Solicitar print"
                        />
                      </Field>
                      <Field label="Categoria">
                        <Input
                          value={novaResposta.categoria}
                          onChange={(e) =>
                            setNovaResposta({
                              ...novaResposta,
                              categoria: e.target.value,
                            })
                          }
                        />
                      </Field>
                      <Field label="Mensagem">
                        <Textarea
                          value={novaResposta.mensagem}
                          onChange={(e) =>
                            setNovaResposta({
                              ...novaResposta,
                              mensagem: e.target.value,
                            })
                          }
                          placeholder="Texto que será usado no chat do chamado"
                        />
                      </Field>
                      <Button>Criar resposta</Button>
                    </form>
                  </Card>
                </div>
                <Card>
                  <h3 className="mb-4 font-black">Prévia aplicada</h3>
                  <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-zinc-200 p-4">
                        <p className="mb-2 text-xs font-bold text-zinc-500">
                          Logo 1 / lateral
                        </p>
                        <img
                          src={sistemaLogo1}
                          alt="Logo 1"
                          className="h-12 w-12 rounded-xl object-contain ring-1 ring-zinc-200"
                        />
                      </div>
                      <div className="rounded-2xl border border-zinc-200 p-4">
                        <p className="mb-2 text-xs font-bold text-zinc-500">
                          Logo 2 / topo
                        </p>
                        <img
                          src={sistemaLogo2}
                          alt="Logo 2"
                          className="h-12 w-12 rounded-xl object-contain ring-1 ring-zinc-200"
                        />
                      </div>
                    </div>
                    <div className="rounded-2xl border border-zinc-200 p-4">
                      <p className="text-xs font-bold text-zinc-500">Nome</p>
                      <p className="text-xl font-black">{sistemaNome}</p>
                    </div>
                    <div className="rounded-2xl border border-zinc-200 p-4">
                      <p className="text-xs font-bold text-zinc-500">Suporte</p>
                      <p className="font-black text-blue-600">
                        {emailSuporteSistema(configSistema)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-zinc-200 p-4">
                      <p className="text-xs font-bold text-zinc-500">
                        Cor principal
                      </p>
                      <div className="mt-2 h-10 rounded-xl bg-blue-600" />
                    </div>
                    <h3 className="pt-3 font-black">
                      Respostas rápidas cadastradas
                    </h3>
                    {respostasRapidas.map((r) => (
                      <div key={r.id} className="rounded-2xl border p-4">
                        <p className="font-black">{r.titulo}</p>
                        <p className="text-xs font-bold text-blue-600">
                          {r.categoria}
                        </p>
                        <p className="mt-2 text-sm text-zinc-600">
                          {r.mensagem}
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {["configuracoes","config_sla"].includes(tab) && (
              <Suspense fallback={<div className="ds-empty-state"><RefreshCw className="ds-empty-state__icon animate-spin"/><strong>Carregando configurações…</strong></div>}><SettingsWorkspace
                config={configSistema}
                setConfig={setConfigSistema}
                initialSection={tab==="config_sla"?"sla":"identidade"}
                logo={sistemaLogo1}
                uploading={enviandoLogoSistema === "logo1"}
                onLogo={(event) => trocarLogoSistema(event, "logo1")}
                onSave={salvarConfiguracoesAdmin}
                quick={novaResposta}
                setQuick={setNovaResposta}
                onCreateQuick={criarRespostaRapidaAdmin}
                responses={respostasRapidas}
                onNavigate={setTab}
              /></Suspense>
            )}

            {tab === "config_integracoes" && desenvolvedor && (
              <section className="ds-card p-6"><h3 className="font-black">Integrações</h3><p className="mt-2 text-sm text-slate-500">Nenhuma integração externa está configurada. Esta área permanece reservada para conexões autenticadas e auditáveis.</p></section>
            )}

            {tab === "manutencao" && desenvolvedor && (
              <div className="grid gap-6 xl:grid-cols-[440px_1fr]">
                <Card>
                  <h3 className="mb-2 flex items-center gap-2 font-black">
                    <AlertTriangle size={18} />
                    Novo aviso de manutenção
                  </h3>
                  <p className="mb-4 text-sm text-zinc-500">
                    A mensagem aparece para usuários, técnicos e administradores
                    enquanto estiver ativa e dentro do período configurado.
                  </p>
                  <form onSubmit={criarAvisoManutencao} className="space-y-3">
                    <Field label="Título">
                      <Input
                        required
                        value={novoAviso.titulo}
                        onChange={(e) =>
                          setNovoAviso({ ...novoAviso, titulo: e.target.value })
                        }
                      />
                    </Field>
                    <Field label="Mensagem">
                      <Textarea
                        required
                        value={novoAviso.mensagem}
                        onChange={(e) =>
                          setNovoAviso({
                            ...novoAviso,
                            mensagem: e.target.value,
                          })
                        }
                      />
                    </Field>
                    <Field label="Tipo">
                      <Select
                        value={novoAviso.tipo}
                        onChange={(e) =>
                          setNovoAviso({ ...novoAviso, tipo: e.target.value })
                        }
                      >
                        <option value="info">Informativo</option>
                        <option value="warning">Atenção</option>
                        <option value="danger">Crítico</option>
                        <option value="success">Sucesso</option>
                      </Select>
                    </Field>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Início opcional">
                        <Input
                          type="datetime-local"
                          value={novoAviso.inicio_em}
                          onChange={(e) =>
                            setNovoAviso({
                              ...novoAviso,
                              inicio_em: e.target.value,
                            })
                          }
                        />
                      </Field>
                      <Field label="Fim opcional">
                        <Input
                          type="datetime-local"
                          value={novoAviso.fim_em}
                          onChange={(e) =>
                            setNovoAviso({
                              ...novoAviso,
                              fim_em: e.target.value,
                            })
                          }
                        />
                      </Field>
                    </div>
                    <label className="flex items-center gap-2 text-sm font-bold">
                      <input
                        type="checkbox"
                        checked={novoAviso.ativo}
                        onChange={(e) =>
                          setNovoAviso({
                            ...novoAviso,
                            ativo: e.target.checked,
                          })
                        }
                      />{" "}
                      Ativo imediatamente
                    </label>
                    <Button className="w-full">
                      <AlertTriangle size={16} />
                      Publicar aviso
                    </Button>
                  </form>
                </Card>

                <Card>
                  <h3 className="mb-4 font-black">Avisos cadastrados</h3>
                  <div className="space-y-3">
                    {avisosAdmin.length === 0 && (
                      <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-zinc-500">
                        Nenhum aviso cadastrado.
                      </p>
                    )}
                    {avisosAdmin.map((aviso) => (
                      <div
                        key={aviso.id}
                        className={`rounded-2xl border p-4 ${dark ? "border-white/10 bg-white/5" : "border-zinc-200 bg-white"}`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-black">{aviso.titulo}</p>
                            <p className={`mt-1 text-sm ${mutedText}`}>
                              {aviso.mensagem}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Badge>{aviso.tipo}</Badge>
                              <Badge
                                className={
                                  aviso.ativo
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                    : "border-zinc-200 bg-zinc-50 text-zinc-600"
                                }
                              >
                                {aviso.ativo ? "Ativo" : "Inativo"}
                              </Badge>
                              {aviso.inicio_em && (
                                <Badge>
                                  Início: {formatDate(aviso.inicio_em)}
                                </Badge>
                              )}
                              {aviso.fim_em && (
                                <Badge>Fim: {formatDate(aviso.fim_em)}</Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => alternarAvisoManutencao(aviso)}
                            >
                              {aviso.ativo ? "Desativar" : "Ativar"}
                            </Button>
                            <Button
                              type="button"
                              variant="danger"
                              onClick={() => removerAvisoManutencao(aviso.id)}
                            >
                              <Trash2 size={16} />
                              Apagar
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {tab === "relatorios" && (
              <Suspense fallback={<div className="ds-empty-state"><RefreshCw className="ds-empty-state__icon animate-spin"/><strong>Carregando relatórios…</strong></div>}><ReportsWorkspace
                chamados={dadosRelatorio}
                dark={dark}
                onDownload={(format, filtrosRelatorio) =>
                  baixarRelatorio(format, filtrosRelatorio)
                }
              /></Suspense>
            )}
            {tab === "diagnostico" && <Suspense fallback={<div className="ds-empty-state"><RefreshCw className="ds-empty-state__icon animate-spin"/><strong>Carregando diagnóstico…</strong></div>}><SystemDiagnosticsPage dark={dark} /></Suspense>}
          </main>
        </div>
      </div>
      <nav
        className={`fixed inset-x-0 bottom-0 z-40 border-t px-2 pb-[calc(env(safe-area-inset-bottom)+6px)] pt-2 shadow-[0_-10px_28px_rgba(15,23,42,0.16)] backdrop-blur lg:hidden ${dark ? "border-white/10 bg-[#101827]/95" : "border-zinc-200 bg-white/95"}`}
      >
        <div className="mx-auto grid max-w-md grid-cols-6 items-end gap-1">
          <MobileNavButton
            icon={<LayoutDashboard size={21} />}
            label="Início"
            active={tab === "dashboard"}
            dark={dark}
            onClick={() => {
              setTab("dashboard");
              setMenuMaisAdmin(false);
            }}
          />
          <MobileNavButton
            icon={<Headphones size={21} />}
            label="Atendimento"
            active={["fila","kanban","chamados","historico"].includes(tab)}
            dark={dark}
            onClick={() => {
              setTab("fila");
              setMenuMaisAdmin(false);
            }}
            badge={
              filaChamados.length ? String(filaChamados.length) : undefined
            }
          />
          {administrador ? (
            <MobileNavButton
              icon={<Users size={21} />}
              label="Equipe"
              active={["usuarios","acessos","carteira","teams"].includes(tab)}
              dark={dark}
              onClick={() => {
                setTab("usuarios");
                setMenuMaisAdmin(false);
              }}
            />
          ) : (
            <MobileNavButton
              icon={<Star size={21} />}
              label="Avaliação"
              active={tab === "satisfacao"}
              dark={dark}
              onClick={() => {
                setTab("satisfacao");
                setMenuMaisAdmin(false);
              }}
            />
          )}
          <MobileNavButton
            icon={<BarChart3 size={21} />}
            label="Indicadores"
            active={["relatorios","satisfacao","indicadores_operacao","indicadores_sla","indicadores_tecnicos","indicadores_ativos"].includes(tab)}
            dark={dark}
            onClick={() => {
              setTab(tecnico?"satisfacao":"indicadores_operacao");
              setMenuMaisAdmin(false);
            }}
          />
          <MobileNavButton
            icon={<BookOpen size={21} />}
            label="Base"
            active={tab === "base"}
            dark={dark}
            onClick={() => {
              setTab("base");
              setMenuMaisAdmin(false);
            }}
          />
          <MobileNavButton
            icon={<Menu size={21} />}
            label="Mais"
            active={
              menuMaisAdmin ||
              [
                "patrimonio",
                "catalogos",
                "configuracoes",
                "config_sla",
                "config_integracoes",
                "manutencao",
                "diagnostico",
              ].includes(tab)
            }
            dark={dark}
            onClick={() => setMenuMaisAdmin(true)}
            badge={unread > 0 ? String(unread) : undefined}
          />
        </div>
      </nav>

      {menuMaisAdmin && (
        <MobileMoreSheet
          title="Mais opções"
          dark={dark}
          onClose={() => setMenuMaisAdmin(false)}
        >
          <MobileMoreAction
            icon={<Filter size={18} />}
            label="Filtros"
            badge={filtrosAtivos > 0 ? `${filtrosAtivos} ativo(s)` : undefined}
            onClick={() => {
              setTab("kanban");
              setMostrarFiltros(true);
              setMenuMaisAdmin(false);
            }}
          />
          <MobileMoreAction
            icon={<Bell size={18} />}
            label="Notificações"
            badge={unread > 0 ? `${unread} nova(s)` : undefined}
            onClick={() => {
              setMenuMaisAdmin(false);
              abrirPainelNotificacoes();
            }}
          />
          <MobileMoreAction
            icon={<MapPinned size={18} />}
            label="Ativos"
            onClick={() => {
              setTab("patrimonio");
              setMenuMaisAdmin(false);
            }}
          />
          {(administrador||desenvolvedor) && (
            <MobileMoreAction
              icon={<Settings size={18} />}
              label="Ajustes"
              onClick={() => {
                setTab(desenvolvedor?"configuracoes":"catalogos");
                setMenuMaisAdmin(false);
              }}
            />
          )}
          <MobileMoreAction
            icon={dark ? <Sun size={18} /> : <Moon size={18} />}
            label={dark ? "Tema claro" : "Tema escuro"}
            onClick={() => setDark((valor) => !valor)}
          />
          <MobileMoreAction
            icon={<ListChecks size={18} />}
            label={modoCompacto ? "Visual confortável" : "Visual compacto"}
            onClick={() => setModoCompacto((valor) => !valor)}
          />
          <MobileMoreAction
            icon={<User size={18} />}
            label="Perfil"
            onClick={() => {
              setMostrarPerfil(true);
              setMenuMaisAdmin(false);
            }}
          />
          <MobileMoreAction
            icon={<LogOut size={18} />}
            label="Sair"
            danger
            onClick={() => {
              setMenuMaisAdmin(false);
              onLogout();
            }}
          />
        </MobileMoreSheet>
      )}

      {mostrarFiltros && (
        <div className="fixed inset-x-0 bottom-0 top-14 z-50 flex justify-end">
          <button
            type="button"
            aria-label="Fechar filtros"
            className="absolute inset-0 bg-slate-950/35 backdrop-blur-[1px]"
            onClick={() => setMostrarFiltros(false)}
          />

          <aside
            className={`relative z-10 flex h-full w-full max-w-[420px] flex-col border-l shadow-2xl ${dark ? "border-white/10 bg-[#101827] text-white" : "border-zinc-200 bg-white text-zinc-900"}`}
          >
            <div
              className={`flex items-start justify-between gap-3 border-b px-5 py-4 ${dark ? "border-white/10" : "border-zinc-100"}`}
            >
              <div>
                <p className="flex items-center gap-2 text-base font-black">
                  <Filter size={18} />
                  Filtros de chamados
                </p>
                <p className={`mt-1 text-xs ${mutedText}`}>
                  Refine o Kanban sem ocupar espaço da tela.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMostrarFiltros(false)}
                className={`rounded-xl p-2 transition ${dark ? "text-white/60 hover:bg-white/10 hover:text-white" : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"}`}
                title="Fechar filtros"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={aplicarFiltros}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="min-h-0 flex-1 space-y-4 overflow-auto px-5 py-5">
                <Field label="Pesquisa">
                  <div className="relative">
                    <Search
                      className="absolute left-3 top-3 text-zinc-400"
                      size={16}
                    />
                    <Input
                      placeholder="Número, título ou descrição"
                      value={filtros.q || ""}
                      onChange={(e) =>
                        setFiltros({ ...filtros, q: e.target.value })
                      }
                      className="pl-9"
                    />
                  </div>
                </Field>

                {filtrosSalvos.length > 0 && (
                  <Field label="Filtros salvos">
                    <div className="grid gap-2">
                      {filtrosSalvos.slice(0, 5).map((filtro) => (
                        <button
                          key={filtro.id}
                          type="button"
                          onClick={() => aplicarFiltroSalvo(filtro)}
                          className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-left text-xs font-bold text-zinc-700 hover:bg-blue-50 hover:text-blue-700"
                        >
                          {filtro.nome}
                        </button>
                      ))}
                    </div>
                  </Field>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Status">
                    <Select
                      value={filtros.status || ""}
                      onChange={(e) =>
                        setFiltros({ ...filtros, status: e.target.value })
                      }
                    >
                      <option value="">Todos</option>
                      {STATUS_OPCOES.map((s) => (
                        <option key={s} value={s}>{ticketStatusLabel(s)}</option>
                      ))}
                    </Select>
                  </Field>

                  <Field label="Prioridade">
                    <Select
                      value={filtros.prioridade || ""}
                      onChange={(e) =>
                        setFiltros({ ...filtros, prioridade: e.target.value })
                      }
                    >
                      <option value="">Todas</option>
                      {PRIORIDADES.map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                    </Select>
                  </Field>
                </div>

                <Field label="Departamento">
                  <Select
                    value={filtros.departamento || ""}
                    onChange={(e) =>
                      setFiltros({ ...filtros, departamento: e.target.value })
                    }
                  >
                    <option value="">Todos os departamentos</option>
                    {departamentos.map((d) => (
                      <option key={d.id}>{d.nome}</option>
                    ))}
                  </Select>
                </Field>

                <Field label="Técnico responsável">
                  <Select
                    value={String(filtros.responsavel_id || "")}
                    onChange={(e) =>
                      setFiltros({ ...filtros, responsavel_id: e.target.value })
                    }
                  >
                    <option value="">Todos os técnicos</option>
                    {equipe.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nome}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label="Tipo de chamado">
                  <Select
                    value={filtros.tipo_chamado || ""}
                    onChange={(e) =>
                      setFiltros({ ...filtros, tipo_chamado: e.target.value })
                    }
                  >
                    <option value="">Todos os tipos</option>
                    {tipos.map((t) => (
                      <option key={t.id}>{t.nome}</option>
                    ))}
                  </Select>
                </Field>

                <Field label="Solicitante">
                  <Input
                    placeholder="Nome ou e-mail do solicitante"
                    value={filtros.usuario || ""}
                    onChange={(e) =>
                      setFiltros({ ...filtros, usuario: e.target.value })
                    }
                  />
                </Field>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Data inicial">
                    <Input
                      type="date"
                      value={filtros.data_inicio || ""}
                      onChange={(e) =>
                        setFiltros({ ...filtros, data_inicio: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Data final">
                    <Input
                      type="date"
                      value={filtros.data_fim || ""}
                      onChange={(e) =>
                        setFiltros({ ...filtros, data_fim: e.target.value })
                      }
                    />
                  </Field>
                </div>

                <label
                  className={`flex items-center gap-3 rounded-2xl border p-4 text-sm font-bold ${dark ? "border-white/10 bg-white/5 text-white/75" : "border-zinc-200 bg-zinc-50 text-zinc-700"}`}
                >
                  <input
                    type="checkbox"
                    checked={Boolean(filtros.vencidos)}
                    onChange={(e) =>
                      setFiltros({ ...filtros, vencidos: e.target.checked })
                    }
                  />
                  Mostrar somente chamados vencidos
                </label>
              </div>

              <div
                className={`flex gap-3 border-t p-5 ${dark ? "border-white/10" : "border-zinc-100"}`}
              >
                <Button className="flex-1">
                  <Search size={16} />
                  Aplicar
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={limparFiltros}
                >
                  Limpar
                </Button>
              </div>
            </form>
          </aside>
        </div>
      )}

      {mostrarPerfil && (
        <ProfileCenter
          profile={usuario as ApiUsuario}
          draft={perfilForm}
          setDraft={setPerfilForm}
          photo={fotoPerfil}
          initials={inicialPerfil}
          uploading={enviandoFoto}
          saving={salvandoPerfil}
          dark={dark}
          stats={{
            abertos: chamados.filter(
              (item) => normalizeStatus(item.status) === TICKET_STATUS.OPEN,
            ).length,
            andamento: chamados.filter(
              (item) => normalizeStatus(item.status) === TICKET_STATUS.IN_PROGRESS,
            ).length,
            concluidos: chamados.filter(
              (item) => normalizeStatus(item.status) === TICKET_STATUS.CLOSED,
            ).length,
            atrasados: chamados.filter((item) => Boolean(item.vencido)).length,
          }}
          onSave={salvarPerfilAdmin}
          onPhoto={trocarFotoPerfil}
          onRemovePhoto={removerFotoPerfil}
          onClose={() => setMostrarPerfil(false)}
          onLogout={onLogout}
        />
      )}

      {false && mostrarPerfil && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            aria-label="Fechar perfil"
            className="absolute inset-0 bg-slate-950/35 backdrop-blur-[1px]"
            onClick={() => setMostrarPerfil(false)}
          />

          <aside
            className={`relative z-10 flex h-full w-full max-w-[430px] flex-col border-l shadow-2xl ${dark ? "border-white/10 bg-[#101827] text-white" : "border-zinc-200 bg-white text-zinc-900"}`}
          >
            <div
              className={`flex items-start justify-between gap-3 border-b px-5 py-4 ${dark ? "border-white/10" : "border-zinc-100"}`}
            >
              <div>
                <p className="flex items-center gap-2 text-base font-black">
                  <UserCog size={18} />
                  Perfil do administrador
                </p>
                <p className={`mt-1 text-xs ${mutedText}`}>
                  Foto, dados pessoais e acesso da conta.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMostrarPerfil(false)}
                className={`rounded-xl p-2 transition ${dark ? "text-white/60 hover:bg-white/10 hover:text-white" : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"}`}
                title="Fechar perfil"
              >
                <X size={18} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-auto px-5 py-5">
              <div
                className={`rounded-3xl border p-5 text-center ${dark ? "border-white/10 bg-white/5" : "border-zinc-200 bg-zinc-50"}`}
              >
                <div className="mx-auto mb-3 grid h-28 w-28 place-items-center overflow-hidden rounded-full border-4 border-white bg-gradient-to-br from-blue-500 to-sky-400 text-4xl font-black text-white shadow-xl">
                  {fotoPerfil ? (
                    <img
                      src={fotoPerfil}
                      alt={usuario.nome}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    inicialPerfil
                  )}
                </div>
                <h3 className="text-lg font-black">{usuario.nome}</h3>
                <p className={`text-sm ${mutedText}`}>{usuario.email}</p>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  <Badge className="border-blue-200 bg-blue-50 text-blue-700">
                    {perfilLabel(usuario.perfil)}
                  </Badge>
                  {usuario.departamento && (
                    <Badge className="border-zinc-200 bg-white text-zinc-600">
                      {usuario.departamento}
                    </Badge>
                  )}
                </div>

                <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                  <label
                    className={`inline-flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition ${enviandoFoto ? "pointer-events-none opacity-60" : ""} ${dark ? "bg-white text-zinc-900 hover:bg-white/90" : "bg-blue-600 text-white shadow-lg shadow-blue-100 hover:bg-blue-700"}`}
                  >
                    <Camera size={16} />
                    {enviandoFoto
                      ? "Enviando..."
                      : fotoPerfil
                        ? "Trocar foto"
                        : "Adicionar foto"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      className="hidden"
                      onChange={trocarFotoPerfil}
                    />
                  </label>
                  {fotoPerfil && (
                    <Button
                      type="button"
                      variant="secondary"
                      className="flex-1"
                      disabled={enviandoFoto}
                      onClick={removerFotoPerfil}
                    >
                      <Trash2 size={16} />
                      Remover
                    </Button>
                  )}
                </div>
                <p className={`mt-3 text-xs ${mutedText}`}>
                  Use PNG, JPG, JPEG ou WEBP até 3 MB.
                </p>
              </div>

              <form onSubmit={salvarPerfilAdmin} className="mt-5 space-y-4">
                <Field label="Nome">
                  <Input
                    required
                    value={perfilForm.nome}
                    onChange={(e) =>
                      setPerfilForm({ ...perfilForm, nome: e.target.value })
                    }
                  />
                </Field>

                <Field label="E-mail">
                  <Input
                    value={usuario.email}
                    disabled
                    className="cursor-not-allowed bg-zinc-100 text-zinc-500"
                  />
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Telefone">
                    <Input
                      value={perfilForm.telefone}
                      onChange={(e) =>
                        setPerfilForm({
                          ...perfilForm,
                          telefone: e.target.value,
                        })
                      }
                      placeholder="(00) 00000-0000"
                    />
                  </Field>
                  <Field label="Cargo">
                    <Input
                      value={perfilForm.cargo}
                      onChange={(e) =>
                        setPerfilForm({ ...perfilForm, cargo: e.target.value })
                      }
                      placeholder="Administrador"
                    />
                  </Field>
                </div>

                <Field label="Departamento">
                  <Input
                    value={perfilForm.departamento}
                    onChange={(e) =>
                      setPerfilForm({
                        ...perfilForm,
                        departamento: e.target.value,
                      })
                    }
                    placeholder="TI, Suporte, Operações..."
                  />
                </Field>

                <Button className="w-full" disabled={salvandoPerfil}>
                  <UserCheck size={16} />
                  {salvandoPerfil ? "Salvando..." : "Salvar perfil"}
                </Button>
              </form>
            </div>

            <div
              className={`border-t p-5 ${dark ? "border-white/10" : "border-zinc-100"}`}
            >
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={onLogout}
              >
                <LogOut size={16} />
                Sair da conta
              </Button>
            </div>
          </aside>
        </div>
      )}

      {usuarioPermissoes && (
        <PermissionDialog
          user={usuarioPermissoes}
          dark={dark}
          onClose={() => setUsuarioPermissoes(null)}
          onSaved={() => toast.success("Permissões atualizadas.")}
        />
      )}

      {usuarioEditando && desenvolvedor && (
        <Modal
          title={`Editar usuário - ${usuarioEditando.nome}`}
          onClose={() => setUsuarioEditando(null)}
        >
          <form onSubmit={salvarEdicaoUsuario} className="space-y-4">
            <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <UsuarioSistemaAvatar usuario={usuarioEditando} size="lg" />
              <div className="min-w-0">
                <p className="font-black text-zinc-900">
                  {usuarioEditando.nome}
                </p>
                <p className="truncate text-sm text-zinc-500">
                  {usuarioEditando.email}
                </p>
                <p className="mt-1 text-xs font-bold text-blue-600">
                  Perfil atual: {perfilLabel(usuarioEditando.perfil)}
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nome">
                <Input
                  required
                  value={usuarioForm.nome}
                  onChange={(e) =>
                    setUsuarioForm({ ...usuarioForm, nome: e.target.value })
                  }
                />
              </Field>
              <Field label="E-mail">
                <Input
                  required
                  type="email"
                  value={usuarioForm.email}
                  onChange={(e) =>
                    setUsuarioForm({ ...usuarioForm, email: e.target.value })
                  }
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tipo de usuário">
                <Select
                  value={usuarioForm.perfil}
                  onChange={(e) =>
                    setUsuarioForm({ ...usuarioForm, perfil: e.target.value })
                  }
                >
                  {PERFIS.map((p) => (
                    <option key={p} value={p}>
                      {perfilLabel(p)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Status">
                <Select
                  value={usuarioForm.status}
                  onChange={(e) =>
                    setUsuarioForm({ ...usuarioForm, status: e.target.value })
                  }
                >
                  <option value="ativo">Ativo</option>
                  <option value="pendente">Pendente</option>
                  <option value="inativo">Inativo</option>
                  <option value="rejeitado">Rejeitado</option>
                </Select>
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Telefone">
                <Input
                  value={usuarioForm.telefone}
                  onChange={(e) =>
                    setUsuarioForm({ ...usuarioForm, telefone: e.target.value })
                  }
                  placeholder="(00) 00000-0000"
                />
              </Field>
              <Field label="Cargo">
                <Input
                  value={usuarioForm.cargo}
                  onChange={(e) =>
                    setUsuarioForm({ ...usuarioForm, cargo: e.target.value })
                  }
                  placeholder="Cargo do usuário"
                />
              </Field>
            </div>

            <Field label="Departamento">
              <Input
                value={usuarioForm.departamento}
                onChange={(e) =>
                  setUsuarioForm({
                    ...usuarioForm,
                    departamento: e.target.value,
                  })
                }
                placeholder="Departamento"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Cidade / área de atuação">
                <Select required value={usuarioForm.municipio} onChange={(e)=>{const municipio=e.target.value;setUsuarioForm({...usuarioForm,municipio,unidade:municipio?`Maranhão Motos - ${municipio}`:""})}}>
                  <option value="">Selecione</option>
                  {municipiosMaranhao.map((item)=><option key={item.nome} value={item.nome}>{item.nome}</option>)}
                </Select>
              </Field>
              <Field label="Unidade / local padrão">
                <Input readOnly value={usuarioForm.unidade} placeholder="Definida pela cidade" />
              </Field>
            </div>

            <Field label="Nova senha opcional">
              <Input
                type="password"
                value={usuarioForm.senha}
                onChange={(e) =>
                  setUsuarioForm({ ...usuarioForm, senha: e.target.value })
                }
                placeholder="Deixe em branco para manter a senha atual"
              />
            </Field>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setUsuarioEditando(null)}
              >
                Cancelar
              </Button>
              <Button disabled={salvandoUsuarioAdmin}>
                <UserCheck size={16} />
                {salvandoUsuarioAdmin ? "Salvando..." : "Salvar alterações"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {selecionado && (
        <ChamadoDetalhe
          chamado={selecionado}
          usuario={usuario}
          equipe={equipe}
          respostasRapidas={respostasRapidas}
          onAssumir={assumirChamadoAdmin}
          somenteLeitura={detalheSomenteLeitura}
          onClose={() => {
            setSelecionado(null);
            setDetalheSomenteLeitura(false);
          }}
          onRefresh={async () => {
            const atualizado = await buscarChamado(selecionado.id);
            sincronizarChamadoEquipe(atualizado);
          }}
        />
      )}
    </div>
  );
}

function HistoricoEquipeView({
  chamados,
  dark,
  onAbrir,
}: {
  chamados: ApiChamado[];
  dark: boolean;
  onAbrir: (id: number) => void;
}) {
  const [busca, setBusca] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const responsaveis = useMemo(
    () =>
      Array.from(
        new Set(chamados.map(nomeResponsavelChamado).filter(Boolean)),
      ).sort(),
    [chamados],
  );
  const filtrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    return chamados.filter((chamado) => {
      const correspondeResponsavel =
        !responsavel || nomeResponsavelChamado(chamado) === responsavel;
      const texto = [
        chamado.numero_chamado,
        chamado.titulo,
        chamado.solicitante,
        chamado.setor,
        nomeResponsavelChamado(chamado),
      ]
        .join(" ")
        .toLocaleLowerCase("pt-BR");
      return correspondeResponsavel && (!termo || texto.includes(termo));
    });
  }, [busca, chamados, responsavel]);

  return (
    <Card>
      <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
              <History size={20} />
            </span>
            <div>
              <h3 className="text-base font-black">
                Histórico de chamados da equipe
              </h3>
              <p
                className={`text-xs ${dark ? "text-white/55" : "text-zinc-500"}`}
              >
                Registros encerrados preservados para consulta e auditoria.
              </p>
            </div>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-[minmax(240px,1fr)_220px]">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
            />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Número, título ou solicitante"
              className="pl-9"
            />
          </div>
          <Select
            value={responsavel}
            onChange={(e) => setResponsavel(e.target.value)}
          >
            <option value="">Todos os responsáveis</option>
            {responsaveis.map((nome) => (
              <option key={nome} value={nome}>
                {nome}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-bold text-zinc-500">
          {filtrados.length} de {chamados.length} registro(s)
        </span>
        <Badge className="border-slate-200 bg-slate-50 text-slate-600">
          <LockKeyhole size={12} className="mr-1" />
          Somente leitura
        </Badge>
      </div>
      <div className="divide-y divide-zinc-100">
        {filtrados.map((chamado) => (
          <button
            key={chamado.id}
            type="button"
            onClick={() => onAbrir(chamado.id)}
            className={`grid w-full gap-3 py-4 text-left transition md:grid-cols-[110px_minmax(0,1fr)_190px_170px_110px] md:items-center ${dark ? "hover:bg-white/5" : "hover:bg-zinc-50"}`}
          >
            <span className="text-sm font-black text-blue-700">
              {chamado.numero_chamado || `#${chamado.id}`}
            </span>
            <span className="min-w-0">
              <b className="block truncate text-sm">{chamado.titulo}</b>
              <small className="block truncate text-zinc-500">
                {chamado.solicitante} · {chamado.setor || "Sem departamento"}
              </small>
            </span>
            <span className="flex items-center gap-2 text-xs font-bold">
              <ResponsavelAvatar chamado={chamado} size="sm" />
              {nomeResponsavelChamado(chamado) || "Não definido"}
            </span>
            <span className="text-xs text-zinc-500">
              Encerrado em
              <br />
              <b className="text-zinc-700">
                {formatDate(chamado.finalizado_em || chamado.atualizado_em)}
              </b>
            </span>
            <span className="flex items-center justify-between gap-2">
              <Badge className={statusClass(chamado.status)}>
                {ticketStatusLabel(chamado.status)}
              </Badge>
              <Eye size={16} className="text-zinc-400" />
            </span>
          </button>
        ))}
        {filtrados.length === 0 && (
          <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-zinc-500">
            Nenhum chamado encerrado corresponde à pesquisa.
          </div>
        )}
      </div>
    </Card>
  );
}

function CarteiraEquipeView({
  equipe,
  chamados,
  dark,
  onAbrir,
  onRedistribuir,
}: {
  equipe: ApiUsuario[];
  chamados: ApiChamado[];
  dark: boolean;
  onAbrir: (id: number) => void;
  onRedistribuir: (chamadoId: number, tecnicoId: number) => Promise<void>;
}) {
  const [arrastando, setArrastando] = useState<number | null>(null);
  const capacidade = 8;
  const cargaDe = (id: number) => chamados.filter((chamado) => Number(chamado.responsavel_id) === Number(id) && ![TICKET_STATUS.RESOLVED,TICKET_STATUS.CLOSED,TICKET_STATUS.CANCELED].some((status) => status === canonicalTicketStatus(chamado.status))).length;

  function presenca(membro: ApiUsuario) {
    if (!membro.ultimo_login_em)
      return { label: "Ausente", cor: "bg-zinc-400" };
    const minutos =
      (Date.now() - new Date(membro.ultimo_login_em).getTime()) / 60000;
    if (minutos <= 30) return { label: "Online", cor: "bg-emerald-500" };
    if (minutos <= 480) return { label: "Recente", cor: "bg-amber-500" };
    return { label: "Ausente", cor: "bg-zinc-400" };
  }

  return (
    <div className="space-y-4">
      <div
        className={`rounded-2xl border p-5 ${dark ? "border-white/10 bg-white/5" : "border-zinc-200 bg-white"}`}
      >
        <h3 className="text-lg font-black">Carteira da equipe técnica</h3>
        <p className="mt-1 text-sm text-zinc-500">
          Carga, SLA e disponibilidade estimada pelo último acesso. Arraste um
          chamado para redistribuí-lo.
        </p>
      </div>
      <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
        {equipe.map((membro) => {
          const itens = chamados.filter(
            (chamado) =>
              Number(chamado.responsavel_id) === Number(membro.id) &&
              normalizeStatus(chamado.status) !== TICKET_STATUS.CLOSED,
          );
          const vencidos = itens.filter(
            (chamado) => chamado.vencido || chamado.sla_status === "vencido",
          ).length;
          const ocupacao = Math.min(
            100,
            Math.round((itens.length / capacidade) * 100),
          );
          const situacao = presenca(membro);
          const excedentes = Math.max(0, itens.length - capacidade);
          const recomendado = equipe
            .filter((candidato) => Number(candidato.id) !== Number(membro.id) && cargaDe(candidato.id) < capacidade)
            .sort((a, b) => cargaDe(a.id) - cargaDe(b.id))[0];
          return (
            <section
              key={membro.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={async () => {
                if (arrastando && itens.length >= capacidade) {
                  toast.error(`${membro.nome} atingiu ${capacidade}/${capacidade}.${recomendado ? ` Sugestão: ${recomendado.nome} (${cargaDe(recomendado.id)}/${capacidade}).` : " Nenhum técnico disponível."}`);
                } else if (arrastando) await onRedistribuir(arrastando, membro.id);
                setArrastando(null);
              }}
              className={`rounded-2xl border p-4 shadow-sm transition ${excedentes ? "border-red-300 bg-red-50/30 ring-2 ring-red-100" : arrastando ? "border-blue-300 ring-2 ring-blue-100" : dark ? "border-white/10 bg-white/5" : "border-zinc-200 bg-white"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <UsuarioSistemaAvatar
                    usuario={membro}
                    size="md"
                    dark={dark}
                  />
                  <div className="min-w-0">
                    <p className="truncate font-black">{membro.nome}</p>
                    <p className="truncate text-xs text-zinc-500">
                      {membro.departamento || perfilLabel(membro.perfil)}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-[11px] font-bold text-zinc-500">
                      <span
                        className={`h-2 w-2 rounded-full ${situacao.cor}`}
                      />
                      {situacao.label}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black">
                    {itens.length}
                    <span className="text-xs text-zinc-400">/{capacidade}</span>
                  </p>
                  <p className="text-[10px] font-bold uppercase text-zinc-400">
                    capacidade
                  </p>
                </div>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className={`h-full rounded-full ${ocupacao >= 100 ? "bg-red-500" : ocupacao >= 75 ? "bg-amber-500" : "bg-emerald-500"}`}
                  style={{ width: `${ocupacao}%` }}
                />
              </div>
              {excedentes > 0 && <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700"><b className="flex items-center gap-2"><AlertTriangle size={15}/>{excedentes} chamado(s) acima da capacidade</b><p className="mt-1">Novas atribuições estão bloqueadas para este técnico.</p>{recomendado&&<button type="button" onClick={async()=>{const chamado=itens[itens.length-1];if(chamado)await onRedistribuir(chamado.id,recomendado.id)}} className="mt-2 w-full rounded-lg bg-white px-3 py-2 font-black text-red-700 shadow-sm">Mover 1 excedente para {recomendado.nome} · {cargaDe(recomendado.id)}/{capacidade}</button>}</div>}
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-blue-50 p-2 text-blue-700">
                  <b className="block text-lg">{itens.length}</b>
                  <span className="text-[10px] font-bold">Ativos</span>
                </div>
                <div className="rounded-xl bg-red-50 p-2 text-red-700">
                  <b className="block text-lg">{vencidos}</b>
                  <span className="text-[10px] font-bold">Vencidos</span>
                </div>
                <div className="rounded-xl bg-emerald-50 p-2 text-emerald-700">
                  <b className="block text-lg">
                    {Math.max(0, capacidade - itens.length)}
                  </b>
                  <span className="text-[10px] font-bold">Disponível</span>
                </div>
              </div>
              <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
                {itens.map((chamado) => (
                  <button
                    draggable
                    onDragStart={() => setArrastando(chamado.id)}
                    onDragEnd={() => setArrastando(null)}
                    key={chamado.id}
                    type="button"
                    onClick={() => onAbrir(chamado.id)}
                    className={`flex w-full cursor-grab items-center gap-3 rounded-xl border p-3 text-left transition ${dark ? "border-white/10 hover:bg-white/10" : "border-zinc-200 hover:bg-zinc-50"}`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-black text-blue-700">
                        {chamado.numero_chamado || `#${chamado.id}`}
                      </span>
                      <span className="block truncate text-sm font-bold">
                        {chamado.titulo}
                      </span>
                    </span>
                    {chamado.vencido && (
                      <AlertTriangle size={15} className="text-red-500" />
                    )}
                    <Badge className={statusClass(chamado.status)}>
                      {ticketStatusLabel(chamado.status)}
                    </Badge>
                  </button>
                ))}
                {itens.length === 0 && (
                  <p className="rounded-xl border border-dashed p-5 text-center text-sm text-zinc-500">
                    Solte um chamado aqui.
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function DashboardView({
  dashboard,
  chamados,
  dark,
}: {
  dashboard: DashboardResumo;
  chamados: ApiChamado[];
  dark: boolean;
}) {
  const cards = [
    {
      label: "Total",
      value: dashboard.totalChamados,
      icon: Ticket,
      tone: "blue",
      hint: "Chamados registrados",
    },
    {
      label: "Abertos",
      value: dashboard.abertos,
      icon: CircleDot,
      tone: "blue",
      hint: "Aguardando triagem",
    },
    {
      label: "Em andamento",
      value: dashboard.emAndamento,
      icon: RefreshCw,
      tone: "amber",
      hint: "Sendo tratados",
    },
    {
      label: "Sem responsável",
      value: dashboard.semResponsavel || 0,
      icon: UserCog,
      tone: "purple",
      hint: "Precisam de dono",
    },
    {
      label: "Vencidos",
      value: dashboard.vencidos,
      icon: AlertTriangle,
      tone: "red",
      hint: "Fora do SLA",
    },
    {
      label: "Satisfação",
      value: dashboard.satisfacaoMedia ? `${dashboard.satisfacaoMedia}/5` : "-",
      icon: Star,
      tone: "emerald",
      hint: `${dashboard.avaliacoesTotal || 0} avaliação(ões)`,
    },
  ] as const;

  const prioridadeMax = Math.max(
    1,
    ...dashboard.porPrioridade.map((p) => Number(p.total || 0)),
  );
  const statusMax = Math.max(
    1,
    ...dashboard.porStatus.map((p) => Number(p.total || 0)),
  );
  const tecnicoMax = Math.max(
    1,
    ...(dashboard.porTecnico || []).map((p) => Number(p.total || 0)),
  );

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {cards.map(({ label, value, icon: Icon, tone, hint }) => (
          <Card key={label} className="dashboard-card">
            <div
              className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl dashboard-tone-${tone}`}
            >
              <Icon size={20} />
            </div>
            <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">
              {label}
            </p>
            <p className="mt-1 text-3xl font-black text-zinc-900">{value}</p>
            <p className="mt-1 text-xs font-semibold text-zinc-400">{hint}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <h3 className="mb-4 flex items-center gap-2 font-black">
            <BarChart3 size={18} />
            Prioridades
          </h3>
          {dashboard.porPrioridade.map((p) => (
            <div key={p.prioridade || "Sem prioridade"} className="mb-3">
              <div className="mb-1 flex justify-between text-sm">
                <b>{p.prioridade || "Sem prioridade"}</b>
                <span>{p.total}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full bg-blue-600"
                  style={{
                    width: `${Math.max(5, (p.total / prioridadeMax) * 100)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </Card>

        <Card className="xl:col-span-1">
          <h3 className="mb-4 flex items-center gap-2 font-black">
            <ListChecks size={18} />
            Status
          </h3>
          {dashboard.porStatus.map((s) => (
            <div key={s.status || "Sem status"} className="mb-3">
              <div className="mb-1 flex justify-between text-sm">
                <b>{s.status ? ticketStatusLabel(s.status) : "Sem status"}</b>
                <span>{s.total}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{
                    width: `${Math.max(5, (s.total / statusMax) * 100)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </Card>

        <Card className="xl:col-span-1">
          <h3 className="mb-4 flex items-center gap-2 font-black">
            <Users size={18} />
            Técnicos
          </h3>
          {(dashboard.porTecnico || []).length > 0 ? (
            (dashboard.porTecnico || []).map((t) => (
              <div key={t.tecnico || "Sem técnico"} className="mb-3">
                <div className="mb-1 flex justify-between text-sm">
                  <b>{t.tecnico || "Sem técnico"}</b>
                  <span>{t.total}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className="h-full rounded-full bg-violet-500"
                    style={{
                      width: `${Math.max(5, (t.total / tecnicoMax) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-2xl border border-dashed border-zinc-200 p-6 text-center text-sm text-zinc-500">
              Nenhum técnico com chamados no período.
            </p>
          )}
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <Card>
          <h3 className="mb-4 flex items-center gap-2 font-black">
            <Building2 size={18} />
            Chamados por departamento
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            {dashboard.porDepartamento.map((d) => (
              <div
                key={d.departamento || "Sem departamento"}
                className="rounded-2xl border border-zinc-200 bg-white p-3"
              >
                <div className="mb-1 flex justify-between text-sm">
                  <b>{d.departamento || "Sem departamento"}</b>
                  <span>{d.total}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className="h-full rounded-full bg-sky-500"
                    style={{
                      width: `${Math.max(5, (d.total / Math.max(1, dashboard.totalChamados)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h3 className="mb-4 flex items-center gap-2 font-black">
            <AlertTriangle size={18} />
            Chamados vencidos recentes
          </h3>
          <div className="space-y-2">
            {chamados
              .filter((c) => c.vencido)
              .slice(0, 8)
              .map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="flex w-full items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-left text-red-800"
                >
                  <span className="min-w-0">
                    <b className="block truncate">
                      {c.numero_chamado || `#${c.id}`}
                    </b>
                    <span className="line-clamp-1 text-sm">{c.titulo}</span>
                  </span>
                  <span className="text-xs font-black">
                    {formatarMinutos(c.sla_minutos_restantes)}
                  </span>
                </button>
              ))}
            {chamados.filter((c) => c.vencido).length === 0 && (
              <p className="rounded-2xl border border-dashed border-zinc-200 p-6 text-center text-sm text-zinc-500">
                Nenhum chamado vencido agora.
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

// Visão consolidada do chamado com histórico, anexos e ações autorizadas.
function ChamadoDetalhe({
  chamado,
  usuario,
  equipe = [],
  respostasRapidas = [],
  onAssumir,
  onClose,
  onRefresh,
  somenteLeitura = false,
}: {
  chamado: ApiChamado;
  usuario: UsuarioLogado;
  equipe?: ApiUsuario[];
  respostasRapidas?: RespostaRapida[];
  onAssumir?: (id: number) => Promise<void>;
  onClose: () => void;
  onRefresh: () => Promise<void>;
  somenteLeitura?: boolean;
}) {
  const [mensagem, setMensagem] = useState("");
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [previewsAnexos, setPreviewsAnexos] = useState<Record<number, string>>({});
  const arquivoInputRef = useRef<HTMLInputElement>(null);
  const arquivosComPrevia = useMemo(
    () => arquivos.map((arquivo) => ({
      arquivo,
      url: arquivo.type.startsWith("image/") ? URL.createObjectURL(arquivo) : "",
    })),
    [arquivos],
  );
  useEffect(
    () => () => arquivosComPrevia.forEach(({ url }) => url && URL.revokeObjectURL(url)),
    [arquivosComPrevia],
  );
  useEffect(() => {
    let ativo = true;
    const urls: string[] = [];
    const anexosImagem = (chamado.anexos || []).filter((anexo) =>
      String(anexo.mime_type || "").startsWith("image/") || /\.(png|jpe?g|webp)$/i.test(anexo.nome_original || ""),
    );
    Promise.all(anexosImagem.map(async (anexo) => {
      try {
        const blob = await obterBlobAnexoChamado(chamado.id, anexo);
        const url = URL.createObjectURL(blob);
        urls.push(url);
        return [anexo.id, url] as const;
      } catch {
        return null;
      }
    })).then((items) => {
      if (ativo) setPreviewsAnexos(Object.fromEntries(items.filter(Boolean) as Array<readonly [number, string]>));
    });
    return () => {
      ativo = false;
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [chamado.id, chamado.anexos]);
  const [motivoReabrir, setMotivoReabrir] = useState("");
  const [mostrarIA, setMostrarIA] = useState(false);
  const [mostrarHistorico, setMostrarHistorico] = useState(false);
  const [edit, setEdit] = useState({
    status: chamado.status,
    prioridade: chamado.prioridade,
    responsavel_id: String(chamado.responsavel_id || ""),
    prioridade_manual_motivo: "",
  });
  const isEquipe = !somenteLeitura && isEquipeApp(usuario.perfil);
  const isDev = isDevApp(usuario.perfil);
  const isAdmin = isAdminApp(usuario.perfil);
  const podeGerenciar =
    !somenteLeitura &&
    (isAdmin || Number(chamado.responsavel_id) === Number(usuario.id));
  const concluido = [
    "Concluido",
    "Concluído",
    "Resolvido",
    "Cancelado",
  ].includes(chamado.status);
  const slaTexto = concluido
    ? "SLA encerrado"
    : chamado.sla_status === "pausado"
      ? "SLA pausado · aguardando usuário"
      : chamado.vencido
      ? `Vencido há ${formatarMinutos(Math.abs(Number(chamado.sla_minutos_restantes || 0)))}`
      : chamado.sla_minutos_restantes != null
        ? formatarMinutos(chamado.sla_minutos_restantes)
        : "SLA não calculado";

  async function enviarComentario(event: FormEvent) {
    event.preventDefault();
    if (!mensagem.trim()) return;
    await adicionarComentario(chamado.id, mensagem);
    setMensagem("");
    await onRefresh();
  }
  async function upload(event: FormEvent) {
    event.preventDefault();
    if (!arquivos.length) return;
    await anexarArquivos(chamado.id, arquivos);
    setArquivos([]);
    if (arquivoInputRef.current) arquivoInputRef.current.value = "";
    await onRefresh();
  }
  async function reabrir(event: FormEvent) {
    event.preventDefault();
    await reabrirChamado(chamado.id, motivoReabrir);
    toast.success("Chamado reaberto.");
    await onRefresh();
  }
  async function salvarAdmin(event: FormEvent) {
    event.preventDefault();
    await atualizarChamado(chamado.id, {
      status: edit.status,
      prioridade: edit.prioridade,
      ...(isAdmin && edit.responsavel_id
        ? { responsavel_id: Number(edit.responsavel_id) }
        : {}),
      prioridade_manual_motivo: edit.prioridade_manual_motivo,
    } as Partial<ApiChamado>);
    toast.success("Chamado atualizado.");
    await onRefresh();
  }

  return (
    <Modal
      title={`${chamado.numero_chamado || `#${chamado.id}`} · ${chamado.titulo}`}
      onClose={onClose}
      wide
      readOnly={somenteLeitura}
    >
      {somenteLeitura && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700">
          <LockKeyhole size={18} />
          <div className="min-w-0 flex-1">
            <b className="block text-sm">
              Registro histórico — somente leitura
            </b>
            <span className="text-xs">
              As informações, mensagens, anexos e movimentações não podem ser
              modificados nesta tela.
            </span>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="shrink-0"
            onClick={() => baixarHistoricoChamadoPdf(chamado).catch((error) => toast.error(error.message))}
          >
            <Download size={16} />
            Baixar PDF
          </Button>
        </div>
      )}
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <Card className="overflow-hidden !p-0">
            <div className="border-b border-zinc-100 bg-zinc-50/70 px-5 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={statusClass(chamado.status)}>
                  {ticketStatusLabel(chamado.status)}
                </Badge>
                <Badge className={prioridadeClass(chamado.prioridade)}>
                  {chamado.prioridade}
                </Badge>
                <span
                  className={`ml-auto inline-flex items-center gap-1.5 text-xs font-black ${chamado.vencido ? "text-red-600" : concluido ? "text-zinc-500" : "text-emerald-600"}`}
                >
                  <Clock3 size={14} />
                  {slaTexto}
                </span>
              </div>
            </div>
            <div className="p-5">
              <p className="whitespace-pre-wrap text-[15px] leading-7 text-zinc-700">
                {chamado.descricao}
              </p>
              <div className="mt-5 grid gap-x-6 gap-y-4 border-t border-zinc-100 pt-5 text-sm sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <span className="block text-[10px] font-black uppercase tracking-wider text-zinc-400">
                    Solicitante
                  </span>
                  <b className="mt-1 block text-zinc-800">
                    {chamado.solicitante}
                  </b>
                </div>
                <div>
                  <span className="block text-[10px] font-black uppercase tracking-wider text-zinc-400">
                    Departamento
                  </span>
                  <b className="mt-1 block text-zinc-800">
                    {chamado.setor || "Não informado"}
                  </b>
                </div>
                <div>
                  <span className="block text-[10px] font-black uppercase tracking-wider text-zinc-400">Origem do solicitante / área</span>
                  <b className="mt-1 block text-zinc-800">{[chamado.municipio_solicitante,chamado.unidade_solicitante].filter(Boolean).join(" · ")||"Não informada"}</b>
                </div>
                <div>
                  <span className="block text-[10px] font-black uppercase tracking-wider text-zinc-400">Local do atendimento</span>
                  <b className="mt-1 block text-zinc-800">{[chamado.ativo_municipio||chamado.municipio_solicitante,chamado.ativo_unidade||chamado.unidade_solicitante].filter(Boolean).join(" · ")||"Não informado"}</b>
                </div>
                {chamado.ativo_id&&<div>
                  <span className="block text-[10px] font-black uppercase tracking-wider text-zinc-400">Ativo / máquina</span>
                  <b className="mt-1 block text-emerald-700">{chamado.ativo_hostname||"Ativo"} · {chamado.ativo_patrimonio||`#${chamado.ativo_id}`}</b>
                </div>}
                <div>
                  <span className="block text-[10px] font-black uppercase tracking-wider text-zinc-400">
                    Tipo
                  </span>
                  <b className="mt-1 block text-zinc-800">
                    {chamado.tipo_chamado}
                  </b>
                </div>
                <div>
                  <span className="block text-[10px] font-black uppercase tracking-wider text-zinc-400">
                    Categoria
                  </span>
                  <b className="mt-1 block text-zinc-800">
                    {chamado.categoria_ia || "Não classificada"}
                  </b>
                </div>
                <div>
                  <span className="block text-[10px] font-black uppercase tracking-wider text-zinc-400">
                    Responsável
                  </span>
                  <span className="mt-1 flex items-center gap-2 font-bold text-zinc-800">
                    <ResponsavelAvatar chamado={chamado} size="sm" />
                    {nomeResponsavelChamado(chamado) || "Não definido"}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-black uppercase tracking-wider text-zinc-400">
                    Aberto em
                  </span>
                  <b className="mt-1 block text-zinc-800">
                    {formatDate(chamado.criado_em)}
                  </b>
                </div>
              </div>
            </div>
          </Card>
          <Card className="!p-0">
            <button
              type="button"
              onClick={() => setMostrarIA((value) => !value)}
              className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-zinc-50"
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-50 text-violet-600">
                <BrainCircuit size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <b className="block text-sm text-zinc-900">Análise da IA</b>
                <span className="block truncate text-xs text-zinc-500">
                  Prioridade sugerida:{" "}
                  {chamado.prioridade_ia || chamado.prioridade}
                </span>
              </span>
              <span className="text-xs font-bold text-zinc-400">
                {mostrarIA ? "Recolher" : "Ver análise"}
              </span>
            </button>
            {mostrarIA && (
              <div className="space-y-3 border-t border-zinc-100 px-5 py-4 text-sm leading-6 text-zinc-600">
                <p>
                  <b className="text-zinc-800">Motivo:</b>{" "}
                  {chamado.prioridade_ia_motivo || "Não disponível"}
                </p>
                <p>
                  <b className="text-zinc-800">Responsável sugerido:</b>{" "}
                  {chamado.ia_responsavel_sugerido || "Não sugerido"}
                </p>
                <div className="rounded-xl bg-zinc-50 p-3">
                  <b className="text-zinc-800">Resposta sugerida:</b>
                  <p className="mt-1">
                    {chamado.ia_resposta_inicial || "Não disponível"}
                  </p>
                </div>
                {chamado.ia_duplicidade_motivo && (
                  <p className="rounded-xl bg-amber-50 p-3 text-amber-800">
                    <b>Possível duplicidade:</b> {chamado.ia_duplicidade_motivo}
                  </p>
                )}
              </div>
            )}
          </Card>
          <Card>
            <h3 className="mb-3 flex items-center gap-2 font-black">
              <MessageSquare size={18} />
              Chat do chamado
            </h3>
            <div className="mb-4 space-y-3">
              {chamado.comentarios?.length ? (
                chamado.comentarios.map((c) => {
                  const atendimento = c.autor_perfil !== "usuario";
                  return (
                    <div
                      key={c.id}
                      className={`flex gap-3 ${atendimento ? "justify-end" : "justify-start"}`}
                    >
                      <span
                        className={`grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full text-xs font-black ${atendimento ? "order-2 bg-blue-600 text-white" : "bg-zinc-200 text-zinc-700"}`}
                      >
                        {c.foto_url ? (
                          <img
                            src={c.foto_url}
                            alt={c.autor_nome || "Participante"}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          iniciaisPessoa(c.autor_nome)
                        )}
                      </span>
                      <div
                        className={`max-w-[82%] rounded-2xl px-4 py-3 shadow-sm ${atendimento ? "rounded-tr-md bg-blue-600 text-white" : "rounded-tl-md bg-zinc-100 text-zinc-800"}`}
                      >
                        <p
                          className={`text-xs font-black ${atendimento ? "text-blue-50" : "text-zinc-700"}`}
                        >
                          {c.autor_nome}{" "}
                          <span
                            className={
                              atendimento
                                ? "font-normal text-blue-100"
                                : "font-normal text-zinc-400"
                            }
                          >
                            • {formatDate(c.criado_em)}
                          </span>
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-6">
                          {c.mensagem}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="rounded-2xl border border-dashed border-zinc-200 p-6 text-center text-sm text-zinc-500">
                  Nenhuma mensagem ainda.
                </p>
              )}
            </div>
            {isEquipe && respostasRapidas.length > 0 && (
              <div className="mb-3">
                <p className="mb-2 text-xs font-black uppercase tracking-wide text-zinc-500">
                  Respostas rápidas
                </p>
                <div className="flex flex-wrap gap-2">
                  {respostasRapidas.slice(0, 8).map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setMensagem(r.mensagem)}
                      className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-black text-blue-700 hover:bg-blue-100"
                    >
                      {r.categoria ? `${r.categoria}: ` : ""}
                      {r.titulo}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <form onSubmit={enviarComentario} className="flex gap-2">
              <Input
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                placeholder="Escreva uma resposta..."
              />
              <Button>Enviar</Button>
            </form>
          </Card>
          <Card>
            <h3 className="mb-3 flex items-center gap-2 font-black">
              <History size={18} />
              Histórico / auditoria do chamado
            </h3>
            <div className="space-y-2">
              {chamado.movimentacoes?.map((m) => (
                <div
                  key={m.id}
                  className="rounded-xl border border-zinc-100 p-3 text-sm"
                >
                  <p>
                    <b>{m.tipo}</b> • {formatDate(m.criado_em)}
                  </p>
                  <p className="text-zinc-600">{m.descricao}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
        <aside className="space-y-5">
          {podeGerenciar && (
            <Card>
              <h3 className="mb-3 font-black">Ações do suporte</h3>
              <form onSubmit={salvarAdmin} className="space-y-3">
                <Field label="Status">
                  <Select
                    value={edit.status}
                    onChange={(e) =>
                      setEdit({ ...edit, status: e.target.value })
                    }
                  >
                    {STATUS_OPCOES.map((s) => (
                        <option key={s} value={s}>{ticketStatusLabel(s)}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Prioridade final">
                  <Select
                    value={edit.prioridade}
                    onChange={(e) =>
                      setEdit({ ...edit, prioridade: e.target.value })
                    }
                  >
                    {PRIORIDADES.map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Motivo da alteração manual">
                  <Textarea
                    value={edit.prioridade_manual_motivo}
                    onChange={(e) =>
                      setEdit({
                        ...edit,
                        prioridade_manual_motivo: e.target.value,
                      })
                    }
                  />
                </Field>
                {isAdmin && (
                  <Field label="Técnico responsável">
                    <Select
                      value={edit.responsavel_id}
                      onChange={(e) =>
                        setEdit({ ...edit, responsavel_id: e.target.value })
                      }
                    >
                      <option value="">Sem responsável</option>
                      {equipe.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nome} - {u.departamento}
                        </option>
                      ))}
                    </Select>
                  </Field>
                )}
                {!chamado.responsavel_id && onAssumir && (
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full"
                    onClick={() => onAssumir(chamado.id)}
                  >
                    Assumir chamado
                  </Button>
                )}
                <Button className="w-full">Salvar alterações</Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={async () => {
                    await encerrarChamado(chamado.id);
                    await onRefresh();
                  }}
                >
                  Finalizar chamado
                </Button>
              </form>
            </Card>
          )}
          <Card>
            <h3 className="mb-3 flex items-center gap-2 font-black">
              <Paperclip size={18} />
              Anexos
            </h3>
            <div className="mb-3 space-y-2">
              {chamado.anexos?.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => baixarAnexoChamado(chamado.id, a).catch((error) => toast.error(error.message))}
                  className="block w-full overflow-hidden rounded-xl border text-left text-sm transition hover:border-blue-300 hover:bg-zinc-50"
                >
                  {previewsAnexos[a.id] && (
                    <img
                      src={previewsAnexos[a.id]}
                      alt={`Prévia de ${a.nome_original}`}
                      className="h-40 w-full border-b bg-white object-contain"
                    />
                  )}
                  <span className="block p-3">
                    <FileText className="mr-2 inline" size={16} />
                    {a.nome_original}
                  </span>
                </button>
              ))}
            </div>
            <form onSubmit={upload} className="space-y-3">
              <input
                ref={arquivoInputRef}
                type="file"
                multiple
                accept="image/png,image/jpeg,image/webp,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
                onClick={(e) => { e.currentTarget.value = ""; }}
                onChange={(e) => setArquivos(Array.from(e.target.files || []).slice(0, 5))}
                className="block w-full cursor-pointer rounded-xl border border-zinc-200 bg-white text-sm file:mr-3 file:border-0 file:bg-zinc-100 file:px-3 file:py-3 file:text-xs file:font-black hover:border-blue-300"
              />
              {arquivosComPrevia.length > 0 && (
                <div className="grid gap-2 sm:grid-cols-2">
                  {arquivosComPrevia.map(({ arquivo, url }, index) => (
                    <div key={`${arquivo.name}-${arquivo.lastModified}-${index}`} className="relative overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
                      {url ? (
                        <img src={url} alt={`Prévia de ${arquivo.name}`} className="h-28 w-full bg-white object-contain" />
                      ) : (
                        <div className="grid h-20 place-items-center text-zinc-400"><FileText size={28} /></div>
                      )}
                      <div className="min-w-0 border-t border-zinc-200 p-2 pr-9">
                        <p className="truncate text-xs font-bold" title={arquivo.name}>{arquivo.name}</p>
                        <p className="mt-0.5 text-[10px] text-zinc-500">{(arquivo.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <button type="button" onClick={() => setArquivos((atuais) => atuais.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remover ${arquivo.name}`} className="absolute bottom-2 right-2 grid h-7 w-7 place-items-center rounded-lg bg-red-50 text-red-600 transition hover:bg-red-100"><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
              <Button className="w-full" disabled={!arquivos.length}>
                <Upload size={16} />
                {arquivos.length ? `Anexar ${arquivos.length} arquivo${arquivos.length > 1 ? "s" : ""}` : "Anexar"}
              </Button>
            </form>
          </Card>
          {concluido && chamado.pode_avaliar && !chamado.avaliacao && (
            <Card>
              <h3 className="mb-3 flex items-center gap-2 font-black">
                <Star size={18} />
                Avalie este atendimento
              </h3>
              <PerformanceRatingCard chamado={chamado} onSubmit={async (dados) => { await enviarAvaliacaoPerformance(chamado.id, dados); toast.success("Avaliação enviada."); await onRefresh(); }} />
            </Card>
          )}
          {concluido && chamado.avaliacao && (
            <Card>
              <div className="flex items-center gap-3 text-emerald-700"><CheckCircle2 size={20} /><div><b className="block text-sm">Atendimento avaliado</b><span className="text-xs">Obrigado por compartilhar sua experiência.</span></div></div>
            </Card>
          )}
          {concluido && (
            <Card>
              <h3 className="mb-3 flex items-center gap-2 font-black">
                <RotateCcw size={18} />
                Reabrir chamado
              </h3>
              <form onSubmit={reabrir} className="space-y-3">
                <Textarea
                  value={motivoReabrir}
                  onChange={(e) => setMotivoReabrir(e.target.value)}
                  placeholder="Explique por que o problema não foi resolvido"
                />
                <Button variant="secondary" className="w-full">
                  Reabrir
                </Button>
              </form>
            </Card>
          )}
        </aside>
      </div>
    </Modal>
  );
}
