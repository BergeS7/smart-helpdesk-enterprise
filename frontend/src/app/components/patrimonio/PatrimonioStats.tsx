import { AlertTriangle, CheckCircle2, Monitor, XCircle } from "lucide-react";
import type { Device } from "../../types/device";

export function PatrimonioStats({ devices }: { devices: Device[] }) {
  const stats = [
    { label: "Total de computadores", value: devices.length, icon: Monitor, tone: "blue" },
    { label: "Online", value: devices.filter((d) => d.status === "online").length, icon: CheckCircle2, tone: "emerald" },
    { label: "Atenção", value: devices.filter((d) => d.status === "warning").length, icon: AlertTriangle, tone: "amber" },
    { label: "Offline", value: devices.filter((d) => d.status === "offline").length, icon: XCircle, tone: "red" },
  ];
  return <div className="grid overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm sm:grid-cols-2 xl:grid-cols-4">{stats.map(({ label, value, icon: Icon, tone }, index) => <div key={label} className={`flex items-center gap-3 px-4 py-2.5 ${index ? "border-t border-zinc-100 sm:border-l sm:border-t-0" : ""}`}><span className={`dashboard-tone-${tone} grid h-9 w-9 shrink-0 place-items-center rounded-xl`}><Icon size={17} /></span><div className="min-w-0"><p className="truncate text-[10px] font-bold uppercase tracking-wide text-zinc-500">{label}</p><p className="text-xl font-black leading-tight text-zinc-900">{value}</p></div></div>)}</div>;
}
