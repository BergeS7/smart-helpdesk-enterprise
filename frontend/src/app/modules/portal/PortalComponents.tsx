/**
 * Responsabilidade: componentes do portal do solicitante (navegação móvel, listas, kanban de leitura, perfil e novo chamado).
 */
import { useMemo } from "react";
import type { Dispatch, FormEvent, ReactNode, SetStateAction } from "react";
import { ArrowRight, BookOpen, Camera, CheckCircle2, FileText, LogOut, RefreshCw, Search, Star, Trash2, UserCheck, UserCog, X } from "lucide-react";
import { municipiosMaranhao } from "../../data/municipiosMaranhao";
import { TICKET_STATUS, ticketStatusLabel } from "../../domain/ticketStatus";
import { Badge, Button, Field, Input, Select, Textarea } from "../../components/shared/FormPrimitives";
import { type ApiChamado, type ApiUsuario, type ArtigoBase, type CatalogoItem, type Notificacao, type UsuarioLogado } from "../../services/api";
import { ResponsavelAvatar, formatDate, nomeResponsavelChamado, normalizeStatus, notificacaoClass, notificacaoIcone, perfilLabel, prioridadeClass, statusClass } from "../comum/appShared";

export function MobileNavButton({
  icon,
  label,
  active,
  badge,
  dark = false,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  active?: boolean;
  badge?: string;
  dark?: boolean;
  onClick: () => void;
}) {
  const activeClass = active
    ? "text-blue-600"
    : dark
      ? "text-white/62"
      : "text-zinc-500";
  const iconClass = active
    ? "bg-blue-50 text-blue-600"
    : dark
      ? "text-white/70"
      : "text-zinc-500";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-1.5 text-[11px] font-black transition ${activeClass}`}
      title={label}
    >
      <span
        className={`relative grid h-8 w-10 place-items-center rounded-2xl transition ${iconClass}`}
      >
        {icon}
        {badge && (
          <span className="absolute -right-0.5 -top-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[9px] leading-none text-white">
            {badge}
          </span>
        )}
      </span>
      <span className="max-w-full truncate leading-none">{label}</span>
    </button>
  );
}

export function MobileMoreSheet({
  title,
  children,
  dark = false,
  onClose,
}: {
  title: string;
  children: ReactNode;
  dark?: boolean;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label="Fechar menu"
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <section
        className={`absolute inset-x-0 bottom-0 rounded-t-[28px] border-t p-4 pb-[calc(env(safe-area-inset-bottom)+18px)] shadow-2xl ${dark ? "border-white/10 bg-[#101827] text-white" : "border-zinc-200 bg-white text-zinc-900"}`}
      >
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-zinc-300/80" />
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-base font-black">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className={`rounded-xl p-2 transition ${dark ? "text-white/60 hover:bg-white/10 hover:text-white" : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"}`}
          >
            <X size={18} />
          </button>
        </div>
        <div className="grid gap-2">{children}</div>
      </section>
    </div>
  );
}

