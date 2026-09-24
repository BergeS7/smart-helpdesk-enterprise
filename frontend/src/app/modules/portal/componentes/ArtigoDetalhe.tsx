/**
 * Responsabilidade: leitura completa de um artigo da base (resumo, solução, passo a passo e vídeo).
 */
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { PlayCircle, RefreshCw, ThumbsDown, ThumbsUp } from "lucide-react";
import { Button, Modal } from "../../../components/shared/FormPrimitives";
import { obterArtigoBase, registrarVisualizacaoArtigo, type ArtigoBase } from "../../../services/api";

function Secao({ titulo, texto }: { titulo: string; texto?: string | null }) {
  if (!texto) return null;
  return (
    <section>
      <h4 className="mb-1 text-xs font-extrabold uppercase tracking-[.055em] text-zinc-500">{titulo}</h4>
      <p className="whitespace-pre-line text-sm leading-6 text-zinc-700">{texto}</p>
    </section>
  );
}

// onResposta só é passado quando o artigo veio de uma recomendação: aí perguntamos se resolveu.
export function ArtigoDetalhe({ artigoId, onClose, onResposta }: { artigoId: number; onClose: () => void; onResposta?: (resolveu: boolean) => Promise<void> }) {
  const [artigo, setArtigo] = useState<ArtigoBase | null>(null);
  const [erro, setErro] = useState("");
  const [respondendo, setRespondendo] = useState(false);

  async function responder(resolveu: boolean) {
    if (!onResposta) return;
    setRespondendo(true);
    try { await onResposta(resolveu); } finally { setRespondendo(false); }
  }

  useEffect(() => {
    let ativo = true;
    obterArtigoBase(artigoId)
      .then((dados) => { if (ativo) setArtigo(dados); })
      .catch((e) => { if (ativo) setErro(e instanceof Error ? e.message : "Não foi possível abrir o artigo."); });
    registrarVisualizacaoArtigo(artigoId).catch(() => {});
    return () => { ativo = false; };
  }, [artigoId]);

  // Portal no body: as abas animadas usam transform, que prenderia o modal "fixed" dentro delas.
  return createPortal(
    <Modal title={artigo?.titulo || "Artigo"} onClose={onClose}>
      {!artigo && !erro && (
        <div className="grid min-h-40 place-items-center"><RefreshCw size={22} className="animate-spin text-blue-600" /></div>
      )}
      {erro && <p className="text-sm font-bold text-red-600">{erro}</p>}
      {artigo && (
        <div className="space-y-5">
          <Secao titulo="Resumo" texto={artigo.resumo} />
          <Secao titulo="Problema" texto={artigo.problema} />
          <Secao titulo="Sintomas" texto={artigo.sintomas} />
          <Secao titulo="Solução" texto={artigo.solucao} />
          {!!artigo.passos?.length && (
            <section>
              <h4 className="mb-2 text-xs font-extrabold uppercase tracking-[.055em] text-zinc-500">Passo a passo</h4>
              <ol className="space-y-3">
                {artigo.passos.map((passo, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue-50 text-xs font-black text-blue-700">{i + 1}</span>
                    <div className="min-w-0 space-y-2">
                      <p className="whitespace-pre-line text-sm leading-6 text-zinc-700">{passo.texto}</p>
                      {passo.imagem_url && <img src={passo.imagem_url} alt={`Passo ${i + 1}`} loading="lazy" className="max-h-72 rounded-lg border border-zinc-200 object-contain" />}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}
          {artigo.video_url?.startsWith("https://") && (
            <a href={artigo.video_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-100">
              <PlayCircle size={18} /> Assistir vídeo explicativo
            </a>
          )}
          <Secao titulo="Detalhes" texto={artigo.conteudo} />
          {onResposta && (
            <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-black text-zinc-800">Essa solução resolveu seu problema?</p>
              <div className="flex gap-2">
                <Button type="button" disabled={respondendo} onClick={() => void responder(true)}><ThumbsUp size={16} /> Sim</Button>
                <Button type="button" variant="secondary" disabled={respondendo} onClick={() => void responder(false)}><ThumbsDown size={16} /> Não</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>,
    document.body,
  );
}
