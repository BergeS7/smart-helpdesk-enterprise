import { useEffect, useMemo, useState } from "react";
import {
  Clock3,
  Filter,
  Maximize2,
  Minimize2,
  RefreshCw,
  X,
} from "lucide-react";
import { toast } from "sonner";
import "leaflet/dist/leaflet.css";
import "./patrimonio-map.css";
import { municipiosMaranhao } from "../../data/municipiosMaranhao";
import {
  createAgentInvite,
  deriveDeviceAlerts,
  getAssetLocations,
  getDeviceHistory,
  getDevices,
  getMunicipioSummary,
  updateDeviceLocation,
  updateDeviceStatus,
} from "../../services/deviceService";
import { criarChamado } from "../../services/api";
import type {
  Device,
  DeviceAlert,
  DeviceHistory,
  MunicipioSummary,
} from "../../types/device";
import { AlertsList } from "../../components/patrimonio/AlertsList";
import { AssetExplorerPanel } from "../../components/patrimonio/AssetExplorerPanel";
import { DeviceDiagnostics } from "../../components/patrimonio/DeviceDiagnostics";
import {
  DeviceFilters,
  type PatrimonioFilters,
} from "../../components/patrimonio/DeviceFilters";
import { PatrimonioMap } from "../../components/patrimonio/PatrimonioMap";
import { PatrimonioStats } from "../../components/patrimonio/PatrimonioStats";

