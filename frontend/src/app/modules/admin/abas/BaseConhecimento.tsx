/**
 * Responsabilidade: aba Base de Conhecimento: artigos da equipe.
 */
import { ArrowDown, ArrowUp, BookOpen, ImagePlus, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Badge, Button, Card, Field, Input, Select, Textarea } from "../../../components/shared/FormPrimitives";
import type { ArtigoBase, PassoArtigo, StatusArtigo, VisibilidadeArtigo } from "../../../services/api";
import type { PainelAdmin } from "../useAdminPanel";

const STATUS_ARTIGO: Record<StatusArtigo, { label: string; className: string }> = {
  rascunho: { label: "Rascunho", className: "border-zinc-200 bg-zinc-50 text-zinc-600" },
  revisao: { label: "Em revisão", className: "border-amber-200 bg-amber-50 text-amber-700" },
  publicado: { label: "Publicado", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  arquivado: { label: "Arquivado", className: "border-zinc-200 bg-zinc-100 text-zinc-500" },
};

// Quem não publica só trabalha com rascunho e revisão (a API aplica a mesma regra).
const STATUS_DO_AUTOR: StatusArtigo[] = ["rascunho", "revisao"];

const CAMPOS_LINHA = [
  { campo: "titulo", label: "Título", required: true },
  { campo: "categoria", label: "Categoria" },
  { campo: "palavras_chave", label: "Palavras-chave" },
  { campo: "resumo", label: "Resumo" },
] as const;

const CAMPOS_TEXTO = [
  { campo: "problema", label: "Problema" },
  { campo: "sintomas", label: "Sintomas" },
  { campo: "solucao", label: "Solução" },
  { campo: "conteudo", label: "Conteúdo completo", required: true },
] as const;

const botaoIcone = "grid h-7 w-7 place-items-center rounded-lg border border-zinc-200 text-zinc-500 transition hover:bg-zinc-50 hover:text-blue-600 disabled:opacity-40";

function EditorPassos({ passos, onChange, onImagem }: { passos: PassoArtigo[]; onChange: (passos: PassoArtigo[]) => void; onImagem: (indice: number, arquivo: File) => void }) {
  const atualizar = (indice: number, passo: PassoArtigo) => onChange(passos.map((atual, i) => (i === indice ? passo : atual)));
  const mover = (indice: number, destino: number) => {
    const novos = [...passos];
    [novos[indice], novos[destino]] = [novos[destino], novos[indice]];
    onChange(novos);
  };
  return (
    <div className="space-y-2">
      <span className="block text-[11px] font-extrabold uppercase tracking-[.055em] text-zinc-500">Passo a passo</span>
      {passos.map((passo, i) => (
        <div key={i} className="space-y-2 rounded-xl border border-zinc-200 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-zinc-500">Passo {i + 1}</span>
            <div className="flex gap-1">
              <button type="button" className={botaoIcone} disabled={i === 0} onClick={() => mover(i, i - 1)} aria-label={`Subir passo ${i + 1}`}><ArrowUp size={13} /></button>
              <button type="button" className={botaoIcone} disabled={i === passos.length - 1} onClick={() => mover(i, i + 1)} aria-label={`Descer passo ${i + 1}`}><ArrowDown size={13} /></button>
              <button type="button" className={botaoIcone} onClick={() => onChange(passos.filter((_, j) => j !== i))} aria-label={`Remover passo ${i + 1}`}><Trash2 size={13} /></button>
            </div>
          </div>
          <Textarea required className="min-h-20" value={passo.texto} onChange={(e) => atualizar(i, { ...passo, texto: e.target.value })} />
          {passo.imagem_url && <img src={passo.imagem_url} alt={`Imagem do passo ${i + 1}`} className="max-h-40 rounded-lg border border-zinc-200 object-contain" />}
          <div className="flex items-center gap-3 text-xs font-bold">
            <label className="inline-flex cursor-pointer items-center gap-1 text-blue-600 hover:text-blue-700">
              <ImagePlus size={14} /> {passo.imagem ? "Trocar imagem" : "Adicionar imagem"}
              <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { const arquivo = e.target.files?.[0]; if (arquivo) onImagem(i, arquivo); e.target.value = ""; }} />
            </label>
            {passo.imagem && <button type="button" className="text-red-600 hover:text-red-700" onClick={() => atualizar(i, { texto: passo.texto })}>Remover imagem</button>}
          </div>
        </div>
      ))}
      <Button type="button" variant="secondary" onClick={() => onChange([...passos, { texto: "" }])}><Plus size={16} /> Adicionar passo</Button>
    </div>
  );
}

