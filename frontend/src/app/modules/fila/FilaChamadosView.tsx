import { useEffect, useMemo, useRef, useState, type ButtonHTMLAttributes, type SelectHTMLAttributes } from "react";
import { AlertTriangle, Check, CheckCircle2, ChevronDown, Clock3, Headphones, ListChecks, MapPin, MessageSquare, Monitor, ShieldAlert, SlidersHorizontal, Ticket, UserCheck, UserCog, Users, X } from "lucide-react";
import { toast } from "sonner";
import { atualizarChamado, buscarChamado, type ApiChamado, type ApiTeam, type ApiUsuario } from "../../services/api";
import { TICKET_STATUS, canonicalTicketStatus, ticketStatusLabel, type TicketStatus } from "../../domain/ticketStatus";

const PRIORIDADES = ["Crítica", "Alta", "Media", "Baixa"];
type AdminStatus = TicketStatus;
function normalizeStatus(status?: string): AdminStatus {
  const canonical=canonicalTicketStatus(status);
  if(canonical===TICKET_STATUS.RESOLVED||canonical===TICKET_STATUS.CANCELED)return TICKET_STATUS.CLOSED;
  if(canonical===TICKET_STATUS.WAITING_THIRD_PARTY)return TICKET_STATUS.WAITING_USER;
  return canonical;
}
function prioridadeClass(p?:string){if(p==="Crítica"||p==="Critica")return "border-rose-300 bg-rose-600 text-white shadow-sm shadow-rose-200";if(p==="Alta")return "border-red-200 bg-red-50 text-red-700";if(p==="Baixa")return "border-emerald-200 bg-emerald-50 text-emerald-700";return "border-amber-200 bg-amber-50 text-amber-700"}
function statusClass(status?:string){const s=canonicalTicketStatus(status);if(s===TICKET_STATUS.CLOSED||s===TICKET_STATUS.RESOLVED)return "border-emerald-200 bg-emerald-50 text-emerald-700";if(s===TICKET_STATUS.IN_PROGRESS)return "border-amber-200 bg-amber-50 text-amber-700";if(s===TICKET_STATUS.WAITING_USER||s===TICKET_STATUS.WAITING_THIRD_PARTY)return "border-orange-200 bg-orange-50 text-orange-700";return "border-blue-200 bg-blue-50 text-blue-700"}
function iniciais(nome?:string|null){return String(nome||"?").trim().split(/\s+/).slice(0,2).map(p=>p[0]?.toUpperCase()).join("")}
function nomeSolicitanteChamado(chamado:ApiChamado){return chamado.solicitante_nome||chamado.solicitante||chamado.email_solicitante||"Solicitante"}
function perfilLabel(perfil?:string){return ({usuario:"Usuário",tecnico:"Técnico",supervisor:"Supervisor",admin:"Administrador",desenvolvedor:"Desenvolvedor",super_admin:"Super administrador"} as Record<string,string>)[String(perfil||"")]||String(perfil||"Perfil não informado")}
function SolicitanteAvatar({chamado,size="md"}:{chamado:ApiChamado;size?:"sm"|"md"|"lg"}){const nome=nomeSolicitanteChamado(chamado);const tamanho={sm:"h-7 w-7 text-[10px]",md:"h-9 w-9 text-xs",lg:"h-10 w-10 text-sm"}[size];return <span title={nome} className={`grid shrink-0 place-items-center overflow-hidden rounded-full border border-zinc-200 bg-gradient-to-br from-blue-500 to-sky-400 font-black text-white shadow-sm ${tamanho}`}>{chamado.solicitante_foto_url?<img src={chamado.solicitante_foto_url} alt={nome} loading="lazy" decoding="async" className="h-full w-full object-cover"/>:iniciais(nome)}</span>}
function UsuarioSistemaAvatar({usuario,size="md",dark=false}:{usuario:ApiUsuario;size?:"sm"|"md"|"lg";dark?:boolean}){const nome=usuario.nome||usuario.email;const tamanho={sm:"h-9 w-9 text-xs",md:"h-12 w-12 text-sm",lg:"h-16 w-16 text-lg"}[size];return <span title={nome} className={`grid shrink-0 place-items-center overflow-hidden rounded-full border bg-gradient-to-br from-blue-500 to-sky-400 font-black text-white shadow-sm ${tamanho} ${dark?"border-white/10":"border-zinc-200"}`}>{usuario.foto_url?<img src={usuario.foto_url} alt={nome} loading="lazy" decoding="async" className="h-full w-full object-cover"/>:iniciais(nome)}</span>}
function Badge({children,className=""}:{children:React.ReactNode;className?:string}){return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-black ${className}`}>{children}</span>}
function Select(props:SelectHTMLAttributes<HTMLSelectElement>){return <select {...props} className={`h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none ${props.className||""}`}/>}
function Button({variant="primary",className="",...props}:ButtonHTMLAttributes<HTMLButtonElement>&{variant?:"primary"|"secondary"|"danger"}){const style=variant==="primary"?"bg-blue-600 text-white":variant==="danger"?"bg-red-600 text-white":"border border-zinc-200 bg-white text-zinc-800";return <button {...props} className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black disabled:opacity-50 ${style} ${className}`}/>}

