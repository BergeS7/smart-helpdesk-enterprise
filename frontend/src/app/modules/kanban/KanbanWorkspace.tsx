/**
 * Responsabilidade: Módulo funcional de kanban workspace; reúne interface e ações do respectivo fluxo.
 */
import { useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, CircleDot, Clock3, Columns3, List, Mail, MapPin, MessageSquare, Monitor, Paperclip, PauseCircle, RefreshCw, Rows3, Ticket } from "lucide-react";
import { type ApiChamado } from "../../services/api";
import { TICKET_STATUS, canonicalTicketStatus, ticketStatusLabel, type TicketStatus } from "../../domain/ticketStatus";

type AdminStatus=TicketStatus;
const STATUS_COLUNAS:{status:AdminStatus;titulo:string;icon:ReactNode;border:string;accent:string;tone:string;count:string}[]=[
{status:TICKET_STATUS.OPEN,titulo:"Em aberto",icon:<CircleDot size={16}/>,border:"border-blue-300",accent:"bg-blue-500",tone:"text-blue-600",count:"bg-blue-50 text-blue-700"},
{status:TICKET_STATUS.IN_PROGRESS,titulo:"Em andamento",icon:<RefreshCw size={16}/>,border:"border-amber-300",accent:"bg-amber-500",tone:"text-amber-600",count:"bg-amber-50 text-amber-700"},
{status:TICKET_STATUS.WAITING_USER,titulo:"Aguardando usuário",icon:<PauseCircle size={16}/>,border:"border-violet-300",accent:"bg-violet-500",tone:"text-violet-600",count:"bg-violet-50 text-violet-700"},
{status:TICKET_STATUS.CLOSED,titulo:"Concluído",icon:<CheckCircle2 size={16}/>,border:"border-emerald-300",accent:"bg-emerald-500",tone:"text-emerald-600",count:"bg-emerald-50 text-emerald-700"}];
function normalizeStatus(status?:string):AdminStatus{const s=canonicalTicketStatus(status);if(s===TICKET_STATUS.RESOLVED||s===TICKET_STATUS.CANCELED)return TICKET_STATUS.CLOSED;if(s===TICKET_STATUS.WAITING_THIRD_PARTY)return TICKET_STATUS.WAITING_USER;return s}
function formatDate(value?:string|null){if(!value)return "-";try{return new Intl.DateTimeFormat("pt-BR",{dateStyle:"short",timeStyle:"short"}).format(new Date(value))}catch{return "-"}}
function formatarMinutos(minutos?:number|null){if(minutos==null)return "-";const abs=Math.abs(minutos),h=Math.floor(abs/60),m=abs%60,texto=h>0?`${h}h ${m}min`:`${m}min`;return minutos<0?`Vencido há ${texto}`:`${texto} restantes`}
function prioridadeClass(p?:string){if(p==="Crítica"||p==="Critica")return "border-rose-300 bg-rose-600 text-white shadow-sm shadow-rose-200";if(p==="Alta")return "border-red-200 bg-red-50 text-red-700";if(p==="Baixa")return "border-emerald-200 bg-emerald-50 text-emerald-700";return "border-amber-200 bg-amber-50 text-amber-700"}
function statusClass(status?:string){const s=canonicalTicketStatus(status);if(s===TICKET_STATUS.CLOSED||s===TICKET_STATUS.RESOLVED)return "border-emerald-200 bg-emerald-50 text-emerald-700";if(s===TICKET_STATUS.IN_PROGRESS)return "border-amber-200 bg-amber-50 text-amber-700";if(s===TICKET_STATUS.WAITING_USER||s===TICKET_STATUS.WAITING_THIRD_PARTY)return "border-orange-200 bg-orange-50 text-orange-700";return "border-blue-200 bg-blue-50 text-blue-700"}
function slaBadgeClass(status?:string){if(status==="vencido")return "border-red-200 bg-red-50 text-red-700";if(status==="alerta")return "border-amber-200 bg-amber-50 text-amber-700";if(status==="pausado")return "border-sky-200 bg-sky-50 text-sky-700";return "border-emerald-200 bg-emerald-50 text-emerald-700"}
function nomeSolicitanteChamado(c:ApiChamado){return c.solicitante_nome||c.solicitante||c.email_solicitante||"Solicitante"}
function nomeResponsavelChamado(c:ApiChamado){return c.responsavel_nome||c.responsavel||""}
function iniciais(nome?:string|null){return String(nome||"?").trim().split(/\s+/).slice(0,2).map(p=>p[0]?.toUpperCase()).join("")}
function SolicitanteAvatar({chamado,size="md"}:{chamado:ApiChamado;size?:"sm"|"md"|"lg"}){const nome=nomeSolicitanteChamado(chamado),tamanho={sm:"h-7 w-7 text-[10px]",md:"h-9 w-9 text-xs",lg:"h-10 w-10 text-sm"}[size];return <span title={nome} className={`grid shrink-0 place-items-center overflow-hidden rounded-full border border-zinc-200 bg-gradient-to-br from-blue-500 to-sky-400 font-black text-white shadow-sm ${tamanho}`}>{chamado.solicitante_foto_url?<img src={chamado.solicitante_foto_url} alt={nome} loading="lazy" decoding="async" className="h-full w-full object-cover"/>:iniciais(nome)}</span>}
function Badge({children,className=""}:{children:ReactNode;className?:string}){return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-black ${className}`}>{children}</span>}

type KanbanViewMode = "kanban" | "list" | "detailed";

export function KanbanWorkspace({
  chamados: todosChamados,
  dark,
  dragId,
  setDragId,
  onMover,
  onAbrir,
}: {
  chamados: ApiChamado[];
  dark: boolean;
  dragId: number | null;
  setDragId: Dispatch<SetStateAction<number | null>>;
  onMover: (id: number, status: string) => void | Promise<void>;
  onAbrir: (id: number) => void;
}) {
  // A janela de permanência é aplicada pela API. O histórico usa consulta própria
  // e nunca depende desta lista operacional.
  const chamados = todosChamados;
  const [preferredView, setPreferredView] = useState<KanbanViewMode>(() => {
    const saved = localStorage.getItem("smart_helpdesk_kanban_view");
    return saved === "list" || saved === "detailed" ? saved : "kanban";
  });
  const [mobile, setMobile] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 767px)").matches,
  );
  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const update = () => setMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  const view: KanbanViewMode = mobile ? "list" : preferredView;
  const chooseView = (next: KanbanViewMode) => {
    setPreferredView(next);
    localStorage.setItem("smart_helpdesk_kanban_view", next);
  };
  const modes = [
    { id: "kanban" as const, label: "Kanban", icon: Columns3 },
    { id: "list" as const, label: "Lista", icon: List },
    { id: "detailed" as const, label: "Detalhado", icon: Rows3 },
  ];

  return (
    <div className="ds-page kanban-workspace space-y-3">
      <div
        className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3 shadow-sm ${dark ? "border-white/10 bg-white/5" : "border-zinc-200 bg-white"}`}
      >
        <div>
          <h3 className="text-sm font-black">Visualização dos chamados</h3>
          <p className={`text-xs ${dark ? "text-white/45" : "text-zinc-500"}`}>
            {mobile
              ? "No celular, os chamados são organizados automaticamente em lista."
              : "Kanban é o modo principal. Concluídos permanecem por 24 horas."}
          </p>
        </div>
        <div className="hidden items-center rounded-xl border border-zinc-200 bg-zinc-50 p-1 md:flex">
          {modes.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => chooseView(id)}
              aria-pressed={view === id}
              className={`flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-black transition ${view === id ? "bg-blue-600 text-white shadow-sm" : "text-zinc-500 hover:bg-white hover:text-zinc-800"}`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
        {mobile && (
          <span className="flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700">
            <List size={14} />
            Lista para celular
          </span>
        )}
      </div>

      {view === "kanban" && (
        <div className="overflow-x-auto pb-4">
          <div className="grid min-w-[1180px] grid-cols-4 gap-3">
            {STATUS_COLUNAS.map((coluna) => {
              const itens = chamados.filter(
                (c) => normalizeStatus(c.status) === coluna.status,
              );
              return (
                <section
                  key={coluna.status}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragId) onMover(dragId, coluna.status);
                    setDragId(null);
                  }}
                  className={`min-h-[610px] rounded-lg border shadow-sm ${dark ? "border-white/10 bg-white/5" : "border-zinc-200 bg-white"}`}
                >
                  <div className="overflow-hidden rounded-t-lg border-b border-zinc-200">
                    <div className={`h-1.5 ${coluna.accent}`} />
                    <div
                      className={`${dark ? "bg-white/5" : "bg-[#eef2f6]"} flex items-center justify-between px-3 py-3`}
                    >
                      <h3 className="flex min-w-0 items-center gap-2 text-sm font-black">
                        <span className={coluna.tone}>{coluna.icon}</span>
                        <span className="truncate">{coluna.titulo}</span>
                      </h3>
                      <div className="flex items-center gap-2">
                        <span
                          className={`grid h-7 min-w-7 place-items-center rounded-full px-2 text-xs font-black ${coluna.count}`}
                        >
                          {itens.length}
                        </span>
                        <span className={coluna.tone}>◆</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3 p-3">
                    {itens.map((c) => (
                      <AdminTicketCard
                        key={c.id}
                        chamado={c}
                        onOpen={() => onAbrir(c.id)}
                        onDrag={() => setDragId(c.id)}
                      />
                    ))}
                    {itens.length === 0 && (
                      <div
                        className={`rounded-lg border border-dashed p-6 text-center text-sm ${dark ? "border-white/10 text-white/45" : "border-zinc-200 text-zinc-400"}`}
                      >
                        Nenhum chamado nesta coluna.
                      </div>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}

      {view === "list" && (
        <section
          className={`overflow-hidden rounded-2xl border shadow-sm ${dark ? "border-white/10 bg-white/5" : "border-zinc-200 bg-white"}`}
        >
          <div
            className={`hidden grid-cols-[130px_minmax(260px,1fr)_170px_140px_150px_28px] gap-3 border-b px-4 py-3 text-[10px] font-black uppercase tracking-wide lg:grid ${dark ? "border-white/10 text-white/40" : "border-zinc-100 bg-zinc-50 text-zinc-400"}`}
          >
            <span>Chamado</span>
            <span>Assunto</span>
            <span>Solicitante</span>
            <span>Status</span>
            <span>Prioridade / SLA</span>
            <span />
          </div>
          <div
            className={
              dark ? "divide-y divide-white/10" : "divide-y divide-zinc-100"
            }
          >
            {chamados.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onAbrir(c.id)}
                className={`grid w-full gap-2 px-4 py-4 text-left transition lg:grid-cols-[130px_minmax(260px,1fr)_170px_140px_150px_28px] lg:items-center lg:gap-3 ${dark ? "hover:bg-white/5" : "hover:bg-blue-50/50"}`}
              >
                <span className="text-xs font-black text-blue-600">
                  {c.numero_chamado || `#${c.id}`}
                </span>
                <span className="min-w-0">
                  <b className="block truncate text-sm">{c.titulo}</b>
                  <small
                    className={`block truncate ${dark ? "text-white/45" : "text-zinc-500"}`}
                  >
                    {c.tipo_chamado || "Chamado"} · {formatDate(c.criado_em)}
                  </small>
                  <small className={`mt-1 flex items-center gap-1 truncate font-bold ${dark?"text-blue-300":"text-blue-700"}`}><MapPin size={11}/>{c.municipio_solicitante||"Origem não informada"}{c.ativo_id?` · ${c.ativo_hostname||c.ativo_patrimonio||"Ativo vinculado"}`:""}</small>
                </span>
                <span className="flex min-w-0 items-center gap-2">
                  <SolicitanteAvatar chamado={c} size="sm" />
                  <span className="truncate text-xs font-bold">
                    {nomeSolicitanteChamado(c)}
                  </span>
                </span>
                <span>
                  <Badge className={statusClass(c.status)}>{ticketStatusLabel(c.status)}</Badge>
                </span>
                <span className="flex flex-wrap gap-1">
                  <Badge className={prioridadeClass(c.prioridade)}>
                    {c.prioridade}
                  </Badge>
                  {(c.vencido || c.sla_status === "alerta") && (
                    <AlertTriangle
                      size={15}
                      className={c.vencido ? "text-red-500" : "text-amber-500"}
                    />
                  )}
                </span>
                <ArrowRight
                  size={16}
                  className="hidden text-zinc-400 lg:block"
                />
              </button>
            ))}
          </div>
          {chamados.length === 0 && <KanbanEmpty dark={dark} />}
        </section>
      )}

      {view === "detailed" && (
        <div className="grid gap-4 xl:grid-cols-2">
          {chamados.map((c) => (
            <article
              key={c.id}
              className={`rounded-2xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${c.vencido ? "border-red-300 ring-2 ring-red-100" : dark ? "border-white/10 bg-white/5" : "border-zinc-200 bg-white"}`}
            >
              <button
                type="button"
                onClick={() => onAbrir(c.id)}
                className="w-full text-left"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-black text-blue-600">
                      {c.numero_chamado || `#${c.id}`} ·{" "}
                      {c.tipo_chamado || "Chamado"}
                    </p>
                    <h3 className="mt-1 line-clamp-2 text-base font-black">
                      {c.titulo}
                    </h3>
                  </div>
                  <SolicitanteAvatar chamado={c} size="lg" />
                </div>
                <p
                  className={`mt-3 line-clamp-3 text-sm leading-6 ${dark ? "text-white/60" : "text-zinc-600"}`}
                >
                  {c.descricao}
                </p>
                <div className="mt-4 grid gap-3 rounded-xl bg-zinc-500/5 p-3 sm:grid-cols-2">
                  <KanbanDetail
                    label="Solicitante"
                    value={nomeSolicitanteChamado(c)}
                  />
                  <KanbanDetail
                    label="Departamento"
                    value={c.setor || "Não informado"}
                  />
                  <KanbanDetail label="Origem / área" value={[c.municipio_solicitante,c.unidade_solicitante].filter(Boolean).join(" · ")||"Não informada"}/>
                  <KanbanDetail label="Local do atendimento" value={[c.ativo_municipio||c.municipio_solicitante,c.ativo_unidade||c.unidade_solicitante].filter(Boolean).join(" · ")||"Não informado"}/>
                  {c.ativo_id&&<KanbanDetail label="Ativo relacionado" value={`${c.ativo_hostname||"Ativo"} · ${c.ativo_patrimonio||`#${c.ativo_id}`}`}/>} 
                  <KanbanDetail
                    label="Responsável"
                    value={nomeResponsavelChamado(c) || "Sem responsável"}
                  />
                  <KanbanDetail
                    label="Criado em"
                    value={formatDate(c.criado_em)}
                  />
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Badge className={statusClass(c.status)}>{ticketStatusLabel(c.status)}</Badge>
                  <Badge className={prioridadeClass(c.prioridade)}>
                    {c.prioridade}
                  </Badge>
                  {c.categoria_ia && <Badge>{c.categoria_ia}</Badge>}
                  {c.vencido && (
                    <Badge className="border-red-200 bg-red-50 text-red-700">
                      SLA vencido
                    </Badge>
                  )}
                  <span className="ml-auto flex items-center gap-3 text-xs text-zinc-400">
                    <span className="flex items-center gap-1">
                      <MessageSquare size={14} />
                      {c.total_comentarios || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <Paperclip size={14} />
                      {c.total_anexos || 0}
                    </span>
                    <ArrowRight size={17} />
                  </span>
                </div>
              </button>
            </article>
          ))}
          {chamados.length === 0 && (
            <div className="xl:col-span-2">
              <KanbanEmpty dark={dark} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function KanbanDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-black uppercase tracking-wide text-zinc-400">
        {label}
      </p>
      <p className="truncate text-xs font-bold">{value}</p>
    </div>
  );
}
function KanbanEmpty({ dark }: { dark: boolean }) {
  return (
    <div
      className={`p-12 text-center ${dark ? "text-white/45" : "text-zinc-400"}`}
    >
      <CheckCircle2 size={34} className="mx-auto mb-3 text-emerald-500" />
      <p className="font-black">Nenhum chamado nesta visualização</p>
    </div>
  );
}

function AdminTicketCard({
  chamado,
  onOpen,
  onDrag,
}: {
  chamado: ApiChamado;
  onOpen: () => void;
  onDrag: () => void;
}) {
  const tipo =
    chamado.tipo_chamado ||
    (chamado.categoria_ia ? "Incident Request" : "Service Request");
  const identificador = chamado.numero_chamado || `#${chamado.id}`;
  const solicitante = nomeSolicitanteChamado(chamado);
  const prioridade = chamado.prioridade || chamado.prioridade_ia || "Media";
  const mensagens = Number(chamado.total_comentarios || 0);
  const anexos = Number(chamado.total_anexos || 0);
  const respostaPendente = chamado.ultimo_comentario_perfil === "usuario";

  return (
    <article
      draggable
      onDragStart={onDrag}
      onClick={onOpen}
      className={`group cursor-grab rounded-md border bg-white p-3 text-[#202a33] shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md active:cursor-grabbing ${chamado.vencido ? "border-red-300 ring-2 ring-red-100" : "border-zinc-200"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <p className="truncate text-[11px] font-semibold text-zinc-500">
            {tipo} ID: {identificador}
          </p>
          <div className="mt-2 flex items-start gap-2">
            <span
              className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg text-white ${tipo.toLowerCase().includes("incident") ? "bg-orange-400" : "bg-cyan-500"}`}
            >
              <Ticket size={14} />
            </span>
            <h4 className="line-clamp-2 text-sm font-black leading-snug text-zinc-800 group-hover:text-blue-700">
              {chamado.titulo}
            </h4>
          </div>
        </div>
        <SolicitanteAvatar chamado={chamado} size="md" />
      </div>

      <div className="mt-3 flex min-w-0 items-center gap-2 text-xs text-zinc-600">
        <span className="truncate font-semibold">{solicitante}</span>
        <span className="text-zinc-300">|</span>
        <span className="shrink-0">{formatDate(chamado.criado_em)}</span>
      </div>

      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-zinc-500">
        {chamado.descricao}
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {(chamado.sla_status || chamado.vencido) && (
          <Badge
            className={slaBadgeClass(
              chamado.sla_status || (chamado.vencido ? "vencido" : "normal"),
            )}
          >
            <AlertTriangle size={12} />{" "}
            {chamado.sla_status === "pausado"
              ? "SLA pausado"
              : chamado.sla_status === "alerta"
              ? "SLA em alerta"
              : chamado.vencido
                ? "Vencido"
                : "SLA ok"}
          </Badge>
        )}
        {chamado.categoria_ia && (
          <Badge className="border-blue-100 bg-blue-50 text-blue-700">
            {chamado.categoria_ia}
          </Badge>
        )}
        {chamado.responsavel || chamado.ia_responsavel_sugerido ? (
          <Badge className="border-zinc-200 bg-zinc-50 text-zinc-600">
            {chamado.responsavel || chamado.ia_responsavel_sugerido}
          </Badge>
        ) : null}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1 text-zinc-400">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpen();
            }}
            className={`relative flex h-7 items-center gap-1 rounded-lg px-1.5 transition hover:bg-blue-50 hover:text-blue-700 ${respostaPendente ? "bg-red-50 text-red-600" : ""}`}
            title={
              respostaPendente
                ? "Nova mensagem do usuário aguardando resposta"
                : mensagens
                  ? `${mensagens} mensagem(ns) no chamado`
                  : "Nenhuma mensagem"
            }
            aria-label={
              respostaPendente
                ? "Nova mensagem do usuário"
                : `${mensagens} mensagens`
            }
          >
            <MessageSquare size={15} />
            {mensagens > 0 && (
              <span className="text-[10px] font-black">{mensagens}</span>
            )}
            {respostaPendente && (
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500" />
            )}
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpen();
            }}
            disabled={!anexos}
            className="flex h-7 items-center gap-1 rounded-lg px-1.5 transition enabled:hover:bg-blue-50 enabled:hover:text-blue-700 disabled:opacity-35"
            title={anexos ? `Abrir ${anexos} anexo(s)` : "Nenhum anexo"}
            aria-label={`${anexos} anexos`}
          >
            <Paperclip size={15} />
            {anexos > 0 && (
              <span className="text-[10px] font-black">{anexos}</span>
            )}
          </button>
          <span
            className={`grid h-7 w-7 place-items-center rounded-lg ${chamado.vencido ? "bg-red-50 text-red-600" : chamado.sla_status === "alerta" ? "bg-amber-50 text-amber-600" : chamado.sla_status === "pausado" ? "bg-sky-50 text-sky-600" : ""}`}
            title={
              chamado.sla_status === "pausado"
                ? "SLA pausado enquanto aguarda resposta do usuário"
                : chamado.vencido
                ? `SLA vencido há ${formatarMinutos(Math.abs(Number(chamado.sla_minutos_restantes || 0)))}`
                : `Tempo restante do SLA: ${formatarMinutos(chamado.sla_minutos_restantes)}`
            }
            aria-label="Situação do SLA"
          >
            <Clock3 size={15} />
          </span>
        </div>
        <Badge
          className={`${prioridadeClass(prioridade)} rounded-full px-3 py-1 text-[11px]`}
        >
          {prioridade}
        </Badge>
      </div>
    </article>
  );
}
