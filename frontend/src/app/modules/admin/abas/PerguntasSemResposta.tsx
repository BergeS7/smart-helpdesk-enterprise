/**
 * Responsabilidade: perguntas que o assistente não respondeu, para a equipe transformar em tutorial.
 */
import { Bot, CheckCircle2, MessageCircleQuestion } from "lucide-react";
import { Button, Card } from "../../../components/shared/FormPrimitives";
import type { LacunaAssistente, LacunasAssistente } from "../../../services/api";

const formatarData = (valor: string) => new Date(valor).toLocaleDateString("pt-BR");
const numero = (valor: number) => valor.toLocaleString("pt-BR");

function Indicador({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2">
      <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">{rotulo}</p>
      <p className="text-lg font-black text-zinc-900">{valor}</p>
    </div>
  );
}

export function PerguntasSemResposta({ lacunas, onCriarArtigo }: {
  lacunas: LacunasAssistente | null;
  onCriarArtigo: (lacuna: LacunaAssistente) => void;
}) {
  if (!lacunas) return null;
  const { dias, resumo, itens } = lacunas;
  const pendentes = itens.filter((item) => !item.artigo);
  const cobertas = itens.filter((item) => item.artigo);
  const taxa = resumo.perguntas ? `${Math.round((resumo.resolvidas / resumo.perguntas) * 100)}%` : "—";

  return (
    <Card className="mb-6">
      <div className="mb-3 flex items-center gap-2">
        <Bot size={18} className="text-blue-600" />
        <h3 className="font-black">Assistente: perguntas sem resposta</h3>
        <span className="text-xs text-zinc-500">últimos {dias} dias</span>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Indicador rotulo="Perguntas" valor={numero(resumo.perguntas)} />
        <Indicador rotulo="Resolvidas pela IA" valor={taxa} />
        <Indicador rotulo="Sem resposta" valor={numero(resumo.sem_resposta)} />
        <Indicador rotulo="Tokens usados" valor={numero(resumo.tokens_entrada + resumo.tokens_saida)} />
      </div>

      {itens.length === 0 && <p className="text-sm text-zinc-500">Todas as perguntas recentes foram respondidas pela base.</p>}
      <div className="grid gap-3 lg:grid-cols-2">
        {pendentes.map((item) => (
          <div key={item.pergunta} className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 text-sm text-blue-950">
            <p className="flex items-center gap-2 font-black"><MessageCircleQuestion size={16} /> “{item.pergunta}”</p>
            <p className="mt-1 text-zinc-700">
              {item.quantidade === 1 ? "Perguntado 1 vez" : `Perguntado ${item.quantidade} vezes por ${item.usuarios} ${item.usuarios === 1 ? "pessoa" : "pessoas"}`}
              {" · última em "}{formatarData(item.ultima_em)}
            </p>
            {item.exemplos.length > 0 && (
              <p className="mt-2 text-xs text-zinc-500">Também perguntaram: {item.exemplos.map((e) => `“${e}”`).join(" · ")}</p>
            )}
            <Button type="button" className="mt-3 h-9" onClick={() => onCriarArtigo(item)}>Criar tutorial</Button>
          </div>
        ))}
      </div>
      {cobertas.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs text-zinc-500">
          {cobertas.map((item) => (
            <li key={`coberta-${item.pergunta}`} className="flex items-start gap-1.5">
              <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-600" />
              <span>“{item.pergunta}” ({item.quantidade}×): agora coberto por “{item.artigo?.titulo}”</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
