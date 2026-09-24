/**
 * Responsabilidade: atalhos da aba Configurações (identidade, SLA, catálogos e integrações).
 */
import { AlertTriangle, Building2, Settings, Users } from "lucide-react";
import type { PainelAdmin } from "../useAdminPanel";

export function AbaConfiguracoesAtalhos({ painel }: { painel: PainelAdmin }) {
  const { setTab, dark } = painel;
  return (
    <div
      className={`mb-5 rounded-2xl border p-2 shadow-sm ${dark ? "border-white/10 bg-white/5" : "border-zinc-200 bg-white"}`}
    >
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <button
          type="button"
          className="flex items-center gap-3 rounded-xl bg-blue-600 p-3 text-left text-white shadow-lg shadow-blue-100"
        >
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/15">
            <Settings size={19} />
          </span>
          <span>
            <b className="block text-sm">Sistema</b>
            <span className="text-xs text-white/70">
              Identidade, SLA e respostas
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => setTab("teams")}
          className={`flex items-center gap-3 rounded-xl p-3 text-left transition ${dark ? "hover:bg-white/10" : "hover:bg-zinc-50"}`}
        >
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-700">
            <Users size={19} />
          </span>
          <span>
            <b className="block text-sm">Equipes</b>
            <span className="text-xs text-zinc-500">
              Estrutura e distribuição
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => setTab("catalogos")}
          className={`flex items-center gap-3 rounded-xl p-3 text-left transition ${dark ? "hover:bg-white/10" : "hover:bg-zinc-50"}`}
        >
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
            <Building2 size={19} />
          </span>
          <span>
            <b className="block text-sm">Catálogos</b>
            <span className="text-xs text-zinc-500">
              Departamentos e tipos
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => setTab("manutencao")}
          className={`flex items-center gap-3 rounded-xl p-3 text-left transition ${dark ? "hover:bg-white/10" : "hover:bg-zinc-50"}`}
        >
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-700">
            <AlertTriangle size={19} />
          </span>
          <span>
            <b className="block text-sm">Manutenção</b>
            <span className="text-xs text-zinc-500">
              Avisos e comunicados
            </span>
          </span>
        </button>
      </div>
    </div>
  );
}
