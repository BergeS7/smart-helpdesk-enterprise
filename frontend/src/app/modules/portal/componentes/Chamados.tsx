/**
 * Responsabilidade: cartões, quadro de leitura e lista dos chamados do solicitante.
 */
import { ArrowRight, CheckCircle2, FileText, Star } from "lucide-react";
import { TICKET_STATUS, ticketStatusLabel } from "../../../domain/ticketStatus";
import { Badge } from "../../../components/shared/FormPrimitives";
import { type ApiChamado } from "../../../services/api";
import { ResponsavelAvatar, formatDate, nomeResponsavelChamado, normalizeStatus, prioridadeClass, statusClass } from "../../comum/appShared";

export function UsuarioMiniChamadoCard({
  chamado,
  onAbrir,
  onAvaliar,
  resolvido = false,
}: {
  chamado: ApiChamado;
  onAbrir: (id: number) => void;
  onAvaliar?: (id: number) => void;
  resolvido?: boolean;
}) {
  const avaliado = Boolean(chamado.avaliacao || chamado.avaliacao_nota);
  return (
    <article className="user-ticket-card w-full rounded-xl border border-zinc-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
      <button type="button" onClick={() => onAbrir(chamado.id)} className="block w-full text-left">
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <span className="truncate text-xs font-black text-blue-700">
          {chamado.numero_chamado || `#${chamado.id}`}
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          <ResponsavelAvatar chamado={chamado} size="sm" />
          {resolvido ? (
            <CheckCircle2 size={20} className="shrink-0 text-emerald-500" />
          ) : (
            <span className="text-lg leading-none text-zinc-400">•••</span>
          )}
        </span>
      </div>
      <p className="line-clamp-1 text-sm font-black text-zinc-900">
        {chamado.titulo}
      </p>
      <p className="mt-1 line-clamp-1 text-xs leading-5 text-zinc-500">
        {chamado.descricao}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] font-bold text-zinc-500">
        <span
          className={`h-2 w-2 rounded-full ${chamado.prioridade === "Alta" ? "bg-red-500" : chamado.prioridade === "Baixa" ? "bg-emerald-500" : "bg-amber-500"}`}
        />
        <span>{chamado.prioridade || "Média"}</span>
        <span className="h-4 w-px bg-zinc-200" />
        <span className="truncate">{chamado.tipo_chamado || "Suporte"}</span>
        <span className="h-4 w-px bg-zinc-200" />
        <span className="min-w-0 truncate">
          {nomeResponsavelChamado(chamado) || "Sem responsável"}
        </span>
        <span className="ml-auto text-zinc-400">
          {resolvido
            ? `Resolvido em ${formatDate(chamado.atualizado_em || chamado.criado_em)}`
            : `Atualizado em ${formatDate(chamado.atualizado_em || chamado.criado_em)}`}
        </span>
      </div>
      {chamado.vencido && (
        <Badge className="mt-3 border-red-200 bg-red-50 text-red-700">
          SLA vencido
        </Badge>
      )}
      </button>
      {resolvido && (
        <div className="mt-3 border-t border-zinc-100 pt-3">
          {avaliado ? (
            <span className="inline-flex items-center gap-2 text-xs font-black text-emerald-600"><CheckCircle2 size={15} />Atendimento avaliado</span>
          ) : (
            <button type="button" onClick={() => onAvaliar?.(chamado.id)} className="flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-amber-50 text-xs font-black text-amber-700 transition hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"><Star size={16} />Avaliar atendimento</button>
          )}
        </div>
      )}
    </article>
  );
}

export type UsuarioBoardColuna = {
  id: string;
  titulo: string;
  resumo: string;
  topBorder: string;
  accent: string;
  badge: string;
  chamados: ApiChamado[];
};

