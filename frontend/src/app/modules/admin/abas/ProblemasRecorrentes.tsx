/**
 * Responsabilidade: sugestões da base a partir de problemas recorrentes nos chamados.
 */
import { AlertTriangle, CheckCircle2, Lightbulb } from "lucide-react";
import { Button, Card } from "../../../components/shared/FormPrimitives";
import type { ProblemaRecorrente } from "../../../services/api";

// Do que exige ação ao que já está resolvido.
const PRIORIDADE: Record<ProblemaRecorrente["situacao"], number> = { sem_artigo: 0, artigo_interno: 1, artigo_pouco_efetivo: 2, coberto: 3 };

const formatarTaxa = (taxa?: number | null) => (taxa == null ? "—" : `${Math.round(taxa * 100)}%`);

function Recomendacao({ problema, podePublicar, onCriar, onRevisar }: { problema: ProblemaRecorrente; podePublicar: boolean; onCriar: () => void; onRevisar: () => void }) {
  const { artigo } = problema;
  if (problema.situacao === "sem_artigo") {
    return <><p>Nenhum artigo adequado foi localizado.</p><p className="font-black">Recomendamos criar um tutorial.</p>
      <Button type="button" className="mt-3 h-9" onClick={onCriar}>Criar tutorial</Button></>;
  }
  if (problema.situacao === "artigo_interno") {
    return <><p>Existe apenas o artigo interno “{artigo?.titulo}”: usuários não conseguem resolver sozinhos.</p>
      <p className="font-black">Recomendamos criar uma versão pública.</p>
      <Button type="button" className="mt-3 h-9" onClick={onCriar}>Criar versão pública</Button></>;
  }
  return <><p>O artigo “{artigo?.titulo}” resolve poucos casos (sucesso {formatarTaxa(artigo?.taxa_sucesso)}).</p>
    <p className="font-black">Recomendamos revisar o artigo.</p>
    {podePublicar
      ? <Button type="button" variant="secondary" className="mt-3 h-9" onClick={onRevisar}>Revisar artigo</Button>
      : <p className="mt-2 text-xs">Artigos publicados são revisados por um supervisor ou administrador.</p>}</>;
}

export function ProblemasRecorrentes({ problemas, podePublicar, onCriarArtigo, onRevisarArtigo }: {
  problemas: ProblemaRecorrente[];
  podePublicar: boolean;
  onCriarArtigo: (problema: ProblemaRecorrente) => void;
  onRevisarArtigo: (artigoId: number) => void;
}) {
  const ordenados = [...problemas].sort((a, b) => PRIORIDADE[a.situacao] - PRIORIDADE[b.situacao] || b.quantidade - a.quantidade);
  const acionaveis = ordenados.filter((p) => p.situacao !== "coberto");
  const cobertos = ordenados.filter((p) => p.situacao === "coberto");

  return (
    <Card className="mb-6">
      <div className="mb-3 flex items-center gap-2">
        <Lightbulb size={18} className="text-amber-500" />
        <h3 className="font-black">Sugestões a partir dos chamados</h3>
      </div>
      {problemas.length === 0 && <p className="text-sm text-zinc-500">Nenhum problema recorrente nos chamados recentes.</p>}
      <div className="grid gap-3 lg:grid-cols-2">
        {acionaveis.map((problema) => (
          <div key={`${problema.situacao}-${problema.titulo}`} className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-900">
            <p className="flex items-center gap-2 font-black"><AlertTriangle size={16} /> Problema recorrente identificado</p>
            <p className="mt-1 font-bold text-zinc-800">{problema.titulo}</p>
            <p>{problema.quantidade} chamados semelhantes nos últimos {problema.dias} dias.</p>
            <Recomendacao
              problema={problema}
              podePublicar={podePublicar}
              onCriar={() => onCriarArtigo(problema)}
              onRevisar={() => problema.artigo && onRevisarArtigo(problema.artigo.id)}
            />
            <p className="mt-3 text-xs text-zinc-500">
              Ex.: {problema.exemplos.slice(0, 3).map((e) => `${e.numero_chamado || `#${e.id}`} ${e.titulo}`).join(" · ")}
            </p>
          </div>
        ))}
      </div>
      {cobertos.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs text-zinc-500">
          {cobertos.map((problema) => (
            <li key={`coberto-${problema.titulo}`} className="flex items-start gap-1.5">
              <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-600" />
              <span>
                {problema.quantidade} chamados sobre “{problema.titulo}”: coberto por “{problema.artigo?.titulo}”
                {problema.artigo?.recomendacoes ? ` (sucesso ${formatarTaxa(problema.artigo.taxa_sucesso)})` : " — ainda não foi recomendado a nenhum usuário"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
