/**
 * Responsabilidade: base de conhecimento do portal (busca e leitura de artigos).
 */
import { useMemo } from "react";
import { BookOpen, Search } from "lucide-react";
import { Badge } from "../../../components/shared/FormPrimitives";
import { type ArtigoBase } from "../../../services/api";

export function UsuarioBaseConhecimento({
  artigos,
  busca,
  setBusca,
}: {
  artigos: ArtigoBase[];
  busca: string;
  setBusca: (value: string) => void;
}) {
  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return artigos;
    return artigos.filter((artigo) =>
      [
        artigo.titulo,
        artigo.categoria,
        artigo.palavras_chave,
        artigo.conteudo,
      ].some((valor) =>
        String(valor || "")
          .toLowerCase()
          .includes(q),
      ),
    );
  }, [artigos, busca]);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-black text-zinc-900">
              Base de conhecimento
            </h3>
            <p className="text-sm text-zinc-500">
              Pesquise soluções antes de abrir um chamado.
            </p>
          </div>
          <div className="ds-search flex h-10 min-w-[280px] items-center overflow-hidden rounded-full border border-zinc-200 bg-white shadow-sm">
            <Search size={17} className="ml-4 text-zinc-400" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar solução..."
              className="h-full min-w-0 flex-1 border-0 bg-transparent px-3 text-sm font-semibold outline-none"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtrados.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500 md:col-span-2 xl:col-span-3">
            Nenhuma solução encontrada.
          </div>
        ) : (
          filtrados.map((artigo) => (
            <div
              key={artigo.id}
              className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
            >
              <div className="mb-3 flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-700">
                  <BookOpen size={17} />
                </div>
                <Badge className="border-zinc-200 bg-zinc-50 text-zinc-600">
                  {artigo.categoria || "Solução"}
                </Badge>
              </div>
              <h4 className="font-black text-zinc-900">{artigo.titulo}</h4>
              <p className="mt-2 line-clamp-5 text-sm leading-6 text-zinc-500">
                {artigo.conteudo}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
