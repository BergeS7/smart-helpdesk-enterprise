/**
 * Responsabilidade: Vínculo opcional entre um ativo e o usuário responsável, exibido nos detalhes do ativo.
 */
import { UserX } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { searchAssignableUsers, setDeviceUser } from "../../services/deviceService";
import type { AssignableUser, Device } from "../../types/device";
import { UserAvatar } from "./UserAvatar";

export const ASSET_USER_LINKED_EVENT = "asset-user-linked";

export function AssetUserLink({ device }: { device: Device }) {
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<AssignableUser[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const linked = device.usuarioVinculado;

  useEffect(() => {
    setEditing(false);
    setQuery("");
  }, [device.id]);

  useEffect(() => {
    if (!editing) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      searchAssignableUsers(query.trim())
        .then((rows) => { if (!cancelled) { setOptions(rows); setError(""); } })
        .catch((e) => { if (!cancelled) { setOptions([]); setError(e instanceof Error ? e.message : "Erro ao buscar usuários"); } });
    }, 250);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [editing, query]);

  async function save(usuarioId: number | null) {
    try {
      setSaving(true);
      const updated = await setDeviceUser(device.id, usuarioId);
      window.dispatchEvent(new CustomEvent(ASSET_USER_LINKED_EVENT, { detail: updated }));
      toast.success(usuarioId === null ? "Vínculo removido." : "Responsável vinculado.");
      setEditing(false);
      setQuery("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível atualizar o vínculo");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-3 rounded-xl border p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          {linked && <UserAvatar name={linked.nome || linked.email || "Usuário"} photoUrl={linked.fotoUrl} size="sm" />}
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-widest text-zinc-500">Responsável (opcional)</p>
            <b className="block truncate text-sm">{linked?.nome || linked?.email || "Não vinculado"}</b>
            {linked?.nome && linked.email && <small className="block truncate text-zinc-500">{linked.email}</small>}
          </div>
        </div>
        <button type="button" onClick={() => setEditing((v) => !v)} className="shrink-0 rounded-lg border px-2.5 py-1.5 text-[11px] font-black">
          {editing ? "Fechar" : linked ? "Alterar" : "Vincular"}
        </button>
      </div>
      {editing && (
        <div className="mt-3 space-y-2">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome ou e-mail"
            aria-label="Buscar usuário para vincular"
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <ul className="max-h-44 divide-y overflow-auto rounded-lg border">
            {options.map((user) => (
              <li key={user.id}>
                <button type="button" disabled={saving} onClick={() => void save(user.id)} className="w-full px-3 py-2 text-left text-xs hover:bg-zinc-50 disabled:opacity-60">
                  <b>{user.nome}</b>
                  <span className="block text-zinc-500">{user.email}</span>
                </button>
              </li>
            ))}
            {!options.length && !error && <li className="px-3 py-2 text-xs text-zinc-500">Nenhum usuário encontrado.</li>}
          </ul>
          {linked && (
            <button type="button" disabled={saving} onClick={() => void save(null)} className="flex items-center gap-1.5 text-xs font-black text-red-600 disabled:opacity-60">
              <UserX size={14} />Remover vínculo
            </button>
          )}
        </div>
      )}
    </div>
  );
}
