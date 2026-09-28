/**
 * Responsabilidade: escolha da unidade da empresa (agrupada por município); define município e unidade juntos.
 */
import type { Localidade } from "../../services/api";

type Valor = { municipio?: string | null; unidade?: string | null };

export function SeletorUnidade({
  unidades,
  carregando,
  value,
  onChange,
  required = false,
  className = "",
  semUnidadesTexto = "A empresa ainda não cadastrou unidades.",
}: {
  unidades: Localidade[];
  carregando: boolean;
  value: Valor;
  onChange: (valor: { municipio: string; unidade: string }) => void;
  required?: boolean;
  className?: string;
  semUnidadesTexto?: string;
}) {
  if (!carregando && unidades.length === 0) return <p className="text-sm text-zinc-500">{semUnidadesTexto}</p>;

  const municipios = [...new Set(unidades.map((u) => u.municipio))];
  const selecionada = unidades.find((u) => u.municipio === value.municipio && u.nome === value.unidade);
  // Valor salvo que não é mais uma unidade ativa: aparece para o usuário saber que precisa trocar.
  const valorAntigo = !selecionada && value.unidade ? `${value.unidade}${value.municipio ? ` (${value.municipio})` : ""}` : "";

  return (
    <select
      required={required}
      disabled={carregando}
      className={className}
      value={selecionada ? String(selecionada.id) : valorAntigo ? "antigo" : ""}
      onChange={(e) => {
        const unidade = unidades.find((u) => String(u.id) === e.target.value);
        onChange(unidade ? { municipio: unidade.municipio, unidade: unidade.nome } : { municipio: "", unidade: "" });
      }}
    >
      <option value="">{carregando ? "Carregando unidades…" : "Selecione a unidade"}</option>
      {valorAntigo && <option value="antigo" disabled>{valorAntigo}: não está mais ativa</option>}
      {municipios.map((municipio) => (
        <optgroup key={municipio} label={municipio}>
          {unidades.filter((u) => u.municipio === municipio).map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
        </optgroup>
      ))}
    </select>
  );
}
