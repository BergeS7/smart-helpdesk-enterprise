/**
 * Responsabilidade: aba Início do portal: saudação, quadro dos chamados e artigos sugeridos.
 */
import { ArrowRight, FileText } from "lucide-react";
import { UsuarioKanbanLeitura } from "../PortalComponents";
import type { PainelPortal } from "../useUserPortal";

export function AbaInicio({ portal }: { portal: PainelPortal }) {
  const { setTab, usuarioAtual, chamadosBoardUsuario, artigosSugeridos, abrirDetalhe, abrirAvaliacao, temBase } = portal;
  return (
    <div className="min-h-full lg:flex lg:h-full lg:flex-col lg:overflow-hidden">
      <section className="mb-3 flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-black tracking-tight text-zinc-900">Olá, {String(usuarioAtual.nome || "Usuário").split(" ")[0]}</h2>
          <p className="text-sm text-zinc-500">Acompanhe seus atendimentos e encontre soluções em um só lugar.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-xs font-bold text-zinc-500">
          <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500"/>Central online</span>
          {usuarioAtual.departamento && <span className="hidden rounded-full border border-zinc-200 bg-white px-3 py-1.5 sm:inline-flex">{usuarioAtual.departamento}</span>}
        </div>
      </section>
      <section className={`grid min-h-full flex-1 gap-4 lg:min-h-0 ${temBase ? "lg:grid-cols-[minmax(0,1fr)_280px] 2xl:grid-cols-[minmax(0,1fr)_310px]" : ""}`}>
        <div className="flex min-w-0 flex-col gap-4 lg:min-h-0">
          <UsuarioKanbanLeitura
            colunas={chamadosBoardUsuario}
            onAbrir={abrirDetalhe}
            onAvaliar={abrirAvaliacao}
            onVerTodos={() => setTab("chamados")}
          />
        </div>

        {/* Mesmo cabeçalho e cartão das colunas de chamados, para os topos ficarem alinhados. */}
        {temBase && (
        <aside className="flex min-h-0 flex-col">
          <div className="mb-2 flex shrink-0 items-center justify-between gap-3">
            <h3 className="text-sm font-black text-zinc-900">Artigos sugeridos</h3>
            <button
              type="button"
              onClick={() => setTab("base")}
              className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 transition hover:text-blue-900"
            >
              Ver todos <ArrowRight size={14} />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-zinc-200 bg-white px-4 py-1">
            <div className="divide-y divide-zinc-100">
              {artigosSugeridos.length === 0 ? (
                <button
                  type="button"
                  onClick={() => setTab("base")}
                  className="my-3 flex w-full items-center gap-3 rounded-lg bg-zinc-50 p-4 text-left transition hover:bg-blue-50"
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
                    className="flex w-full items-center gap-3 py-3 text-left transition hover:text-blue-700"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700">
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
          </div>
        </aside>
        )}
      </section>
    </div>
  );
}
