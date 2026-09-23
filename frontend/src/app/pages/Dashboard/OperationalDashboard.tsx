/**
 * Responsabilidade: Página de operational dashboard; compõe a experiência e os dados desta área do sistema.
 */
import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
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
import { AnimatedValue, CountUp, enter } from "../../components/motion";
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
    <section style={enter(0)} className={`motion-enter relative overflow-hidden rounded-3xl border p-5 shadow-sm sm:p-6 ${dark ? "border-blue-400/20 bg-gradient-to-r from-slate-900 to-slate-950" : "border-blue-100 bg-gradient-to-r from-blue-50 via-white to-indigo-50"}`}>
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
      {cards.map((card, index) => <MetricCard key={card.label} {...card} delay={60 + index * 45} dark={dark} onClick={() => onNavigate(card.label === "Satisfação" ? "satisfacao" : card.tab)} />)}
    </section>

    <section className="grid grid-cols-12 gap-5">
      <div style={enter(280)} className={`motion-enter col-span-12 rounded-3xl border p-5 shadow-sm xl:col-span-8 ${panel}`}>
        <div className="flex items-start justify-between gap-3">
          <div><h3 className="font-black">Fluxo de chamados</h3><p className={`mt-1 text-xs ${muted}`}>Recebidos e resolvidos no período selecionado</p></div>
          <Trend value={trend} />
        </div>
        <FlowSummary items={data.evolucao || []} dark={dark}/>
        <div className="mt-4 h-72"><FlowChart items={data.evolucao || []} dark={dark}/></div>
      </div>

      <div className="col-span-12 grid gap-5 sm:grid-cols-2 xl:col-span-4 xl:grid-cols-1">
        <section style={enter(340)} className={`motion-enter rounded-3xl border p-5 shadow-sm ${panel}`}>
          <div className="flex items-center justify-between"><div><h3 className="font-black">Saúde da operação</h3><p className={`mt-1 text-xs ${muted}`}>Indicadores de eficiência</p></div><CheckCircle2 size={20} className="text-emerald-500"/></div>
          <div className="mt-5 flex flex-col items-center gap-5 min-[430px]:flex-row min-[430px]:items-center">
            <div className="motion-sweep relative grid h-28 w-28 shrink-0 place-items-center rounded-full" style={{ ...enter(500), "--motion-sweep": `${slaCompliance}%`, background: `conic-gradient(#2563eb var(--motion-sweep), ${dark ? "#1e293b" : "#e2e8f0"} 0)` } as CSSProperties}><div className={`grid h-20 w-20 place-items-center rounded-full ${dark ? "bg-slate-900" : "bg-white"}`}><div className="w-16 text-center leading-none"><b className="block text-lg leading-none"><CountUp value={slaCompliance} />%</b><span className={`mt-2 block text-[8px] font-extrabold uppercase leading-[1.25] ${muted}`}>Dentro do SLA</span></div></div></div>
            <div className="space-y-3"><MiniStat label="Resposta média" value={formatMinutes(data.tempoMedioRespostaMinutos)}/><MiniStat label="Resolução média" value={formatMinutes(data.tempoMedioResolucaoMinutos)}/><MiniStat label="Ativos disponíveis" value={`${onlineRate}%`}/></div>
          </div>
        </section>

        <section style={enter(400)} className={`motion-enter rounded-3xl border p-5 shadow-sm ${panel}`}>
          <div className="flex items-center justify-between"><div><h3 className="font-black">Atenção agora</h3><p className={`mt-1 text-xs ${muted}`}>Itens que exigem ação</p></div><AlertTriangle size={20} className="text-amber-500"/></div>
          <div className="mt-4 space-y-2">
            {urgent.slice(0, 3).map((ticket) => <button key={ticket.id} onClick={() => onOpenTicket(Number(ticket.id))} className={`group w-full rounded-2xl border p-3 text-left transition ${dark ? "border-white/10 hover:border-red-400/40 hover:bg-white/5" : "border-slate-100 hover:border-red-200 hover:bg-red-50/60"}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><b className="block truncate text-xs">{ticket.numero_chamado || `#${ticket.id}`} · {ticket.titulo}</b><p className={`mt-1 truncate text-[10px] ${muted}`}>{ticketStatusLabel(ticket.status)} · {ticket.responsavel || "Sem responsável"}</p></div><span className="shrink-0 rounded-full bg-red-50 px-2 py-1 text-[8px] font-black uppercase text-red-600">{ticket.vencido ? "Vencido" : ticket.prioridade}</span></div></button>)}
            {!urgent.length && <div className={`rounded-2xl border border-dashed p-5 text-center text-xs ${muted}`}><CheckCircle2 className="mx-auto mb-2 text-emerald-500" size={20}/>Nenhuma ocorrência crítica agora.</div>}
          </div>
        </section>
      </div>
    </section>

    <section className="grid gap-5 lg:grid-cols-3">
      <Rank title="Carga por técnico" icon={<Users size={17}/>} rows={(data.porTecnico || []).map((item) => ({ label: item.tecnico, value: Number(item.total) }))} onClick={() => onNavigate("carteira")} dark={dark} color="bg-violet-500" delay={460} />
      <Rank title="Por departamento" icon={<Ticket size={17}/>} rows={data.porDepartamento.map((item) => ({ label: item.departamento, value: Number(item.total) }))} onClick={() => onNavigate("chamados")} dark={dark} color="bg-blue-500" delay={520} />
      <Rank title="Por prioridade" icon={<AlertTriangle size={17}/>} rows={data.porPrioridade.map((item) => ({ label: item.prioridade, value: Number(item.total) }))} onClick={() => onNavigate("chamados")} dark={dark} color="bg-amber-500" delay={580} />
    </section>

    <section style={enter(640)} className={`motion-enter overflow-hidden rounded-3xl border shadow-sm ${panel}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 px-5 py-4 dark:border-white/10"><div><h3 className="font-black">Chamados recentes</h3><p className={`mt-1 text-xs ${muted}`}>Últimas movimentações registradas</p></div><button onClick={() => onNavigate("chamados")} className="flex items-center gap-1 text-xs font-extrabold text-blue-600 hover:text-blue-700">Ver todos <ArrowUpRight size={14}/></button></div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left">
          <thead className={dark ? "bg-white/[.03]" : "bg-slate-50/80"}><tr className={`text-[9px] font-black uppercase tracking-widest ${muted}`}><th className="px-5 py-3">Chamado</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Prioridade</th><th className="px-4 py-3">Responsável</th><th className="px-5 py-3 text-right">Situação</th></tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">{(data.chamadosRecentes || []).slice(0, 7).map((ticket) => <tr key={ticket.id} onClick={() => onOpenTicket(Number(ticket.id))} className={`cursor-pointer text-xs transition ${dark ? "hover:bg-white/[.03]" : "hover:bg-blue-50/40"}`}><td className="px-5 py-3.5"><b className="block max-w-[300px] truncate">{ticket.numero_chamado || `#${ticket.id}`} · {ticket.titulo}</b><span className={`mt-1 block max-w-[340px] truncate text-[10px] ${muted}`}>{ticket.departamento || ticket.tipo_chamado || "Não informado"}</span></td><td className="px-4 py-3.5"><StatusBadge status={ticket.status || "Não informado"}/></td><td className="px-4 py-3.5"><PriorityBadge priority={ticket.prioridade || "Não informada"}/></td><td className={`px-4 py-3.5 font-semibold ${muted}`}>{ticket.responsavel || "Sem responsável"}</td><td className="px-5 py-3.5 text-right">{ticket.vencido ? <span className="font-black text-red-600">SLA vencido</span> : <span className="font-bold text-emerald-600">No prazo</span>}</td></tr>)}</tbody>
        </table>
      </div>
    </section>
  </div>;
}

function MetricCard({ label, value, icon: Icon, tone, hint, onClick, dark, delay }: { label: string; value: string | number; icon: typeof Ticket; tone: string; hint: string; onClick: () => void; dark: boolean; delay: number }) {
  const tones: Record<string, string> = { blue: "bg-blue-50 text-blue-600", violet: "bg-violet-50 text-violet-600", amber: "bg-amber-50 text-amber-600", red: "bg-red-50 text-red-600", rose: "bg-rose-50 text-rose-600", emerald: "bg-emerald-50 text-emerald-600" };
  return <button onClick={onClick} style={enter(delay)} className={`motion-enter group rounded-2xl border p-4 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg ${dark ? "border-white/10 bg-slate-900" : "border-slate-200/80 bg-white"}`}><div className="flex items-start justify-between"><span className={`grid h-10 w-10 place-items-center rounded-xl ${tones[tone]}`}><Icon size={18}/></span><ArrowUpRight size={15} className="text-slate-300 transition group-hover:text-blue-500"/></div><p className={`mt-4 text-[9px] font-black uppercase tracking-[.12em] ${dark ? "text-slate-400" : "text-slate-500"}`}>{label}</p><b className="mt-1 block text-2xl tracking-tight"><AnimatedValue value={value} /></b><small className={`mt-1 block truncate text-[10px] ${dark ? "text-slate-500" : "text-slate-400"}`}>{hint}</small></button>;
}

function ActionButton({ children, title, onClick, dark, wide = false }: { children: ReactNode; title: string; onClick: () => void; dark: boolean; wide?: boolean }) {
  return <button onClick={onClick} title={title} className={`${wide ? "flex px-3" : "grid w-10"} h-10 items-center justify-center gap-2 rounded-xl border text-xs font-extrabold transition ${dark ? "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10" : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:text-blue-600"}`}>{children}</button>;
}

function Trend({ value }: { value: number }) {
  const positive = value >= 0;
  return <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black ${positive ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"}`}>{positive ? <TrendingUp size={14}/> : <TrendingDown size={14}/>} {Math.abs(value)}%</span>;
}

function MiniStat({ label, value }: { label: string; value: string }) { return <div><span className="block text-[9px] font-bold uppercase tracking-wide text-slate-400">{label}</span><b className="mt-0.5 block text-sm">{value}</b></div>; }

function Rank({ title, icon, rows, onClick, dark, color, delay }: { title: string; icon: ReactNode; rows: { label: string; value: number }[]; onClick: () => void; dark: boolean; color: string; delay: number }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return <button onClick={onClick} style={enter(delay)} className={`motion-enter rounded-3xl border p-5 text-left shadow-sm transition hover:shadow-md ${dark ? "border-white/10 bg-slate-900" : "border-slate-200/80 bg-white"}`}><h3 className="flex items-center gap-2 font-black">{icon}{title}</h3><div className="mt-5 space-y-4">{rows.slice(0, 5).map((row, index) => <div key={row.label}><div className={`flex justify-between gap-3 text-xs ${dark ? "text-slate-300" : "text-slate-700"}`}><b className="truncate">{row.label || "Não informado"}</b><span className="font-black">{row.value}</span></div><div className={`mt-2 h-1.5 overflow-hidden rounded-full ${dark ? "bg-white/10" : "bg-slate-100"}`}><div className={`motion-bar h-full rounded-full ${color}`} style={{ ...enter(delay + 180 + index * 70), width: `${row.value / max * 100}%` }}/></div></div>)}{!rows.length && <p className="py-5 text-center text-xs text-slate-400">Nenhum dado disponível.</p>}</div></button>;
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

type FlowPoint = { data: string; recebidos: number; resolvidos: number };

// Cores validadas para daltonismo (azul x verde) em cada fundo.
const flowColors = (dark: boolean) => dark
  ? { received: "#3b82f6", resolved: "#12a87a", grid: "#1e293b", axis: "#94a3b8", hover: "rgba(148,163,184,.10)" }
  : { received: "#2563eb", resolved: "#059669", grid: "#eef2f6", axis: "#64748b", hover: "rgba(100,116,139,.08)" };

// A API manda o dia como meia-noite UTC; usar só AAAA-MM-DD evita mostrar o dia anterior no fuso local.
function parseDay(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : new Date(value);
}

// Escala com passos inteiros "redondos" (1, 2, 5, 10...) para o eixo Y.
function niceTicks(max: number) {
  const target = Math.max(1, max);
  const rough = target / 4;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = Math.max(1, [1, 2, 5, 10].map((m) => m * power).find((candidate) => candidate >= rough) || power * 10);
  const top = Math.ceil(target / step) * step;
  return Array.from({ length: top / step + 1 }, (_, index) => index * step);
}

// Coluna com topo arredondado (4px) e base reta, crescendo a partir da linha de base.
function columnPath(x: number, width: number, top: number, baseline: number) {
  const r = Math.min(4, width / 2, (baseline - top) / 2);
  return `M${x},${baseline} V${top + r} Q${x},${top} ${x + r},${top} H${x + width - r} Q${x + width},${top} ${x + width},${top + r} V${baseline} Z`;
}

function Swatch({ color }: { color: string }) {
  return <svg width="10" height="10" aria-hidden="true" className="shrink-0"><rect width="10" height="10" rx="2.5" fill={color} stroke="none" /></svg>;
}

function FlowSummary({ items, dark }: { items: FlowPoint[]; dark: boolean }) {
  const colors = flowColors(dark);
  const received = items.reduce((sum, item) => sum + Number(item.recebidos || 0), 0);
  const resolved = items.reduce((sum, item) => sum + Number(item.resolvidos || 0), 0);
  const rate = received ? Math.round((resolved / received) * 100) : null;
  const tile = `rounded-2xl border px-4 py-3 ${dark ? "border-white/10 bg-white/[.03]" : "border-slate-200/80 bg-slate-50/60"}`;
  const label = `flex items-center gap-2 text-[11px] font-bold ${dark ? "text-slate-400" : "text-slate-500"}`;
  // Também é a legenda: o quadradinho repete a cor de cada coluna do gráfico.
  return <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
    <div className={tile}><span className={label}><Swatch color={colors.received} />Recebidos</span><b className="mt-1 block text-2xl font-black"><CountUp value={received} /></b></div>
    <div className={tile}><span className={label}><Swatch color={colors.resolved} />Resolvidos</span><b className="mt-1 block text-2xl font-black"><CountUp value={resolved} /></b></div>
    <div className={tile}><span className={label}>Pendentes do período</span><b className="mt-1 block text-2xl font-black"><CountUp value={Math.max(0, received - resolved)} /></b></div>
    <div className={tile}><span className={label}>Taxa de resolução</span><b className="mt-1 block text-2xl font-black">{rate === null ? "—" : <><CountUp value={rate} />%</>}</b></div>
  </div>;
}

function FlowChart({ items, dark }: { items: FlowPoint[]; dark: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [active, setActive] = useState<number | null>(null);
  useEffect(() => {
    const element = box.current;
    if (!element) return;
    // Desenha no tamanho real do cartão: textos com 11px e o gráfico ocupa toda a altura.
    const observer = new window.ResizeObserver(([entry]) => setSize({ width: Math.round(entry.contentRect.width), height: Math.round(entry.contentRect.height) }));
    observer.observe(element);
    return () => observer.disconnect();
  }, [items.length > 0]);
  if (!items.length) return <div className="grid h-full place-items-center text-xs text-slate-400">Ainda não há dados suficientes para o período.</div>;

  const colors = flowColors(dark);
  const { width, height } = size;
  const left = 32, right = 8, top = 14, bottom = 28;
  const plotWidth = Math.max(1, width - left - right), plotHeight = Math.max(1, height - top - bottom);
  const ticks = niceTicks(Math.max(...items.flatMap((item) => [Number(item.recebidos), Number(item.resolvidos)])));
  const max = ticks[ticks.length - 1];
  const band = plotWidth / items.length;
  // Colunas finas (até 14px) com 2px de respiro entre recebidos e resolvidos do mesmo dia.
  const barWidth = Math.max(2, Math.min(14, (band - 6) / 2));
  const center = (index: number) => left + band * index + band / 2;
  const y = (value: number) => top + plotHeight - (Number(value) / max) * plotHeight;
  const baseline = top + plotHeight;
  const labelEvery = Math.max(1, Math.ceil(items.length / Math.max(2, Math.floor(plotWidth / 64))));
  const dayLabel = (value: string) => parseDay(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  const current = active === null ? null : items[active];
  // Colunas entram em sequência, em até ~0,6s no total, qualquer que seja o período.
  const columnDelay = (index: number) => enter(320 + index * Math.min(28, 600 / items.length));
  const showLabel = (index: number) => index === items.length - 1 || (index % labelEvery === 0 && items.length - 1 - index >= labelEvery / 2);

  function pick(clientX: number) {
    const rect = box.current?.getBoundingClientRect();
    if (!rect) return;
    setActive(Math.max(0, Math.min(items.length - 1, Math.floor((clientX - rect.left - left) / band))));
  }
  function onKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    setActive((index) => Math.max(0, Math.min(items.length - 1, (index ?? items.length) + (event.key === "ArrowRight" ? 1 : -1))));
  }

  return <div ref={box} className="relative h-full w-full touch-pan-y outline-none" tabIndex={0} onKeyDown={onKey} onBlur={() => setActive(null)}
    onPointerMove={(event) => pick(event.clientX)} onPointerDown={(event) => pick(event.clientX)} onPointerLeave={() => setActive(null)}
    aria-label="Chamados recebidos e resolvidos por dia. Use as setas para percorrer os dias.">
    {width > 0 && <svg width={width} height={height} className="block" aria-hidden="true">
      {/* stroke explícito em tudo: o tema aplica contorno preto ao <svg> e os filhos herdariam. */}
      {active !== null && <rect x={left + band * active} y={top} width={band} height={plotHeight} rx="6" fill={colors.hover} stroke="none"/>}
      {ticks.map((tick) => <g key={tick}>
        <line x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} stroke={colors.grid} strokeWidth="1"/>
        <text x={left - 10} y={y(tick) + 4} textAnchor="end" fontSize="11" fontWeight="600" fill={colors.axis} stroke="none" style={{ fontVariantNumeric: "tabular-nums" }}>{tick}</text>
      </g>)}
      {items.map((item, index) => <g key={item.data}>
        {Number(item.recebidos) > 0 && <path className="motion-column" style={columnDelay(index)} d={columnPath(center(index) - barWidth - 1, barWidth, y(item.recebidos), baseline)} fill={colors.received} stroke="none"/>}
        {Number(item.resolvidos) > 0 && <path className="motion-column" style={columnDelay(index)} d={columnPath(center(index) + 1, barWidth, y(item.resolvidos), baseline)} fill={colors.resolved} stroke="none"/>}
        {showLabel(index) && <text x={center(index)} y={height - 8} textAnchor="middle" fontSize="11" fontWeight="600" fill={colors.axis} stroke="none">{dayLabel(item.data)}</text>}
      </g>)}
    </svg>}
    {current && active !== null && <div className={`pointer-events-none absolute top-1 z-10 min-w-[150px] rounded-xl border px-3 py-2 text-xs shadow-lg ${dark ? "border-white/10 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-950"}`}
      style={center(active) > width / 2 ? { right: width - (left + band * active) + 8 } : { left: left + band * (active + 1) + 8 }}>
      <p className={`mb-1.5 font-bold capitalize ${dark ? "text-slate-400" : "text-slate-500"}`}>{parseDay(current.data).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })}</p>
      <p className="flex items-center gap-2"><Swatch color={colors.received} /><b className="text-sm">{current.recebidos}</b><span className={dark ? "text-slate-400" : "text-slate-500"}>recebidos</span></p>
      <p className="mt-1 flex items-center gap-2"><Swatch color={colors.resolved} /><b className="text-sm">{current.resolvidos}</b><span className={dark ? "text-slate-400" : "text-slate-500"}>resolvidos</span></p>
    </div>}
  </div>;
}

function formatMinutes(minutes?: number) {
  if (!minutes && minutes !== 0) return "—";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  return rest ? `${hours}h ${rest}min` : `${hours}h`;
}

function signed(value: number) { return value >= 0 ? `+${value}` : String(value); }
