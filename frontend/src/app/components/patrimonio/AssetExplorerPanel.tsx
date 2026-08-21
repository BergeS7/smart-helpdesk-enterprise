import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ChevronRight,
  CircleUserRound,
  Cpu,
  HardDrive,
  MapPin,
  MemoryStick,
  Monitor,
  Search,
  Ticket,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import React from "react";
import { getDeviceInventory } from "../../services/deviceService";
import type {
  AssetInventory,
  Device,
  MunicipioSummary,
} from "../../types/device";

type Props = {
  summary: MunicipioSummary[];
  devices: Device[];
  municipio: string;
  selected: Device | null;
  onCity: (city: string) => void;
  onDevice: (device: Device) => void;
  onBack: () => void;
  onCloseDevice: () => void;
  onAction: (action: string, device: Device) => void;
};
const status = {
  online: {
    label: "Online",
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700",
    icon: Wifi,
  },
  warning: {
    label: "Atenção",
    dot: "bg-amber-500",
    badge: "bg-amber-50 text-amber-700",
    icon: AlertTriangle,
  },
  offline: {
    label: "Offline",
    dot: "bg-red-500",
    badge: "bg-red-50 text-red-700",
    icon: WifiOff,
  },
} as const;
const owner = (device: Device) =>
  device.usuario && device.usuario !== "-"
    ? device.usuario
    : "Usuário não identificado";