export function FilaChamadosView({
  chamados,
  carteira,
  equipe,
  teams,
  dark,
  administrador,
  onAbrir,
  onAssumir,
  onAtualizar,
}: {
  chamados: ApiChamado[];
  carteira: ApiChamado[];
  equipe: ApiUsuario[];
  teams: ApiTeam[];
  dark: boolean;
  administrador: boolean;
  onAbrir: (id: number) => void;
  onAssumir: (id: number) => void;
  onAtualizar: () => void | Promise<void>;
}) {
  const [visao, setVisao] = useState<"recebidos" | "alerta" | "atrasados">(
    "recebidos",
  );
  const [atualizando, setAtualizando] = useState(false);
  const [selecionados, setSelecionados] = useState<number[]>([]);
  const [menuDelegar, setMenuDelegar] = useState<number | null>(null);
  const [detalheFila, setDetalheFila] = useState<ApiChamado | null>(null);
  const [novosIds, setNovosIds] = useState<number[]>([]);
  const idsAnteriores = useRef<Set<number> | null>(null);

  useEffect(() => {
    const atuais = new Set(chamados.map((chamado) => chamado.id));
    if (idsAnteriores.current) {
      const chegaram = chamados
        .filter((chamado) => !idsAnteriores.current?.has(chamado.id))
        .map((chamado) => chamado.id);
      if (chegaram.length) {
        setNovosIds(chegaram);
        toast.info(`${chegaram.length} novo(s) chamado(s) recebido(s).`);
        window.setTimeout(() => setNovosIds([]), 8000);
      }
    }
    idsAnteriores.current = atuais;
  }, [chamados]);

  const emAlerta = chamados.filter(
    (chamado) => chamado.sla_status === "alerta",
  ).length;
  const atrasados = chamados.filter(
    (chamado) =>
      chamado.vencido ||
      chamado.sla_status === "vencido" ||
      Number(chamado.sla_minutos_restantes) < 0,
  ).length;

  const chamadosVisiveis = useMemo(() => {
    return chamados
      .filter((chamado) => {
        if (visao === "alerta") return chamado.sla_status === "alerta";
        if (visao === "atrasados")
          return (
            chamado.vencido ||
            chamado.sla_status === "vencido" ||
            Number(chamado.sla_minutos_restantes) < 0
          );
        return true;
      })
      .sort((a, b) => {
        const slaA =
          a.sla_minutos_restantes == null
            ? Number.MAX_SAFE_INTEGER
            : Number(a.sla_minutos_restantes);
        const slaB =
          b.sla_minutos_restantes == null
            ? Number.MAX_SAFE_INTEGER
            : Number(b.sla_minutos_restantes);
        return slaA - slaB;
      });
  }, [chamados, visao]);

  function statusFila(chamado: ApiChamado) {
    if (chamado.sla_status === "pausado") {
      return {
        label: "SLA pausado",
        dot: "bg-sky-500",
        text: "text-sky-600",
        bg: "bg-sky-50",
      };
    }
    if (
      chamado.vencido ||
      chamado.sla_status === "vencido" ||
      Number(chamado.sla_minutos_restantes) < 0
    ) {
      return {
        label: "Atrasado",
        dot: "bg-red-500",
        text: "text-red-600",
        bg: "bg-red-50",
      };
    }
    if (chamado.sla_status === "alerta")
      return {
        label: "Em alerta",
        dot: "bg-amber-500",
        text: "text-amber-600",
        bg: "bg-amber-50",
      };
    if (String(chamado.prioridade).toLowerCase() === "alta")
      return {
        label: "Prioritário",
        dot: "bg-violet-500",
        text: "text-violet-600",
        bg: "bg-violet-50",
      };
    return {
      label: "Novo",
      dot: "bg-emerald-500",
      text: "text-emerald-600",
      bg: "bg-emerald-50",
    };
  }

  function tempoSla(chamado: ApiChamado) {
    if (chamado.sla_status === "pausado") return "SLA pausado · aguardando usuário";
    if (chamado.sla_minutos_restantes == null) return "SLA não informado";
    const minutos = Number(chamado.sla_minutos_restantes);
    const absoluto = Math.abs(minutos);
    const tempo =
      absoluto >= 1440
        ? `${Math.ceil(absoluto / 1440)} dia(s)`
        : absoluto >= 60
          ? `${Math.ceil(absoluto / 60)}h`
          : `${absoluto}min`;
    return minutos < 0 || chamado.vencido
      ? `Atraso: ${tempo}`
      : `SLA: ${tempo}`;
  }

  async function abrirPainel(id: number) {
    try {
      setDetalheFila(await buscarChamado(id));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao abrir chamado.",
      );
    }
  }

  async function delegarChamado(chamadoId: number, tecnicoId: number) {
    try {
      await atualizarChamado(chamadoId, { responsavel_id: tecnicoId });
      setMenuDelegar(null);
      toast.success("Chamado delegado.");
      await onAtualizar();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao delegar chamado.",
      );
    }
  }

  function alternarSelecionado(id: number) {
    setSelecionados((atuais) =>
      atuais.includes(id)
        ? atuais.filter((item) => item !== id)
        : [...atuais, id],
    );
  }

  async function executarLote(dados: Partial<ApiChamado>, mensagem: string) {
    if (!selecionados.length) return;
    setAtualizando(true);
    const resultados = await Promise.allSettled(
      selecionados.map((id) => atualizarChamado(id, dados)),
    );
    const falhas = resultados.filter(
      (resultado) => resultado.status === "rejected",
    ).length;
    if (falhas)
      toast.error(`${falhas} chamado(s) não puderam ser atualizados.`);
    if (falhas < selecionados.length) toast.success(mensagem);
    setSelecionados([]);
    await onAtualizar();
    setAtualizando(false);
  }

  const cargaTecnico = (id: number) =>
    carteira.filter(
      (chamado) =>
        Number(chamado.responsavel_id) === Number(id) &&
        normalizeStatus(chamado.status) !== TICKET_STATUS.CLOSED,
    ).length;

  const abas = [
    { id: "recebidos" as const, label: "Recebidos", total: chamados.length },
    { id: "alerta" as const, label: "Em alerta", total: emAlerta },
    { id: "atrasados" as const, label: "Atrasados", total: atrasados },
  ];

  return (
    <section
      className={`ds-page queue-workspace overflow-hidden rounded-2xl border shadow-sm ${dark ? "border-white/10 bg-white/5" : "border-zinc-200 bg-white"}`}
    >
      <div
        className={`border-b px-4 pt-4 sm:px-5 ${dark ? "border-white/10" : "border-zinc-200"}`}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <MessageSquare size={20} className="text-blue-600" />
              <h3 className="text-lg font-black">Chamados recebidos</h3>
            </div>
            <p
              className={`mt-1 text-sm ${dark ? "text-white/50" : "text-zinc-500"}`}
            >
              Atenda ou delegue os chamados sem responsável.
            </p>
          </div>
        </div>

        <div className="mt-4 flex gap-5 overflow-x-auto">
          {abas.map((aba) => (
            <button
              key={aba.id}
              type="button"
              onClick={() => setVisao(aba.id)}
              className={`relative flex shrink-0 items-center gap-1.5 pb-3 text-sm font-black transition ${visao === aba.id ? "text-blue-600" : dark ? "text-white/50 hover:text-white" : "text-zinc-500 hover:text-zinc-800"}`}
            >
              {aba.label}{" "}
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] ${visao === aba.id ? "bg-blue-50 text-blue-700" : dark ? "bg-white/10" : "bg-zinc-100"}`}
              >
                {aba.total}
              </span>
              {visao === aba.id && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-blue-600" />
              )}
            </button>
          ))}
        </div>
      </div>

      {selecionados.length > 0 && (
        <div
          className={`flex flex-wrap items-center gap-2 border-b px-4 py-3 ${dark ? "border-white/10 bg-blue-500/10" : "border-blue-100 bg-blue-50"}`}
        >
          <b className="mr-2 text-sm">{selecionados.length} selecionado(s)</b>
          <Select
            className="h-9 w-auto min-w-44"
            defaultValue=""
            onChange={(e) => {
              if (e.target.value)
                executarLote(
                  { responsavel_id: Number(e.target.value) },
                  "Chamados delegados.",
                );
            }}
          >
            <option value="">Delegar para...</option>
            {equipe.map((membro) => (
              <option key={membro.id} value={membro.id}>
                {membro.nome}
              </option>
            ))}
          </Select>
          <Select
            className="h-9 w-auto min-w-40"
            defaultValue=""
            onChange={(e) => {
              if (e.target.value)
                executarLote(
                  {
                    prioridade: e.target.value,
                    prioridade_manual_motivo: "Alteração em lote pela fila",
                  },
                  "Prioridade atualizada.",
                );
            }}
          >
            <option value="">Prioridade...</option>
            {PRIORIDADES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </Select>
          <Select
            className="h-9 w-auto min-w-40"
            defaultValue=""
            onChange={(e) => {
              if (e.target.value)
                executarLote(
                  { team_id: Number(e.target.value) },
                  "Chamados movidos para a equipe.",
                );
            }}
          >
            <option value="">Mover para equipe...</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </Select>
          <button
            type="button"
            onClick={() =>
              executarLote(
                {
                  prioridade: "Alta",
                  prioridade_manual_motivo: "Marcado como crítico na fila",
                },
                "Chamados marcados como críticos.",
              )
            }
            className="h-9 rounded-lg bg-red-600 px-3 text-xs font-black text-white"
          >
            Marcar crítico
          </button>
          <button
            type="button"
            onClick={() => setSelecionados([])}
            className="ml-auto p-2"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="max-h-[calc(100vh-270px)] min-h-[360px] overflow-y-auto">
        {chamadosVisiveis.map((chamado) => {
          const indicador = statusFila(chamado);
          const data = chamado.criado_em ? new Date(chamado.criado_em) : null;
          return (
            <article
              key={chamado.id}
              className={`group relative border-b px-4 py-3 transition last:border-b-0 sm:px-5 ${novosIds.includes(chamado.id) ? "bg-emerald-50 ring-1 ring-inset ring-emerald-200" : dark ? "border-white/10 hover:bg-white/5" : "border-zinc-100 hover:bg-blue-50/40"}`}
            >
              <div className="flex min-w-0 items-start gap-3">
                <input
                  type="checkbox"
                  checked={selecionados.includes(chamado.id)}
                  onChange={() => alternarSelecionado(chamado.id)}
                  className="mt-3 h-4 w-4 shrink-0 accent-blue-600"
                  aria-label={`Selecionar ${chamado.numero_chamado || chamado.id}`}
                />
                <SolicitanteAvatar chamado={chamado} size="lg" />
                <button
                  type="button"
                  onClick={() => abrirPainel(chamado.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-sm ${indicador.dot}`}
                    />
                    <span
                      className={`shrink-0 text-xs font-black ${indicador.text}`}
                    >
                      {indicador.label}
                    </span>
                    <span
                      className={`truncate text-xs font-bold ${dark ? "text-white/35" : "text-zinc-400"}`}
                    >
                      {chamado.numero_chamado || `#${chamado.id}`}
                    </span>
                    <Badge
                      className={`${prioridadeClass(chamado.prioridade)} hidden sm:inline-flex`}
                    >
                      {chamado.prioridade}
                    </Badge>
                  </div>
                  <p className="mt-1 truncate text-sm font-black">
                    {nomeSolicitanteChamado(chamado)}
                  </p>
                  <p
                    className={`mt-0.5 truncate text-xs ${dark ? "text-white/45" : "text-zinc-500"}`}
                  >
                    {chamado.setor || "Departamento não informado"}
                    {chamado.tipo_chamado ? ` · ${chamado.tipo_chamado}` : ""}
                  </p>
                  <p className={`mt-1 flex items-center gap-1 truncate text-xs font-bold ${dark?"text-blue-300":"text-blue-700"}`}><MapPin size={12}/>{chamado.municipio_solicitante||"Origem não informada"}{chamado.unidade_solicitante?` · ${chamado.unidade_solicitante}`:""}</p>
                  {chamado.ativo_id&&<p className={`mt-1 flex items-center gap-1 truncate text-xs ${dark?"text-emerald-300":"text-emerald-700"}`}><Monitor size={12}/>{chamado.ativo_hostname||"Ativo"} · {chamado.ativo_patrimonio||`#${chamado.ativo_id}`} · Atendimento: {chamado.ativo_municipio||chamado.municipio_solicitante||"não informado"}</p>}
                  <p
                    className={`mt-1.5 truncate text-sm font-semibold ${dark ? "text-white/75" : "text-zinc-700"}`}
                  >
                    {chamado.titulo}
                  </p>
                </button>

                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className={`text-xs font-black ${indicador.text}`}>
                    {tempoSla(chamado)}
                  </span>
                  <span
                    className={`text-xs ${dark ? "text-white/40" : "text-zinc-400"}`}
                  >
                    {data
                      ? data.toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "-"}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {(chamado.total_comentarios || 0) > 0 && (
                      <span
                        className={`flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-black ${dark ? "bg-white/10 text-white/60" : "bg-zinc-100 text-zinc-500"}`}
                      >
                        <MessageSquare size={12} />
                        {chamado.total_comentarios}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => onAssumir(chamado.id)}
                      className="rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-black text-white opacity-100 transition hover:bg-blue-700 sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      <span className="hidden sm:inline">Assumir</span>
                      <UserCheck size={14} className="sm:hidden" />
                    </button>
                    {administrador && (
                      <button
                        type="button"
                        onClick={() =>
                          setMenuDelegar(
                            menuDelegar === chamado.id ? null : chamado.id,
                          )
                        }
                        className={`rounded-lg border p-1.5 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 ${dark ? "border-white/10 hover:bg-white/10" : "border-zinc-200 hover:bg-white"}`}
                        title="Delegar"
                      >
                        <UserCog size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
              {menuDelegar === chamado.id && (
                <div
                  className={`absolute right-4 top-[82px] z-30 w-72 overflow-hidden rounded-xl border p-2 shadow-2xl ${dark ? "border-white/10 bg-[#101827]" : "border-zinc-200 bg-white"}`}
                >
                  <p className="px-2 pb-2 pt-1 text-xs font-black uppercase tracking-wide text-zinc-400">
                    Delegar chamado
                  </p>
                  <div className="max-h-64 space-y-1 overflow-y-auto">
                    {equipe.map((membro) => (
                      <button
                        key={membro.id}
                        type="button"
                        onClick={() => delegarChamado(chamado.id, membro.id)}
                        className={`flex w-full items-center gap-2 rounded-lg p-2 text-left ${dark ? "hover:bg-white/10" : "hover:bg-zinc-50"}`}
                      >
                        <UsuarioSistemaAvatar
                          usuario={membro}
                          size="sm"
                          dark={dark}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-black">
                            {membro.nome}
                          </span>
                          <span className="block truncate text-[11px] text-zinc-500">
                            {membro.departamento || perfilLabel(membro.perfil)}
                          </span>
                        </span>
                        <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-black text-blue-700">
                          {cargaTecnico(membro.id)} ativos
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </article>
          );
        })}

        {chamadosVisiveis.length === 0 && (
          <div className="grid min-h-[360px] place-items-center p-8 text-center">
            <div>
              <CheckCircle2
                size={38}
                className="mx-auto mb-3 text-emerald-500"
              />
              <p className="font-black">Nenhum chamado nesta visão</p>
              <p
                className={`mt-1 text-sm ${dark ? "text-white/45" : "text-zinc-500"}`}
              >
                A fila está em dia ou nenhum resultado corresponde à busca.
              </p>
            </div>
          </div>
        )}
      </div>
      {detalheFila && (
        <div className="fixed inset-0 z-[70] flex justify-end">
          <button
            type="button"
            aria-label="Fechar detalhes"
            onClick={() => setDetalheFila(null)}
            className="absolute inset-0 bg-slate-950/35 backdrop-blur-[1px]"
          />
          <aside
            className={`relative z-10 h-full w-full max-w-xl overflow-y-auto border-l p-5 shadow-2xl ${dark ? "border-white/10 bg-[#101827] text-white" : "border-zinc-200 bg-white text-zinc-900"}`}
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black text-blue-600">
                  {detalheFila.numero_chamado || `#${detalheFila.id}`}
                </p>
                <h3 className="mt-1 text-xl font-black">
                  {detalheFila.titulo}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDetalheFila(null)}
                className="rounded-xl p-2 hover:bg-zinc-100"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className={statusClass(detalheFila.status)}>
                {ticketStatusLabel(detalheFila.status)}
              </Badge>
              <Badge className={prioridadeClass(detalheFila.prioridade)}>
                {detalheFila.prioridade}
              </Badge>
              <Badge>{detalheFila.tipo_chamado || "Chamado"}</Badge>
            </div>
            <div
              className={`mt-5 rounded-2xl border p-4 ${dark ? "border-white/10 bg-white/5" : "border-zinc-200 bg-zinc-50"}`}
            >
              <div className="flex items-center gap-3">
                <SolicitanteAvatar chamado={detalheFila} size="lg" />
                <div>
                  <p className="font-black">
                    {nomeSolicitanteChamado(detalheFila)}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {detalheFila.setor || "Departamento não informado"}
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-xs font-bold text-blue-700"><MapPin size={12}/>{detalheFila.municipio_solicitante||"Origem não informada"}{detalheFila.unidade_solicitante?` · ${detalheFila.unidade_solicitante}`:""}</p>
                </div>
              </div>
            </div>
            {detalheFila.ativo_id&&<div className={`mt-4 rounded-2xl border p-4 ${dark?"border-emerald-400/20 bg-emerald-400/10":"border-emerald-200 bg-emerald-50"}`}><p className="flex items-center gap-2 text-xs font-black uppercase text-emerald-700"><Monitor size={15}/>Ativo e local do atendimento</p><b className="mt-2 block">{detalheFila.ativo_hostname||"Ativo"} · {detalheFila.ativo_patrimonio||`#${detalheFila.ativo_id}`}</b><p className="mt-1 text-xs text-zinc-600">{detalheFila.ativo_municipio||"Cidade não informada"}{detalheFila.ativo_unidade?` · ${detalheFila.ativo_unidade}`:""}</p></div>}
            <div className="mt-5">
              <h4 className="mb-2 font-black">Descrição</h4>
              <p
                className={`whitespace-pre-wrap text-sm leading-6 ${dark ? "text-white/65" : "text-zinc-600"}`}
              >
                {detalheFila.descricao}
              </p>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Button onClick={() => onAssumir(detalheFila.id)}>
                <UserCheck size={16} />
                Assumir
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setDetalheFila(null);
                  onAbrir(detalheFila.id);
                }}
              >
                Abrir detalhes completos
              </Button>
            </div>
            {administrador && (
              <div className="mt-6">
                <h4 className="mb-2 font-black">Delegação rápida</h4>
                <div className="grid gap-2">
                  {equipe.map((membro) => (
                    <button
                      key={membro.id}
                      onClick={() => {
                        delegarChamado(detalheFila.id, membro.id);
                        setDetalheFila(null);
                      }}
                      className={`flex items-center gap-3 rounded-xl border p-3 text-left ${dark ? "border-white/10 hover:bg-white/10" : "border-zinc-200 hover:bg-zinc-50"}`}
                    >
                      <UsuarioSistemaAvatar
                        usuario={membro}
                        size="sm"
                        dark={dark}
                      />
                      <span className="min-w-0 flex-1">
                        <b className="block truncate">{membro.nome}</b>
                        <span className="text-xs text-zinc-500">
                          {membro.departamento || "Sem departamento"}
                        </span>
                      </span>
                      <Badge>{cargaTecnico(membro.id)} ativos</Badge>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      )}
    </section>
  );
}
