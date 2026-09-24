/**
 * Responsabilidade: demandas e projetos do módulo de desenvolvimento.
 */
import { request } from "./http";

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
