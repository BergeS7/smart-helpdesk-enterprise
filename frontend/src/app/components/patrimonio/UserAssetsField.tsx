/**
 * Responsabilidade: Campo do "Editar usuário" para vincular ativos ao usuário (opcional, salvo na hora).
 */
import { Monitor, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { getDevices, setDeviceUser } from "../../services/deviceService";
import type { Device } from "../../types/device";
import { ASSET_USER_LINKED_EVENT } from "./AssetUserLink";

const matches = (device: Device, term: string) =>
  [device.hostname, device.patrimonio, device.serialNumber, device.unidade, device.municipio, device.usuario]
    .some((value) => String(value || "").toLowerCase().includes(term));

export function UserAssetsField({ userId, userName }: { userId: number; userName: string }) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    let cancelled = false;
    setDevices([]);
    setQuery("");
    setError("");
    getDevices()
      .then((rows) => { if (!cancelled) setDevices(rows); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : "Não foi possível carregar os ativos"); });
    return () => { cancelled = true; };
  }, [userId]);

  const linked = useMemo(() => devices.filter((d) => d.usuarioVinculado?.id === userId), [devices, userId]);
  const term = query.trim().toLowerCase();
  const options = useMemo(
    () => (term.length < 2 ? [] : devices.filter((d) => d.usuarioVinculado?.id !== userId && matches(d, term)).slice(0, 8)),
    [devices, term, userId],
  );

  async function assign(device: Device, target: number | null) {
    const other = device.usuarioVinculado;
    if (target !== null && other && other.id !== userId && !window.confirm(`${device.hostname} está vinculado a ${other.nome || other.email}. Transferir para ${userName}?`)) return;
    try {
      setBusy(device.id);
      const updated = await setDeviceUser(device.id, target);
      setDevices((rows) => rows.map((d) => (d.id === updated.id ? updated : d)));
      window.dispatchEvent(new CustomEvent(ASSET_USER_LINKED_EVENT, { detail: updated }));
      toast.success(target === null ? "Ativo desvinculado." : "Ativo vinculado.");
      if (target !== null) setQuery("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível atualizar o vínculo");
    } finally {
      setBusy("");
    }
  }

  return (
    <div>
      <span className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-[.055em] text-zinc-500">Ativos vinculados (opcional)</span>
      {error ? (
        <p className="rounded-xl border border-zinc-200 p-3 text-xs text-zinc-500">{error}</p>
      ) : (
        <div className="space-y-2 rounded-xl border border-zinc-200 p-3">
          {linked.length === 0 && <p className="text-xs text-zinc-500">Nenhum ativo vinculado a este usuário.</p>}
          {linked.map((device) => (
            <div key={device.id} className="flex items-center justify-between gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-xs">
              <span className="flex min-w-0 items-center gap-2">
                <Monitor size={14} className="shrink-0" />
                <span className="min-w-0"><b className="block truncate">{device.hostname}</b><span className="text-zinc-500">Patrimônio {device.patrimonio} · {device.unidade}</span></span>
              </span>
              <button type="button" disabled={busy === device.id} onClick={() => void assign(device, null)} aria-label={`Desvincular ${device.hostname}`} className="shrink-0 rounded-lg p-1.5 hover:bg-zinc-100 disabled:opacity-60"><X size={14} /></button>
            </div>
          ))}
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar ativo por nome, patrimônio ou unidade (mín. 2 letras)"
            aria-label="Buscar ativo para vincular"
            className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
          {term.length >= 2 && (
            <ul className="max-h-44 divide-y overflow-auto rounded-lg border border-zinc-200">
              {options.map((device) => (
                <li key={device.id}>
                  <button type="button" disabled={busy === device.id} onClick={() => void assign(device, userId)} className="w-full px-3 py-2 text-left text-xs hover:bg-zinc-50 disabled:opacity-60">
                    <b>{device.hostname}</b> <span className="text-zinc-500">· Patrimônio {device.patrimonio} · {device.unidade}</span>
                    {device.usuarioVinculado && <span className="block text-zinc-500">Vinculado a {device.usuarioVinculado.nome || device.usuarioVinculado.email}</span>}
                  </button>
                </li>
              ))}
              {!options.length && <li className="px-3 py-2 text-xs text-zinc-500">Nenhum ativo encontrado.</li>}
            </ul>
          )}
          <p className="text-[10px] text-zinc-500">Os vínculos de ativos são salvos na hora, sem precisar de “Salvar alterações”.</p>
        </div>
      )}
    </div>
  );
}
