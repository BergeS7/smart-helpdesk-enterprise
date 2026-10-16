/**
 * Responsabilidade: conteúdo da análise da IA de prioridade no detalhe do chamado. Motivo,
 * responsável e resposta sugerida são de todos; confiança, dimensões, sinais e perguntas
 * pendentes são dados de triagem e só aparecem para a equipe.
 */
import { AlertTriangle } from "lucide-react";
import type { ApiChamado } from "../../services/api";

// O banco grava a confiança em NUMERIC (chega como texto); registros antigos podem estar em fração.
export function confiancaIA(chamado: ApiChamado): number | null {
  const bruto = chamado.prioridade_ia_confianca ?? chamado.prioridade_ia_analise?.confianca;
  if (bruto == null) return null;
  const valor = Number(bruto);
  if (!Number.isFinite(valor) || valor <= 0) return null;
  return Math.round(valor <= 1 ? valor * 100 : valor);
}

export function requerTriagemIA(chamado: ApiChamado): boolean {
  return Boolean(chamado.prioridade_ia_analise?.requer_triagem);
}

const DIMENSOES: Array<{ chave: "impacto" | "urgencia" | "abrangencia" | "risco"; label: string; maximo: number }> = [
  { chave: "impacto", label: "Impacto", maximo: 40 },
  { chave: "urgencia", label: "Urgência", maximo: 25 },
  { chave: "abrangencia", label: "Abrangência", maximo: 20 },
  { chave: "risco", label: "Risco", maximo: 25 },
];

export function AnaliseIAPrioridade({ chamado, detalhada }: { chamado: ApiChamado; detalhada: boolean }) {
  const analise = chamado.prioridade_ia_analise;
  const confianca = confiancaIA(chamado);
  const motivos = String(chamado.prioridade_ia_motivo || "").split(" | ").map((m) => m.trim()).filter(Boolean);
  return (
    <div className="space-y-3 border-t border-zinc-100 px-5 py-4 text-sm leading-6 text-zinc-600">
      {detalhada && requerTriagemIA(chamado) && (
        <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-amber-800">
          <AlertTriangle size={16} className="mt-1 shrink-0" />
          <span><b>Requer triagem:</b> a confiança da IA está baixa. Confirme a prioridade com o solicitante.</span>
        </p>
      )}
      {detalhada && analise && (
        <div className="grid gap-3 rounded-xl border border-zinc-100 p-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <span className="block text-[10px] font-black uppercase tracking-wider text-zinc-400">Regra decisiva</span>
            <p className="font-semibold text-zinc-800">{analise.regra_decisiva || "Não informada"}</p>
          </div>
          <div>
            <span className="block text-[10px] font-black uppercase tracking-wider text-zinc-400">Confiança</span>
            <b className="text-zinc-800">{confianca != null ? `${confianca}%` : "Não informada"}</b>
          </div>
          <div>
            <span className="block text-[10px] font-black uppercase tracking-wider text-zinc-400">Pontuação</span>
            <b className="text-zinc-800">{analise.pontuacao ?? "—"} / 100</b>
          </div>
          {analise.dimensoes && (
            <div className="space-y-1.5 sm:col-span-2">
              {DIMENSOES.map(({ chave, label, maximo }) => {
                const valor = Number(analise.dimensoes?.[chave] || 0);
                return (
                  <div key={chave} className="flex items-center gap-2 text-xs">
                    <span className="w-24 shrink-0 font-bold text-zinc-700">{label}</span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100">
                      <span className="block h-full rounded-full bg-violet-500" style={{ width: `${Math.min(100, (valor / maximo) * 100)}%` }} />
                    </span>
                    <span className="w-12 shrink-0 text-right text-zinc-500">{valor}/{maximo}</span>
                  </div>
                );
              })}
            </div>
          )}
          {!!analise.sinais?.length && (
            <div className="sm:col-span-2">
              <span className="block text-[10px] font-black uppercase tracking-wider text-zinc-400">Sinais encontrados</span>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {analise.sinais.map((sinal) => <span key={sinal} className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-bold text-violet-700">{sinal}</span>)}
              </div>
            </div>
          )}
          {!!analise.perguntas_pendentes?.length && (
            <div className="sm:col-span-2">
              <span className="block text-[10px] font-black uppercase tracking-wider text-zinc-400">Perguntar ao solicitante</span>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {analise.perguntas_pendentes.map((pergunta) => <li key={pergunta}>{pergunta}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
      <div>
        <b className="text-zinc-800">Motivo:</b>
        {motivos.length > 1 ? (
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {motivos.map((motivo) => <li key={motivo}>{motivo}</li>)}
          </ul>
        ) : (
          <> {motivos[0] || "Não disponível"}</>
        )}
      </div>
      <p>
        <b className="text-zinc-800">Responsável sugerido:</b>{" "}
        {chamado.ia_responsavel_sugerido || "Não sugerido"}
      </p>
      <div className="rounded-xl bg-zinc-50 p-3">
        <b className="text-zinc-800">Resposta sugerida:</b>
        <p className="mt-1">{chamado.ia_resposta_inicial || "Não disponível"}</p>
      </div>
      {chamado.ia_duplicidade_motivo && (
        <p className="rounded-xl bg-amber-50 p-3 text-amber-800">
          <b>Possível duplicidade:</b> {chamado.ia_duplicidade_motivo}
        </p>
      )}
    </div>
  );
}
