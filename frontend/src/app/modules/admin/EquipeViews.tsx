/**
 * Responsabilidade: visões da equipe: histórico, carteira e dashboard.
 */
import { useMemo, useState } from "react";
import { AlertTriangle, BarChart3, Building2, CircleDot, Eye, History, ListChecks, LockKeyhole, RefreshCw, RotateCcw, Search, Star, Ticket, UserCog, Users } from "lucide-react";
import { toast } from "sonner";
import { REOPEN_WINDOW_DAYS, TICKET_STATUS, canonicalTicketStatus, isReopenWindowOpen, ticketStatusLabel } from "../../domain/ticketStatus";
import { Badge, Card, Input, Select } from "../../components/shared/FormPrimitives";
import { reabrirChamado, type ApiChamado, type ApiUsuario, type DashboardResumo } from "../../services/api";
import { ResponsavelAvatar, UsuarioSistemaAvatar, formatDate, formatarMinutos, nomeResponsavelChamado, normalizeStatus, perfilLabel, statusClass } from "../comum/appShared";

export function HistoricoEquipeView({
  chamados,
  dark,
  administrador,
  onAbrir,
  onAtualizar,
}: {
  chamados: ApiChamado[];
  dark: boolean;
  administrador: boolean;
  onAbrir: (id: number) => void;
  onAtualizar: () => Promise<void> | void;
}) {
  const [busca, setBusca] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [reabrindoId, setReabrindoId] = useState<number | null>(null);
  async function reabrirRapido(chamado: ApiChamado, event: React.MouseEvent) {
    event.stopPropagation();
    const motivo = window.prompt(
      `Reabrir ${chamado.numero_chamado || `#${chamado.id}`}?\n\nExplique por que o problema não foi resolvido (obrigatório):`,
    );
    if (motivo === null) return;
    if (!motivo.trim()) {
      toast.error("Explique o motivo para reabrir o chamado.");
      return;
    }
    try {
      setReabrindoId(chamado.id);
      await reabrirChamado(chamado.id, motivo.trim());
      toast.success("Chamado reaberto e movido para Em andamento.");
      await onAtualizar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível reabrir o chamado.");
    } finally {
      setReabrindoId(null);
    }
  }
  const responsaveis = useMemo(
    () =>
      Array.from(
        new Set(chamados.map(nomeResponsavelChamado).filter(Boolean)),
      ).sort(),
    [chamados],
  );
  const filtrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    return chamados.filter((chamado) => {
      const correspondeResponsavel =
        !responsavel || nomeResponsavelChamado(chamado) === responsavel;
      const texto = [
        chamado.numero_chamado,
        chamado.titulo,
        chamado.solicitante,
        chamado.setor,
        nomeResponsavelChamado(chamado),
      ]
        .join(" ")
        .toLocaleLowerCase("pt-BR");
      return correspondeResponsavel && (!termo || texto.includes(termo));
    });
  }, [busca, chamados, responsavel]);

  return (
    <Card>
      <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
              <History size={20} />
            </span>
            <div>
              <h3 className="text-base font-black">
                Histórico de chamados da equipe
              </h3>
              <p
                className={`text-xs ${dark ? "text-white/55" : "text-zinc-500"}`}
              >
                Registros encerrados preservados para consulta e auditoria.
              </p>
            </div>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-[minmax(240px,1fr)_220px]">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
            />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Número, título ou solicitante"
              className="pl-9"
            />
          </div>
          <Select
            value={responsavel}
            onChange={(e) => setResponsavel(e.target.value)}
          >
            <option value="">Todos os responsáveis</option>
            {responsaveis.map((nome) => (
              <option key={nome} value={nome}>
                {nome}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-bold text-zinc-500">
          {filtrados.length} de {chamados.length} registro(s)
        </span>
        <Badge className="border-slate-200 bg-slate-50 text-slate-600">
          <LockKeyhole size={12} className="mr-1" />
          Somente leitura
        </Badge>
      </div>
      <div className="divide-y divide-zinc-100">
        {filtrados.map((chamado) => {
          // Mesma referência usada em "Encerrado em" logo abaixo: chamado antigo sem finalizado_em
          // gravado cai para atualizado_em, em vez de liberar reabertura sem limite.
          const referenciaConclusao = chamado.finalizado_em || chamado.atualizado_em;
          const dentroDoPrazo = administrador || isReopenWindowOpen(referenciaConclusao);
          return (
            <div
              key={chamado.id}
              role="button"
              tabIndex={0}
              onClick={() => onAbrir(chamado.id)}
              onKeyDown={(e) => {
                // Ignora Enter/Espaço originado do botão "Reabrir" (foco nele, não na linha),
                // senão o teclado abriria o detalhe junto com a reabertura.
                if (e.target !== e.currentTarget) return;
                if (e.key === "Enter" || e.key === " ") onAbrir(chamado.id);
              }}
              className={`grid w-full cursor-pointer gap-3 py-4 text-left transition md:grid-cols-[110px_minmax(0,1fr)_190px_170px_110px_130px] md:items-center ${dark ? "hover:bg-white/5" : "hover:bg-zinc-50"}`}
            >
              <span className="text-sm font-black text-blue-700">
                {chamado.numero_chamado || `#${chamado.id}`}
              </span>
              <span className="min-w-0">
                <b className="block truncate text-sm">{chamado.titulo}</b>
                <small className="block truncate text-zinc-500">
                  {chamado.solicitante} · {chamado.setor || "Sem departamento"}
                </small>
              </span>
              <span className="flex items-center gap-2 text-xs font-bold">
                <ResponsavelAvatar chamado={chamado} size="sm" />
                {nomeResponsavelChamado(chamado) || "Não definido"}
              </span>
              <span className="text-xs text-zinc-500">
                Encerrado em
                <br />
                <b className="text-zinc-700">
                  {formatDate(chamado.finalizado_em || chamado.atualizado_em)}
                </b>
              </span>
              <span className="flex items-center justify-between gap-2">
                <Badge className={statusClass(chamado.status)}>
                  {ticketStatusLabel(chamado.status)}
                </Badge>
                <Eye size={16} className="text-zinc-400" />
              </span>
              <span className="flex justify-end">
                {dentroDoPrazo ? (
                  <button
                    type="button"
                    disabled={reabrindoId === chamado.id}
                    onClick={(e) => void reabrirRapido(chamado, e)}
                    title={`Reabertura permitida até ${REOPEN_WINDOW_DAYS} dias após a conclusão`}
                    className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[11px] font-black text-blue-700 transition hover:bg-blue-100 disabled:opacity-60"
                  >
                    <RotateCcw size={13} />
                    {reabrindoId === chamado.id ? "Reabrindo..." : "Reabrir"}
                  </button>
                ) : (
                  <span className="text-[10px] text-zinc-400" title={`O prazo de ${REOPEN_WINDOW_DAYS} dias para reabertura terminou`}>
                    Prazo encerrado
                  </span>
                )}
              </span>
            </div>
          );
        })}
        {filtrados.length === 0 && (
          <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-zinc-500">
            Nenhum chamado encerrado corresponde à pesquisa.
          </div>
        )}
      </div>
    </Card>
  );
}

export function CarteiraEquipeView({
  equipe,
  chamados,
  dark,
  onAbrir,
  onRedistribuir,
}: {
  equipe: ApiUsuario[];
  chamados: ApiChamado[];
  dark: boolean;
  onAbrir: (id: number) => void;
  onRedistribuir: (chamadoId: number, tecnicoId: number) => Promise<void>;
}) {
  const [arrastando, setArrastando] = useState<number | null>(null);
  const capacidade = 8;
  const cargaDe = (id: number) => chamados.filter((chamado) => Number(chamado.responsavel_id) === Number(id) && ![TICKET_STATUS.RESOLVED,TICKET_STATUS.CLOSED,TICKET_STATUS.CANCELED].some((status) => status === canonicalTicketStatus(chamado.status))).length;

  function presenca(membro: ApiUsuario) {
    if (!membro.ultimo_login_em)
      return { label: "Ausente", cor: "bg-zinc-400" };
    const minutos =
      (Date.now() - new Date(membro.ultimo_login_em).getTime()) / 60000;
    if (minutos <= 30) return { label: "Online", cor: "bg-emerald-500" };
    if (minutos <= 480) return { label: "Recente", cor: "bg-amber-500" };
    return { label: "Ausente", cor: "bg-zinc-400" };
  }

  return (
    <div className="space-y-4">
      <div
        className={`rounded-2xl border p-5 ${dark ? "border-white/10 bg-white/5" : "border-zinc-200 bg-white"}`}
      >
        <h3 className="text-lg font-black">Carteira da equipe técnica</h3>
        <p className="mt-1 text-sm text-zinc-500">
          Carga, SLA e disponibilidade estimada pelo último acesso. Arraste um
          chamado para redistribuí-lo.
        </p>
      </div>
      <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
        {equipe.map((membro) => {
          const itens = chamados.filter(
            (chamado) =>
              Number(chamado.responsavel_id) === Number(membro.id) &&
              normalizeStatus(chamado.status) !== TICKET_STATUS.CLOSED,
          );
          const vencidos = itens.filter(
            (chamado) => chamado.vencido || chamado.sla_status === "vencido",
          ).length;
          const ocupacao = Math.min(
            100,
            Math.round((itens.length / capacidade) * 100),
          );
          const situacao = presenca(membro);
          const excedentes = Math.max(0, itens.length - capacidade);
          const recomendado = equipe
            .filter((candidato) => Number(candidato.id) !== Number(membro.id) && cargaDe(candidato.id) < capacidade)
            .sort((a, b) => cargaDe(a.id) - cargaDe(b.id))[0];
          return (
            <section
              key={membro.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={async () => {
                if (arrastando && itens.length >= capacidade) {
                  toast.error(`${membro.nome} atingiu ${capacidade}/${capacidade}.${recomendado ? ` Sugestão: ${recomendado.nome} (${cargaDe(recomendado.id)}/${capacidade}).` : " Nenhum técnico disponível."}`);
                } else if (arrastando) await onRedistribuir(arrastando, membro.id);
                setArrastando(null);
              }}
              className={`rounded-2xl border p-4 shadow-sm transition ${excedentes ? "border-red-300 bg-red-50/30 ring-2 ring-red-100" : arrastando ? "border-blue-300 ring-2 ring-blue-100" : dark ? "border-white/10 bg-white/5" : "border-zinc-200 bg-white"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <UsuarioSistemaAvatar
                    usuario={membro}
                    size="md"
                    dark={dark}
                  />
                  <div className="min-w-0">
                    <p className="truncate font-black">{membro.nome}</p>
                    <p className="truncate text-xs text-zinc-500">
                      {membro.departamento || perfilLabel(membro.perfil)}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-[11px] font-bold text-zinc-500">
                      <span
                        className={`h-2 w-2 rounded-full ${situacao.cor}`}
                      />
                      {situacao.label}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black">
                    {itens.length}
                    <span className="text-xs text-zinc-400">/{capacidade}</span>
                  </p>
                  <p className="text-[10px] font-bold uppercase text-zinc-400">
                    capacidade
                  </p>
                </div>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className={`h-full rounded-full ${ocupacao >= 100 ? "bg-red-500" : ocupacao >= 75 ? "bg-amber-500" : "bg-emerald-500"}`}
                  style={{ width: `${ocupacao}%` }}
                />
              </div>
              {excedentes > 0 && <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700"><b className="flex items-center gap-2"><AlertTriangle size={15}/>{excedentes} chamado(s) acima da capacidade</b><p className="mt-1">Novas atribuições estão bloqueadas para este técnico.</p>{recomendado&&<button type="button" onClick={async()=>{const chamado=itens[itens.length-1];if(chamado)await onRedistribuir(chamado.id,recomendado.id)}} className="mt-2 w-full rounded-lg bg-white px-3 py-2 font-black text-red-700 shadow-sm">Mover 1 excedente para {recomendado.nome} · {cargaDe(recomendado.id)}/{capacidade}</button>}</div>}
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-blue-50 p-2 text-blue-700">
                  <b className="block text-lg">{itens.length}</b>
                  <span className="text-[10px] font-bold">Ativos</span>
                </div>
                <div className="rounded-xl bg-red-50 p-2 text-red-700">
                  <b className="block text-lg">{vencidos}</b>
                  <span className="text-[10px] font-bold">Vencidos</span>
                </div>
                <div className="rounded-xl bg-emerald-50 p-2 text-emerald-700">
                  <b className="block text-lg">
                    {Math.max(0, capacidade - itens.length)}
                  </b>
                  <span className="text-[10px] font-bold">Disponível</span>
                </div>
              </div>
              <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
                {itens.map((chamado) => (
                  <button
                    draggable
                    onDragStart={() => setArrastando(chamado.id)}
                    onDragEnd={() => setArrastando(null)}
                    key={chamado.id}
                    type="button"
                    onClick={() => onAbrir(chamado.id)}
                    className={`flex w-full cursor-grab items-center gap-3 rounded-xl border p-3 text-left transition ${dark ? "border-white/10 hover:bg-white/10" : "border-zinc-200 hover:bg-zinc-50"}`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-black text-blue-700">
                        {chamado.numero_chamado || `#${chamado.id}`}
                      </span>
                      <span className="block truncate text-sm font-bold">
                        {chamado.titulo}
                      </span>
                    </span>
                    {chamado.vencido && (
                      <AlertTriangle size={15} className="text-red-500" />
                    )}
                    <Badge className={statusClass(chamado.status)}>
                      {ticketStatusLabel(chamado.status)}
                    </Badge>
                  </button>
                ))}
                {itens.length === 0 && (
                  <p className="rounded-xl border border-dashed p-5 text-center text-sm text-zinc-500">
                    Solte um chamado aqui.
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

export function DashboardView({
  dashboard,
  chamados,
  dark,
}: {
  dashboard: DashboardResumo;
  chamados: ApiChamado[];
  dark: boolean;
}) {
  const cards = [
    {
      label: "Total",
      value: dashboard.totalChamados,
      icon: Ticket,
      tone: "blue",
      hint: "Chamados registrados",
    },
    {
      label: "Abertos",
      value: dashboard.abertos,
      icon: CircleDot,
      tone: "blue",
      hint: "Aguardando triagem",
    },
    {
      label: "Em andamento",
      value: dashboard.emAndamento,
      icon: RefreshCw,
      tone: "amber",
      hint: "Sendo tratados",
    },
    {
      label: "Sem responsável",
      value: dashboard.semResponsavel || 0,
      icon: UserCog,
      tone: "purple",
      hint: "Precisam de dono",
    },
    {
      label: "Vencidos",
      value: dashboard.vencidos,
      icon: AlertTriangle,
      tone: "red",
      hint: "Fora do SLA",
    },
    {
      label: "Satisfação",
      value: dashboard.satisfacaoMedia ? `${dashboard.satisfacaoMedia}/5` : "-",
      icon: Star,
      tone: "emerald",
      hint: `${dashboard.avaliacoesTotal || 0} avaliação(ões)`,
    },
  ] as const;

  const prioridadeMax = Math.max(
    1,
    ...dashboard.porPrioridade.map((p) => Number(p.total || 0)),
  );
  const statusMax = Math.max(
    1,
    ...dashboard.porStatus.map((p) => Number(p.total || 0)),
  );
  const tecnicoMax = Math.max(
    1,
    ...(dashboard.porTecnico || []).map((p) => Number(p.total || 0)),
  );

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {cards.map(({ label, value, icon: Icon, tone, hint }) => (
          <Card key={label} className="dashboard-card">
            <div
              className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl dashboard-tone-${tone}`}
            >
              <Icon size={20} />
            </div>
            <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">
              {label}
            </p>
            <p className="mt-1 text-3xl font-black text-zinc-900">{value}</p>
            <p className="mt-1 text-xs font-semibold text-zinc-400">{hint}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <h3 className="mb-4 flex items-center gap-2 font-black">
            <BarChart3 size={18} />
            Prioridades
          </h3>
          {dashboard.porPrioridade.map((p) => (
            <div key={p.prioridade || "Sem prioridade"} className="mb-3">
              <div className="mb-1 flex justify-between text-sm">
                <b>{p.prioridade || "Sem prioridade"}</b>
                <span>{p.total}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full bg-blue-600"
                  style={{
                    width: `${Math.max(5, (p.total / prioridadeMax) * 100)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </Card>

        <Card className="xl:col-span-1">
          <h3 className="mb-4 flex items-center gap-2 font-black">
            <ListChecks size={18} />
            Status
          </h3>
          {dashboard.porStatus.map((s) => (
            <div key={s.status || "Sem status"} className="mb-3">
              <div className="mb-1 flex justify-between text-sm">
                <b>{s.status ? ticketStatusLabel(s.status) : "Sem status"}</b>
                <span>{s.total}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{
                    width: `${Math.max(5, (s.total / statusMax) * 100)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </Card>

        <Card className="xl:col-span-1">
          <h3 className="mb-4 flex items-center gap-2 font-black">
            <Users size={18} />
            Técnicos
          </h3>
          {(dashboard.porTecnico || []).length > 0 ? (
            (dashboard.porTecnico || []).map((t) => (
              <div key={t.tecnico || "Sem técnico"} className="mb-3">
                <div className="mb-1 flex justify-between text-sm">
                  <b>{t.tecnico || "Sem técnico"}</b>
                  <span>{t.total}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className="h-full rounded-full bg-violet-500"
                    style={{
                      width: `${Math.max(5, (t.total / tecnicoMax) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-2xl border border-dashed border-zinc-200 p-6 text-center text-sm text-zinc-500">
              Nenhum técnico com chamados no período.
            </p>
          )}
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <Card>
          <h3 className="mb-4 flex items-center gap-2 font-black">
            <Building2 size={18} />
            Chamados por departamento
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            {dashboard.porDepartamento.map((d) => (
              <div
                key={d.departamento || "Sem departamento"}
                className="rounded-2xl border border-zinc-200 bg-white p-3"
              >
                <div className="mb-1 flex justify-between text-sm">
                  <b>{d.departamento || "Sem departamento"}</b>
                  <span>{d.total}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className="h-full rounded-full bg-sky-500"
                    style={{
                      width: `${Math.max(5, (d.total / Math.max(1, dashboard.totalChamados)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h3 className="mb-4 flex items-center gap-2 font-black">
            <AlertTriangle size={18} />
            Chamados vencidos recentes
          </h3>
          <div className="space-y-2">
            {chamados
              .filter((c) => c.vencido)
              .slice(0, 8)
              .map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="flex w-full items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-left text-red-800"
                >
                  <span className="min-w-0">
                    <b className="block truncate">
                      {c.numero_chamado || `#${c.id}`}
                    </b>
                    <span className="line-clamp-1 text-sm">{c.titulo}</span>
                  </span>
                  <span className="text-xs font-black">
                    {formatarMinutos(c.sla_minutos_restantes)}
                  </span>
                </button>
              ))}
            {chamados.filter((c) => c.vencido).length === 0 && (
              <p className="rounded-2xl border border-dashed border-zinc-200 p-6 text-center text-sm text-zinc-500">
                Nenhum chamado vencido agora.
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
