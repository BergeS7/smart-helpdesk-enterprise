/**
 * Responsabilidade: painel lateral do assistente da base de conhecimento.
 * A resposta vem da IA com base nos artigos; cada artigo usado aparece com passo a passo e vídeo.
 * Fica montado mesmo fechado, para a conversa continuar quando o painel é reaberto.
 */
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowUp, BookOpen, Check, Copy, PlayCircle, Plus, Sparkles, ThumbsDown, ThumbsUp, Ticket, X } from "lucide-react";
import { perguntarAssistente, registrarCliqueRecomendacao, responderRecomendacao, type ArtigoAssistente, type ArtigoBase, type FalaAssistente, type SituacaoAssistente } from "../../../services/api";
import { ArtigoDetalhe } from "./ArtigoDetalhe";

type Mensagem = {
  id: number;
  papel: FalaAssistente["papel"];
  texto: string;
  situacao?: SituacaoAssistente;
  artigos?: ArtigoAssistente[];
  resolveu?: boolean;
};

const NOME_ASSISTENTE = "Assistente";
const MAX_SUGESTOES = 2;
const SITUACOES_SEM_SOLUCAO: SituacaoAssistente[] = ["sem_resposta", "sem_artigo"];

let proximoId = 1;

export function AssistenteChat({ aberto, onFechar, nomeUsuario, artigos, onAbrirChamado }: {
  aberto: boolean;
  onFechar: () => void;
  nomeUsuario?: string;
  // Artigos que o usuário já pode ver: os mais acessados viram atalhos de pergunta.
  artigos: ArtigoBase[];
  onAbrirChamado: (dados: { titulo: string; descricao: string }) => void;
}) {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [copiada, setCopiada] = useState<number | null>(null);
  const [artigoAberto, setArtigoAberto] = useState<{ artigo: ArtigoAssistente; mensagemId: number } | null>(null);
  const fimRef = useRef<HTMLDivElement>(null);
  const campoRef = useRef<HTMLTextAreaElement>(null);

  const primeiroNome = String(nomeUsuario || "").trim().split(/\s+/)[0];
  const sugestoes = [...artigos].sort((a, b) => (b.visualizacoes || 0) - (a.visualizacoes || 0)).slice(0, MAX_SUGESTOES);

  useEffect(() => { fimRef.current?.scrollIntoView?.({ block: "end" }); }, [mensagens, enviando]);
  useEffect(() => {
    if (!aberto) return;
    campoRef.current?.focus();
    const fecharComEsc = (e: KeyboardEvent) => { if (e.key === "Escape" && !artigoAberto) onFechar(); };
    window.addEventListener("keydown", fecharComEsc);
    return () => window.removeEventListener("keydown", fecharComEsc);
  }, [aberto, artigoAberto, onFechar]);

  async function enviar(pergunta: string) {
    pergunta = pergunta.trim();
    if (pergunta.length < 3 || enviando) return;
    // Só as falas: o backend decide quantas mensagens e quantos caracteres vão para a IA.
    const historico = mensagens.map(({ papel, texto: fala }) => ({ papel, texto: fala }));
    setMensagens((atual) => [...atual, { id: proximoId++, papel: "usuario", texto: pergunta }]);
    setTexto("");
    setEnviando(true);
    try {
      const resposta = await perguntarAssistente(pergunta, historico);
      setMensagens((atual) => [...atual, { id: proximoId++, papel: "assistente", texto: resposta.resposta, situacao: resposta.situacao, artigos: resposta.artigos }]);
    } catch (e) {
      const erro = e instanceof Error ? e.message : "Não foi possível responder agora.";
      setMensagens((atual) => [...atual, { id: proximoId++, papel: "assistente", texto: erro, situacao: "sem_resposta" }]);
    } finally {
      setEnviando(false);
    }
  }

  function enviarFormulario(evento: FormEvent) {
    evento.preventDefault();
    void enviar(texto);
  }

  // A resposta vale para todos os artigos da mensagem: é o mesmo "resolveu?" das recomendações da base.
  async function responder(mensagem: Mensagem, resolveu: boolean) {
    setMensagens((atual) => atual.map((m) => (m.id === mensagem.id ? { ...m, resolveu } : m)));
    await Promise.all((mensagem.artigos || []).filter((a) => a.recomendacao_id).map((a) => responderRecomendacao(a.recomendacao_id as number, resolveu).catch(() => {})));
  }

  async function copiar(mensagem: Mensagem) {
    try {
      await navigator.clipboard.writeText(mensagem.texto);
      setCopiada(mensagem.id);
      window.setTimeout(() => setCopiada((atual) => (atual === mensagem.id ? null : atual)), 1500);
    } catch { /* sem permissão de área de transferência: nada a fazer */ }
  }

  function abrirVideo(artigo: ArtigoAssistente) {
    if (artigo.recomendacao_id) registrarCliqueRecomendacao(artigo.recomendacao_id).catch(() => {});
  }

  function abrirChamado() {
    const perguntas = mensagens.filter((m) => m.papel === "usuario").map((m) => m.texto);
    const conversa = mensagens.map((m) => `${m.papel === "usuario" ? "Eu" : NOME_ASSISTENTE}: ${m.texto}`).join("\n");
    onAbrirChamado({
      titulo: (perguntas[0] || "").slice(0, 120),
      descricao: `${perguntas.join("\n")}\n\n--- Conversa com o assistente ---\n${conversa}`,
    });
    onFechar();
  }

  const mensagemDoArtigo = artigoAberto ? mensagens.find((m) => m.id === artigoAberto.mensagemId) : undefined;

  return (
    <>
      <aside
        role="dialog"
        aria-label="Assistente de suporte"
        hidden={!aberto}
        className="fixed inset-0 z-[80] flex flex-col bg-white lg:static lg:z-auto lg:h-screen lg:w-[380px] lg:shrink-0 lg:border-l lg:border-zinc-200"
      >
        <header className="flex h-14 shrink-0 items-center gap-2.5 border-b border-zinc-100 px-4">
          <AvatarAssistente />
          <p className="text-sm font-black text-zinc-900">{NOME_ASSISTENTE}</p>
          <span className="rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-black tracking-wide text-indigo-600">IA</span>
          <div className="ml-auto flex items-center gap-1.5">
            <button type="button" onClick={() => setMensagens([])} disabled={enviando || mensagens.length === 0} className="grid h-8 w-8 place-items-center rounded-lg border border-zinc-200 text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-800 disabled:opacity-40" title="Nova conversa" aria-label="Nova conversa">
              <Plus size={16} />
            </button>
            <button type="button" onClick={onFechar} className="grid h-8 w-8 place-items-center rounded-lg border border-zinc-200 text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-800" title="Fechar" aria-label="Fechar assistente">
              <X size={16} />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-5" aria-live="polite">
          <div>
            <div className="flex items-center gap-2.5">
              <AvatarAssistente grande />
              <h2 className="text-xl font-black tracking-tight text-zinc-900">Olá{primeiroNome ? `, ${primeiroNome}` : ""}.</h2>
            </div>
            <p className="mt-2 text-sm leading-6 text-zinc-500">Descreva seu problema do seu jeito que eu mostro o passo a passo. Por onde começamos?</p>
          </div>

          {sugestoes.length > 0 && (
            <div className="space-y-2">
              {sugestoes.map((artigo) => (
                <button key={artigo.id} type="button" disabled={enviando} onClick={() => void enviar(artigo.titulo)} className="flex w-full items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 text-left transition hover:border-indigo-200 hover:bg-indigo-50/50 disabled:opacity-60">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-indigo-100 text-indigo-600"><BookOpen size={15} /></span>
                  <span className="min-w-0">
                    <span className="block text-sm font-black text-zinc-800">{artigo.titulo.replace(/^\[DEMO\]\s*/, "")}</span>
                    {artigo.resumo && <span className="mt-0.5 block line-clamp-1 text-xs text-zinc-500">{artigo.resumo}</span>}
                  </span>
                </button>
              ))}
            </div>
          )}

          {mensagens.map((mensagem) => mensagem.papel === "usuario" ? (
            <div key={mensagem.id} className="flex justify-end">
              <p className="max-w-[85%] whitespace-pre-line rounded-2xl rounded-br-md bg-indigo-600 px-3.5 py-2.5 text-sm leading-6 text-white">{mensagem.texto}</p>
            </div>
          ) : (
            <div key={mensagem.id} className="space-y-2">
              <div className="flex items-center gap-2"><AvatarAssistente /><p className="text-xs font-black text-zinc-800">{NOME_ASSISTENTE}</p></div>
              <p className="whitespace-pre-line text-sm leading-6 text-zinc-800">{mensagem.texto}</p>

              {mensagem.artigos?.map((artigo) => (
                <div key={artigo.id} className="rounded-xl border border-zinc-200 bg-white p-3">
                  <p className="text-sm font-black text-zinc-900">{artigo.titulo}</p>
                  {artigo.resumo && <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{artigo.resumo}</p>}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" onClick={() => setArtigoAberto({ artigo, mensagemId: mensagem.id })} className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-black text-zinc-700 transition hover:bg-zinc-50">
                      <BookOpen size={14} /> Passo a passo
                    </button>
                    {artigo.video_url && (
                      <a href={artigo.video_url} target="_blank" rel="noopener noreferrer" onClick={() => abrirVideo(artigo)} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs font-black text-indigo-700 transition hover:bg-indigo-100">
                        <PlayCircle size={14} /> Assistir vídeo
                      </a>
                    )}
                  </div>
                </div>
              ))}

              <div className="flex items-center gap-1 text-zinc-400">
                <BotaoIcone rotulo={copiada === mensagem.id ? "Copiado" : "Copiar resposta"} onClick={() => void copiar(mensagem)}>
                  {copiada === mensagem.id ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                </BotaoIcone>
                {!!mensagem.artigos?.length && (
                  <>
                    <BotaoIcone rotulo="Resolveu" ativo={mensagem.resolveu === true} disabled={mensagem.resolveu !== undefined} onClick={() => void responder(mensagem, true)}><ThumbsUp size={14} /></BotaoIcone>
                    <BotaoIcone rotulo="Não resolveu" ativo={mensagem.resolveu === false} disabled={mensagem.resolveu !== undefined} onClick={() => void responder(mensagem, false)}><ThumbsDown size={14} /></BotaoIcone>
                  </>
                )}
                {mensagem.resolveu === true && <span className="ml-1 text-xs font-bold text-zinc-500">Que bom! Obrigado pelo retorno.</span>}
              </div>

              {(SITUACOES_SEM_SOLUCAO.includes(mensagem.situacao as SituacaoAssistente) || mensagem.resolveu === false) && (
                <button type="button" onClick={abrirChamado} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-black text-white transition hover:bg-indigo-700">
                  <Ticket size={14} /> Abrir chamado com esta conversa
                </button>
              )}
            </div>
          ))}

          {enviando && (
            <div className="space-y-2">
              <div className="flex items-center gap-2"><AvatarAssistente /><p className="text-xs font-black text-zinc-800">{NOME_ASSISTENTE}</p></div>
              <span className="inline-flex gap-1" aria-label="Respondendo"><Ponto /><Ponto atraso="150ms" /><Ponto atraso="300ms" /></span>
            </div>
          )}
          <div ref={fimRef} />
        </div>

        <div className="shrink-0 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-2">
          <form onSubmit={enviarFormulario} className="rounded-2xl border border-zinc-200 bg-white p-2.5 shadow-sm transition focus-within:border-indigo-300 focus-within:ring-4 focus-within:ring-indigo-500/10">
            <textarea
              ref={campoRef}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void enviar(texto); } }}
              rows={2}
              maxLength={600}
              placeholder="Descreva seu problema..."
              aria-label="Sua pergunta"
              className="block max-h-32 w-full resize-none border-0 bg-transparent px-1 text-sm text-zinc-800 outline-none placeholder:text-zinc-400"
            />
            <div className="mt-1 flex items-center justify-between">
              <span className="px-1 text-[11px] text-zinc-400">Enter envia · Shift+Enter quebra linha</span>
              <button type="submit" disabled={enviando || texto.trim().length < 3} className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Enviar pergunta">
                <ArrowUp size={16} />
              </button>
            </div>
          </form>
          <p className="mt-2 text-center text-[11px] text-zinc-400">A IA pode cometer erros. Confira informações importantes.</p>
        </div>
      </aside>

      {artigoAberto && (
        <ArtigoDetalhe
          artigoId={artigoAberto.artigo.id}
          onClose={() => setArtigoAberto(null)}
          onResposta={artigoAberto.artigo.recomendacao_id && mensagemDoArtigo?.resolveu === undefined ? async (resolveu) => {
            if (mensagemDoArtigo) await responder(mensagemDoArtigo, resolveu);
            setArtigoAberto(null);
          } : undefined}
        />
      )}
    </>
  );
}

