/**
 * Responsabilidade: Componente de interface de ticket workspace toolbar; apresenta dados e interações do usuário.
 */
import { Filter, Search, X } from "lucide-react";
import { useState } from "react";
import type { FiltrosChamados } from "../services/api";
import { municipiosMaranhao } from "../data/municipiosMaranhao";

export function TicketWorkspaceToolbar({
  filters,
  onChange,
  onApply,
  dark,
  embedded = false,
}: {
  filters: FiltrosChamados;
  onChange: (filters: FiltrosChamados) => void;
  onApply: (filters: FiltrosChamados) => void;
  dark: boolean;
  embedded?: boolean;
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const active =
    Number(!!filters.prioridade) +
    Number(!!filters.status) +
    Number(!!filters.municipio) +
    Number(!!filters.unidade);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onApply(filters);
        setFiltersOpen(false);
      }}
      className={`relative ${embedded ? "" : "mb-4 rounded-2xl border p-2.5 shadow-sm"} ${dark ? "border-white/10 bg-slate-900" : "border-slate-200 bg-white"}`}
      aria-label="Ferramentas da Central de Atendimento"
      title="Atualização automática a cada 20 segundos; filtros preservados na URL"
    >
      <div className="flex flex-nowrap items-center gap-2">
        <label
          className={`ds-search ticket-workspace-search flex h-11 min-w-0 flex-1 items-center gap-3 rounded-xl border px-3 transition focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 ${dark ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-50/70"}`}
        >
          <Search size={18} className="shrink-0 text-slate-400" />
          <input
            aria-label="Pesquisar chamado"
            value={filters.q || ""}
            onChange={(e) =>
              onChange({ ...filters, q: e.target.value || undefined })
            }
            placeholder="Pesquisar chamado..."
            className="min-w-0 flex-1"
          />
        </label>
        <button
          type="button"
          onClick={() => setFiltersOpen((value) => !value)}
          className="ds-button ds-button--secondary relative !inline-flex !h-11 !min-h-11 min-w-[104px] shrink-0 !flex-row items-center justify-center gap-2 whitespace-nowrap !px-4"
        >
          <Filter size={17} className="shrink-0" />
          <span className="leading-none">Filtros</span>
          {active > 0 && (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-blue-600 px-1 text-[10px] leading-none text-white">
              {active}
            </span>
          )}
        </button>
        {Object.keys(filters).length ? (
          <button
            type="button"
            onClick={() => {
              onChange({});
              onApply({});
            }}
            className="ds-button ds-button--secondary"
          >
            <X size={15} />
            Limpar
          </button>
        ) : null}
      </div>
      {filtersOpen && (
        <div
          className={`absolute right-3 top-14 z-40 w-[min(380px,calc(100vw-48px))] rounded-2xl border p-4 shadow-2xl ${dark ? "border-white/10 bg-slate-900" : "border-slate-200 bg-white"}`}
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <b className="text-sm">Filtrar atendimento</b>
              <p className="text-xs text-slate-400">
                Segmente pelas 27 áreas de atuação.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFiltersOpen(false)}
              className="rounded-lg p-2 hover:bg-slate-100"
            >
              <X size={16} />
            </button>
          </div>
          <div className="grid gap-3">
            <label className="text-xs font-bold text-slate-500">
              Cidade / área de atuação
              <select
                aria-label="Cidade ou área de atuação"
                value={filters.municipio || ""}
                onChange={(e) => {
                  const municipio = e.target.value || undefined;
                  onChange({
                    ...filters,
                    municipio,
                    unidade: municipio
                      ? `Maranhão Motos - ${municipio}`
                      : undefined,
                  });
                }}
                className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-transparent px-3 text-sm font-bold"
              >
                <option value="">Todas as 27 áreas</option>
                {municipiosMaranhao.map((item) => (
                  <option key={item.nome}>{item.nome}</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-bold text-slate-500">
              Unidade / local do atendimento
              <input
                aria-label="Unidade"
                value={filters.unidade || ""}
                onChange={(e) =>
                  onChange({ ...filters, unidade: e.target.value || undefined })
                }
                placeholder="Todas as unidades"
                className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-transparent px-3 text-sm font-bold"
              />
            </label>
            <label className="text-xs font-bold text-slate-500">
              Prioridade
              <select
                aria-label="Prioridade"
                value={filters.prioridade || ""}
                onChange={(e) =>
                  onChange({
                    ...filters,
                    prioridade: e.target.value || undefined,
                  })
                }
                className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-transparent px-3 text-sm font-bold"
              >
                <option value="">Todas</option>
                <option>Crítica</option>
                <option>Alta</option>
                <option>Media</option>
                <option>Baixa</option>
              </select>
            </label>
            <label className="text-xs font-bold text-slate-500">
              Status
              <select
                aria-label="Status"
                value={filters.status || ""}
                onChange={(e) =>
                  onChange({ ...filters, status: e.target.value || undefined })
                }
                className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-transparent px-3 text-sm font-bold"
              >
                <option value="">Todos</option>
                <option value="OPEN">Em aberto</option>
                <option value="IN_PROGRESS">Em andamento</option>
                <option value="WAITING_USER">Aguardando usuário</option>
                <option value="CLOSED">Concluído</option>
              </select>
            </label>
            <button className="ds-button ds-button--primary mt-1 w-full">
              <Filter size={15} />
              Aplicar filtros
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