const formatarTaxa = (taxa?: number | null) => (taxa == null ? "—" : `${Math.round(taxa * 100)}%`);

const formatarData = (valor?: string) => (valor ? new Date(valor).toLocaleDateString("pt-BR") : "—");

export function AbaBaseConhecimento({ painel }: { painel: PainelAdmin }) {
  const { base, baseCarregando, erroBase, novoArtigo, setNovoArtigo, artigoEditandoId, carregar, salvarArtigo, editarArtigo, enviarImagemPasso, cancelarEdicaoArtigo, podePublicarBase } = painel;
  const podeEditar = (artigo: ArtigoBase) => podePublicarBase || STATUS_DO_AUTOR.includes(artigo.status || "publicado");
  return (
    <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <Card>
        <h3 className="mb-4 font-black">{artigoEditandoId ? "Editar artigo" : "Novo artigo"}</h3>
        <form onSubmit={salvarArtigo} className="space-y-3">
          {CAMPOS_LINHA.map(({ campo, label, ...rest }) => (
            <Field key={campo} label={label}>
              <Input
                required={"required" in rest}
                value={novoArtigo[campo]}
                onChange={(e) => setNovoArtigo({ ...novoArtigo, [campo]: e.target.value })}
              />
            </Field>
          ))}
          {CAMPOS_TEXTO.map(({ campo, label, ...rest }) => (
            <Field key={campo} label={label}>
              <Textarea
                required={"required" in rest}
                value={novoArtigo[campo]}
                onChange={(e) => setNovoArtigo({ ...novoArtigo, [campo]: e.target.value })}
              />
            </Field>
          ))}
          <EditorPassos
            passos={novoArtigo.passos}
            onChange={(passos) => setNovoArtigo({ ...novoArtigo, passos })}
            onImagem={(indice, arquivo) => void enviarImagemPasso(indice, arquivo)}
          />
          <Field label="Vídeo explicativo (link)">
            <Input
              type="url"
              placeholder="https://"
              value={novoArtigo.video_url}
              onChange={(e) => setNovoArtigo({ ...novoArtigo, video_url: e.target.value })}
            />
          </Field>
          <Field label="Visibilidade">
            <Select
              value={novoArtigo.visibilidade}
              onChange={(e) => setNovoArtigo({ ...novoArtigo, visibilidade: e.target.value as VisibilidadeArtigo })}
            >
              <option value="publico">Público — usuários e equipe</option>
              <option value="interno">Interno — somente equipe técnica</option>
            </Select>
          </Field>
          <Field label="Status">
            <Select
              value={novoArtigo.status}
              onChange={(e) => setNovoArtigo({ ...novoArtigo, status: e.target.value as StatusArtigo })}
            >
              {Object.entries(STATUS_ARTIGO).map(([valor, { label }]) => (
                <option key={valor} value={valor} disabled={!podePublicarBase && !STATUS_DO_AUTOR.includes(valor as StatusArtigo)}>{label}</option>
              ))}
            </Select>
          </Field>
          <div className="flex gap-2">
            <Button>{artigoEditandoId ? "Salvar alterações" : "Criar artigo"}</Button>
            {artigoEditandoId && <Button type="button" variant="secondary" onClick={cancelarEdicaoArtigo}>Cancelar</Button>}
          </div>
        </form>
      </Card>
      <Card>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-black">Artigos cadastrados</h3>
            <p className="mt-1 text-xs text-zinc-500">{baseCarregando ? "Carregando…" : `${base.length} artigo(s)`}</p>
          </div>
          <button type="button" onClick={() => void carregar("base")} disabled={baseCarregando} className="grid h-9 w-9 place-items-center rounded-lg border border-zinc-200 text-zinc-500 transition hover:bg-zinc-50 hover:text-blue-600 disabled:opacity-50" title="Atualizar artigos" aria-label="Atualizar artigos">
            <RefreshCw size={16} className={baseCarregando ? "animate-spin" : ""} />
          </button>
        </div>
        {baseCarregando && base.length === 0 && (
          <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/60 text-center">
            <div><RefreshCw size={24} className="mx-auto animate-spin text-blue-600"/><p className="mt-3 text-sm font-bold text-zinc-600">Carregando artigos…</p></div>
          </div>
        )}
        {!baseCarregando && erroBase && (
          <div className="grid min-h-64 place-items-center rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
            <div><BookOpen size={28} className="mx-auto text-red-500"/><p className="mt-3 text-sm font-black text-red-700">Não foi possível carregar os artigos</p><p className="mt-1 max-w-sm text-xs text-red-600">{erroBase}</p><button type="button" onClick={() => void carregar("base")} className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-xs font-black text-white hover:bg-red-700">Tentar novamente</button></div>
          </div>
        )}
        {!baseCarregando && !erroBase && base.length === 0 && (
          <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/60 p-6 text-center">
            <div><BookOpen size={30} className="mx-auto text-zinc-400"/><p className="mt-3 text-sm font-black text-zinc-700">Nenhum artigo cadastrado</p><p className="mt-1 text-xs text-zinc-500">Preencha o formulário ao lado para publicar o primeiro artigo.</p></div>
          </div>
        )}
        <div className="space-y-3">
          {base.map((a) => {
            const status = STATUS_ARTIGO[a.status || "publicado"];
            return (
              <div key={a.id} className={`rounded-2xl border p-4 ${artigoEditandoId === a.id ? "border-blue-300 bg-blue-50/40" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-black">{a.titulo}</p>
                    <p className="text-sm text-zinc-500">
                      {[a.categoria, a.palavras_chave].filter(Boolean).join(" • ")}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {a.revisar && <Badge className="border-amber-300 bg-amber-50 text-amber-800"><span title="Muito recomendado, mas resolve poucos casos. Vale revisar o conteúdo.">Revisar</span></Badge>}
                    {a.visibilidade === "interno" && <Badge className="border-violet-200 bg-violet-50 text-violet-700">Interno</Badge>}
                    <Badge className={status.className}>{status.label}</Badge>
                    {podeEditar(a) && <button type="button" onClick={() => void editarArtigo(a)} className="grid h-8 w-8 place-items-center rounded-lg border border-zinc-200 text-zinc-500 transition hover:bg-zinc-50 hover:text-blue-600" title="Editar artigo" aria-label={`Editar artigo ${a.titulo}`}>
                      <Pencil size={14} />
                    </button>}
                  </div>
                </div>
                <p className="mt-2 line-clamp-3 text-sm">{a.resumo || a.conteudo}</p>
                <p className="mt-2 text-xs font-semibold text-zinc-500">
                  {a.visualizacoes || 0} visualizações · {a.recomendacoes || 0} recomendações · {a.cliques || 0} cliques ·{" "}
                  {a.autoatendimentos || 0} resolvidos por autoatendimento · sucesso {formatarTaxa(a.taxa_sucesso)}
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  Criado por {a.autor_nome || "—"} em {formatarData(a.criado_em)} · Atualizado em {formatarData(a.atualizado_em)}
                  {a.atualizado_por_nome ? ` por ${a.atualizado_por_nome}` : ""}
                </p>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
