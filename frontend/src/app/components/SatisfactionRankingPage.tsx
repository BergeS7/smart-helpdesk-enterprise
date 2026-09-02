import { useEffect, useMemo, useState } from "react";
import { Award, Medal, RefreshCw, ShieldCheck, Star, Trophy } from "lucide-react";
import { obterRankingSatisfacao, type PerformanceScore } from "../services/api";

const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const minimumSample = 3;

export default function SatisfactionRankingPage({ dark }: { dark: boolean }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [items, setItems] = useState<PerformanceScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    obterRankingSatisfacao(month, year)
      .then(setItems)
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Não foi possível carregar o ranking."))
      .finally(() => setLoading(false));
  }, [month, year]);

  const ranking = useMemo(() => [...items]
    .filter((item) => Number(item.total_ratings) >= minimumSample)
    .sort((a, b) => Number(b.average_rating) - Number(a.average_rating) || Number(b.total_ratings) - Number(a.total_ratings)), [items]);
  const panel = dark ? "border-white/10 bg-[#111827] text-white" : "border-zinc-200 bg-white text-zinc-900";
  const card = dark ? "border-white/10 bg-white/[.04]" : "border-zinc-200 bg-white";
  const muted = dark ? "text-slate-400" : "text-zinc-500";

  return <section className={`overflow-hidden rounded-3xl border shadow-sm ${panel}`}>
    <header className={`flex flex-wrap items-center gap-3 border-b p-5 ${dark ? "border-white/10" : "border-zinc-200"}`}>
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-50 text-amber-600"><Trophy size={22}/></span>
      <div className="min-w-0 flex-1"><h2 className="text-lg font-black">Ranking de satisfação</h2><p className={`mt-1 text-xs ${muted}`}>Reconhecimento da equipe técnica com base nas avaliações dos atendimentos.</p></div>
      <select aria-label="Mês do ranking" value={month} onChange={(event) => setMonth(Number(event.target.value))} className={`h-10 rounded-xl border px-3 text-xs font-bold ${dark ? "border-white/10 bg-slate-900" : "border-zinc-200 bg-white"}`}>{months.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}</select>
      <select aria-label="Ano do ranking" value={year} onChange={(event) => setYear(Number(event.target.value))} className={`h-10 rounded-xl border px-3 text-xs font-bold ${dark ? "border-white/10 bg-slate-900" : "border-zinc-200 bg-white"}`}>{[now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2].map((value) => <option key={value}>{value}</option>)}</select>
    </header>
    <div className="p-4 sm:p-6">
      <div className={`flex gap-3 rounded-2xl border p-4 ${dark ? "border-blue-400/20 bg-blue-400/10" : "border-blue-100 bg-blue-50"}`}><ShieldCheck size={18} className="shrink-0 text-blue-600"/><p className={`text-xs leading-5 ${dark ? "text-blue-200" : "text-blue-800"}`}>O ranking considera somente resultados consolidados com pelo menos {minimumSample} avaliações no período. Comentários e identidades dos avaliadores não são exibidos.</p></div>
      {loading && <div className="grid min-h-64 place-items-center"><RefreshCw className="animate-spin text-blue-600"/></div>}
      {!loading && error && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">{error}</div>}
      {!loading && !error && !ranking.length && <div className={`mt-5 rounded-2xl border border-dashed p-12 text-center ${card}`}><Award className="mx-auto text-amber-500"/><h3 className="mt-3 text-sm font-black">Ranking ainda indisponível</h3><p className={`mx-auto mt-2 max-w-md text-xs leading-5 ${muted}`}>Nenhum profissional atingiu a amostra mínima de avaliações neste período.</p></div>}
      {!loading && !error && ranking.length > 0 && <div className="mt-5 grid gap-3">{ranking.map((item, index) => <article key={item.technician_id || item.id || item.name} className={`flex flex-wrap items-center gap-4 rounded-2xl border p-4 ${card}`}>
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl font-black ${index === 0 ? "bg-amber-100 text-amber-700" : index === 1 ? "bg-slate-200 text-slate-700" : index === 2 ? "bg-orange-100 text-orange-700" : dark ? "bg-white/10 text-slate-300" : "bg-zinc-100 text-zinc-600"}`}>{index < 3 ? <Medal size={19}/> : `${index + 1}º`}</span>
        <div className="min-w-[180px] flex-1"><b className="block truncate text-sm">{item.name || "Profissional"}</b><span className={`mt-1 block truncate text-xs ${muted}`}>{item.departamento || "Equipe técnica"}</span></div>
        <div className="flex min-w-[220px] flex-1 items-center gap-4 sm:justify-end"><span className="text-right"><b className="flex items-center gap-1 text-lg"><Star size={16} className="fill-amber-400 text-amber-400"/>{Number(item.average_rating).toFixed(1)}</b><small className={muted}>de 5</small></span><span className="text-right"><b className="block text-sm">{item.total_ratings}</b><small className={muted}>avaliações</small></span><span className="text-right"><b className="block text-sm">{Number(item.sla_rate || 0).toFixed(0)}%</b><small className={muted}>SLA</small></span></div>
      </article>)}</div>}
    </div>
  </section>;
}
