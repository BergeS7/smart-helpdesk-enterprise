/**
 * Responsabilidade: aba Unidades (admin): as unidades da empresa formam a área de atuação usada em
 * cadastros, filtros de chamados e no mapa de ativos.
 */
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { MapPin, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Badge, Button, Card, Field, Input } from "../../../components/shared/FormPrimitives";
import { invalidarLocalidades } from "../../../hooks/useLocalidades";
import { createAssetLocation, getAssetLocations, updateAssetLocation, type AssetLocation } from "../../../services/deviceService";

type Formulario = { nome: string; municipio: string; latitude: string; longitude: string };
const VAZIO: Formulario = { nome: "", municipio: "", latitude: "", longitude: "" };

const numeroOuNulo = (valor: string) => (valor.trim() === "" ? null : Number(valor.replace(",", ".")));

export function AbaUnidades() {
  const [unidades, setUnidades] = useState<AssetLocation[]>([]);
  const [form, setForm] = useState<Formulario>(VAZIO);
  const [editando, setEditando] = useState<number | null>(null);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      setUnidades(await getAssetLocations(true));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao carregar unidades.");
    }
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  async function salvar(event: FormEvent) {
    event.preventDefault();
    setSalvando(true);
    const dados = { nome: form.nome.trim(), municipio: form.municipio.trim(), latitude: numeroOuNulo(form.latitude), longitude: numeroOuNulo(form.longitude) };
    try {
      if (editando) await updateAssetLocation(editando, dados);
      else await createAssetLocation(dados);
      toast.success(editando ? "Unidade atualizada." : "Unidade cadastrada.");
      invalidarLocalidades();
      setForm(VAZIO);
      setEditando(null);
      await carregar();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar a unidade.");
    } finally {
      setSalvando(false);
    }
  }

  async function alternar(unidade: AssetLocation) {
    const desativar = unidade.ativa !== false;
    if (desativar && !confirm(`Desativar ${unidade.nome}? Ela deixa de aparecer para novos cadastros e filtros; quem já está nela mantém o registro.`)) return;
    try {
      await updateAssetLocation(unidade.id, { ativa: !desativar });
      invalidarLocalidades();
      toast.success(desativar ? "Unidade desativada." : "Unidade reativada.");
      await carregar();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível alterar a unidade.");
    }
  }

  const editar = (unidade: AssetLocation) => {
    setEditando(unidade.id);
    setForm({ nome: unidade.nome, municipio: unidade.municipio, latitude: unidade.latitude == null ? "" : String(unidade.latitude), longitude: unidade.longitude == null ? "" : String(unidade.longitude) });
  };

  const ativas = unidades.filter((u) => u.ativa !== false).length;

  return (
    <div className="grid gap-6 xl:grid-cols-[400px_1fr]">
      <Card>
        <h3 className="mb-1 flex items-center gap-2 font-black"><MapPin size={18} /> {editando ? "Editar unidade" : "Nova unidade"}</h3>
        <p className="mb-4 text-sm text-zinc-500">
          As unidades são os locais onde a empresa atende: aparecem no cadastro de pessoas, nos filtros de chamados e no mapa de ativos.
        </p>
        <form onSubmit={salvar} className="space-y-3">
          <Field label="Nome da unidade">
            <Input required maxLength={255} placeholder="Ex.: Filial Centro" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </Field>
          <Field label="Município">
            <Input required maxLength={150} value={form.municipio} onChange={(e) => setForm({ ...form, municipio: e.target.value })} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Latitude (opcional)">
              <Input inputMode="decimal" placeholder="-3.6667" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} />
            </Field>
            <Field label="Longitude (opcional)">
              <Input inputMode="decimal" placeholder="-45.3800" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} />
            </Field>
          </div>
          <p className="text-xs text-zinc-500">Sem coordenadas a unidade funciona normalmente, só não aparece como ponto próprio no mapa.</p>
          <div className="flex gap-2">
            <Button type="submit" disabled={salvando} className="flex-1">{salvando ? "Salvando…" : editando ? "Salvar alterações" : "Cadastrar unidade"}</Button>
            {editando && <Button type="button" variant="ghost" onClick={() => { setEditando(null); setForm(VAZIO); }}>Cancelar</Button>}
          </div>
        </form>
      </Card>

      <Card className="overflow-hidden p-0">
        <header className="border-b border-zinc-100 p-4">
          <h3 className="font-black">Unidades da empresa</h3>
          <p className="text-xs text-zinc-500">{ativas} ativa(s) de {unidades.length}</p>
        </header>
        {unidades.length === 0 ? (
          <p className="p-6 text-sm text-zinc-500">Nenhuma unidade cadastrada. Sem unidades, o cadastro de pessoas fica sem local de trabalho.</p>
        ) : (
          <div className="divide-y divide-zinc-100">
            {unidades.map((unidade) => (
              <div key={unidade.id} className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 ${unidade.ativa === false ? "opacity-60" : ""}`}>
                <div className="min-w-0">
                  <p className="truncate font-bold">{unidade.nome}</p>
                  <p className="text-xs text-zinc-500">
                    {unidade.municipio}{unidade.latitude != null && unidade.longitude != null ? ` · ${unidade.latitude}, ${unidade.longitude}` : " · sem coordenadas"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {unidade.ativa === false && <Badge className="border-zinc-200 bg-zinc-100 text-zinc-600">Desativada</Badge>}
                  <Button type="button" variant="ghost" className="!h-9 text-xs" onClick={() => editar(unidade)} aria-label={`Editar ${unidade.nome}`}><Pencil size={14} /></Button>
                  <Button type="button" variant="secondary" className="!h-9 text-xs" onClick={() => void alternar(unidade)}>
                    {unidade.ativa === false ? "Reativar" : "Desativar"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
