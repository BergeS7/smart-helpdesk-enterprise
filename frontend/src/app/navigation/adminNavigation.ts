import { Activity, BarChart3, BookOpen, Headphones, LayoutDashboard, MapPinned, Settings, ShieldCheck, Ticket, Users } from "lucide-react";
import type { PermissionKey } from "../services/api";

export type AdminRouteKey =
  | "dashboard" | "satisfacao" | "fila" | "kanban" | "carteira" | "chamados"
  | "historico" | "usuarios" | "acessos" | "teams" | "catalogos" | "base"
  | "indicadores_operacao" | "indicadores_sla" | "indicadores_tecnicos" | "indicadores_ativos"
  | "relatorios" | "patrimonio" | "diagnostico" | "configuracoes" | "config_sla" | "config_integracoes" | "manutencao";

export const ADMIN_ROUTES: Record<AdminRouteKey, readonly string[]> = {
  dashboard: ["/admin", "/admin/dashboard"],
  fila: ["/admin/atendimento/fila", "/admin/fila"],
  kanban: ["/admin/atendimento/meu-trabalho", "/admin/kanban"],
  chamados: ["/admin/atendimento/todos", "/admin/chamados"],
  historico: ["/admin/atendimento/historico", "/admin/historico"],
  usuarios: ["/admin/equipe/pessoas", "/admin/usuarios"],
  carteira: ["/admin/equipe/carga", "/admin/tecnicos"],
  teams: ["/admin/equipe/grupos", "/admin/equipes"],
  acessos: ["/admin/equipe/acessos"],
  satisfacao: ["/admin/indicadores/satisfacao", "/admin/satisfacao"],
  indicadores_operacao: ["/admin/indicadores/operacao"],
  indicadores_sla: ["/admin/indicadores/sla"],
  indicadores_tecnicos: ["/admin/indicadores/tecnicos"],
  indicadores_ativos: ["/admin/indicadores/ativos"],
  relatorios: ["/admin/indicadores/exportacoes", "/admin/relatorios"],
  base: ["/admin/conhecimento", "/admin/base"],
  patrimonio: ["/admin/ativos/equipamentos", "/admin/ativos"],
  catalogos: ["/admin/configuracoes/catalogos", "/admin/catalogos"],
  configuracoes: ["/admin/configuracoes/sistema", "/admin/configuracoes"],
  config_sla: ["/admin/configuracoes/sla"],
  config_integracoes: ["/admin/configuracoes/integracoes"],
  manutencao: ["/admin/configuracoes/manutencao", "/admin/manutencao"],
  diagnostico: ["/admin/configuracoes/diagnostico", "/admin/diagnostico"],
};

export type NavigationContext = { administrador:boolean; desenvolvedor:boolean; tecnico:boolean; permissions:PermissionKey[] };
export type NavigationArea = { id:string; label:string; title:string; description:string; icon:typeof LayoutDashboard; defaultTab:AdminRouteKey; tabs:AdminRouteKey[]; visible:boolean };

export function buildAdminNavigation(ctx:NavigationContext):NavigationArea[]{
  const reports=ctx.permissions.includes("visualizar_relatorios")||ctx.permissions.includes("baixar_relatorios");
  return [
    {id:"home",label:"Início",title:"Visão operacional",description:"Acompanhe os principais indicadores e prioridades da operação.",icon:LayoutDashboard,defaultTab:"dashboard",tabs:["dashboard"],visible:ctx.permissions.includes("visualizar_dashboard")},
    {id:"service",label:"Atendimento",title:"Central de Atendimento",description:"Organize, distribua e acompanhe os chamados em tempo real.",icon:Headphones,defaultTab:"fila",tabs:["fila","kanban","chamados","historico"],visible:true},
    {id:"team",label:"Equipe",title:"Equipe e Acessos",description:"Gerencie pessoas, capacidade, grupos e permissões de acesso.",icon:Users,defaultTab:"usuarios",tabs:["usuarios","carteira","teams","acessos"],visible:ctx.administrador},
    {id:"analytics",label:"Indicadores",title:"Indicadores",description:"Analise desempenho, SLA, satisfação e evolução do atendimento.",icon:BarChart3,defaultTab:ctx.tecnico?"satisfacao":"indicadores_operacao",tabs:ctx.tecnico?["satisfacao"]:["indicadores_operacao","indicadores_sla","indicadores_tecnicos","satisfacao","indicadores_ativos","relatorios"],visible:reports||ctx.administrador||ctx.tecnico},
    {id:"knowledge",label:"Base",title:"Base de Conhecimento",description:"Centralize orientações e soluções reutilizáveis para a equipe.",icon:BookOpen,defaultTab:"base",tabs:["base"],visible:ctx.permissions.includes("gerenciar_base")},
    {id:"assets",label:"Ativos",title:"Monitoramento de Ativos",description:"Acompanhe equipamentos, disponibilidade e alertas da operação.",icon:MapPinned,defaultTab:"patrimonio",tabs:["patrimonio"],visible:ctx.permissions.includes("visualizar_patrimonio")},
    {id:"admin",label:"Ajustes",title:"Ajustes",description:"Configure regras, catálogos, integrações e serviços do sistema.",icon:Settings,defaultTab:ctx.desenvolvedor?"configuracoes":"catalogos",tabs:ctx.desenvolvedor?["configuracoes","config_sla","catalogos","config_integracoes","manutencao","diagnostico"]:["catalogos"],visible:ctx.administrador||ctx.desenvolvedor},
  ].filter(area=>area.visible);
}

export const TAB_LABELS:Record<AdminRouteKey,string>={
  dashboard:"Início",fila:"Fila",kanban:"Meu trabalho",chamados:"Todos",historico:"Histórico",
  usuarios:"Pessoas",carteira:"Carga da equipe",teams:"Equipes",acessos:"Acessos",
  indicadores_operacao:"Operação",indicadores_sla:"SLA",indicadores_tecnicos:"Técnicos",indicadores_ativos:"Ativos",
  satisfacao:"Satisfação",relatorios:"Exportações",base:"Artigos",patrimonio:"Equipamentos",
  configuracoes:"Sistema",config_sla:"SLA e prioridades",catalogos:"Catálogos",config_integracoes:"Integrações",manutencao:"Manutenção",diagnostico:"Diagnóstico",
};

export const TAB_ICONS:Partial<Record<AdminRouteKey,typeof Ticket>>={fila:Headphones,kanban:Ticket,chamados:Ticket,historico:Activity,usuarios:Users,carteira:Users,teams:Users,acessos:ShieldCheck,relatorios:BarChart3,satisfacao:BarChart3};
