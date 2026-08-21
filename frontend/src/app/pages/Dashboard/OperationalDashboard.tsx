import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Download,
  Expand,
  MonitorCheck,
  MonitorX,
  RefreshCw,
  Star,
  Ticket,
  TrendingDown,
  TrendingUp,
  UserCog,
  Users,
} from "lucide-react";
import { obterDashboard, type DashboardResumo } from "../../services/api";
import { isFinalTicketStatus, ticketStatusLabel } from "../../domain/ticketStatus";

type Props = {
  initial: DashboardResumo;
  dark: boolean;
  onNavigate: (tab: "fila" | "chamados" | "patrimonio" | "carteira" | "satisfacao") => void;
  onOpenTicket: (id: number) => void;
};

type DashboardTab = Parameters<Props["onNavigate"]>[0];

const isClosed = isFinalTicketStatus;

export function OperationalDashboard({ initial, dark, onNavigate, onOpenTicket }: Props) {
  const [data, setData] = useState(initial);
  const [period, setPeriod] = useState(() => Number(localStorage.getItem("dashboard-period") || 7));
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const root = useRef<HTMLDivElement>(null);

  async function reload(nextPeriod = period) {
    setLoading(true);
    try {
      setData(await obterDashboard(nextPeriod));
      setLastUpdate(new Date());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    localStorage.setItem("dashboard-period", String(period));
    reload(period);
  }, [period]);

  useEffect(() => {
    const timer = window.setInterval(() => reload(), 60_000);
    return () => window.clearInterval(timer);
  }, [period]);

  const trend = useMemo(() => {
    const current = Number(data.comparativo?.atual || 0);
    const previous = Number(data.comparativo?.anterior || 0);
    return previous ? Math.round(((current - previous) / previous) * 100) : current ? 100 : 0;
  }, [data]);

  const urgent = (data.chamadosRecentes || [])
    .filter((ticket) => !isClosed(ticket.status) && (ticket.vencido || ["Crítica", "Critica", "Alta"].includes(ticket.prioridade || "") || !ticket.responsavel_id))
    .slice(0, 5);

  const slaCompliance = Math.max(0, Math.min(100, Math.round((1 - Number(data.vencidos || 0) / Math.max(1, Number(data.abertos || 0))) * 100)));
  const onlineRate = Math.round(Number(data.ativos?.online || 0) / Math.max(1, Number(data.ativos?.total || 0)) * 100);
  const panel = dark ? "border-white/10 bg-slate-900 text-white" : "border-slate-200/80 bg-white text-slate-950";
  const muted = dark ? "text-slate-400" : "text-slate-500";

  const cards = [
    { label: "Chamados abertos", value: data.abertos, icon: Ticket, tone: "blue", tab: "fila" as DashboardTab, hint: `${signed(trend)}% no período` },
    { label: "Sem responsável", value: data.semResponsavel || 0, icon: UserCog, tone: "violet", tab: "fila" as DashboardTab, hint: "Aguardando delegação" },
    { label: "SLA em risco", value: data.slaEmRisco || 0, icon: Clock3, tone: "amber", tab: "chamados" as DashboardTab, hint: "Vencem em até 4 horas" },
    { label: "SLA vencido", value: data.vencidos, icon: AlertTriangle, tone: "red", tab: "chamados" as DashboardTab, hint: "Fora do prazo" },
    { label: "Ativos offline", value: data.ativos?.offline || 0, icon: MonitorX, tone: "rose", tab: "patrimonio" as DashboardTab, hint: `${data.ativos?.online || 0} dispositivos online` },
    { label: "Satisfação", value: data.satisfacaoMedia ? `${data.satisfacaoMedia}/5` : "—", icon: Star, tone: "emerald", tab: "chamados" as DashboardTab, hint: `${data.avaliacoesTotal || 0} avaliações recebidas` },
  ];

  function exportCsv() {
    const rows = [["Indicador", "Valor"], ...cards.map((card) => [card.label, String(card.value)])];
    const blob = new Blob(["\ufeff" + rows.map((row) => row.join(";")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `dashboard-${period}-dias.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return <div ref={root} className={`ds-page dashboard-modern space-y-5 ${dark ? "text-white" : "text-slate-950"}`}>
    <section className={`relative overflow-hidden rounded-3xl border p-5 shadow-sm sm:p-6 ${dark ? "border-blue-400/20 bg-gradient-to-r from-slate-900 to-slate-950" : "border-blue-100 bg-gradient-to-r from-blue-50 via-white to-indigo-50"}`}>
      <div className="absolute -right-14 -top-20 h-52 w-52 rounded-full bg-blue-500/10" />
      <div className="relative flex flex-wrap items-center gap-4">
        <div className="mr-auto">
          <div className="mb-2 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Operação em tempo real
            </span>
          </div>
          <h2 className="text-xl font-black tracking-tight sm:text-2xl">Visão operacional</h2>
          <p className={`mt-1 text-xs ${muted}`}>Decisões rápidas sobre chamados, equipe, SLA e ativos.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={period} onChange={(event) => setPeriod(Number(event.target.value))} className={`h-10 rounded-xl border px-3 text-xs font-extrabold outline-none ${dark ? "border-white/10 bg-white/5 text-white" : "border-slate-200 bg-white text-slate-700"}`}>
            <option value={1}>Hoje</option><option value={7}>7 dias</option><option value={30}>30 dias</option><option value={90}>90 dias</option>
          </select>
          <ActionButton title="Atualizar" onClick={() => reload()} dark={dark}><RefreshCw size={16} className={loading ? "animate-spin" : ""} /></ActionButton>
          <ActionButton title="Exportar CSV" onClick={exportCsv} dark={dark} wide><Download size={15} /> Exportar</ActionButton>
          <button onClick={() => root.current?.requestFullscreen()} className="grid h-10 w-10 place-items-center rounded-xl bg-slate-950 text-white shadow-sm transition hover:bg-blue-600" title="Modo TV"><Expand size={16} /></button>
        </div>
      </div>
      <p className={`relative mt-4 text-[10px] font-semibold ${muted}`}>Atualizado às {lastUpdate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
    </section>

    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
      {cards.map((card) => <MetricCard key={card.label} {...card} dark={dark} onClick={() => onNavigate(card.label === "Satisfação" ? "satisfacao" : card.tab)} />)}
    </section>

    <section className="grid grid-cols-12 gap-5">
      <div className={`col-span-12 rounded-3xl border p-5 shadow-sm xl:col-span-8 ${panel}`}>
        <div className="flex items-start justify-between gap-3">
          <div><h3 className="font-black">Fluxo de chamados</h3><p className={`mt-1 text-xs ${muted}`}>Recebidos e resolvidos no período selecionado</p></div>
          <Trend value={trend} />
        </div>
        <div className="mt-5 h-72"><FlowChart items={data.evolucao || []} dark={dark}/></div>
        <div className={`mt-2 flex flex-wrap gap-5 text-[11px] font-bold ${muted}`}><Legend color="bg-blue-600" label="Recebidos"/><Legend color="bg-emerald-500" label="Resolvidos"/></div>
      </div>

      <div className="col-span-12 grid gap-5 sm:grid-cols-2 xl:col-span-4 xl:grid-cols-1">
        <section className={`rounded-3xl border p-5 shadow-sm ${panel}`}>
          <div className="flex items-center justify-between"><div><h3 className="font-black">Saúde da operação</h3><p className={`mt-1 text-xs ${muted}`}>Indicadores de eficiência</p></div><CheckCircle2 size={20} className="text-emerald-500"/></div>
          <div className="mt-5 flex flex-col items-center gap-5 min-[430px]:flex-row min-[430px]:items-center">
            <div className="relative grid h-28 w-28 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(#2563eb ${slaCompliance}%, ${dark ? "#1e293b" : "#e2e8f0"} 0)` }}><div className={`grid h-20 w-20 place-items-center rounded-full ${dark ? "bg-slate-900" : "bg-white"}`}><div className="w-16 text-center leading-none"><b className="block text-lg leading-none">{slaCompliance}%</b><span className={`mt-2 block text-[8px] font-extrabold uppercase leading-[1.25] ${muted}`}>Dentro do SLA</span></div></div></div>
            <div className="space-y-3"><MiniStat label="Resposta média" value={formatMinutes(data.tempoMedioRespostaMinutos)}/><MiniStat label="Resolução média" value={formatMinutes(data.tempoMedioResolucaoMinutos)}/><MiniStat label="Ativos disponíveis" value={`${onlineRate}%`}/></div>
          </div>
        </section>

        <section className={`rounded-3xl border p-5 shadow-sm ${panel}`}>
          <div className="flex items-center justify-between"><div><h3 className="font-black">Atenção agora</h3><p className={`mt-1 text-xs ${muted}`}>Itens que exigem ação</p></div><AlertTriangle size={20} className="text-amber-500"/></div>
          <div className="mt-4 space-y-2">
            {urgent.slice(0, 3).map((ticket) => <button key={ticket.id} onClick={() => onOpenTicket(Number(ticket.id))} className={`group w-full rounded-2xl border p-3 text-left transition ${dark ? "border-white/10 hover:border-red-400/40 hover:bg-white/5" : "border-slate-100 hover:border-red-200 hover:bg-red-50/60"}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><b className="block truncate text-xs">{ticket.numero_chamado || `#${ticket.id}`} · {ticket.titulo}</b><p className={`mt-1 truncate text-[10px] ${muted}`}>{ticketStatusLabel(ticket.status)} · {ticket.responsavel || "Sem responsável"}</p></div><span className="shrink-0 rounded-full bg-red-50 px-2 py-1 text-[8px] font-black uppercase text-red-600">{ticket.vencido ? "Vencido" : ticket.prioridade}</span></div></button>)}
            {!urgent.length && <div className={`rounded-2xl border border-dashed p-5 text-center text-xs ${muted}`}><CheckCircle2 className="mx-auto mb-2 text-emerald-500" size={20}/>Nenhuma ocorrência crítica agora.</div>}
          </div>
        </section>
      </div>
    </section>

    <section className={`overflow-hidden rounded-3xl border shadow-sm ${panel}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 px-5 py-4 dark:border-white/10"><div><h3 className="font-black">Chamados recentes</h3><p className={`mt-1 text-xs ${muted}`}>Últimas movimentações registradas</p></div><button onClick={() => onNavigate("chamados")} className="flex items-center gap-1 text-xs font-extrabold text-blue-600 hover:text-blue-700">Ver todos <ArrowUpRight size={14}/></button></div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left">
          <thead className={dark ? "bg-white/[.03]" : "bg-slate-50/80"}><tr className={`text-[9px] font-black uppercase tracking-widest ${muted}`}><th className="px-5 py-3">Chamado</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Prioridade</th><th className="px-4 py-3">Responsável</th><th className="px-5 py-3 text-right">Situação</th></tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">{(data.chamadosRecentes || []).slice(0, 7).map((ticket) => <tr key={ticket.id} onClick={() => onOpenTicket(Number(ticket.id))} className={`cursor-pointer text-xs transition ${dark ? "hover:bg-white/[.03]" : "hover:bg-blue-50/40"}`}><td className="px-5 py-3.5"><b className="block max-w-[300px] truncate">{ticket.numero_chamado || `#${ticket.id}`} · {ticket.titulo}</b><span className={`mt-1 block max-w-[340px] truncate text-[10px] ${muted}`}>{ticket.departamento || ticket.tipo_chamado || "Não informado"}</span></td><td className="px-4 py-3.5"><StatusBadge status={ticket.status || "Não informado"}/></td><td className="px-4 py-3.5"><PriorityBadge priority={ticket.prioridade || "Não informada"}/></td><td className={`px-4 py-3.5 font-semibold ${muted}`}>{ticket.responsavel || "Sem responsável"}</td><td className="px-5 py-3.5 text-right">{ticket.vencido ? <span className="font-black text-red-600">SLA vencido</span> : <span className="font-bold text-emerald-600">No prazo</span>}</td></tr>)}</tbody>
        </table>
      </div>
    </section>

    <section className="grid gap-5 lg:grid-cols-3">
      <Rank title="Carga por técnico" icon={<Users size={17}/>} rows={(data.porTecnico || []).map((item) => ({ label: item.tecnico, value: Number(item.total) }))} onClick={() => onNavigate("carteira")} dark={dark} color="bg-violet-500" />
      <Rank title="Por departamento" icon={<Ticket size={17}/>} rows={data.porDepartamento.map((item) => ({ label: item.departamento, value: Number(item.total) }))} onClick={() => onNavigate("chamados")} dark={dark} color="bg-blue-500" />
      <Rank title="Por prioridade" icon={<AlertTriangle size={17}/>} rows={data.porPrioridade.map((item) => ({ label: item.prioridade, value: Number(item.total) }))} onClick={() => onNavigate("chamados")} dark={dark} color="bg-amber-500" />
    </section>
  </div>;
}

function MetricCard({ label, value, icon: Icon, tone, hint, onClick, dark }: { label: string; value: string | number; icon: typeof Ticket; tone: string; hint: string; onClick: () => void; dark: boolean }) {
  const tones: Record<string, string> = { blue: "bg-blue-50 text-blue-600", violet: "bg-violet-50 text-violet-600", amber: "bg-amber-50 text-amber-600", red: "bg-red-50 text-red-600", rose: "bg-rose-50 text-rose-600", emerald: "bg-emerald-50 text-emerald-600" };
  return <button onClick={onClick} className={`group rounded-2xl border p-4 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg ${dark ? "border-white/10 bg-slate-900" : "border-slate-200/80 bg-white"}`}><div className="flex items-start justify-between"><span className={`grid h-10 w-10 place-items-center rounded-xl ${tones[tone]}`}><Icon size={18}/></span><ArrowUpRight size={15} className="text-slate-300 transition group-hover:text-blue-500"/></div><p className={`mt-4 text-[9px] font-black uppercase tracking-[.12em] ${dark ? "text-slate-400" : "text-slate-500"}`}>{label}</p><b className="mt-1 block text-2xl tracking-tight">{value}</b><small className={`mt-1 block truncate text-[10px] ${dark ? "text-slate-500" : "text-slate-400"}`}>{hint}</small></button>;
}

function ActionButton({ children, title, onClick, dark, wide = false }: { children: ReactNode; title: string; onClick: () => void; dark: boolean; wide?: boolean }) {
  return <button onClick={onClick} title={title} className={`${wide ? "flex px-3" : "grid w-10"} h-10 items-center justify-center gap-2 rounded-xl border text-xs font-extrabold transition ${dark ? "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10" : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:text-blue-600"}`}>{children}</button>;
}

function Trend({ value }: { value: number }) {
  const positive = value >= 0;
  return <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black ${positive ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"}`}>{positive ? <TrendingUp size={14}/> : <TrendingDown size={14}/>} {Math.abs(value)}%</span>;
}

function Legend({ color, label }: { color: string; label: string }) { return <span className="flex items-center gap-2"><i className={`h-2 w-2 rounded-full ${color}`}/>{label}</span>; }
function MiniStat({ label, value }: { label: string; value: string }) { return <div><span className="block text-[9px] font-bold uppercase tracking-wide text-slate-400">{label}</span><b className="mt-0.5 block text-sm">{value}</b></div>; }

function Rank({ title, icon, rows, onClick, dark, color }: { title: string; icon: ReactNode; rows: { label: string; value: number }[]; onClick: () => void; dark: boolean; color: string }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return <button onClick={onClick} className={`rounded-3xl border p-5 text-left shadow-sm transition hover:shadow-md ${dark ? "border-white/10 bg-slate-900" : "border-slate-200/80 bg-white"}`}><h3 className="flex items-center gap-2 font-black">{icon}{title}</h3><div className="mt-5 space-y-4">{rows.slice(0, 5).map((row) => <div key={row.label}><div className={`flex justify-between gap-3 text-xs ${dark ? "text-slate-300" : "text-slate-700"}`}><b className="truncate">{row.label || "Não informado"}</b><span className="font-black">{row.value}</span></div><div className={`mt-2 h-1.5 overflow-hidden rounded-full ${dark ? "bg-white/10" : "bg-slate-100"}`}><div className={`h-full rounded-full ${color}`} style={{ width: `${row.value / max * 100}%` }}/></div></div>)}{!rows.length && <p className="py-5 text-center text-xs text-slate-400">Nenhum dado disponível.</p>}</div></button>;
}

function StatusBadge({ status }: { status: string }) {
  const done = isClosed(status);
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-black ${done ? "bg-emerald-50 text-emerald-700" : status.toLowerCase().includes("andamento") ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600"}`}>{status}</span>;
}

function PriorityBadge({ priority }: { priority: string }) {
  const normalized = priority.toLowerCase();
  const style = normalized.includes("crít") || normalized.includes("crit") ? "bg-red-50 text-red-700" : normalized.includes("alta") ? "bg-orange-50 text-orange-700" : normalized.includes("média") || normalized.includes("media") ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-black ${style}`}>{priority}</span>;
}

function FlowChart({ items, dark }: { items: { data: string; recebidos: number; resolvidos: number }[]; dark: boolean }) {
  if (!items.length) return <div className="grid h-full place-items-center text-xs text-slate-400">Ainda não há dados suficientes para o período.</div>;
  const width = 760, height = 250, left = 34, right = 12, top = 12, bottom = 30;
  const chartWidth = width - left - right, chartHeight = height - top - bottom;
  const max = Math.max(1, ...items.flatMap((item) => [Number(item.recebidos), Number(item.resolvidos)]));
  const x = (index: number) => left + index * (chartWidth / Math.max(1, items.length - 1));
  const y = (value: number) => top + chartHeight - (Number(value) / max) * chartHeight;
  const received = items.map((item, index) => `${index ? "L" : "M"}${x(index)},${y(item.recebidos)}`).join(" ");
  const resolved = items.map((item, index) => `${index ? "L" : "M"}${x(index)},${y(item.resolvidos)}`).join(" ");
  const receivedArea = `${received} L${x(items.length - 1)},${top + chartHeight} L${x(0)},${top + chartHeight} Z`;
  const resolvedArea = `${resolved} L${x(items.length - 1)},${top + chartHeight} L${x(0)},${top + chartHeight} Z`;
  const labelStep = Math.max(1, Math.ceil(items.length / 7));
  return <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" role="img" aria-label="Evolução de chamados recebidos e resolvidos">
    <defs><linearGradient id="dashReceived" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2563eb" stopOpacity=".28"/><stop offset="1" stopColor="#2563eb" stopOpacity="0"/></linearGradient><linearGradient id="dashResolved" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#10b981" stopOpacity=".2"/><stop offset="1" stopColor="#10b981" stopOpacity="0"/></linearGradient></defs>
    {[0, .25, .5, .75, 1].map((ratio) => <g key={ratio}><line x1={left} x2={width - right} y1={top + chartHeight * ratio} y2={top + chartHeight * ratio} stroke={dark ? "#334155" : "#e2e8f0"} strokeDasharray="4 5"/><text x={left - 8} y={top + chartHeight * ratio + 3} textAnchor="end" fontSize="9" fill={dark ? "#94a3b8" : "#64748b"}>{Math.round(max * (1 - ratio))}</text></g>)}
    <path d={receivedArea} fill="url(#dashReceived)"/><path d={resolvedArea} fill="url(#dashResolved)"/>
    <path d={received} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/><path d={resolved} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
    {items.map((item, index) => <g key={item.data}><circle cx={x(index)} cy={y(item.recebidos)} r="3" fill="#2563eb"><title>{shortDate(item.data)}: {item.recebidos} recebidos</title></circle><circle cx={x(index)} cy={y(item.resolvidos)} r="3" fill="#10b981"><title>{shortDate(item.data)}: {item.resolvidos} resolvidos</title></circle>{(index % labelStep === 0 || index === items.length - 1) && <text x={x(index)} y={height - 8} textAnchor="middle" fontSize="9" fill={dark ? "#94a3b8" : "#64748b"}>{shortDate(item.data)}</text>}</g>)}
  </svg>;
}

function formatMinutes(minutes?: number) {
  if (!minutes && minutes !== 0) return "—";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  return rest ? `${hours}h ${rest}min` : `${hours}h`;
}

function shortDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }); }
function signed(value: number) { return value >= 0 ? `+${value}` : String(value); }
