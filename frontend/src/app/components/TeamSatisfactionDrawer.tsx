import { useEffect, useMemo, useState } from "react";
import {
  Award,
  Download,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Search,
  ShieldCheck,
  Star,
  Users,
  X,
} from "lucide-react";
import {
  obterDashboardPerformance,
  type PerformanceCompanyDashboard,
  type PerformanceScore,
} from "../services/api";

type Props = {
  open: boolean;
  onClose: () => void;
  dark: boolean;
  variant?: "drawer" | "page";
};
const minimumSample = 3;
const months = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export function TeamSatisfactionDrawer({
  open,
  onClose,
  dark,
  variant = "drawer",
}: Props) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [query, setQuery] = useState("");
  const [technicianPage, setTechnicianPage] = useState(0);
  const [data, setData] = useState<PerformanceCompanyDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError("");
    obterDashboardPerformance(month, year)
      .then(setData)
      .catch((reason) =>
        setError(
          reason instanceof Error
            ? reason.message
            : "Não foi possível carregar as avaliações.",
        ),
      )
      .finally(() => setLoading(false));
  }, [open, month, year]);

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open, onClose]);

  const technicians = useMemo(
    () =>
      (data?.technicians || []).filter((item) =>
        (item.name || "").toLowerCase().includes(query.toLowerCase()),
      ),
    [data, query],
  );
  const page = variant === "page";
  const eligible = (data?.technicians || []).filter(
    (item) => Number(item.total_ratings) >= minimumSample,
  );
  const pageSize=5,technicianPages=Math.max(1,Math.ceil(technicians.length/pageSize));
  const visibleTechnicians=page?technicians.slice(technicianPage*pageSize,(technicianPage+1)*pageSize):technicians;
  const panel = dark
    ? "border-white/10 bg-slate-950 text-white"
    : "border-slate-200 bg-white text-slate-950";
  const card = dark
    ? "border-white/10 bg-white/[.04]"
    : "border-slate-200 bg-white";
  const muted = dark ? "text-slate-400" : "text-slate-500";

  function exportCsv() {
    const rows = [
      [
        "Técnico",
        "Nota média",
        "Avaliações",
        "NPS",
        "SLA",
        "Cordialidade",
        "Comunicação",
        "Solução",
        "Agilidade",
      ],
      ...eligible.map((item) => [
        item.name || "Não informado",
        item.average_rating,
        item.total_ratings,
        item.nps_average,
        item.sla_rate,
        item.courtesy_rating || 0,
        item.communication_rating || 0,
        item.resolution_rating || 0,
        item.speed_rating || 0,
      ]),
    ];
    const csv =
      "\ufeff" +
      rows
        .map((row) =>
          row
            .map((value) => `"${String(value).replaceAll('"', '""')}"`)
            .join(";"),
        )
        .join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `satisfacao-tecnicos-${year}-${String(month).padStart(2, "0")}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (!open) return null;
  return (
    <div
      className={page ? "relative" : "fixed inset-0 z-[160] flex justify-end"}
      role={page ? undefined : "dialog"}
      aria-modal={page ? undefined : "true"}
      aria-labelledby="satisfaction-title"
    >
      {!page && (
        <button
          className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]"
          onClick={onClose}
          aria-label="Fechar painel"
        />
      )}
      <aside
        className={`${page ? "satisfaction-page flex h-[calc(100vh-137px)] min-h-0 w-full flex-col overflow-hidden border" : "relative flex h-full w-full max-w-[760px] flex-col border-l shadow-2xl"} ${panel}`}
      >
        <header
          className={`flex items-center gap-3 border-b ${page?"px-4 py-2.5":"p-5 sm:p-6"} ${dark ? "border-white/10" : "border-slate-200"}`}
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
            <Star size={21} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="satisfaction-title" className="text-lg font-black">
              Satisfação da equipe
            </h2>
            <p className={`mt-1 text-xs ${muted}`}>
              Percepção dos clientes internos por técnico.
            </p>
          </div>
          {page&&data&&<div className="hidden items-center gap-4 2xl:flex"><HeaderMetric value={data.company.total_ratings?`${Number(data.company.average_rating).toFixed(1)}/5`:"—"} label="Nota"/><HeaderMetric value={String(data.company.total_ratings||0)} label="Avaliações"/><HeaderMetric value={data.company.total_ratings?Number(data.company.nps_average).toFixed(1):"—"} label="NPS"/><HeaderMetric value={String(eligible.length)} label="Técnicos"/></div>}
          {page&&<div className="ml-auto flex min-w-0 items-center gap-2"><label className="ds-search hidden h-9 w-48 items-center gap-2 px-3 xl:flex"><Search size={14}/><input value={query} onChange={event=>{setQuery(event.target.value);setTechnicianPage(0)}} placeholder="Buscar técnico" className="min-w-0 flex-1 bg-transparent text-xs outline-none"/></label><select value={month} onChange={event=>{setMonth(Number(event.target.value));setTechnicianPage(0)}} className="h-9 w-28 border px-2 text-xs font-bold">{months.map((name,index)=><option key={name} value={index+1}>{name}</option>)}</select><select value={year} onChange={event=>setYear(Number(event.target.value))} className="h-9 w-20 border px-2 text-xs font-bold">{[now.getFullYear(),now.getFullYear()-1,now.getFullYear()-2].map(value=><option key={value}>{value}</option>)}</select><button onClick={exportCsv} disabled={!eligible.length} className="ds-button ds-button--secondary !min-h-9 gap-1 !px-3"><Download size={14}/>CSV</button></div>}
          <button
            onClick={onClose}
            className={`flex h-10 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-black ${dark ? "border-white/10 hover:bg-white/10" : "border-slate-200 hover:bg-slate-50"}`}
          >
            <X size={16} />
            {page ? <span className="hidden xl:inline">Voltar</span> : ""}
          </button>
        </header>

        <div className={`${page?"satisfaction-content min-h-0 flex-1 overflow-hidden p-3":"flex-1 overflow-y-auto p-4 sm:p-6"}`}>
          {!page&&<div className="satisfaction-filters grid gap-2 sm:grid-cols-[1fr_150px_110px_auto]">
            <label
              className={`ds-search flex h-10 items-center gap-2 rounded-xl border px-3 ${dark ? "border-white/10 bg-white/5" : "border-slate-200 bg-white"}`}
            >
              <Search size={15} className={muted} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar técnico..."
                className="min-w-0 flex-1 bg-transparent text-xs outline-none"
              />
            </label>
            <select
              value={month}
              onChange={(event) => setMonth(Number(event.target.value))}
              className={`h-10 rounded-xl border px-3 text-xs font-bold ${dark ? "border-white/10 bg-slate-900" : "border-slate-200 bg-white"}`}
            >
              {months.map((name, index) => (
                <option key={name} value={index + 1}>
                  {name}
                </option>
              ))}
            </select>
            <select
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
              className={`h-10 rounded-xl border px-3 text-xs font-bold ${dark ? "border-white/10 bg-slate-900" : "border-slate-200 bg-white"}`}
            >
              {[
                now.getFullYear(),
                now.getFullYear() - 1,
                now.getFullYear() - 2,
              ].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
            <button
              onClick={exportCsv}
              disabled={!eligible.length}
              className="flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 text-xs font-black text-white disabled:opacity-40"
            >
              <Download size={15} /> CSV
            </button>
          </div>}

          <div
            className={`satisfaction-privacy ${page?"":"mt-4"} flex items-center gap-3 rounded-2xl border px-3 py-2 ${dark ? "border-blue-400/20 bg-blue-400/10" : "border-blue-100 bg-blue-50"}`}
          >
            <ShieldCheck size={18} className="shrink-0 text-blue-600" />
            <p
              className={`text-[11px] leading-relaxed ${dark ? "text-blue-200" : "text-blue-800"}`}
            >
              <b>Privacidade aplicada:</b> notas comparativas aparecem somente
              após {minimumSample} avaliações. Comentários são exibidos sem
              identificar o colaborador.
            </p>
          </div>

          {loading && (
            <div className="grid min-h-64 place-items-center">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
            </div>
          )}
          {!loading && error && (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}
          {!loading && !error && data && (
            <>
              {!page&&<section className="satisfaction-summary mt-5 grid gap-2 sm:grid-cols-4">
                <Summary
                  label="Nota geral"
                  value={
                    data.company.total_ratings
                      ? `${Number(data.company.average_rating).toFixed(1)}/5`
                      : "—"
                  }
                  icon={<Star size={16} />}
                  card={card}
                />
                <Summary
                  label="Avaliações"
                  value={String(data.company.total_ratings || 0)}
                  icon={<MessageSquare size={16} />}
                  card={card}
                />
                <Summary
                  label="NPS interno"
                  value={
                    data.company.total_ratings
                      ? Number(data.company.nps_average).toFixed(1)
                      : "—"
                  }
                  icon={<Users size={16} />}
                  card={card}
                />
                <Summary
                  label="Técnicos avaliados"
                  value={String(eligible.length)}
                  icon={<ShieldCheck size={16} />}
                  card={card}
                />
              </section>}

              <section className={`satisfaction-distribution rounded-2xl border p-3 ${card} ${page?"":"mt-5"}`}>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black">Distribuição das notas</h3>
                  <span className={`text-[10px] font-bold ${muted}`}>
                    {data.company.total_ratings || 0} respostas
                  </span>
                </div>
                <div className="mt-4 space-y-2">
                  {[5, 4, 3, 2, 1].map((rating) => {
                    const total = Number(
                      data.rating_distribution.find(
                        (item) => Number(item.rating) === rating,
                      )?.total || 0,
                    );
                    const width =
                      (total /
                        Math.max(1, Number(data.company.total_ratings))) *
                      100;
                    return (
                      <div
                        key={rating}
                        className="grid grid-cols-[38px_1fr_30px] items-center gap-2"
                      >
                        <span className="flex items-center gap-1 text-[11px] font-bold">
                          {rating}
                          <Star
                            size={10}
                            className="fill-amber-400 text-amber-400"
                          />
                        </span>
                        <div
                          className={`h-2 overflow-hidden rounded-full ${dark ? "bg-white/10" : "bg-slate-100"}`}
                        >
                          <div
                            className="h-full rounded-full bg-amber-400"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                        <span className={`text-right text-[10px] ${muted}`}>
                          {total}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className={`satisfaction-ranking min-h-0 ${page?"":"mt-5"}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black">
                      Satisfação por técnico
                    </h3>
                    <p className={`mt-1 text-[11px] ${muted}`}>
                      A nota nunca deve ser analisada sem considerar a amostra.
                    </p>
                  </div>
                  <div className="flex items-center gap-2"><span className={`text-[10px] font-bold ${muted}`}>{technicians.length} técnico(s)</span>{page&&technicianPages>1&&<><button className="grid h-7 w-7 place-items-center border" disabled={technicianPage===0} onClick={()=>setTechnicianPage(value=>Math.max(0,value-1))}><ChevronLeft size={14}/></button><span className="text-[10px] font-bold">{technicianPage+1}/{technicianPages}</span><button className="grid h-7 w-7 place-items-center border" disabled={technicianPage>=technicianPages-1} onClick={()=>setTechnicianPage(value=>Math.min(technicianPages-1,value+1))}><ChevronRight size={14}/></button></>}</div>
                </div>
                <div className={`mt-3 space-y-2 ${page?"satisfaction-ranking-list overflow-y-auto pr-1":""}`}>
                  {visibleTechnicians.map((technician) => (
                    <TechnicianCard
                      key={technician.technician_id || technician.name}
                      technician={technician}
                      dark={dark}
                      rank={Number(technician.position || (data.technicians.indexOf(technician) + 1))}
                      compact={page}
                    />
                  ))}
                  {!technicians.length && (
                    <div
                      className={`rounded-2xl border border-dashed p-8 text-center text-xs ${muted}`}
                    >
                      Nenhum técnico encontrado neste período.
                    </div>
                  )}
                </div>
              </section>

              <section className={`satisfaction-comments min-h-0 ${page?"":"mt-6"}`}>
                <h3 className="text-sm font-black">Comentários recentes</h3>
                <p className={`mt-1 text-[11px] ${muted}`}>
                  Identidade do cliente interno ocultada.
                </p>
                <div className={`mt-3 grid gap-2 ${page?"satisfaction-comments-list overflow-y-auto":"sm:grid-cols-2"}`}>
                  {data.recent_comments
                    .filter((item) => item.comment?.trim())
                    .map((item, index) => (
                      <article
                        key={`${item.created_at}-${index}`}
                        className={`rounded-2xl border p-4 ${card}`}
                      >
                        <div className="flex items-center justify-between">
                          <Sentiment value={item.sentiment} />
                          <span className={`text-[9px] ${muted}`}>
                            {new Date(item.created_at).toLocaleDateString(
                              "pt-BR",
                            )}
                          </span>
                        </div>
                        <p
                          className={`mt-3 line-clamp-4 text-xs leading-relaxed ${dark ? "text-slate-300" : "text-slate-600"}`}
                        >
                          {cleanComment(item.comment)}
                        </p>
                        <span
                          className={`mt-3 block text-[9px] font-bold uppercase ${muted}`}
                        >
                          Cliente interno anônimo
                        </span>
                      </article>
                    ))}
                  {!data.recent_comments.some((item) =>
                    item.comment?.trim(),
                  ) && (
                    <div
                      className={`col-span-2 rounded-2xl border border-dashed p-8 text-center text-xs ${muted}`}
                    >
                      Nenhum comentário neste período.
                    </div>
                  )}
                </div>
              </section>

              {!page && <FullAnalysis data={data} dark={dark} card={card} muted={muted}/>}
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

export function SatisfactionAnalyticsPage({
  dark,
  onBack,
}: {
  dark: boolean;
  onBack: () => void;
}) {
  return (
    <TeamSatisfactionDrawer open onClose={onBack} dark={dark} variant="page" />
  );
}

function FullAnalysis({
  data,
  dark,
  card,
  muted,
}: {
  data: PerformanceCompanyDashboard;
  dark: boolean;
  card: string;
  muted: string;
}) {
  const eligible = data.technicians.filter(
    (item) => Number(item.total_ratings) >= minimumSample,
  );
  const attention = eligible.filter(
    (item) =>
      Number(item.average_rating) < 4 ||
      Number(item.nps_average) < 7 ||
      Number(item.sla_rate) < 85,
  );
  return (
    <>
      <section className="mt-6 grid gap-5 lg:grid-cols-2">
        <div className={`rounded-2xl border p-5 ${card}`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black">Desempenho por equipe</h3>
              <p className={`mt-1 text-[11px] ${muted}`}>
                Satisfação combinada com eficiência operacional.
              </p>
            </div>
            <Users size={18} className="text-violet-500" />
          </div>
          <div className="mt-4 space-y-3">
            {data.teams.slice(0, 8).map((team) => (
              <div
                key={team.team_id || team.name}
                className={`rounded-xl border p-3 ${dark ? "border-white/10" : "border-slate-100"}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <b className="block truncate text-xs">
                      {team.name || "Equipe não informada"}
                    </b>
                    <span className={`mt-1 block text-[9px] ${muted}`}>
                      {team.total_ratings} avaliações ·{" "}
                      {team.total_closed_tickets} resolvidos
                    </span>
                  </div>
                  <div className="text-right">
                    <b className="text-sm">
                      {Number(team.total_ratings) >= minimumSample
                        ? `${Number(team.average_rating).toFixed(1)}/5`
                        : "—"}
                    </b>
                    <span className={`block text-[9px] ${muted}`}>
                      SLA {Number(team.sla_rate).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {!data.teams.length && (
              <p className={`py-8 text-center text-xs ${muted}`}>
                Nenhuma equipe avaliada no período.
              </p>
            )}
          </div>
        </div>
        <div className={`rounded-2xl border p-5 ${card}`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black">Pontos de atenção</h3>
              <p className={`mt-1 text-[11px] ${muted}`}>
                Sinais que merecem acompanhamento, não punição.
              </p>
            </div>
            <ShieldCheck size={18} className="text-amber-500" />
          </div>
          <div className="mt-4 space-y-3">
            {attention.map((item) => (
              <div
                key={item.technician_id || item.name}
                className={`rounded-xl border p-3 ${dark ? "border-amber-400/20 bg-amber-400/5" : "border-amber-100 bg-amber-50/50"}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <b className="truncate text-xs">{item.name}</b>
                  <span className="rounded-full bg-amber-100 px-2 py-1 text-[8px] font-black uppercase text-amber-700">
                    Acompanhar
                  </span>
                </div>
                <p className={`mt-2 text-[10px] ${muted}`}>
                  {Number(item.average_rating) < 4
                    ? `Nota ${Number(item.average_rating).toFixed(1)} · `
                    : ""}
                  {Number(item.nps_average) < 7
                    ? `NPS ${Number(item.nps_average).toFixed(1)} · `
                    : ""}
                  SLA {Number(item.sla_rate).toFixed(0)}%
                </p>
              </div>
            ))}
            {!attention.length && (
              <div
                className={`rounded-xl border border-dashed p-8 text-center text-xs ${muted}`}
              >
                Nenhum indicador abaixo dos parâmetros de acompanhamento.
              </div>
            )}
          </div>
        </div>
      </section>
      <section className="mt-5 grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
        <div className={`rounded-2xl border p-5 ${card}`}>
          <h3 className="text-sm font-black">Temas recorrentes</h3>
          <p className={`mt-1 text-[11px] ${muted}`}>
            Palavras mais frequentes nos comentários do período.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {data.keywords.map((item, index) => (
              <span
                key={item.keyword}
                className={`rounded-full border px-3 py-1.5 font-bold ${dark ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-50"}`}
                style={{ fontSize: `${Math.max(10, 15 - index * 0.35)}px` }}
              >
                {item.keyword} <small className={muted}>{item.total}</small>
              </span>
            ))}
            {!data.keywords.length && (
              <p className={`py-6 text-xs ${muted}`}>
                Ainda não há comentários suficientes para identificar temas.
              </p>
            )}
          </div>
        </div>
        <div className={`rounded-2xl border p-5 ${card}`}>
          <h3 className="text-sm font-black">Metodologia</h3>
          <div
            className={`mt-4 space-y-3 text-[11px] leading-relaxed ${muted}`}
          >
            <p>
              <b className={dark ? "text-white" : "text-slate-800"}>
                Nota geral:
              </b>{" "}
              média das avaliações de 1 a 5 após o encerramento.
            </p>
            <p>
              <b className={dark ? "text-white" : "text-slate-800"}>
                NPS interno:
              </b>{" "}
              intenção de recomendar o atendimento, de 0 a 10.
            </p>
            <p>
              <b className={dark ? "text-white" : "text-slate-800"}>
                Amostra mínima:
              </b>{" "}
              três respostas antes de qualquer comparação individual.
            </p>
            <p>
              <b className={dark ? "text-white" : "text-slate-800"}>
                Uso recomendado:
              </b>{" "}
              desenvolvimento da equipe junto com SLA, complexidade e volume
              atendido.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

function Summary({
  label,
  value,
  icon,
  card,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  card: string;
}) {
  return (
    <div className={`rounded-2xl border p-4 ${card}`}>
      <span className="text-emerald-600">{icon}</span>
      <b className="mt-3 block text-xl">{value}</b>
      <span className="mt-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </span>
    </div>
  );
}

function HeaderMetric({value,label}:{value:string;label:string}) { return <div className="min-w-16 border-l pl-4"><b className="block text-base leading-none">{value}</b><span className="mt-1 block text-[9px] font-bold uppercase text-slate-500">{label}</span></div>; }

function TechnicianCard({
  technician,
  dark,
  rank,
  compact=false,
}: {
  technician: PerformanceScore;
  dark: boolean;
  rank: number;
  compact?: boolean;
}) {
  const enough = Number(technician.total_ratings) >= minimumSample;
  const muted = dark ? "text-slate-400" : "text-slate-500";
  if(compact)return <CompactTechnicianRow technician={technician} rank={rank} dark={dark}/>;
  return (
    <article
      className={`rounded-2xl border p-4 ${dark ? "border-white/10 bg-white/[.03]" : "border-slate-200 bg-white"}`}
    >
      <div className="flex flex-wrap items-start gap-3">
        <span className={`inline-flex h-8 min-w-10 shrink-0 items-center justify-center gap-1 rounded-full px-2 text-xs font-black ${rank===1?"bg-amber-100 text-amber-700":rank===2?"bg-slate-200 text-slate-700":rank===3?"bg-orange-100 text-orange-700":dark?"bg-white/10 text-slate-300":"bg-slate-100 text-slate-500"}`} title={`${rank}º lugar`}><Award size={13}/>{rank}º</span>
        <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-slate-100 text-sm font-black text-slate-700">
          {technician.foto_url?<img src={technician.foto_url} alt={technician.name||"Técnico"} className="h-full w-full object-cover"/>:initials(technician.name)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="truncate text-sm font-black">
              {technician.name || "Não informado"}
            </h4>
            {enough ? (
              <span className="rounded-full bg-emerald-50 px-2 py-1 text-[8px] font-black uppercase text-emerald-700">
                Amostra válida
              </span>
            ) : (
              <span className="rounded-full bg-amber-50 px-2 py-1 text-[8px] font-black uppercase text-amber-700">
                Amostra insuficiente
              </span>
            )}
          </div>
          <p className={`mt-1 text-[11px] leading-5 ${muted}`}>
            {[technician.departamento,technician.email].filter(Boolean).join(" · ") || "Equipe técnica"}<br/>{technician.total_ratings} avaliação(ões) ·{" "}
            {technician.total_closed_tickets} chamados concluídos
          </p>
        </div>
        <div className="text-right">
          <b className="flex items-center gap-1 text-lg">
            <Star
              size={15}
              className={
                enough ? "fill-amber-400 text-amber-400" : "text-slate-300"
              }
            />
            {enough ? Number(technician.average_rating).toFixed(1) : "—"}
          </b>
          <span className={`text-[10px] ${muted}`}>de 5</span>
        </div>
      </div>
      <PerformanceSummary technician={technician} dark={dark}/>
      {enough && (
        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
          <Criterion label="Cordialidade" value={technician.courtesy_rating} />
          <Criterion
            label="Comunicação"
            value={technician.communication_rating}
          />
          <Criterion label="Solução" value={technician.resolution_rating} />
          <Criterion label="Agilidade" value={technician.speed_rating} />
        </div>
      )}
      <div
        className={`mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t pt-3 text-[11px] ${dark ? "border-white/10" : "border-slate-100"}`}
      >
        <span>
          <b>SLA:</b> {Number(technician.sla_rate).toFixed(0)}%
        </span>
        <span>
          <b>NPS:</b> {enough ? Number(technician.nps_average).toFixed(1) : "—"}
        </span>
        <span>
          <b>Resolução:</b> {formatDuration(technician.average_resolution_time)}
        </span>
      </div>
    </article>
  );
}

function CompactTechnicianRow({technician,rank,dark}:{technician:PerformanceScore;rank:number;dark:boolean}) {
  const enough=Number(technician.total_ratings)>=minimumSample;
  return <article className={`grid grid-cols-[42px_42px_minmax(150px,1.25fr)_repeat(5,minmax(70px,.6fr))] items-center gap-2 border px-2 py-2 ${dark?"border-white/10 bg-white/[.03]":"border-slate-200 bg-white"}`}>
    <b className={`text-center text-sm ${rank<=3?"text-amber-600":"text-slate-500"}`}>{rank}º</b>
    <span className="grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-slate-100 text-xs font-black text-slate-700">{technician.foto_url?<img src={technician.foto_url} alt={technician.name||"Técnico"} className="h-full w-full object-cover"/>:initials(technician.name)}</span>
    <div className="min-w-0"><div className="flex items-center gap-2"><b className="truncate text-xs">{technician.name}</b><span className={`shrink-0 text-[8px] font-bold uppercase ${enough?"text-emerald-600":"text-amber-600"}`}>{enough?"Amostra válida":"Amostra insuficiente"}</span></div><span className="block truncate text-[10px] text-slate-500">{technician.departamento||"Equipe técnica"} · {technician.email||"Sem e-mail"}</span></div>
    <MiniValue label="Nota" value={enough?`${Number(technician.average_rating).toFixed(1)}/5`:`${Number(technician.average_rating||0).toFixed(1)}/5`}/>
    <MiniValue label="SLA" value={`${Number(technician.sla_rate||0).toFixed(0)}%`}/>
    <MiniValue label="Resolvidos" value={String(technician.total_closed_tickets||0)}/>
    <MiniValue label="Avaliações" value={String(technician.total_ratings||0)}/>
    <MiniValue label="Tempo médio" value={formatDuration(technician.average_resolution_time)}/>
  </article>;
}
function MiniValue({label,value}:{label:string;value:string}) { return <div className="min-w-0"><span className="block text-[9px] font-bold uppercase text-slate-500">{label}</span><b className="block truncate text-[11px]" title={value}>{value}</b></div>; }

function PerformanceSummary({technician,dark}:{technician:PerformanceScore;dark:boolean}) {
  const metrics=[
    {label:"Avaliações recebidas",display:String(technician.total_ratings||0)},
    {label:"Chamados resolvidos",display:String(technician.total_closed_tickets||0)},
    {label:"SLA cumprido",display:`${Number(technician.sla_rate||0).toFixed(0)}%`},
    {label:"Tempo médio de resolução",display:formatDuration(technician.average_resolution_time)},
  ];
  return <div className={`mt-4 rounded-xl border p-3 ${dark?"border-white/10 bg-white/[.025]":"border-slate-100 bg-slate-50/70"}`}>
    <b className="text-sm">Resultados do período</b>
    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">{metrics.map(item=><div key={item.label}><span className="block text-[11px] text-slate-500">{item.label}</span><b className="text-xs">{item.display}</b></div>)}</div>
  </div>;
}

function Criterion({ label, value }: { label: string; value?: number }) {
  const numeric = Number(value || 0);
  return (
    <div>
      <div className="flex justify-between text-[10px] font-bold">
        <span className="text-slate-500">{label}</span>
        <span>{numeric.toFixed(1)}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-emerald-500"
          style={{ width: `${(numeric / 5) * 100}%` }}
        />
      </div>
    </div>
  );
}
function Sentiment({ value }: { value: string }) {
  const positive = value === "positive",
    negative = value === "negative";
  return (
    <span
      className={`rounded-full px-2 py-1 text-[8px] font-black uppercase ${positive ? "bg-emerald-50 text-emerald-700" : negative ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-600"}`}
    >
      {positive ? "Positivo" : negative ? "Negativo" : "Neutro"}
    </span>
  );
}
function initials(name?: string) {
  return (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
function formatDuration(minutes: number) {
  const value = Number(minutes || 0);
  return value < 60
    ? `${Math.round(value)} min`
    : `${Math.floor(value / 60)}h ${Math.round(value % 60)}min`;
}
function cleanComment(comment: string) {
  return (
    comment
      .split("\n")
      .filter(
        (line) => !line.startsWith("Tags:") && !line.startsWith("Emoção:"),
      )
      .join(" ")
      .trim() || "Comentário registrado sem texto livre."
  );
}
