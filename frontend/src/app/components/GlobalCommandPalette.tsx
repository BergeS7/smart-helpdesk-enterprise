/**
 * Responsabilidade: Componente de interface de global command palette; apresenta dados e interações do usuário.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Command,
  LayoutDashboard,
  MapPinned,
  Search,
  Ticket,
  UserPlus,
  Users,
  X,
  Zap,
} from "lucide-react";
import type { ApiChamado, ApiUsuario, ArtigoBase } from "../services/api";
type Props = {
  open: boolean;
  onClose: () => void;
  chamados: ApiChamado[];
  usuarios: ApiUsuario[];
  artigos: ArtigoBase[];
  onTicket: (id: number) => void;
  onNavigate: (tab: string) => void;
  dark?: boolean;
};
export function GlobalCommandPalette({
  open,
  onClose,
  chamados,
  usuarios,
  artigos,
  onTicket,
  onNavigate,
  dark,
}: Props) {
  const [query, setQuery] = useState(""),
    input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => input.current?.focus(), 30);
    }
  }, [open]);
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);
  const q = query.trim().toLowerCase();
  const results = useMemo(
    () =>
      q
        ? [
            ...chamados
              .filter((c) =>
                [c.numero_chamado, c.titulo, c.solicitante_nome].some((v) =>
                  String(v || "")
                    .toLowerCase()
                    .includes(q),
                ),
              )
              .slice(0, 6)
              .map((c) => ({
                kind: "Chamado",
                title: `${c.numero_chamado || `#${c.id}`} · ${c.titulo}`,
                meta: `${c.status} · ${c.prioridade}`,
                icon: Ticket,
                run: () => onTicket(c.id),
              })),
            ...usuarios
              .filter((u) =>
                [u.nome, u.email, u.departamento].some((v) =>
                  String(v || "")
                    .toLowerCase()
                    .includes(q),
                ),
              )
              .slice(0, 4)
              .map((u) => ({
                kind: "Usuário",
                title: u.nome,
                meta: `${u.email} · ${u.departamento || "Sem departamento"}`,
                icon: Users,
                run: () => onNavigate("usuarios"),
              })),
            ...artigos
              .filter((a) =>
                [a.titulo, a.categoria, a.palavras_chave].some((v) =>
                  String(v || "")
                    .toLowerCase()
                    .includes(q),
                ),
              )
              .slice(0, 4)
              .map((a) => ({
                kind: "Base",
                title: a.titulo,
                meta: a.categoria || "Artigo",
                icon: BookOpen,
                run: () => onNavigate("base"),
              })),
          ]
        : [],
    [q, chamados, usuarios, artigos, onTicket, onNavigate],
  );
  if (!open) return null;
  const go = (fn: () => void) => {
    fn();
    onClose();
  };
  return (
    <div
      className="fixed inset-0 z-[120] flex items-start justify-center bg-slate-950/45 px-4 pt-[10vh] backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        className={`w-full max-w-2xl overflow-hidden rounded-3xl border shadow-2xl ${dark ? "border-white/10 bg-slate-900 text-white" : "border-white/70 bg-white text-zinc-900"}`}
      >
        <div className="ds-search flex h-16 items-center gap-3 border-b border-zinc-200/70 px-5">
          <Search size={20} className="text-blue-600" />
          <input
            ref={input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Busque chamados, pessoas ou artigos..."
            className="h-full min-w-0 flex-1 border-0 bg-transparent text-base font-semibold outline-none"
          />
          <kbd className="rounded-lg border bg-zinc-50 px-2 py-1 text-[10px] font-black text-zinc-500">
            ESC
          </kbd>
          <button onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[62vh] overflow-y-auto p-3">
          {!q ? (
            <>
              <p className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                Ações rápidas
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <Action
                  icon={LayoutDashboard}
                  label="Abrir Dashboard"
                  hint="G depois D"
                  onClick={() => go(() => onNavigate("dashboard"))}
                />
                <Action
                  icon={Ticket}
                  label="Central de chamados"
                  hint="N"
                  onClick={() => go(() => onNavigate("chamados"))}
                />
                <Action
                  icon={UserPlus}
                  label="Cadastrar usuário"
                  onClick={() => go(() => onNavigate("usuarios"))}
                />
                <Action
                  icon={MapPinned}
                  label="Monitoramento de ativos"
                  onClick={() => go(() => onNavigate("patrimonio"))}
                />
              </div>
              <div className="mt-3 rounded-2xl bg-blue-50 p-4 text-xs text-blue-800">
                <b className="flex items-center gap-2">
                  <Zap size={15} />
                  Atalhos disponíveis
                </b>
                <p className="mt-2 leading-6">
                  Ctrl K busca · N chamados · / filtros · G D dashboard · G F
                  fila · Esc fecha painéis
                </p>
              </div>
            </>
          ) : results.length ? (
            <div className="space-y-1">
              {results.map((r, i) => (
                <button
                  key={`${r.kind}-${i}`}
                  onClick={() => go(r.run)}
                  className="flex w-full items-center gap-3 rounded-2xl p-3 text-left hover:bg-blue-50"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-zinc-100 text-zinc-600">
                    <r.icon size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-sm">{r.title}</b>
                    <small className="block truncate text-zinc-500">
                      {r.kind} · {r.meta}
                    </small>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="grid place-items-center py-14 text-center">
              <Search size={28} className="text-zinc-300" />
              <b className="mt-3">Nenhum resultado</b>
              <p className="mt-1 text-xs text-zinc-500">
                Revise os termos ou navegue pelas ações rápidas.
              </p>
            </div>
          )}
        </div>
        <footer className="flex items-center gap-2 border-t bg-zinc-50/70 px-5 py-3 text-[10px] font-bold text-zinc-500">
          <Command size={13} />
          Busca global do Smart HelpDesk
        </footer>
      </section>
    </div>
  );
}
function Action({
  icon: Icon,
  label,
  hint,
  onClick,
}: {
  icon: any;
  label: string;
  hint?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 rounded-2xl border border-zinc-100 p-3 text-left hover:border-blue-200 hover:bg-blue-50"
    >
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600">
        <Icon size={18} />
      </span>
      <b className="min-w-0 flex-1 text-sm">{label}</b>
      {hint && <kbd className="text-[9px] text-zinc-400">{hint}</kbd>}
    </button>
  );
}
