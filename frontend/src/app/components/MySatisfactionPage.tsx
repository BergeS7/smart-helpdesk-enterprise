import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Clock3, MessageSquare, ShieldCheck, Star, Target } from "lucide-react";
import { obterMinhaPerformance, type MyPerformanceDashboard } from "../services/api";

const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const minimumSample = 3;

export default function MySatisfactionPage({ dark, onBack }: { dark: boolean; onBack: () => void }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState<MyPerformanceDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => { setLoading(true); setError(""); obterMinhaPerformance(month, year).then(setData).catch((reason) => setError(reason instanceof Error ? reason.message : "Não foi possível carregar sua avaliação.")).finally(() => setLoading(false)); }, [month, year]);

  const panel = dark ? "border-white/10 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-950";
  const card = dark ? "border-white/10 bg-white/[.04]" : "border-slate-200 bg-white";
  const muted = dark ? "text-slate-400" : "text-slate-500";
  const enough = Number(data?.total_ratings || 0) >= minimumSample;

  return <section className={`min-h-[calc(100vh-150px)] overflow-hidden rounded-3xl border shadow-sm ${panel}`}>
    <header className={`flex flex-wrap items-center gap-3 border-b p-5 ${dark ? "border-white/10" : "border-slate-200"}`}>
      <span className="grid h-12 w-12 place-items-center overflow-hidden rounded-full bg-amber-50 text-amber-500">{data?.foto_url?<img src={data.foto_url} alt={data.name||"Técnico"} className="h-full w-full object-cover"/>:<Star size={21}/>}</span>
      <div className="min-w-0 flex-1"><h2 className="text-lg font-black">{data?.name||"Minha avaliação"}</h2><p className={`mt-1 text-xs ${muted}`}>Resultados do período e percepção dos clientes sobre seus atendimentos.</p></div>
      <select value={month} onChange={(event) => setMonth(Number(event.target.value))} className={`h-10 rounded-xl border px-3 text-xs font-bold ${dark ? "border-white/10 bg-slate-900" : "border-slate-200 bg-white"}`}>{months.map((name,index)=><option key={name} value={index+1}>{name}</option>)}</select>
      <select value={year} onChange={(event) => setYear(Number(event.target.value))} className={`h-10 rounded-xl border px-3 text-xs font-bold ${dark ? "border-white/10 bg-slate-900" : "border-slate-200 bg-white"}`}>{[now.getFullYear(),now.getFullYear()-1,now.getFullYear()-2].map((value)=><option key={value}>{value}</option>)}</select>
      <button onClick={onBack} className={`flex h-10 items-center gap-2 rounded-xl border px-3 text-xs font-black ${dark ? "border-white/10 hover:bg-white/10" : "border-slate-200 hover:bg-slate-50"}`}><ArrowLeft size={15}/>Voltar</button>
    </header>
    <div className="p-4 sm:p-6">
      <div className={`flex gap-3 rounded-2xl border p-3 ${dark ? "border-blue-400/20 bg-blue-400/10" : "border-blue-100 bg-blue-50"}`}><ShieldCheck size={18} className="shrink-0 text-blue-600"/><p className={`text-[11px] leading-relaxed ${dark ? "text-blue-200" : "text-blue-800"}`}>As avaliações são anônimas e servem para desenvolvimento profissional. As notas consolidadas aparecem após pelo menos {minimumSample} respostas no período.</p></div>
      {loading && <div className="grid min-h-64 place-items-center"><span className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600"/></div>}
      {!loading && error && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">{error}</div>}
      {!loading && !error && data && <>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <Metric icon={<Star size={17}/>} label="Nota média" value={enough ? `${Number(data.average_rating).toFixed(1)}/5` : "—"} card={card}/>
          <Metric icon={<MessageSquare size={17}/>} label="Avaliações" value={String(data.total_ratings || 0)} card={card}/>
          <Metric icon={<Target size={17}/>} label="NPS interno" value={enough ? Number(data.nps_average).toFixed(1) : "—"} card={card}/>
          <Metric icon={<CheckCircle2 size={17}/>} label="SLA cumprido" value={`${Number(data.sla_rate).toFixed(0)}%`} card={card}/>
          <Metric icon={<Clock3 size={17}/>} label="Chamados concluídos" value={String(data.total_closed_tickets || 0)} card={card}/>
          <Metric icon={<Clock3 size={17}/>} label="Tempo médio de resolução" value={formatDuration(data.average_resolution_time)} card={card}/>
        </div>
        {!enough ? <div className={`mt-5 rounded-2xl border border-dashed p-10 text-center ${card}`}><ShieldCheck className="mx-auto text-amber-500"/><h3 className="mt-3 text-sm font-black">Amostra ainda insuficiente</h3><p className={`mx-auto mt-2 max-w-md text-xs leading-relaxed ${muted}`}>Você possui {data.total_ratings || 0} avaliação(ões) neste período. Os detalhes serão liberados ao atingir {minimumSample}, protegendo o anonimato dos clientes.</p></div> : <>
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <section className={`rounded-2xl border p-5 ${card}`}><h3 className="text-sm font-black">Critérios do atendimento</h3><div className="mt-5 space-y-4"><Criterion label="Cordialidade" value={data.courtesy_rating}/><Criterion label="Comunicação" value={data.communication_rating}/><Criterion label="Solução apresentada" value={data.resolution_rating}/><Criterion label="Agilidade" value={data.speed_rating}/></div></section>
            <section className={`rounded-2xl border p-5 ${card}`}><h3 className="text-sm font-black">Distribuição das notas</h3><div className="mt-5 space-y-3">{[5,4,3,2,1].map((rating)=>{const total=Number(data.rating_distribution.find((item)=>Number(item.rating)===rating)?.total||0);return <div key={rating} className="grid grid-cols-[38px_1fr_30px] items-center gap-2"><span className="flex items-center gap-1 text-[11px] font-bold">{rating}<Star size={10} className="fill-amber-400 text-amber-400"/></span><div className={`h-2 overflow-hidden rounded-full ${dark?"bg-white/10":"bg-slate-100"}`}><div className="h-full rounded-full bg-amber-400" style={{width:`${total/Math.max(1,Number(data.total_ratings))*100}%`}}/></div><span className={`text-right text-[10px] ${muted}`}>{total}</span></div>})}</div></section>
          </div>
          <section className="mt-5"><h3 className="text-sm font-black">Comentários recebidos</h3><p className={`mt-1 text-[11px] ${muted}`}>A identidade de quem avaliou não é exibida.</p><div className="mt-3 grid gap-3 md:grid-cols-2">{data.recent_ratings.filter((item)=>item.comment?.trim()).map((item,index)=><article key={`${item.created_at}-${index}`} className={`rounded-2xl border p-4 ${card}`}><div className="flex items-center justify-between"><span className="flex gap-1">{[1,2,3,4,5].map((star)=><Star key={star} size={12} className={star<=item.overall_rating?"fill-amber-400 text-amber-400":"text-slate-300"}/>)}</span><span className={`text-[9px] ${muted}`}>{new Date(item.created_at).toLocaleDateString("pt-BR")}</span></div><p className={`mt-3 text-xs leading-relaxed ${dark?"text-slate-300":"text-slate-600"}`}>{item.comment}</p><span className={`mt-3 block text-[9px] font-bold uppercase ${muted}`}>Cliente interno anônimo</span></article>)}{!data.recent_ratings.some((item)=>item.comment?.trim())&&<div className={`col-span-2 rounded-2xl border border-dashed p-8 text-center text-xs ${muted}`}>Nenhum comentário neste período.</div>}</div></section>
        </>}
      </>}
    </div>
  </section>;
}

function Metric({icon,label,value,card}:{icon:React.ReactNode;label:string;value:string;card:string}) { return <div className={`rounded-2xl border p-4 ${card}`}><span className="text-amber-500">{icon}</span><b className="mt-3 block text-xl">{value}</b><span className="mt-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</span></div>; }
function Criterion({label,value}:{label:string;value?:number}) { const numeric=Number(value||0);return <div><div className="flex justify-between text-xs font-bold"><span className="text-slate-500">{label}</span><span>{numeric.toFixed(1)}/5</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{width:`${numeric/5*100}%`}}/></div></div>; }

function formatDuration(minutes?:number) { const value=Number(minutes||0);if(!value)return "—";if(value<60)return `${Math.round(value)} min`;const hours=Math.floor(value/60),remaining=Math.round(value%60);return `${hours}h${remaining?` ${remaining}min`:""}`; }