const emptyFilters: PatrimonioFilters = {
  status: "all",
  municipio: "",
  query: "",
};
export function PatrimonioMapPage({ dark = false }: { dark?: boolean }) {
  const [devices, setDevices] = useState<Device[]>([]),
    [alerts, setAlerts] = useState<DeviceAlert[]>([]),
    [summary, setSummary] = useState<MunicipioSummary[]>([]),
    [selected, setSelected] = useState<Device | null>(null),
    [loading, setLoading] = useState(true),
    [filtersOpen, setFiltersOpen] = useState(false),
    [mapExpanded, setMapExpanded] = useState(false);
  const [history, setHistory] = useState<DeviceHistory[]>([]),
    [historyOpen, setHistoryOpen] = useState(false),
    [diagnostics, setDiagnostics] = useState<Device | null>(null),
    [diagnosticsRefreshing, setDiagnosticsRefreshing] = useState(false);
  const [filters, setFilters] = useState<PatrimonioFilters>(() => {
    try {
      return (
        JSON.parse(localStorage.getItem("patrimonio-filtros") || "null") ||
        emptyFilters
      );
    } catch {
      return emptyFilters;
    }
  });
  async function reload() {
    try {
      const rows = await getDevices();
      setDevices(rows);
      setAlerts(deriveDeviceAlerts(rows));
      setSummary(await getMunicipioSummary());
      if (selected) setSelected(rows.find((x) => x.id === selected.id) || null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar ativos");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    reload();
    const timer = window.setInterval(reload, 30000);
    return () => clearInterval(timer);
  }, []);
  useEffect(
    () => localStorage.setItem("patrimonio-filtros", JSON.stringify(filters)),
    [filters],
  );
  useEffect(() => {
    const open = (e: Event) =>
        setDiagnostics((e as CustomEvent<Device>).detail),
      invite = () => void generateInvite(),
      showFilters = () => setFiltersOpen(true),
      refresh = () => void reload();
    window.addEventListener("asset-diagnostics-open", open);
    window.addEventListener("assets-invite", invite);
    window.addEventListener("assets-filters", showFilters);
    window.addEventListener("assets-refresh", refresh);
    return () => {
      window.removeEventListener("asset-diagnostics-open", open);
      window.removeEventListener("assets-invite", invite);
      window.removeEventListener("assets-filters", showFilters);
      window.removeEventListener("assets-refresh", refresh);
    };
  }, []);
  useEffect(() => {
    const handler = (e: Event) =>
      void correctLocation((e as CustomEvent<Device>).detail);
    window.addEventListener("asset-location-correct", handler);
    return () => window.removeEventListener("asset-location-correct", handler);
  }, []);
  const filtered = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return devices.filter(
      (d) =>
        (filters.status === "all" || d.status === filters.status) &&
        (!filters.municipio || d.municipio === filters.municipio) &&
        (!q ||
          [
            d.hostname,
            d.patrimonio,
            d.usuario,
            d.ip,
            d.serialNumber || "",
            d.fabricante || "",
            d.modelo || "",
          ].some((v) => v.toLowerCase().includes(q))),
    );
  }, [devices, filters]);
  const cityDevices = useMemo(
    () => devices.filter((d) => d.municipio === filters.municipio),
    [devices, filters.municipio],
  );
  const selectCity = (municipio: string) => {
    setSelected(null);
    setFilters((old) => ({ ...old, municipio }));
  };
  const backToAreas = () => {
    setSelected(null);
    setFilters((old) => ({ ...old, municipio: "" }));
  };
  async function refreshDiagnostics() {
    if (!diagnostics) return;
    setDiagnosticsRefreshing(true);
    try {
      const rows = await getDevices();
      setDevices(rows);
      setDiagnostics(rows.find((x) => x.id === diagnostics.id) || diagnostics);
      toast.success("Dados atualizados.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao atualizar");
    } finally {
      setDiagnosticsRefreshing(false);
    }
  }
  async function action(type: string, device: Device) {
    if (type === "diagnostico") {
      setDiagnostics(device);
      return;
    }
    if (type === "historico") {
      setHistory(await getDeviceHistory(device.id));
      setHistoryOpen(true);
      return;
    }
    if (type.startsWith("status:")) {
      try {
        const updated = await updateDeviceStatus(
          device.id,
          type.slice(7) as Device["status"],
        );
        setSelected(updated);
        await reload();
        toast.success("Estado atualizado.");
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Erro ao atualizar estado",
        );
      }
      return;
    }
    if (type === "chamado") {
      try {
        const ticket = await criarChamado({
          ativo_id: device.id,
          titulo: `[Ativo ${device.patrimonio}] ${device.hostname} requer atendimento`,
          descricao: `Chamado aberto pelo Monitoramento de Ativos.\n\nUsuário do equipamento: ${device.usuario || "Não identificado"}\nIP: ${device.ip}\nStatus: ${device.status}\nCPU: ${Math.round(device.cpuUsage)}% | RAM: ${Math.round(device.ramUsage)}% | Disco: ${Math.round(device.diskUsage)}%`,
          tipo_chamado: "Incidente",
        });
        toast.success(
          `Chamado ${ticket.numero_chamado || `#${ticket.id}`} aberto.`,
        );
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Não foi possível abrir o chamado",
        );
      }
    }
  }
  async function correctLocation(device: Device) {
    try {
      const locations = await getAssetLocations(),
        options = locations
          .map((l, i) => `${i + 1}. ${l.municipio} — ${l.nome}`)
          .join("\n"),
        choice = window.prompt(
          `Escolha a unidade correta:\n\n${options}\n\nDigite o número:`,
        );
      if (!choice) return;
      const location = locations[Number(choice) - 1];
      if (!location) return void toast.error("Opção inválida.");
      if (
        !window.confirm(
          `Confirma mover ${device.hostname} para ${location.nome}?`,
        )
      )
        return;
      const updated = await updateDeviceLocation(device.id, location);
      setSelected(updated);
      await reload();
      toast.success("Localização atualizada.");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Erro ao atualizar localização",
      );
    }
  }
  async function generateInvite() {
    try {
      const result = await createAgentInvite(2);
      await navigator.clipboard?.writeText(result.convite);
      window.prompt("Convite de uso único válido por 2 horas:", result.convite);
      toast.success("Convite criado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar convite");
    }
  }
  return (
    <div
      className={`ds-page space-y-px patrimonio-module ${dark ? "patrimonio-dark" : ""}`}
    >
      <PatrimonioStats devices={devices} />
      {loading ? (
        <div className="grid h-[420px] place-items-center rounded-2xl border bg-white">
          <RefreshCw className="animate-spin text-blue-600" />
        </div>
      ) : (
        <>
          <div
            className={`asset-command-center grid gap-px ${mapExpanded ? "map-expanded" : selected ? "asset-state-device" : filters.municipio ? "asset-state-city" : "asset-state-overview"}`}
          >
            <section className="map-stage relative flex min-h-[260px] flex-col overflow-hidden rounded-2xl border bg-white shadow-sm">
              <button
                type="button"
                onClick={() => setMapExpanded((value) => !value)}
                className="absolute right-3 top-3 z-[500] grid h-10 w-10 place-items-center rounded-xl border bg-white/95 text-slate-600 shadow-lg backdrop-blur"
                title={mapExpanded ? "Voltar ao painel" : "Expandir mapa"}
                aria-label={mapExpanded ? "Voltar ao painel" : "Expandir mapa"}
              >
                {mapExpanded ? (
                  <Minimize2 size={17} />
                ) : (
                  <Maximize2 size={17} />
                )}
              </button>
              <div className="min-h-0 flex-1 overflow-hidden">
                <PatrimonioMap
                  devices={filtered}
                  allDevices={devices}
                  selected={selected}
                  municipio={filters.municipio}
                  onSelect={(d) => {
                    setSelected(d);
                    if (d.municipio !== filters.municipio)
                      setFilters((old) => ({ ...old, municipio: d.municipio }));
                  }}
                  onMunicipioSelect={selectCity}
                />
              </div>
              <footer className="flex min-h-12 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t px-4 py-2">
                <b className="text-[11px] text-slate-700">
                  {filters.municipio || "27 áreas de atuação"} ·{" "}
                  {filtered.length} ativos visíveis
                </b>
                <div className="flex gap-3 text-[10px] font-bold text-slate-500">
                  <span>
                    <i className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-500" />
                    Online
                  </span>
                  <span>
                    <i className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-500" />
                    Atenção
                  </span>
                  <span>
                    <i className="mr-1 inline-block h-2 w-2 rounded-full bg-red-500" />
                    Offline
                  </span>
                </div>
              </footer>
            </section>
            {!mapExpanded && (
              <AssetExplorerPanel
                summary={summary}
                devices={cityDevices}
                municipio={filters.municipio}
                selected={selected}
                onCity={selectCity}
                onDevice={setSelected}
                onBack={backToAreas}
                onCloseDevice={() => setSelected(null)}
                onAction={action}
              />
            )}
          </div>
          {alerts.length > 0 && (
            <details className="rounded-2xl border bg-white shadow-sm">
              <summary className="cursor-pointer px-5 py-4 text-sm font-black">
                Alertas prioritários{" "}
                <span className="ml-2 rounded-full bg-red-50 px-2 py-1 text-xs text-red-600">
                  {alerts.length}
                </span>
              </summary>
              <div className="border-t p-3">
                <AlertsList
                  alerts={alerts.slice(0, 12)}
                  onSelect={(id) => {
                    const d = devices.find((x) => x.id === id);
                    if (d) {
                      selectCity(d.municipio);
                      setSelected(d);
                    }
                  }}
                />
              </div>
            </details>
          )}
        </>
      )}
      {filtersOpen && (
        <div className="fixed inset-0 z-[80] flex justify-end">
          <button
            aria-label="Fechar"
            onClick={() => setFiltersOpen(false)}
            className="absolute inset-0 bg-slate-950/35"
          />
          <aside className="relative z-10 h-full w-full max-w-md bg-white p-5 shadow-2xl">
            <div className="flex justify-between">
              <b className="flex gap-2">
                <Filter size={18} />
                Filtros do mapa
              </b>
              <button onClick={() => setFiltersOpen(false)}>
                <X />
              </button>
            </div>
            <div className="mt-6">
              <DeviceFilters
                filters={filters}
                municipios={municipiosMaranhao.map((m) => m.nome)}
                onChange={setFilters}
              />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                onClick={() => setFilters(emptyFilters)}
                className="rounded-xl border py-3 font-black"
              >
                Limpar
              </button>
              <button
                onClick={() => setFiltersOpen(false)}
                className="rounded-xl bg-blue-600 py-3 font-black text-white"
              >
                Aplicar ({filtered.length})
              </button>
            </div>
          </aside>
        </div>
      )}
      {historyOpen && (
        <div className="fixed inset-0 z-[90] flex justify-end">
          <button
            aria-label="Fechar"
            onClick={() => setHistoryOpen(false)}
            className="absolute inset-0 bg-slate-950/35"
          />
          <aside className="relative z-10 h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-2xl">
            <div className="flex justify-between">
              <h3 className="text-xl font-black">Histórico do ativo</h3>
              <button onClick={() => setHistoryOpen(false)}>
                <X />
              </button>
            </div>
            <div className="mt-6 space-y-3">
              {history.map((item) => (
                <div key={item.id} className="rounded-xl border p-4">
                  <b className="flex gap-2 text-sm">
                    <Clock3 size={16} />
                    {item.titulo}
                  </b>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.descricao}
                  </p>
                  <time className="text-[10px] text-slate-400">
                    {new Date(item.horario).toLocaleString("pt-BR")}
                  </time>
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}
      {diagnostics && (
        <DeviceDiagnostics
          device={diagnostics}
          onClose={() => setDiagnostics(null)}
          onRefresh={refreshDiagnostics}
          refreshing={diagnosticsRefreshing}
          onAction={action}
        />
      )}
    </div>
  );
}
