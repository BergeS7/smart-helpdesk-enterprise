/**
 * Responsabilidade: Componente de interface de device diagnostics; apresenta dados e interações do usuário.
 */
import { Activity, Cpu, HardDrive, History, Laptop, MapPin, MemoryStick, RefreshCw, ShieldCheck, Ticket, X } from "lucide-react";
import type { ReactNode } from "react";
import type { Device } from "../../types/device";
import { AssetInventoryPanel } from "./AssetInventoryPanel";

export function DeviceDiagnostics({device,onClose,onRefresh,onAction,refreshing}:{device:Device;onClose:()=>void;onRefresh:()=>void;onAction:(type:string,device:Device)=>void;refreshing?:boolean}){
 const communication=device.communicationStatus==="recent"?"Recente":device.communicationStatus==="attention"?"Atenção":"Sem comunicação";
 return <div className="fixed inset-0 z-[2000] grid bg-slate-950/45 p-0 backdrop-blur-sm sm:p-5" role="dialog" aria-modal="true" aria-label={`Diagnóstico de ${device.hostname}`}>
  <div className="m-auto flex max-h-screen w-full max-w-[1180px] flex-col overflow-hidden bg-[#f4f7fb] shadow-2xl sm:max-h-[calc(100vh-40px)] sm:rounded-3xl">
   <header className="flex shrink-0 items-center gap-3 border-b bg-white px-4 py-3 sm:px-5"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-white"><ShieldCheck size={21}/></span><div className="min-w-0 flex-1"><h1 className="truncate font-black text-slate-900">Diagnóstico · {device.hostname}</h1><p className="truncate text-xs text-slate-500">{device.patrimonio} · {device.municipio} / {device.unidade}</p></div><button onClick={onRefresh} disabled={refreshing} className="flex h-9 items-center gap-2 rounded-xl bg-blue-600 px-3 text-xs font-black text-white disabled:opacity-60"><RefreshCw size={14} className={refreshing?"animate-spin":""}/><span className="hidden sm:inline">Atualizar</span></button><button onClick={onClose} aria-label="Fechar" className="grid h-9 w-9 place-items-center rounded-xl border bg-white"><X size={18}/></button></header>
   <main className="space-y-3 overflow-y-auto p-3 sm:p-4"><section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4"><Summary icon={<Laptop/>} label="Equipamento" value={[device.fabricante,device.modelo].filter(Boolean).join(" ")||device.hostname} detail={device.serialNumber||device.patrimonio}/><Summary icon={<Activity/>} label="Comunicação" value={communication} detail={new Date(device.ultimoHeartbeat).toLocaleString("pt-BR")}/><Summary icon={<HardDrive/>} label="Sistema" value={device.sistemaOperacional} detail={device.osBuild?`Build ${device.osBuild}`:device.processador}/><Summary icon={<MapPin/>} label="Localidade" value={device.municipio} detail={device.unidade}/></section>
    <section className="grid gap-2 sm:grid-cols-3"><Metric icon={<Cpu/>} label="CPU" value={device.cpuUsage}/><Metric icon={<MemoryStick/>} label="Memória" value={device.ramUsage}/><Metric icon={<HardDrive/>} label="Disco" value={device.diskUsage}/></section>
    <AssetInventoryPanel device={device}/>
    <section className="grid gap-2 sm:grid-cols-3"><Action icon={<History/>} label="Histórico" onClick={()=>onAction("historico",device)}/><Action primary icon={<Ticket/>} label="Abrir chamado" onClick={()=>onAction("chamado",device)}/><Action icon={<RefreshCw/>} label="Consultar servidor" onClick={onRefresh}/></section>
    <p className="pb-1 text-center text-[10px] text-slate-400">Coleta técnica autorizada; não inclui arquivos, senhas, áudio, câmera, navegação ou GPS.</p>
   </main>
  </div>
 </div>
}
function Summary({icon,label,value,detail}:{icon:ReactNode;label:string;value:string;detail:string}){return <div className="flex min-w-0 items-center gap-3 rounded-xl border bg-white p-3"><span className="text-blue-600">{icon}</span><div className="min-w-0"><small className="block font-black uppercase tracking-wide text-slate-400">{label}</small><b className="block truncate text-sm">{value}</b><span className="block truncate text-[11px] text-slate-500">{detail}</span></div></div>}
function Metric({icon,label,value}:{icon:ReactNode;label:string;value:number}){const tone=value>=85?"bg-red-500":value>=70?"bg-amber-500":"bg-emerald-500";return <div className="rounded-xl border bg-white p-3"><div className="flex items-center gap-2 text-sm"><span className="text-blue-600">{icon}</span><b className="flex-1">{label}</b><strong>{Math.round(value)}%</strong></div><div className="mt-2 h-1.5 overflow-hidden rounded bg-slate-100"><div className={`h-full rounded ${tone}`} style={{width:`${Math.min(100,value)}%`}}/></div></div>}
function Action({icon,label,onClick,primary}:{icon:ReactNode;label:string;onClick:()=>void;primary?:boolean}){return <button onClick={onClick} className={`flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-black ${primary?"bg-blue-600 text-white":"border bg-white text-slate-700"}`}>{icon}{label}</button>}