export function AssetExplorerPanel(props: Props) {
  const {
    summary,
    devices,
    municipio,
    selected,
    onCity,
    onDevice,
    onBack,
    onCloseDevice,
    onAction,
  } = props;
  if (selected)
    return (
      <DeviceView
        device={selected}
        onBack={onCloseDevice}
        onAction={onAction}
      />
    );
  if (municipio)
    return (
      <CityView
        municipio={municipio}
        devices={devices}
        onBack={onBack}
        onDevice={onDevice}
      />
    );
  const priority = [...summary].sort(
    (a, b) => b.offline * 10 + b.warning - (a.offline * 10 + a.warning),
  );
  return (
    <aside className="asset-explorer flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border bg-white shadow-sm">
      <PanelHeader
        eyebrow="Visão operacional"
        title="Áreas de atuação"
        subtitle="Selecione uma área no mapa ou na lista"
      />
      <div className="grid grid-cols-3 gap-2 px-4 pb-3">
        <Kpi label="Áreas" value={summary.length} />
        <Kpi
          label="Com alerta"
          value={summary.filter((x) => x.warning + x.offline > 0).length}
          tone="amber"
        />
        <Kpi
          label="Sem comunicação"
          value={summary.reduce((n, x) => n + x.offline, 0)}
          tone="red"
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto border-t">
        <p className="px-1 py-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
          Prioridade operacional
        </p>
        <div className="grid grid-cols-1 gap-px bg-slate-100 2xl:grid-cols-2">
          {priority.map((city) => (
            <button
              key={city.municipio}
              onClick={() => onCity(city.municipio)}
              className="flex min-h-[66px] w-full items-center gap-3 bg-white p-3 text-left transition hover:bg-blue-50"
            >
              <span
                className={`grid h-9 w-9 place-items-center rounded-xl ${city.offline ? "bg-red-50 text-red-600" : city.warning ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"}`}
              >
                <MapPin size={17} />
              </span>
              <span className="min-w-0 flex-1">
                <b className="block truncate text-sm">{city.municipio}</b>
                <small className="text-slate-500">
                  {city.total} equipamentos · {city.online} online
                </small>
              </span>
              {city.warning + city.offline > 0 && (
                <span className="rounded-full bg-red-50 px-2 py-1 text-[10px] font-black text-red-600">
                  {city.warning + city.offline} alerta(s)
                </span>
              )}
              <ChevronRight size={15} className="text-slate-300" />
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
function CityView({
  municipio,
  devices,
  onBack,
  onDevice,
}: {
  municipio: string;
  devices: Device[];
  onBack: () => void;
  onDevice: (d: Device) => void;
}) {
  const [query, setQuery] = React.useState(""),
    [filter, setFilter] = React.useState<"all" | Device["status"]>("all");
  const rows = devices.filter(
    (d) =>
      (filter === "all" || d.status === filter) &&
      (!query ||
        [d.hostname, d.patrimonio, owner(d), d.ip, d.modelo || ""].some((v) =>
          v.toLowerCase().includes(query.toLowerCase()),
        )),
  );
  return (
    <aside className="asset-explorer flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="flex items-start gap-3 border-b p-4">
        <button
          onClick={onBack}
          className="grid h-9 w-9 place-items-center rounded-xl border"
        >
          <ArrowLeft size={17} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-wider text-blue-600">
            Município selecionado
          </p>
          <h3 className="truncate text-lg font-black">{municipio}</h3>
          <p className="text-xs text-slate-500">
            {devices.length} equipamentos encontrados
          </p>
        </div>
      </div>
      <div className="space-y-3 border-b p-3">
        <label className="ds-search flex h-10 items-center gap-2 rounded-xl border bg-slate-50 px-3">
          <Search size={16} className="text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            placeholder="Equipamento, usuário, IP..."
          />
          {query && (
            <button onClick={() => setQuery("")}>
              <X size={15} />
            </button>
          )}
        </label>
        <div className="grid grid-cols-4 gap-1">
          {(
            [
              ["all", "Todos"],
              ["online", "Online"],
              ["warning", "Atenção"],
              ["offline", "Offline"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`rounded-lg px-2 py-2 text-[10px] font-black ${filter === value ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {rows.map((device) => (
          <DeviceCard
            key={device.id}
            device={device}
            onClick={() => onDevice(device)}
          />
        ))}
        {!rows.length && (
          <div className="p-8 text-center text-sm text-slate-500">
            Nenhum equipamento corresponde à busca.
          </div>
        )}
      </div>
    </aside>
  );
}
function DeviceCard({
  device,
  onClick,
}: {
  device: Device;
  onClick: () => void;
}) {
  const meta = status[device.status],
    Icon = meta.icon;
  return (
    <button
      onClick={onClick}
      className="w-full rounded-xl border p-3 text-left transition hover:border-blue-300 hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <span
          className={`grid h-9 w-9 place-items-center rounded-xl ${meta.badge}`}
        >
          <Icon size={17} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <b className="truncate text-sm">{device.hostname}</b>
            <small
              className={`rounded-full px-2 py-1 font-black ${meta.badge}`}
            >
              {meta.label}
            </small>
          </span>
          <span className="mt-1 flex items-center gap-1 truncate text-xs font-semibold text-slate-600">
            <CircleUserRound size={13} />
            {owner(device)}
          </span>
          <small className="block truncate text-slate-400">
            {[device.fabricante, device.modelo, device.ip]
              .filter(Boolean)
              .join(" · ")}
          </small>
        </span>
        <ChevronRight size={16} className="mt-2 text-slate-300" />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <MiniMetric label="CPU" value={device.cpuUsage} />
        <MiniMetric label="RAM" value={device.ramUsage} />
        <MiniMetric label="Disco" value={device.diskUsage} />
      </div>
    </button>
  );
}
function DeviceView({
  device,
  onBack,
  onAction,
}: {
  device: Device;
  onBack: () => void;
  onAction: (a: string, d: Device) => void;
}) {
  const meta = status[device.status],
    [inventory, setInventory] = React.useState<AssetInventory | null>(null),
    [loading, setLoading] = React.useState(true);
  React.useEffect(() => {
    let active = true;
    setLoading(true);
    getDeviceInventory(device.id)
      .then((data) => active && setInventory(data))
      .catch(() => active && setInventory(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [device.id]);
  const memory = inventory?.memory?.modules || [],
    disks = inventory?.storage?.physicalDisks || [],
    volumes = inventory?.storage?.volumes || [];
  return (
    <aside className="asset-explorer flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="flex items-start gap-3 border-b p-4">
        <button
          onClick={onBack}
          className="grid h-9 w-9 place-items-center rounded-xl border"
        >
          <ArrowLeft size={17} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase text-blue-600">
            Ficha técnica do equipamento
          </p>
          <h3 className="truncate text-lg font-black">{device.hostname}</h3>
          <p className="truncate text-xs text-slate-500">
            {device.patrimonio} · {device.municipio}
          </p>
        </div>
        <span
          className={`rounded-full px-2 py-1 text-[10px] font-black ${meta.badge}`}
        >
          {meta.label}
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="rounded-xl bg-blue-50 p-4">
          <p className="flex items-center gap-2 text-[10px] font-black uppercase text-blue-600">
            <CircleUserRound size={15} />
            Usuário responsável
          </p>
          <b className="mt-1 block text-base">{owner(device)}</b>
          <small className="text-blue-700">
            {device.unidade} · {device.municipio}
          </small>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <MiniMetric label="CPU" value={device.cpuUsage} />
          <MiniMetric label="RAM" value={device.ramUsage} />
          <MiniMetric label="Disco" value={device.diskUsage} />
        </div>
        <TechSection icon={<Monitor size={15} />} title="Identificação">
          <TechRows
            rows={[
              ["Patrimônio", device.patrimonio],
              ["ID do agente", device.deviceId],
              ["Serial do computador", device.serialNumber],
              [
                "Fabricante / modelo",
                [device.fabricante, device.modelo].filter(Boolean).join(" "),
              ],
              ["Agente", inventory?.agentVersion],
              ["Último inventário", formatDate(device.ultimoInventario)],
            ]}
          />
        </TechSection>
        <TechSection icon={<Cpu size={15} />} title="Sistema e processamento">
          <TechRows
            rows={[
              ["Sistema operacional", device.sistemaOperacional],
              ["Build", device.osBuild],
              ["Processador", device.processador],
              ["RAM total", formatBytes(device.ramTotalBytes)],
              ["Última inicialização", formatDate(device.lastBoot)],
              [
                "Uptime",
                device.uptimeHours != null
                  ? `${device.uptimeHours} hora(s)`
                  : null,
              ],
            ]}
          />
        </TechSection>
        <TechSection
          icon={<MemoryStick size={15} />}
          title={`Memória física (${memory.length} módulo(s))`}
        >
          {loading ? (
            <LoadingInventory />
          ) : memory.length ? (
            memory.map((item, index) => (
              <InventoryCard
                key={index}
                title={`Módulo ${index + 1} · ${read(item, "deviceLocator", "bank")}`}
                data={item}
                preferred={[
                  "serialNumber",
                  "partNumber",
                  "manufacturer",
                  "capacityBytes",
                  "speedMhz",
                  "bank",
                  "deviceLocator",
                ]}
              />
            ))
          ) : (
            <MissingInventory text="O agente ainda não enviou os módulos de memória." />
          )}
        </TechSection>
        <TechSection
          icon={<HardDrive size={15} />}
          title={`Discos físicos / SSD (${disks.length})`}
        >
          {loading ? (
            <LoadingInventory />
          ) : disks.length ? (
            disks.map((item, index) => (
              <InventoryCard
                key={index}
                title={`${read(item, "model") || `Disco ${index + 1}`}`}
                data={item}
                preferred={[
                  "serialNumber",
                  "model",
                  "mediaType",
                  "interfaceType",
                  "sizeBytes",
                  "index",
                ]}
              />
            ))
          ) : (
            <MissingInventory text="O agente ainda não enviou os discos físicos." />
          )}
          {volumes.length > 0 && (
            <div className="mt-2 space-y-2">
              {volumes.map((item, index) => (
                <InventoryCard
                  key={index}
                  title={`Volume ${read(item, "drive") || index + 1}`}
                  data={item}
                  preferred={[
                    "label",
                    "fileSystem",
                    "sizeBytes",
                    "freeBytes",
                    "freePercentage",
                  ]}
                />
              ))}
            </div>
          )}
        </TechSection>
        <TechSection icon={<Wifi size={15} />} title="Rede e comunicação">
          <TechRows
            rows={[
              ["Endereço IP", device.ip],
              ["Endereço MAC", device.mac],
              ["Tipo de rede", device.networkType],
              ["Velocidade do link", device.linkSpeed],
              ["Última comunicação", formatDate(device.ultimoHeartbeat)],
            ]}
          />
          {inventory?.network && (
            <InventoryCard
              title="Interfaces e configuração"
              data={inventory.network}
            />
          )}
        </TechSection>
        {inventory && (
          <>
            <TechSection icon={<ShieldCheckIcon />} title="Placa-mãe e BIOS">
              <InventoryCard
                title="Placa-mãe"
                data={inventory.motherboard || {}}
              />
              <InventoryCard title="BIOS" data={inventory.bios || {}} />
            </TechSection>
            <TechSection
              icon={<Activity size={15} />}
              title="Inventário adicional"
            >
              {inventory.videoAdapters?.map((x, i) => (
                <InventoryCard
                  key={`v${i}`}
                  title={`Vídeo ${i + 1}`}
                  data={x}
                />
              ))}
              {inventory.monitors?.map((x, i) => (
                <InventoryCard
                  key={`m${i}`}
                  title={`Monitor ${i + 1}`}
                  data={x}
                />
              ))}
              {inventory.battery && (
                <InventoryCard title="Bateria" data={inventory.battery} />
              )}
              <InventoryCard
                title="Segurança"
                data={inventory.security || {}}
              />
            </TechSection>
          </>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 border-t p-3">
        <button
          onClick={() => onAction("diagnostico", device)}
          className="flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 text-xs font-black text-white"
        >
          <Activity size={15} />
          Diagnóstico
        </button>
        <button
          onClick={() => onAction("chamado", device)}
          className="flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 text-xs font-black text-white"
        >
          <Ticket size={15} />
          Abrir chamado
        </button>
      </div>
    </aside>
  );
}
function ShieldCheckIcon() {
  return <span className="text-blue-600">◆</span>;
}
function TechSection({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-3 rounded-xl border p-3">
      <h4 className="mb-2 flex items-center gap-2 text-xs font-black text-slate-800">
        {icon}
        {title}
      </h4>
      {children}
    </section>
  );
}
function TechRows({ rows }: { rows: Array<[string, unknown]> }) {
  return (
    <div className="divide-y">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="grid grid-cols-[145px_minmax(0,1fr)] gap-3 py-2 text-xs"
        >
          <span className="text-slate-500">{label}</span>
          <b className="break-all text-right">{display(value)}</b>
        </div>
      ))}
    </div>
  );
}
function InventoryCard({
  title,
  data,
  preferred = [],
}: {
  title: string;
  data: Record<string, unknown>;
  preferred?: string[];
}) {
  const keys = [
    ...preferred.filter((k) => k in data),
    ...Object.keys(data).filter((k) => !preferred.includes(k)),
  ];
  return (
    <div className="mb-2 rounded-lg bg-slate-50 p-3">
      <b className="mb-2 block text-xs text-blue-700">{title}</b>
      <div className="grid gap-x-4 sm:grid-cols-2">
        {keys.map((key) => (
          <div
            key={key}
            className="min-w-0 border-t border-slate-200 py-1.5 text-[10px]"
          >
            <span className="block uppercase text-slate-400">
              {labelKey(key)}
            </span>
            <strong className="break-all text-slate-700">
              {displayValue(key, data[key])}
            </strong>
          </div>
        ))}
      </div>
    </div>
  );
}
function MissingInventory({ text }: { text: string }) {
  return (
    <p className="rounded-lg bg-amber-50 p-2 text-[11px] text-amber-700">
      {text}
    </p>
  );
}
function LoadingInventory() {
  return (
    <p className="animate-pulse text-[11px] text-slate-400">
      Consultando inventário técnico...
    </p>
  );
}
function read(data: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys)
    if (data[key] != null && data[key] !== "") return String(data[key]);
  return "";
}
function formatBytes(value: unknown) {
  const size = Number(value);
  return Number.isFinite(size) && size > 0
    ? `${(size / 1073741824).toFixed(2)} GB`
    : "Não informado";
}
function formatDate(value: unknown) {
  if (!value) return "Não informado";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString("pt-BR");
}
function display(value: unknown) {
  return value == null || value === "" || value === "-"
    ? "Não informado"
    : String(value);
}
function displayValue(key: string, value: unknown) {
  if (/bytes$/i.test(key)) return formatBytes(value);
  if (value && typeof value === "object") return JSON.stringify(value);
  return display(value);
}
function labelKey(key: string) {
  const labels: Record<string, string> = {
    serialNumber: "Número de série",
    partNumber: "Part number",
    manufacturer: "Fabricante",
    capacityBytes: "Capacidade",
    speedMhz: "Velocidade (MHz)",
    deviceLocator: "Slot",
    bank: "Banco",
    mediaType: "Tipo de mídia",
    interfaceType: "Interface",
    sizeBytes: "Capacidade",
    freeBytes: "Espaço livre",
    freePercentage: "Livre (%)",
    fileSystem: "Sistema de arquivos",
  };
  return labels[key] || key.replace(/([A-Z])/g, " $1").trim();
}
function PanelHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="p-4">
      <p className="text-[10px] font-black uppercase tracking-wider text-blue-600">
        {eyebrow}
      </p>
      <h3 className="text-lg font-black">{title}</h3>
      <p className="text-xs text-slate-500">{subtitle}</p>
    </div>
  );
}
function Kpi({
  label,
  value,
  tone = "blue",
}: {
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div
      className={`rounded-xl p-3 ${tone === "red" ? "bg-red-50 text-red-700" : tone === "amber" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"}`}
    >
      <b className="block text-lg">{value}</b>
      <small className="font-bold">{label}</small>
    </div>
  );
}
function MiniMetric({ label, value }: { label: string; value: number }) {
  const color =
    value >= 85
      ? "bg-red-500"
      : value >= 70
        ? "bg-amber-500"
        : "bg-emerald-500";
  return (
    <div>
      <span className="flex justify-between text-[10px] font-black">
        <span>{label}</span>
        <span>{Math.round(value)}%</span>
      </span>
      <div className="mt-1 h-1 overflow-hidden rounded bg-slate-100">
        <div
          className={`h-full ${color}`}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
    </div>
  );
}
