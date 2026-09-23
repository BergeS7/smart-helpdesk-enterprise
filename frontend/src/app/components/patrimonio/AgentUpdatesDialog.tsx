/**
 * Responsabilidade: Janela de atualizações do agente; publica pacotes assinados e mostra a distribuição de versões.
 */
import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import { Ban, RefreshCw, ShieldCheck, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { getAgentReleases, publishAgentRelease, revokeAgentRelease } from "../../services/deviceService";
import type { AgentReleaseOverview } from "../../services/deviceService";

export const AGENT_UPDATES_EVENT = "assets-agent-updates";

const formatSize = (bytes: number) => `${(bytes / 1024).toFixed(0)} KB`;
const formatDate = (value: string) => new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

export function AgentUpdatesDialog() {
  const [open, setOpen] = useState(false),
    [data, setData] = useState<AgentReleaseOverview | null>(null),
    [loading, setLoading] = useState(false),
    [publishing, setPublishing] = useState(false);

  async function load() {
    setLoading(true);
    try { setData(await getAgentReleases()); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Erro ao carregar versões do agente"); setOpen(false); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    const show = () => { setOpen(true); void load(); };
    window.addEventListener(AGENT_UPDATES_EVENT, show);
    return () => window.removeEventListener(AGENT_UPDATES_EVENT, show);
  }, []);

  async function publish(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setPublishing(true);
    try {
      let release: unknown;
      try { release = JSON.parse(await file.text()); }
      catch { throw new Error("Selecione o arquivo .update.json gerado por Publicar-Atualizacao.ps1."); }
      const published = await publishAgentRelease(release);
      toast.success(`Versão ${published.version} publicada. Os computadores instalam na próxima coleta.`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao publicar a versão");
    } finally {
      setPublishing(false);
    }
  }

  async function revoke(id: string, version: string) {
    if (!window.confirm(`Parar de distribuir a versão ${version}? Computadores que já instalaram continuam nela.`)) return;
    try { await revokeAgentRelease(id); toast.success(`Versão ${version} revogada.`); await load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Erro ao revogar a versão"); }
  }

  if (!open) return null;
  const total = data?.agents.reduce((sum, row) => sum + row.total, 0) || 0;
  const updated = data?.agents.find((row) => row.version === data.currentVersion)?.total || 0;
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/45 p-4" role="dialog" aria-modal="true" aria-labelledby="agent-updates-title">
      <section className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border bg-white shadow-2xl">
        <header className="flex items-start justify-between border-b p-5">
          <div><h2 id="agent-updates-title" className="text-lg font-black text-slate-950">Atualizações do agente</h2><p className="mt-1 text-sm text-slate-600">Os computadores só instalam pacotes assinados com a chave privada da TI.</p></div>
          <button type="button" onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center rounded-lg border" aria-label="Fechar atualizações"><X size={18} /></button>
        </header>
        <div className="space-y-5 overflow-y-auto p-5">
          {loading && !data ? <p className="flex items-center gap-2 text-sm text-slate-600"><RefreshCw className="animate-spin" size={16} />Carregando versões...</p> : data && <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border p-4"><span className="block text-xs font-black uppercase tracking-wide text-slate-600">Versão distribuída</span><b className="mt-1 block text-2xl text-slate-950">{data.currentVersion || "Nenhuma"}</b></div>
              <div className="rounded-xl border p-4"><span className="block text-xs font-black uppercase tracking-wide text-slate-600">Computadores atualizados</span><b className="mt-1 block text-2xl text-slate-950">{data.currentVersion ? `${updated} de ${total}` : "—"}</b></div>
            </div>
            {data.agents.length > 0 && <div><h3 className="mb-2 text-xs font-black uppercase tracking-wide text-slate-700">Versões em uso</h3><ul className="flex flex-wrap gap-2">{data.agents.map((row) => <li key={row.version} className={`rounded-lg border px-3 py-1.5 text-sm ${row.version === data.currentVersion ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "text-slate-700"}`}><b>{row.version}</b> · {row.total} {row.total === 1 ? "computador" : "computadores"}</li>)}</ul><p className="mt-2 text-xs leading-5 text-slate-600">Agentes anteriores à 2.2.0 não se atualizam sozinhos: reinstale-os uma vez com o pacote novo.</p></div>}
            <label className={`ds-button ds-button--primary w-full cursor-pointer justify-center ${publishing ? "pointer-events-none opacity-50" : ""}`}>
              {publishing ? <RefreshCw className="animate-spin" size={17} /> : <Upload size={17} />}Enviar arquivo .update.json
              <input type="file" accept=".json,application/json" className="sr-only" onChange={(e) => void publish(e)} disabled={publishing} />
            </label>
            <p className="-mt-3 text-xs leading-5 text-slate-600">Gere o arquivo no seu computador com <code className="rounded bg-slate-100 px-1">agent\Publicar-Atualizacao.ps1</code>. A instalação acontece na próxima coleta de cada computador (ao ligar ou às 15h).</p>
            <div>
              <h3 className="mb-2 text-xs font-black uppercase tracking-wide text-slate-700">Histórico de publicações</h3>
              {data.releases.length === 0 ? <p className="text-sm text-slate-600">Nenhuma versão publicada ainda.</p> :
                <ul className="divide-y rounded-xl border">{data.releases.map((release) => <li key={release.id} className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0"><p className="flex items-center gap-2 font-black text-slate-950">{release.active && <ShieldCheck size={16} className="text-emerald-600" />}{release.version}{!release.active && <span className="rounded bg-slate-100 px-1.5 text-xs font-bold text-slate-600">revogada</span>}</p><p className="truncate text-xs text-slate-600">{formatDate(release.publishedAt)} · {formatSize(release.sizeBytes)} · SHA-256 {release.sha256.slice(0, 12)}…</p></div>
                  {release.active && <button type="button" onClick={() => void revoke(release.id, release.version)} className="ds-button ds-button--secondary inline-flex shrink-0 items-center gap-2"><Ban size={15} />Revogar</button>}
                </li>)}</ul>}
            </div>
          </>}
        </div>
      </section>
    </div>
  );
}
