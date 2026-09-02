import { useEffect, useMemo, useState } from "react";
import { Award, Crown, Medal, MessageSquare, RefreshCw, ShieldCheck, Star, Trophy } from "lucide-react";
import { obterRankingSatisfacao, type PerformanceScore } from "../services/api";

const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const minimumSample = 3;

export default function SatisfactionRankingPage({ dark }: { dark: boolean }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1), [year, setYear] = useState(now.getFullYear());
  const [items, setItems] = useState<PerformanceScore[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState("");
  useEffect(() => { setLoading(true); setError(""); obterRankingSatisfacao(month, year).then(setItems).catch((reason) => setError(reason instanceof Error ? reason.message : "Não foi possível carregar o ranking.")).finally(() => setLoading(false)); }, [month, year]);
  const ranking = useMemo(() => [...items].filter((item) => Number(item.total_ratings) >= minimumSample).sort((a, b) => Number(b.average_rating) - Number(a.average_rating) || Number(b.total_ratings) - Number(a.total_ratings)), [items]);
  const panel = dark ? "border-white/10 bg-[#111827] text-white" : "border-zinc-200 bg-white text-zinc-900", card = dark ? "border-white/10 bg-white/[.04]" : "border-zinc-200 bg-white", muted = dark ? "text-slate-400" : "text-zinc-500";
  const podium = [ranking[1], ranking[0], ranking[2]].filter(Boolean);

  return <section className={`overflow-hidden rounded-3xl border shadow-sm ${panel}`}>
    <header className={`flex flex-wrap items-center gap-3 border-b p-4 sm:p-5 ${dark ? "border-white/10" : "border-zinc-200"}`}>
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-50 text-indigo-700"><Trophy size={21}/></span><div className="min-w-0 flex-1"><h2 className="text-lg font-black">Ranking de satisfação</h2><p className={`mt-0.5 text-xs ${muted}`}>Destaques da equipe segundo as avaliações recebidas.</p></div>
      <div className="flex gap-2"><select aria-label="Mês do ranking" value={month} onChange={(event) => setMonth(Number(event.target.value))} className={`h-9 rounded-lg border px-2.5 text-xs font-bold ${dark ? "border-white/10 bg-slate-900" : "border-zinc-200 bg-white"}`}>{months.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}</select><select aria-label="Ano do ranking" value={year} onChange={(event) => setYear(Number(event.target.value))} className={`h-9 rounded-lg border px-2.5 text-xs font-bold ${dark ? "border-white/10 bg-slate-900" : "border-zinc-200 bg-white"}`}>{[now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2].map((value) => <option key={value}>{value}</option>)}</select></div>
    </header>
    <div className="p-4 sm:p-6">
      {loading && <div className="grid min-h-64 place-items-center"><RefreshCw className="animate-spin text-indigo-600"/></div>}
      {!loading && error && <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">{error}</div>}
      {!loading && !error && !ranking.length && <div className={`rounded-2xl border border-dashed p-12 text-center ${card}`}><Award className="mx-auto text-amber-500"/><h3 className="mt-3 text-sm font-black">Ranking ainda indisponível</h3><p className={`mx-auto mt-2 max-w-md text-xs leading-5 ${muted}`}>Nenhum profissional atingiu a amostra mínima de avaliações neste período.</p></div>}
      {!loading && !error && ranking.length > 0 && <>
        <section className={`relative overflow-hidden rounded-3xl bg-gradient-to-br p-5 text-white sm:p-7 ${dark ? "from-indigo-950 via-indigo-900 to-violet-950" : "from-indigo-700 via-indigo-600 to-violet-600"}`}>
          <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/10"/><div className="relative text-center"><span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.16em]"><Crown size={13}/>Pódio do mês</span><p className="mt-2 text-xs text-white/65">Melhores médias com amostra mínima válida</p></div>
          <div className="relative mx-auto mt-6 grid max-w-3xl grid-cols-3 items-end gap-2 sm:gap-4">{podium.map((item) => { const position = ranking.indexOf(item) + 1, first = position === 1; return <article key={item.technician_id || item.id || item.name} className={`flex flex-col items-center rounded-t-3xl border border-white/15 bg-white/10 px-2 pb-4 text-center backdrop-blur-sm ${first ? "min-h-60 pt-4" : "min-h-48 pt-5"}`}>{first && <Crown size={22} className="mb-2 fill-amber-300 text-amber-300"/>}<span className={`grid place-items-center rounded-full border-4 border-white/30 bg-white font-black text-indigo-700 shadow-xl ${first ? "h-20 w-20 text-xl" : "h-16 w-16 text-base"}`}>{initials(item.name)}</span><b className="mt-3 line-clamp-2 text-sm">{item.name || "Profissional"}</b><span className="mt-1 text-[10px] text-white/60">{item.departamento || "Equipe técnica"}</span><span className="mt-auto pt-3 text-2xl font-black">{position}º</span><span className="mt-1 flex items-center gap-1 text-xs font-black text-amber-200"><Star size={13} className="fill-current"/>{Number(item.average_rating).toFixed(1)}</span></article>; })}</div>
        </section>
        <section className="mt-4"><div className="mb-3 flex items-end justify-between gap-3"><div><h3 className="text-sm font-black">Classificação completa</h3><p className={`mt-0.5 text-[11px] ${muted}`}>{ranking.length} profissional(is) no período</p></div><span className={`flex items-center gap-1.5 text-[10px] ${muted}`}><ShieldCheck size={13} className="text-emerald-600"/>Mínimo de {minimumSample} avaliações</span></div><div className="space-y-2">{ranking.map((item, index) => <article key={item.technician_id || item.id || item.name} className={`grid grid-cols-[42px_44px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border p-3 ${card}`}><span className={`grid h-9 w-9 place-items-center rounded-xl text-xs font-black ${index === 0 ? "bg-amber-100 text-amber-700" : index === 1 ? "bg-slate-200 text-slate-700" : index === 2 ? "bg-orange-100 text-orange-700" : dark ? "bg-white/10 text-slate-300" : "bg-zinc-100 text-zinc-600"}`}>{index < 3 ? <Medal size={16}/> : `${index + 1}º`}</span><span className="grid h-11 w-11 place-items-center rounded-full bg-indigo-50 text-xs font-black text-indigo-700">{initials(item.name)}</span><div className="min-w-0"><b className="block truncate text-sm">{item.name || "Profissional"}</b><span className={`mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] ${muted}`}><span className="flex items-center gap-1"><MessageSquare size={11}/>{item.total_ratings} avaliações</span><span>SLA {Number(item.sla_rate || 0).toFixed(0)}%</span></span></div><span className="flex items-center gap-1 text-base font-black"><Star size={15} className="fill-amber-400 text-amber-400"/>{Number(item.average_rating).toFixed(1)}</span></article>)}</div></section>
      </>}
    </div>
  </section>;
}

function initials(name?: string) { return (name || "?").split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase(); }
