/**
 * Responsabilidade: tipos, constantes, utilitários visuais e módulos sob demanda compartilhados pelo portal e pelo painel da equipe.
 */
import { lazy } from "react";
import type { CSSProperties, ReactNode } from "react";
import { AlertTriangle, Bell, CheckCircle2, CircleDot, PauseCircle, RefreshCw, Settings, UserCog, XCircle } from "lucide-react";
import smartHelpdeskLogo from "../../../assets/smart-helpdesk-logo.png";
import { TICKET_STATUS, canonicalTicketStatus, type TicketStatus } from "../../domain/ticketStatus";
import { type AdminRouteKey } from "../../navigation/adminNavigation";
import { login, API_URL, type ApiAvisoSistema, type ApiChamado, type ApiUsuario, type FiltrosChamados, type ConfiguracoesSistema, type UsuarioLogado } from "../../services/api";

export const PatrimonioMapPage = lazy(() =>
  import("../../pages/PatrimonioMap/PatrimonioMapPage").then((module) => ({
    default: module.PatrimonioMapPage,
  })),
);

export const SatisfactionAnalyticsPage = lazy(() =>
  import("../../components/TeamSatisfactionDrawer").then((module) => ({
    default: module.SatisfactionAnalyticsPage,
  })),
);

export const MySatisfactionPage = lazy(
  () => import("../../components/MySatisfactionPage"),
);

export const SatisfactionRankingPage = lazy(() => import("../../components/SatisfactionRankingPage"));

export const OperationalDashboard = lazy(() => import("../../pages/Dashboard/OperationalDashboard").then(module => ({ default:module.OperationalDashboard })));

export const ReportsWorkspace = lazy(() => import("../../components/ReportsWorkspace").then(module => ({ default:module.ReportsWorkspace })));

export const SettingsWorkspace = lazy(() => import("../../pages/Settings/SettingsWorkspace").then(module => ({ default:module.SettingsWorkspace })));

export const PermissionMatrixPage = lazy(() => import("../../components/PermissionMatrixPage").then(module => ({ default:module.PermissionMatrixPage })));

export const FilaChamadosView = lazy(() => import("../../modules/fila/FilaChamadosView").then(module => ({ default:module.FilaChamadosView })));

export const KanbanWorkspace = lazy(() => import("../../modules/kanban/KanbanWorkspace").then(module => ({ default:module.KanbanWorkspace })));

export const ChamadosListModule = lazy(() => import("../../modules/chamados/ChamadosListModule").then(module => ({ default:module.ChamadosListModule })));

export const UsersModule = lazy(() => import("../../modules/usuarios/UsersModule").then(module => ({ default:module.UsersModule })));

export const IndicatorsWorkspace = lazy(() => import("../../modules/indicadores/IndicatorsWorkspace").then(module => ({ default:module.IndicatorsWorkspace })));

export const DevelopmentWorkspace = lazy(() => import("../../modules/desenvolvimento/DevelopmentWorkspace").then(module => ({ default:module.DevelopmentWorkspace })));

export const SystemDiagnosticsPage = lazy(() =>
  import("../../components/SystemDiagnosticsPage").then((module) => ({ default: module.SystemDiagnosticsPage })),
);

export type LoginMode = "usuario" | "admin";

export type TelaAuth = "login" | "cadastro" | "verificar" | "recuperar";

export type AdminTab = AdminRouteKey;

export type UsuarioTab =
  "home" | "chamados" | "base" | "avisos" | "acessos" | "ranking" | "dashboard" | "patrimonio" | "relatorios";

// Restaura filtros compartilháveis diretamente da URL do navegador.
export function ticketFiltersFromUrl():FiltrosChamados{
  const params=new URLSearchParams(window.location.search),result:FiltrosChamados={};
  const textKeys=(['q','status','prioridade','departamento','municipio','unidade','team_id','usuario','data_inicio','data_fim','responsavel','responsavel_id','tipo_chamado','categoria'] as const);
  textKeys.forEach(key=>{const value=params.get(key);if(value)result[key]=value});
  (['vencidos','sem_responsavel','meus','fila','closed','historico'] as const).forEach(key=>{if(params.get(key)==='true')result[key]=true});
  return result;
}

export type AdminStatus = TicketStatus;

