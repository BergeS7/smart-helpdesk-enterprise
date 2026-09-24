/**
 * Responsabilidade: modal de filtros avançados dos chamados (salvar, aplicar e limpar filtros).
 */
import { Filter, Search, X } from "lucide-react";
import { ticketStatusLabel } from "../../../domain/ticketStatus";
import { Button, Field, Input, Select } from "../../../components/shared/FormPrimitives";
import { PRIORIDADES, STATUS_OPCOES } from "../../comum/appShared";
import type { PainelAdmin } from "../useAdminPanel";

export function ModalFiltros({ painel }: { painel: PainelAdmin }) {
  const { dark, departamentos, tipos, filtrosSalvos, filtros, setFiltros, setMostrarFiltros, equipe, aplicarFiltros, limparFiltros, aplicarFiltroSalvo, mutedText } = painel;
  return (
    <div className="fixed inset-x-0 bottom-0 top-14 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Fechar filtros"
        className="absolute inset-0 bg-slate-950/35 backdrop-blur-[1px]"
        onClick={() => setMostrarFiltros(false)}
      />

      <aside
        className={`relative z-10 flex h-full w-full max-w-[420px] flex-col border-l shadow-2xl ${dark ? "border-white/10 bg-[#101827] text-white" : "border-zinc-200 bg-white text-zinc-900"}`}
      >
        <div
          className={`flex items-start justify-between gap-3 border-b px-5 py-4 ${dark ? "border-white/10" : "border-zinc-100"}`}
        >
          <div>
            <p className="flex items-center gap-2 text-base font-black">
              <Filter size={18} />
              Filtros de chamados
            </p>
            <p className={`mt-1 text-xs ${mutedText}`}>
              Refine o Kanban sem ocupar espaço da tela.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMostrarFiltros(false)}
            className={`rounded-xl p-2 transition ${dark ? "text-white/60 hover:bg-white/10 hover:text-white" : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"}`}
            title="Fechar filtros"
          >
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={aplicarFiltros}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 space-y-4 overflow-auto px-5 py-5">
            <Field label="Pesquisa">
              <div className="relative">
                <Search
                  className="absolute left-3 top-3 text-zinc-400"
                  size={16}
                />
                <Input
                  placeholder="Número, título ou descrição"
                  value={filtros.q || ""}
                  onChange={(e) =>
                    setFiltros({ ...filtros, q: e.target.value })
                  }
                  className="pl-9"
                />
              </div>
            </Field>

            {filtrosSalvos.length > 0 && (
              <Field label="Filtros salvos">
                <div className="grid gap-2">
                  {filtrosSalvos.slice(0, 5).map((filtro) => (
                    <button
                      key={filtro.id}
                      type="button"
                      onClick={() => aplicarFiltroSalvo(filtro)}
                      className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-left text-xs font-bold text-zinc-700 hover:bg-blue-50 hover:text-blue-700"
                    >
                      {filtro.nome}
                    </button>
                  ))}
                </div>
              </Field>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Status">
                <Select
                  value={filtros.status || ""}
                  onChange={(e) =>
                    setFiltros({ ...filtros, status: e.target.value })
                  }
                >
                  <option value="">Todos</option>
                  {STATUS_OPCOES.map((s) => (
                    <option key={s} value={s}>{ticketStatusLabel(s)}</option>
                  ))}
                </Select>
              </Field>

              <Field label="Prioridade">
                <Select
                  value={filtros.prioridade || ""}
                  onChange={(e) =>
                    setFiltros({ ...filtros, prioridade: e.target.value })
                  }
                >
                  <option value="">Todas</option>
                  {PRIORIDADES.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </Select>
              </Field>
            </div>

            <Field label="Departamento">
              <Select
                value={filtros.departamento || ""}
                onChange={(e) =>
                  setFiltros({ ...filtros, departamento: e.target.value })
                }
              >
                <option value="">Todos os departamentos</option>
                {departamentos.map((d) => (
                  <option key={d.id}>{d.nome}</option>
                ))}
              </Select>
            </Field>

            <Field label="Técnico responsável">
              <Select
                value={String(filtros.responsavel_id || "")}
                onChange={(e) =>
                  setFiltros({ ...filtros, responsavel_id: e.target.value })
                }
              >
                <option value="">Todos os técnicos</option>
                {equipe.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Tipo de chamado">
              <Select
                value={filtros.tipo_chamado || ""}
                onChange={(e) =>
                  setFiltros({ ...filtros, tipo_chamado: e.target.value })
                }
              >
                <option value="">Todos os tipos</option>
                {tipos.map((t) => (
                  <option key={t.id}>{t.nome}</option>
                ))}
              </Select>
            </Field>

            <Field label="Solicitante">
              <Input
                placeholder="Nome ou e-mail do solicitante"
                value={filtros.usuario || ""}
                onChange={(e) =>
                  setFiltros({ ...filtros, usuario: e.target.value })
                }
              />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Data inicial">
                <Input
                  type="date"
                  value={filtros.data_inicio || ""}
                  onChange={(e) =>
                    setFiltros({ ...filtros, data_inicio: e.target.value })
                  }
                />
              </Field>
              <Field label="Data final">
                <Input
                  type="date"
                  value={filtros.data_fim || ""}
                  onChange={(e) =>
                    setFiltros({ ...filtros, data_fim: e.target.value })
                  }
                />
              </Field>
            </div>

            <label
              className={`flex items-center gap-3 rounded-2xl border p-4 text-sm font-bold ${dark ? "border-white/10 bg-white/5 text-white/75" : "border-zinc-200 bg-zinc-50 text-zinc-700"}`}
            >
              <input
                type="checkbox"
                checked={Boolean(filtros.vencidos)}
                onChange={(e) =>
                  setFiltros({ ...filtros, vencidos: e.target.checked })
                }
              />
              Mostrar somente chamados vencidos
            </label>
          </div>

          <div
            className={`flex gap-3 border-t p-5 ${dark ? "border-white/10" : "border-zinc-100"}`}
          >
            <Button className="flex-1">
              <Search size={16} />
              Aplicar
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={limparFiltros}
            >
              Limpar
            </Button>
          </div>
        </form>
      </aside>
    </div>
  );
}