export function MobileMoreAction({
  icon,
  label,
  badge,
  danger = false,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  badge?: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-12 items-center gap-3 rounded-2xl border px-3 text-sm font-black transition ${danger ? "border-red-100 bg-red-50 text-red-700 hover:bg-red-100" : "border-zinc-200 bg-white text-zinc-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"}`}
    >
      <span
        className={`grid h-9 w-9 place-items-center rounded-xl ${danger ? "bg-red-100 text-red-700" : "bg-blue-50 text-blue-700"}`}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate text-left">{label}</span>
      {badge && (
        <span className="rounded-full bg-blue-100 px-2 py-1 text-[11px] font-black text-blue-700">
          {badge}
        </span>
      )}
    </button>
  );
}

export function UsuarioSidebarButton({
  icon,
  label,
  ativo = false,
  badge,
  onClick,
  title,
  compact = false,
}: {
  icon: ReactNode;
  label: string;
  ativo?: boolean;
  badge?: string;
  onClick?: () => void;
  title?: string;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      title={title || label}
      onClick={onClick}
      className={`relative flex h-12 w-full items-center justify-center text-sm font-bold transition ${compact ? "rounded-none px-0" : "gap-3 rounded-xl px-3"} ${ativo ? "bg-white/10 text-white shadow-lg shadow-black/10" : "text-white/72 hover:bg-white/7 hover:text-white"}`}
    >
      {ativo && (
        <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-blue-500" />
      )}
      <span className="grid h-8 w-8 shrink-0 place-items-center">{icon}</span>
      <span className={compact ? "sr-only" : "min-w-0 flex-1 truncate text-left"}>{label}</span>
      {badge && (
        <span className={`grid min-h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-black leading-none text-white ${compact ? "absolute right-1 top-1" : ""}`}>
          {badge}
        </span>
      )}
    </button>
  );
}

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

export function UsuarioBaseConhecimento({
  artigos,
  busca,
  setBusca,
}: {
  artigos: ArtigoBase[];
  busca: string;
  setBusca: (value: string) => void;
}) {
  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return artigos;
    return artigos.filter((artigo) =>
      [
        artigo.titulo,
        artigo.categoria,
        artigo.palavras_chave,
        artigo.conteudo,
      ].some((valor) =>
        String(valor || "")
          .toLowerCase()
          .includes(q),
      ),
    );
  }, [artigos, busca]);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-black text-zinc-900">
              Base de conhecimento
            </h3>
            <p className="text-sm text-zinc-500">
              Pesquise soluções antes de abrir um chamado.
            </p>
          </div>
          <div className="ds-search flex h-10 min-w-[280px] items-center overflow-hidden rounded-full border border-zinc-200 bg-white shadow-sm">
            <Search size={17} className="ml-4 text-zinc-400" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar solução..."
              className="h-full min-w-0 flex-1 border-0 bg-transparent px-3 text-sm font-semibold outline-none"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtrados.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500 md:col-span-2 xl:col-span-3">
            Nenhuma solução encontrada.
          </div>
        ) : (
          filtrados.map((artigo) => (
            <div
              key={artigo.id}
              className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
            >
              <div className="mb-3 flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-700">
                  <BookOpen size={17} />
                </div>
                <Badge className="border-zinc-200 bg-zinc-50 text-zinc-600">
                  {artigo.categoria || "Solução"}
                </Badge>
              </div>
              <h4 className="font-black text-zinc-900">{artigo.titulo}</h4>
              <p className="mt-2 line-clamp-5 text-sm leading-6 text-zinc-500">
                {artigo.conteudo}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function UsuarioAvisosPanel({
  notificacoes,
  carregando,
  onAbrir,
  onMarcarTodas,
  onAtualizar,
}: {
  notificacoes: Notificacao[];
  carregando: boolean;
  onAbrir: (notificacao: Notificacao) => void;
  onMarcarTodas: () => void;
  onAtualizar: () => Promise<void>;
}) {
  const unread = notificacoes.filter((n) => !n.lida).length;
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-black text-zinc-900">Notificações</h3>
          <p className="text-sm text-zinc-500">{unread} não lida(s)</p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => onAtualizar()}
          >
            <RefreshCw size={16} />
            Atualizar
          </Button>
          <Button type="button" disabled={unread === 0} onClick={onMarcarTodas}>
            <CheckCircle2 size={16} />
            Marcar lidas
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {carregando && notificacoes.length === 0 && (
          <div className="rounded-2xl bg-zinc-50 p-8 text-center text-sm text-zinc-500">
            Carregando notificações...
          </div>
        )}
        {!carregando && notificacoes.length === 0 && (
          <div className="rounded-2xl bg-zinc-50 p-8 text-center text-sm text-zinc-500">
            Nenhuma notificação por enquanto.
          </div>
        )}
        {notificacoes.map((notificacao) => (
          <button
            key={notificacao.id}
            type="button"
            onClick={() => onAbrir(notificacao)}
            className={`flex w-full gap-3 rounded-2xl border p-4 text-left transition ${notificacao.lida ? "border-zinc-200 bg-white hover:bg-zinc-50" : "border-blue-100 bg-blue-50 hover:bg-blue-100"}`}
          >
            <span
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${notificacaoClass(notificacao.tipo)}`}
            >
              {notificacaoIcone(notificacao.tipo)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-start justify-between gap-2">
                <span className="font-black text-zinc-900">
                  {notificacao.titulo}
                </span>
                {!notificacao.lida && (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                )}
              </span>
              <span className="mt-1 block text-sm leading-6 text-zinc-500">
                {notificacao.mensagem}
              </span>
              <span className="mt-2 block text-xs font-bold text-zinc-400">
                {formatDate(notificacao.criado_em)}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function UsuarioPerfilDrawer({
  perfil,
  fotoPerfil,
  inicialPerfil,
  enviandoFoto,
  salvandoPerfil,
  setPerfil,
  onSalvar,
  onTrocarFoto,
  onRemoverFoto,
  onClose,
  onLogout,
}: {
  perfil: ApiUsuario;
  fotoPerfil: string;
  inicialPerfil: string;
  enviandoFoto: boolean;
  salvandoPerfil: boolean;
  setPerfil: (perfil: ApiUsuario) => void;
  onSalvar: (event: FormEvent) => void;
  onTrocarFoto: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoverFoto: () => void;
  onClose: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Fechar perfil"
        className="absolute inset-0 bg-slate-950/35 backdrop-blur-[1px]"
        onClick={onClose}
      />

      <aside className="relative z-10 flex h-full w-full max-w-[430px] flex-col border-l border-zinc-200 bg-white text-zinc-900 shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div>
            <p className="flex items-center gap-2 text-base font-black">
              <UserCog size={18} />
              Meu perfil
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Foto, dados pessoais e informações para triagem.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
            title="Fechar perfil"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-5 py-5">
          <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5 text-center">
            <div className="mx-auto mb-3 grid h-28 w-28 place-items-center overflow-hidden rounded-full border-4 border-white bg-gradient-to-br from-blue-500 to-sky-400 text-4xl font-black text-white shadow-xl">
              {fotoPerfil ? (
                <img
                  src={fotoPerfil}
                  alt={perfil.nome}
                  className="h-full w-full object-cover"
                />
              ) : (
                inicialPerfil
              )}
            </div>
            <h3 className="text-lg font-black">{perfil.nome}</h3>
            <p className="text-sm text-zinc-500">{perfil.email}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <Badge className="border-blue-200 bg-blue-50 text-blue-700">
                {perfilLabel(perfil.perfil)}
              </Badge>
              {perfil.departamento && (
                <Badge className="border-zinc-200 bg-white text-zinc-600">
                  {perfil.departamento}
                </Badge>
              )}
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <label
                className={`inline-flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700 ${enviandoFoto ? "pointer-events-none opacity-60" : ""}`}
              >
                <Camera size={16} />
                {enviandoFoto
                  ? "Enviando..."
                  : fotoPerfil
                    ? "Trocar foto"
                    : "Adicionar foto"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  onChange={onTrocarFoto}
                />
              </label>
              {fotoPerfil && (
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  disabled={enviandoFoto}
                  onClick={onRemoverFoto}
                >
                  <Trash2 size={16} />
                  Remover
                </Button>
              )}
            </div>
            <p className="mt-3 text-xs text-zinc-500">
              Use PNG, JPG, JPEG ou WEBP até 3 MB.
            </p>
          </div>

          <form onSubmit={onSalvar} className="mt-5 space-y-4">
            <Field label="Nome">
              <Input
                required
                value={perfil.nome}
                onChange={(e) => setPerfil({ ...perfil, nome: e.target.value })}
              />
            </Field>
            <Field label="E-mail">
              <Input
                value={perfil.email}
                disabled
                className="cursor-not-allowed bg-zinc-100 text-zinc-500"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Telefone">
                <Input
                  value={perfil.telefone || ""}
                  onChange={(e) =>
                    setPerfil({ ...perfil, telefone: e.target.value })
                  }
                  placeholder="(00) 00000-0000"
                />
              </Field>
              <Field label="Cargo">
                <Input
                  value={perfil.cargo || ""}
                  onChange={(e) =>
                    setPerfil({ ...perfil, cargo: e.target.value })
                  }
                  placeholder="Seu cargo"
                />
              </Field>
            </div>
            <Field label="Departamento">
              <Input
                value={perfil.departamento || ""}
                onChange={(e) =>
                  setPerfil({ ...perfil, departamento: e.target.value })
                }
                placeholder="TI, Financeiro, Operações..."
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Município">
                <select value={perfil.municipio || ""} onChange={(e) => { const municipio = e.target.value; setPerfil({ ...perfil, municipio, unidade: municipio ? `Maranhão Motos - ${municipio}` : "" }); }} className="h-10 w-full rounded-md border border-input bg-input-background px-3 text-sm">
                  <option value="">Selecione</option>{municipiosMaranhao.map((item) => <option key={item.nome} value={item.nome}>{item.nome}</option>)}
                </select>
              </Field>
              <Field label="Unidade"><Input readOnly value={perfil.unidade || ""} placeholder="Definida pelo município" /></Field>
            </div>
            <Button className="w-full" disabled={salvandoPerfil}>
              <UserCheck size={16} />
              {salvandoPerfil ? "Salvando..." : "Salvar perfil"}
            </Button>
          </form>
        </div>

        <div className="border-t border-zinc-100 p-5">
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={onLogout}
          >
            <LogOut size={16} />
            Sair da conta
          </Button>
        </div>
      </aside>
    </div>
  );
}

export function UsuarioNovoChamadoModal({
  perfil,
  tipos,
  novo,
  setNovo,
  base,
  loading,
  onClose,
  onSubmit,
}: {
  perfil: UsuarioLogado | ApiUsuario;
  tipos: CatalogoItem[];
  novo: { titulo: string; descricao: string; tipo_chamado: string; processo_atual:string; problema:string; resultado_esperado:string; frequencia:string; pessoas:string; tempo_minutos:string; sistemas:string; impacto_nao_execucao:string; beneficios:string };
  setNovo: Dispatch<
    SetStateAction<{ titulo: string; descricao: string; tipo_chamado: string; processo_atual:string; problema:string; resultado_esperado:string; frequencia:string; pessoas:string; tempo_minutos:string; sistemas:string; impacto_nao_execucao:string; beneficios:string }>
  >;
  base: ArtigoBase[];
  loading: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  const tiposDisponiveis =
    tipos.length > 0
      ? tipos.map((tipo) => tipo.nome)
      : [
          "Incidente",
          "Solicitação",
          "Dúvida",
          "Melhoria",
          "Acesso",
          "Equipamento",
        ];
  const allTypes=Array.from(new Set([...tiposDisponiveis,"Bug","Melhoria","Automação","Integração","Dashboard / Relatório","Novo Sistema"]));
  const developmentType=["Bug","Melhoria","Automação","Integração","Dashboard / Relatório","Novo Sistema"].includes(novo.tipo_chamado);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-4xl overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-zinc-100 px-6 py-5">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
              <FileText size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-zinc-800">
                Abrir novo chamado
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Preencha as informações abaixo para abrir um novo chamado
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-2xl p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800"
          >
            <X size={22} />
          </button>
        </div>

        <form
          onSubmit={onSubmit}
          className="max-h-[78vh] overflow-auto px-6 py-6"
        >
          <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <UsuarioCampoReadOnly label="Nome" value={perfil.nome || "-"} />
            <UsuarioCampoReadOnly label="E-mail" value={perfil.email || "-"} />
            <UsuarioCampoReadOnly
              label="Telefone"
              value={perfil.telefone || "-"}
            />
            <UsuarioCampoReadOnly label="Cargo" value={perfil.cargo || "-"} />
            <UsuarioCampoReadOnly label="Cidade / área de atuação" value={perfil.municipio || "Atualize seu perfil"} />
            <UsuarioCampoReadOnly label="Unidade / local padrão" value={perfil.unidade || "Atualize seu perfil"} />
          </div>

          <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Tipo do chamado">
              <Select
                value={novo.tipo_chamado}
                onChange={(e) =>
                  setNovo((prev) => ({ ...prev, tipo_chamado: e.target.value }))
                }
              >
                {allTypes.map((tipo) => (
                  <option key={tipo}>{tipo}</option>
                ))}
              </Select>
            </Field>
            <UsuarioCampoReadOnly
              label="Departamento"
              value={
                perfil.departamento ||
                "Atualize seu perfil antes de abrir chamado"
              }
            />
          </div>

          <div className="space-y-4">
            <Field label="Título">
              <Input
                required
                value={novo.titulo}
                onChange={(e) =>
                  setNovo((prev) => ({ ...prev, titulo: e.target.value }))
                }
                placeholder="Ex.: Não consigo acessar o sistema"
              />
            </Field>
            <Field label="Descrição">
              <Textarea
                required
                value={novo.descricao}
                onChange={(e) =>
                  setNovo((prev) => ({ ...prev, descricao: e.target.value }))
                }
                placeholder="Descreva com detalhes o problema ou sua solicitação..."
                className="min-h-[150px]"
              />
            </Field>
            {developmentType && <div className="grid gap-4 rounded-2xl border border-violet-200 bg-violet-50/50 p-4 md:grid-cols-2">
              <div className="md:col-span-2"><p className="font-black text-violet-900">Conte-nos sobre o resultado que você precisa</p><p className="text-sm text-violet-700">Não é necessário conhecer a solução técnica. A equipe de TI fará essa análise.</p></div>
              <Field label="Como o processo funciona atualmente?"><Textarea required value={novo.processo_atual} onChange={e=>setNovo(prev=>({...prev,processo_atual:e.target.value}))} placeholder="Ex.: Recebo as solicitações por e-mail, copio os dados para uma planilha e envio o relatório ao gestor." className="min-h-24"/></Field>
              <Field label="Qual problema você quer resolver?"><Textarea required value={novo.problema} onChange={e=>setNovo(prev=>({...prev,problema:e.target.value}))} placeholder="Ex.: O preenchimento manual demora, gera erros e dificulta acompanhar solicitações pendentes." className="min-h-24"/></Field>
              <Field label="Resultado esperado"><Textarea value={novo.resultado_esperado} onChange={e=>setNovo(prev=>({...prev,resultado_esperado:e.target.value}))} placeholder="Ex.: Ter uma tela que reúna as solicitações e gere o relatório automaticamente."/></Field>
              <Field label="Frequência"><Select value={novo.frequencia} onChange={e=>setNovo(prev=>({...prev,frequencia:e.target.value}))}><option value="">Selecione (ex.: diariamente)</option><option value="varias_dia">Várias vezes ao dia</option><option value="diaria">Diariamente</option><option value="semanal">Semanalmente</option><option value="mensal">Mensalmente</option><option value="ocasional">Ocasionalmente</option><option value="outro">Outro</option></Select></Field>
              <Field label="Pessoas envolvidas"><Input type="number" min="0" value={novo.pessoas} onChange={e=>setNovo(prev=>({...prev,pessoas:e.target.value}))} placeholder="Ex.: 5"/></Field>
              <Field label="Tempo atual por execução (minutos)"><Input type="number" min="0" value={novo.tempo_minutos} onChange={e=>setNovo(prev=>({...prev,tempo_minutos:e.target.value}))} placeholder="Ex.: 30"/></Field>
              <Field label="Sistemas envolvidos"><Input value={novo.sistemas} onChange={e=>setNovo(prev=>({...prev,sistemas:e.target.value}))} placeholder="Ex.: ERP, Excel, e-mail e Power BI"/></Field>
              <Field label="Impacto se não for executada"><Textarea value={novo.impacto_nao_execucao} onChange={e=>setNovo(prev=>({...prev,impacto_nao_execucao:e.target.value}))} placeholder="Ex.: Atraso no atendimento, risco de perder informações e dificuldade para cumprir o prazo."/></Field>
              <Field label="Benefícios esperados"><Input value={novo.beneficios} onChange={e=>setNovo(prev=>({...prev,beneficios:e.target.value}))} placeholder="Ex.: Reduzir tempo, erros e retrabalho; melhorar o acompanhamento."/></Field>
            </div>}
          </div>

          {base.length > 0 && (
            <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <div className="mb-3 flex items-center gap-2 text-blue-800">
                <BookOpen size={18} />
                <p className="font-black">Sugestões da base de conhecimento</p>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {base.slice(0, 3).map((artigo) => (
                  <div
                    key={artigo.id}
                    className="rounded-2xl bg-white p-3 shadow-sm"
                  >
                    <p className="text-sm font-black text-zinc-800">
                      {artigo.titulo}
                    </p>
                    <p className="mt-1 line-clamp-3 text-xs leading-5 text-zinc-500">
                      {artigo.conteudo}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center justify-end gap-3 border-t border-zinc-100 pt-5">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button disabled={loading}>
              {loading ? "Criando..." : "Criar chamado"}
              {!loading && <ArrowRight size={17} />}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function UsuarioCampoReadOnly({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-zinc-500">
        {label}
      </span>
      <div className="flex h-11 items-center rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm font-semibold text-zinc-700">
        {value}
      </div>
    </div>
  );
}
