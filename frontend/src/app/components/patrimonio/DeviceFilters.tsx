import { Search, X } from "lucide-react";
import type { DeviceStatus } from "../../types/device";

export type PatrimonioFilters = { status: "all" | DeviceStatus; municipio: string; query: string };

export function DeviceFilters({ filters, municipios, onChange }: { filters: PatrimonioFilters; municipios: string[]; onChange: (filters: PatrimonioFilters) => void }) {
  return <div className="grid gap-3 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
    <select value={filters.status} onChange={(e) => onChange({ ...filters, status: e.target.value as PatrimonioFilters["status"] })} className="h-11 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm font-bold"><option value="all">Todos os status</option><option value="online">Online</option><option value="warning">Atenção</option><option value="offline">Offline</option></select>
    <select value={filters.municipio} onChange={(e) => onChange({ ...filters, municipio: e.target.value })} className="h-11 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm font-bold"><option value="">Todos os municípios</option>{municipios.map((item) => <option key={item}>{item}</option>)}</select>
    <label className="flex h-11 items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3"><Search size={17} className="text-zinc-400" /><input value={filters.query} onChange={(e) => onChange({ ...filters, query: e.target.value })} placeholder="Hostname, patrimônio, usuário ou IP..." className="min-w-0 flex-1 border-0 bg-transparent text-sm font-semibold outline-none" />{filters.query && <button type="button" onClick={() => onChange({ ...filters, query: "" })}><X size={16} /></button>}</label>
  </div>;
}