// Botão do topo do portal que abre e fecha o painel.
export function BotaoAssistente({ aberto, onClick }: { aberto: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={aberto}
      title="Assistente de suporte"
      aria-label="Assistente IA"
      className={`flex h-10 items-center gap-2 rounded-xl px-3 text-xs font-black transition sm:px-4 ${aberto ? "bg-indigo-700 text-white" : "bg-indigo-600 text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700"}`}
    >
      <Sparkles size={16} />
      <span className="hidden sm:inline">Assistente IA</span>
    </button>
  );
}

function AvatarAssistente({ grande = false }: { grande?: boolean }) {
  return (
    <span className={`grid shrink-0 place-items-center rounded-lg bg-zinc-900 text-white ${grande ? "h-8 w-8" : "h-6 w-6"}`}>
      <Sparkles size={grande ? 16 : 13} />
    </span>
  );
}

function BotaoIcone({ rotulo, ativo = false, disabled = false, onClick, children }: { rotulo: string; ativo?: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" title={rotulo} aria-label={rotulo} aria-pressed={ativo} disabled={disabled} onClick={onClick} className={`grid h-7 w-7 place-items-center rounded-md transition hover:bg-zinc-100 hover:text-zinc-700 disabled:cursor-default disabled:hover:bg-transparent ${ativo ? "text-indigo-600" : ""}`}>
      {children}
    </button>
  );
}

function Ponto({ atraso = "0ms" }: { atraso?: string }) {
  return <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400" style={{ animationDelay: atraso }} />;
}
