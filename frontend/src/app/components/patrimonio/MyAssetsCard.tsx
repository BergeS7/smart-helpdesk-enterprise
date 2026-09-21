/**
 * Responsabilidade: Cartão "Meus ativos" do perfil; some quando o usuário não tem ativos vinculados.
 */
import { Monitor } from "lucide-react";
import { useEffect, useState } from "react";
import { getMyAssets } from "../../services/deviceService";
import type { MyAsset } from "../../types/device";

const statusMeta = {
  online: ["Online", "bg-emerald-50 text-emerald-700 border-emerald-200"],
  warning: ["Atenção", "bg-amber-50 text-amber-700 border-amber-200"],
  offline: ["Offline", "bg-red-50 text-red-700 border-red-200"],
} as const;

export function MyAssetsCard({ dark = false }: { dark?: boolean }) {
  const [assets, setAssets] = useState<MyAsset[]>([]);

  useEffect(() => {
    let cancelled = false;
    // Falha ou lista vazia: o cartão simplesmente não aparece.
    getMyAssets().then((rows) => { if (!cancelled) setAssets(rows); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  if (!assets.length) return null;
  const muted = dark ? "text-white/55" : "text-zinc-500";
  return (
    <section className={`rounded-2xl border p-4 ${dark ? "border-white/10 bg-white/[.04]" : "border-zinc-200 bg-zinc-50/70"}`} aria-label="Meus ativos">
      <p className="flex items-center gap-2 text-sm font-black"><Monitor size={16} />Meus ativos</p>
      <ul className="mt-3 space-y-3">
        {assets.map((asset) => {
          const [label, className] = statusMeta[asset.status];
          const model = [asset.fabricante, asset.modelo].filter(Boolean).join(" ");
          return (
            <li key={asset.id} className={`rounded-xl border p-3 text-xs ${dark ? "border-white/10 bg-white/5" : "border-zinc-200 bg-white"}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <b className="block truncate text-sm">{asset.hostname}</b>
                  <span className={muted}>Patrimônio {asset.patrimonio}</span>
                </div>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-black ${className}`}>{label}</span>
              </div>
              {model && <p className={`mt-1 ${muted}`}>{model}</p>}
              {(asset.unidade || asset.municipio) && <p className={muted}>{[asset.unidade, asset.municipio].filter(Boolean).join(" · ")}</p>}
              {asset.ultimoHeartbeat && <p className={`mt-1 text-[10px] ${muted}`}>Último contato: {new Date(asset.ultimoHeartbeat).toLocaleString("pt-BR")}</p>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
