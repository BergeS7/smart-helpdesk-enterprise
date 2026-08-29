/**
 * Responsabilidade: Serviço de domínio de device; concentra regras reutilizáveis fora da camada HTTP.
 */
import { API_URL, getToken } from "./api";
import type { AssetAlert, AssetChange, AssetInventory, AssetSnapshot, Device, DeviceAlert, DeviceHistory, MunicipioSummary } from "../types/device";
async function assetRequest<T>(path: string): Promise<T> { const response=await fetch(`${API_URL}/assets${path}`,{headers:{Authorization:`Bearer ${getToken()||""}`}}); const data=await response.json().catch(()=>null); if(!response.ok) throw new Error(data?.erro||"Erro ao consultar ativos"); return data as T; }
export type AssetLocation={id:number;nome:string;municipio:string;latitude:number;longitude:number;rede_prefixo?:string|null};
async function assetWrite<T>(path:string,method:string,body:unknown):Promise<T>{const response=await fetch(`${API_URL}/assets${path}`,{method,headers:{Authorization:`Bearer ${getToken()||""}`,"Content-Type":"application/json"},body:JSON.stringify(body)});const data=await response.json().catch(()=>null);if(!response.ok)throw new Error(data?.erro||"Erro ao atualizar ativo");return data as T;}
export async function getAssetLocations():Promise<AssetLocation[]>{return assetRequest<AssetLocation[]>("/admin/locations");}
export async function createAgentInvite(validadeHoras=2):Promise<{convite:string;expira_em:string;aviso:string}>{return assetWrite("/admin/invites","POST",{validade_horas:validadeHoras,descricao:"Instalação de computador"});}
export async function updateDeviceLocation(id:string,location:AssetLocation):Promise<Device>{return assetWrite<Device>(`/${id}/location`,"PATCH",{municipio:location.municipio,unidade:location.nome,latitude:location.latitude,longitude:location.longitude});}
export async function updateDeviceStatus(id:string,status:Device["status"]):Promise<Device>{return assetWrite<Device>(`/${id}/status`,"PATCH",{status});}
export async function getDevices(): Promise<Device[]> { return assetRequest<Device[]>(""); }
export async function getDeviceById(id:string):Promise<Device|null>{const rows=await getDevices();return rows.find((d)=>d.id===id)||null;}
export async function getDeviceHistory(id:string):Promise<DeviceHistory[]>{return assetRequest<DeviceHistory[]>(`/${id}/history`);}
export async function getDevice(id:string):Promise<Device>{return assetRequest<Device>(`/${id}`);}
export async function getDeviceInventory(id:string):Promise<AssetInventory|null>{return assetRequest<AssetInventory|null>(`/${id}/inventory`);}
export async function getDeviceChanges(id:string):Promise<AssetChange[]>{return assetRequest<AssetChange[]>(`/${id}/changes`);}
export async function getDeviceSnapshots(id:string):Promise<AssetSnapshot[]>{return assetRequest<AssetSnapshot[]>(`/${id}/snapshots`);}
export async function getDeviceAlerts(id:string):Promise<AssetAlert[]>{return assetRequest<AssetAlert[]>(`/${id}/alerts`);}
export async function acknowledgeDeviceAlert(deviceId:string,alertId:string):Promise<void>{await assetWrite(`/${deviceId}/alerts/${alertId}/acknowledge`,"PATCH",{});}
export async function getMunicipioSummary():Promise<MunicipioSummary[]>{const rows=await getDevices();const map=new Map<string,MunicipioSummary>();rows.forEach((d)=>{const row=map.get(d.municipio)||{municipio:d.municipio,online:0,warning:0,offline:0,total:0};row[d.status]++;row.total++;map.set(d.municipio,row);});return [...map.values()].sort((a,b)=>b.total-a.total);}
export function deriveDeviceAlerts(devices:Device[]):DeviceAlert[]{return devices.flatMap((d)=>{const rows:DeviceAlert[]=[];const add=(suffix:string,tipo:string,severidade:DeviceAlert["severidade"])=>rows.push({id:`${d.id}-${suffix}`,tipo,deviceId:d.id,hostname:d.hostname,municipio:d.municipio,horario:d.ultimoHeartbeat,severidade});if(d.status==="offline")add("offline","Computador diagnosticado como offline","critical");if(d.diskUsage>=85)add("disk","Espaço em disco crítico","critical");if(d.ramUsage>=85)add("ram","Alto uso de memória","warning");if(d.cpuUsage>=85)add("cpu","Alto uso de CPU","warning");if(d.antivirusAtualizado===false)add("av","Antivírus desatualizado","warning");return rows;});}
