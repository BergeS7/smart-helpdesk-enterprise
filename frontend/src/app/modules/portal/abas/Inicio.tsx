/**
 * Responsabilidade: aba Início do portal: saudação, quadro dos chamados e artigos sugeridos.
 */
import { ArrowRight, BookOpen, FileText } from "lucide-react";
import { UsuarioKanbanLeitura } from "../PortalComponents";
import type { PainelPortal } from "../useUserPortal";

export function AbaInicio({ portal }: { portal: PainelPortal }) {
  const { setTab, usuarioAtual, chamadosBoardUsuario, artigosSugeridos, abrirDetalhe, abrirAvaliacao } = portal;
  return (
    <div className="min-h-full lg:flex lg:h-full lg:flex-col lg:overflow-hidden">
      <section className="mb-4 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Central do solicitante</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-zinc-900">Olá, {String(usuarioAtual.nome || "Usuário").split(" ")[0]}</h2>
          <p className="mt-1 text-sm text-zinc-500">Acompanhe seus atendimentos e encontre soluções em um só lugar.</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-zinc-500">
          <span className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 shadow-sm"><span className="h-2 w-2 rounded-full bg-emerald-500"/>Central online</span>
          <span className="hidden rounded-xl border border-zinc-200 bg-white px-3 py-2 shadow-sm sm:inline-flex">{usuarioAtual.departamento || "Seu departamento"}</span>
        </div>
      </section>
      <section className="grid min-h-full flex-1 gap-4 lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_280px] 2xl:grid-cols-[minmax(0,1fr)_310px]">
        <div className="flex min-w-0 flex-col gap-4 lg:min-h-0">
          <UsuarioKanbanLeitura
            colunas={chamadosBoardUsuario}
            onAbrir={abrirDetalhe}
            onAvaliar={abrirAvaliacao}
            onVerTodos={() => setTab("chamados")}
          />
        </div>

        <aside className="flex min-h-0 flex-col gap-4">
          <div className="min-h-0 flex-1 overflow-hidden rounded-[20px] border border-zinc-200 bg-white p-4 shadow-sm shadow-slate-200/60">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="font-black text-zinc-900">Artigos sugeridos</h3>
              <BookOpen size={18} className="text-blue-600" />
            </div>

            <div className="divide-y divide-zinc-100">
              {artigosSugeridos.length === 0 ? (
                <button
                  type="button"
                  onClick={() => setTab("base")}
                  className="flex w-full items-center gap-3 rounded-2xl bg-zinc-50 p-4 text-left transition hover:bg-blue-50"
                >
                  <FileText size={19} className="text-blue-600" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-black text-zinc-900">
                      Consultar base de conhecimento
                    </span>
                    <span className="mt-1 block text-xs font-medium text-zinc-500">
                      Soluções e tutoriais
                    </span>
                  </span>
                  <ArrowRight size={16} className="text-zinc-400" />
                </button>
              ) : (
                artigosSugeridos.map((artigo) => (
                  <button
                    key={artigo.id}
                    type="button"
                    onClick={() => setTab("base")}
                    className="flex w-full items-center gap-3 py-4 text-left transition hover:text-blue-700"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700">
                      <FileText size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-sm font-black text-zinc-900">
                        {artigo.titulo}
                      </span>
                      <span className="mt-1 block truncate text-xs font-medium text-zinc-500">
                        {artigo.categoria || "Solução"}
                      </span>
                    </span>
                    <ArrowRight
                      size={16}
                      className="shrink-0 text-zinc-400"
                    />
                  </button>
                ))
              )}
            </div>

            <button
              type="button"
              onClick={() => setTab("base")}
              className="mt-4 flex items-center gap-2 text-sm font-black text-blue-700 transition hover:text-blue-900"
            >
              Ver todos os artigos <ArrowRight size={16} />
            </button>
          </div>
        </aside>
      </section>
    </div>
  );
}