export const STATUS_COLUNAS: {
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

export const STATUS_OPCOES = [
  TICKET_STATUS.OPEN,
  TICKET_STATUS.IN_PROGRESS,
  TICKET_STATUS.WAITING_USER,
  TICKET_STATUS.WAITING_THIRD_PARTY,
  TICKET_STATUS.RESOLVED,
  TICKET_STATUS.CLOSED,
  TICKET_STATUS.CANCELED,
  TICKET_STATUS.REOPENED,
];

export const PRIORIDADES = ["Crítica", "Alta", "Media", "Baixa"];

export const PERFIS = ["usuario", "tecnico", "admin", "desenvolvedor"];

export const PERFIL_LABEL: Record<string, string> = {
  usuario: "Usuário comum",
  tecnico: "Técnico",
  admin: "Administrador",
  desenvolvedor: "Desenvolvedor",
  super_admin: "Desenvolvedor",
};

export function normalizarPerfilApp(perfil?: string) {
  const valor = String(perfil || "usuario")
    .trim()
    .toLowerCase();
  if (["super_admin", "dev", "developer"].includes(valor))
    return "desenvolvedor";
  if (["usuario", "tecnico", "admin", "desenvolvedor"].includes(valor))
    return valor;
  return "usuario";
}

export function perfilLabel(perfil?: string) {
  return PERFIL_LABEL[normalizarPerfilApp(perfil)] || "Usuário comum";
}

export function isEquipeApp(perfil?: string) {
  return ["tecnico", "admin", "desenvolvedor"].includes(
    normalizarPerfilApp(perfil),
  );
}

export function isAdminApp(perfil?: string) {
  return ["admin", "desenvolvedor"].includes(normalizarPerfilApp(perfil));
}

export function isDevApp(perfil?: string) {
  return normalizarPerfilApp(perfil) === "desenvolvedor";
}

export const CONFIG_SISTEMA_PADRAO: ConfiguracoesSistema = {
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

export function valorConfig(
  config: ConfiguracoesSistema | null | undefined,
  chave: string,
  fallback: string,
) {
  const valor = config?.[chave];
  return valor === undefined || valor === null || String(valor).trim() === ""
    ? fallback
    : String(valor);
}

export function nomeSistema(config: ConfiguracoesSistema | null | undefined) {
  return valorConfig(config, "nome_sistema", "Smart HelpDesk");
}

export function emailSuporteSistema(config: ConfiguracoesSistema | null | undefined) {
  return valorConfig(config, "email_suporte", "");
}

export function corPrincipalSistema(config: ConfiguracoesSistema | null | undefined) {
  const cor = valorConfig(config, "cor_principal", "#17a9d4").trim();
  return /^#[0-9a-fA-F]{6}$/.test(cor) ? cor : "#17a9d4";
}

export function ajustarCor(hex: string, amount: number) {
  const cor = corPrincipalSistema({ cor_principal: hex });
  const num = parseInt(cor.slice(1), 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amount));
  const b = Math.max(0, Math.min(255, (num & 0xff) + amount));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export function rgbaHex(hex: string, alpha: number) {
  const cor = corPrincipalSistema({ cor_principal: hex });
  const num = parseInt(cor.slice(1), 16);
  const r = num >> 16;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function resolverLogoUrl(logoBruta: string) {
  const logo = String(logoBruta || "").trim();
  if (!logo) return smartHelpdeskLogo;
  if (/^https?:\/\//i.test(logo) || logo.startsWith("data:")) return logo;
  if (logo.startsWith("/uploads"))
    return `${API_URL.replace(/\/api\/?$/, "")}${logo}`;
  return logo;
}

export function logoSistema1(config: ConfiguracoesSistema | null | undefined) {
  return resolverLogoUrl(
    valorConfig(config, "logo_1_url", valorConfig(config, "logo_url", "")),
  );
}

export function logoSistema(config: ConfiguracoesSistema | null | undefined) {
  return logoSistema1(config);
}

export function variaveisTemaSistema(
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
export function SystemThemeStyle() {
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

export function formatDate(value?: string | null) {
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

export function prioridadeClass(p?: string) {
  if (p === "Crítica" || p === "Critica")
    return "border-rose-300 bg-rose-600 text-white shadow-sm shadow-rose-200";
  if (p === "Alta") return "border-red-200 bg-red-50 text-red-700";
  if (p === "Baixa") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

export function statusClass(status?: string) {
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

export function slaBadgeClass(status?: string) {
  if (status === "vencido") return "border-red-200 bg-red-50 text-red-700";
  if (status === "alerta") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

export function formatarMinutos(minutos?: number | null) {
  if (minutos === null || minutos === undefined) return "-";
  const abs = Math.abs(minutos);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const texto = h > 0 ? `${h}h ${m}min` : `${m}min`;
  return minutos < 0 ? `Vencido há ${texto}` : `${texto} restantes`;
}

export function notificacaoClass(tipo?: string) {
  if (tipo === "success")
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (tipo === "warning") return "border-amber-200 bg-amber-50 text-amber-700";
  if (tipo === "error" || tipo === "danger")
    return "border-red-200 bg-red-50 text-red-700";
  return "border-blue-200 bg-blue-50 text-blue-700";
}

export function notificacaoIcone(tipo?: string) {
  if (tipo === "success") return <CheckCircle2 size={16} />;
  if (tipo === "warning") return <AlertTriangle size={16} />;
  if (tipo === "error" || tipo === "danger") return <XCircle size={16} />;
  return <Bell size={16} />;
}

export function chamadoIdFromNotification(link?: string | null) {
  const match = String(link || "").match(/\/chamados\/(\d+)/);
  return match ? Number(match[1]) : null;
}

export function normalizeStatus(status?: string): AdminStatus {
  const canonical = canonicalTicketStatus(status);
  if (canonical === TICKET_STATUS.RESOLVED || canonical === TICKET_STATUS.CANCELED) return TICKET_STATUS.CLOSED;
  if (canonical === TICKET_STATUS.WAITING_THIRD_PARTY) return TICKET_STATUS.WAITING_USER;
  return canonical;
}

export function iniciaisPessoa(nome?: string | null) {
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

export function nomeSolicitanteChamado(chamado: ApiChamado) {
  return (
    chamado.solicitante_nome ||
    chamado.solicitante ||
    chamado.email_solicitante ||
    "Solicitante"
  );
}

export function SolicitanteAvatar({
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

export function nomeResponsavelChamado(chamado: ApiChamado) {
  return chamado.responsavel_nome || chamado.responsavel || "";
}

export function ResponsavelAvatar({
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

export function UsuarioSistemaAvatar({
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

export function AvisosSistemaBanner({
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
