/**
 * Responsabilidade: unidades (e municípios) da empresa, carregadas uma vez por empresa e compartilhadas entre as telas.
 */
import { useEffect, useMemo, useState } from "react";
import { getToken, listarLocalidades, type Localidade } from "../services/api";

const cache = new Map<string, Promise<Localidade[]>>();

/** Descarta o cache (ex.: depois que o admin cadastra ou desativa uma unidade). */
export function invalidarLocalidades() {
  cache.clear();
}

export function useLocalidades(empresaSlug?: string) {
  // A sessão entra na chave: antes do login valem as unidades da principal; depois, as da empresa do usuário.
  const chave = `${empresaSlug || ""}|${getToken() || ""}`;
  const [unidades, setUnidades] = useState<Localidade[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    if (!cache.has(chave)) {
      cache.set(chave, listarLocalidades(empresaSlug).catch((error) => {
        cache.delete(chave);
        throw error;
      }));
    }
    setCarregando(true);
    cache.get(chave)!
      .then((lista) => ativo && setUnidades(lista))
      .catch(() => ativo && setUnidades([]))
      .finally(() => ativo && setCarregando(false));
    return () => { ativo = false; };
  }, [chave, empresaSlug]);

  const municipios = useMemo(() => [...new Set(unidades.map((u) => u.municipio))].sort((a, b) => a.localeCompare(b, "pt-BR")), [unidades]);
  return { unidades, municipios, carregando };
}