export function UsuarioKanbanLeitura({
  colunas,
  onAbrir,
  onAvaliar,
  onVerTodos,
}: {
  colunas: UsuarioBoardColuna[];
  onAbrir: (id: number) => void;
  onAvaliar?: (id: number) => void;
  onVerTodos?: () => void;
}) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="mb-2 flex shrink-0 items-center justify-between gap-3">
        <h2 className="text-xl font-black tracking-tight text-zinc-900">
          Meus chamados
        </h2>
        {onVerTodos && (
          <button
            type="button"
            onClick={onVerTodos}
            className="hidden items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-black text-blue-700 shadow-sm transition hover:bg-blue-50 sm:flex"
          >
            Ver todos <ArrowRight size={16} />
          </button>
        )}
      </div>
      <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-3">
        {colunas.map((coluna) => (
          <div
            key={coluna.id}
            className={`user-kanban-column flex min-h-[260px] flex-col overflow-hidden rounded-[18px] border border-zinc-200 border-t-[5px] ${coluna.topBorder} bg-white/90 p-3 shadow-sm shadow-slate-200/50 lg:min-h-0`}
          >
            <div className="mb-2 flex shrink-0 items-center justify-between gap-2 px-1 py-1">
              <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                <h4 className="truncate text-sm font-black text-zinc-900">
                  {coluna.titulo}
                </h4>
                <p className="mt-0.5 text-[11px] font-medium text-zinc-500">
                  {coluna.resumo}
                </p>
              </div>
              <span
                className={`grid h-7 min-w-7 place-items-center rounded-full px-2 text-xs font-black ${coluna.badge}`}
              >
                {coluna.chamados.length}
              </span>
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pr-1">
              {coluna.chamados.slice(0, 3).map((chamado) => (
                <UsuarioMiniChamadoCard
                  key={chamado.id}
                  chamado={chamado}
                  onAbrir={onAbrir}
                  onAvaliar={onAvaliar}
                  resolvido={coluna.id === "resolvidos"}
                />
              ))}
              {onVerTodos && coluna.chamados.length > 3 && (
                <button
                  type="button"
                  onClick={onVerTodos}
                  className="w-full rounded-xl border border-dashed border-blue-200 bg-blue-50/70 px-3 py-2 text-xs font-black text-blue-700 transition hover:bg-blue-100"
                >
                  +{coluna.chamados.length - 3} chamado(s)
                </button>
              )}
              {coluna.chamados.length === 0 && (
                <div className="user-kanban-empty rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/70 p-6 text-center text-xs font-semibold text-zinc-400">
                  Nenhum chamado aqui
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function UsuarioChamadoLista({
  chamados,
  onAbrir,
  onAvaliar,
  titulo = "Meus chamados",
  compacto = false,
  busca,
}: {
  chamados: ApiChamado[];
  onAbrir: (id: number) => void;
  onAvaliar?: (id: number) => void;
  titulo?: string;
  compacto?: boolean;
  busca?: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-base font-black text-zinc-900">{titulo}</h3>
          <p className="text-xs font-medium text-zinc-500">
            {busca
              ? `Resultado para “${busca}”`
              : "Acompanhe status, prioridade, comentários e anexos."}
          </p>
        </div>
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-black text-zinc-600">
          {chamados.length} chamado(s)
        </span>
      </div>

      <div className="divide-y divide-zinc-100">
        {chamados.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-8 text-center">
            <FileText className="mx-auto mb-3 text-zinc-400" size={34} />
            <p className="font-bold text-zinc-700">Nenhum chamado encontrado</p>
            <p className="mt-1 text-sm text-zinc-500">
              Abra um novo chamado ou limpe a pesquisa atual.
            </p>
          </div>
        ) : (
          chamados.map((c) => {
            const concluido=normalizeStatus(c.status)===TICKET_STATUS.CLOSED;
            const avaliado=Boolean(c.avaliacao||c.avaliacao_nota);
            return <article key={c.id} className="user-ticket-list-item rounded-xl px-2 py-4 transition hover:bg-zinc-50">
            <button onClick={() => onAbrir(c.id)} className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-h-0 min-w-0 flex-1 items-start gap-3">
                  <ResponsavelAvatar chamado={c} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-blue-700">
                      {c.numero_chamado || `#${c.id}`}
                    </p>
                    <p className="mt-1 font-bold text-zinc-800">{c.titulo}</p>
                    {!compacto && (
                      <p className="mt-1 line-clamp-2 text-sm text-zinc-500">
                        {c.descricao}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-zinc-400">
                      {c.tipo_chamado || "Chamado"} • Criado em{" "}
                      {formatDate(c.criado_em)} • {c.total_comentarios || 0}{" "}
                      comentários • {c.total_anexos || 0} anexos
                    </p>
                    <p className="mt-1 text-xs font-semibold text-zinc-500">
                      Responsável:{" "}
                      {nomeResponsavelChamado(c) || "Sem responsável definido"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <Badge className={statusClass(c.status)}>{ticketStatusLabel(c.status)}</Badge>
                  <Badge className={prioridadeClass(c.prioridade)}>
                    {c.prioridade}
                  </Badge>
                  {c.vencido && (
                    <Badge className="border-red-200 bg-red-50 text-red-700">
                      SLA vencido
                    </Badge>
                  )}
                </div>
              </div>
            </button>
            {concluido&&!avaliado&&<div className="mt-3 flex justify-end border-t border-zinc-100 pt-3"><button type="button" onClick={()=>onAvaliar?.(c.id)} className="inline-flex h-9 items-center gap-2 rounded-xl bg-amber-50 px-4 text-xs font-black text-amber-700 transition hover:bg-amber-100"><Star size={15}/>Avaliar atendimento</button></div>}
            {concluido&&avaliado&&<div className="mt-3 flex justify-end border-t border-zinc-100 pt-3"><span className="inline-flex items-center gap-2 text-xs font-black text-emerald-600"><CheckCircle2 size={15}/>Atendimento avaliado</span></div>}
          </article>})
        )}
      </div>
    </div>
  );
}
