/**
 * Responsabilidade: aba Base de Conhecimento: artigos da equipe.
 */
import { BookOpen, Pencil, RefreshCw } from "lucide-react";
import { Badge, Button, Card, Field, Input, Select, Textarea } from "../../../components/shared/FormPrimitives";
import type { StatusArtigo } from "../../../services/api";
import type { PainelAdmin } from "../useAdminPanel";

const STATUS_ARTIGO: Record<StatusArtigo, { label: string; className: string }> = {
  rascunho: { label: "Rascunho", className: "border-zinc-200 bg-zinc-50 text-zinc-600" },
  revisao: { label: "Em revisão", className: "border-amber-200 bg-amber-50 text-amber-700" },
  publicado: { label: "Publicado", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  arquivado: { label: "Arquivado", className: "border-zinc-200 bg-zinc-100 text-zinc-500" },
};

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

const formatarData = (valor?: string) => (valor ? new Date(valor).toLocaleDateString("pt-BR") : "—");

export function AbaBaseConhecimento({ painel }: { painel: PainelAdmin }) {
  const { base, baseCarregando, erroBase, novoArtigo, setNovoArtigo, artigoEditandoId, carregar, salvarArtigo, editarArtigo, cancelarEdicaoArtigo } = painel;
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
          <Field label="Status">
            <Select
              value={novoArtigo.status}
              onChange={(e) => setNovoArtigo({ ...novoArtigo, status: e.target.value as StatusArtigo })}
            >
              {Object.entries(STATUS_ARTIGO).map(([valor, { label }]) => (
                <option key={valor} value={valor}>{label}</option>
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
                    <Badge className={status.className}>{status.label}</Badge>
                    <button type="button" onClick={() => editarArtigo(a)} className="grid h-8 w-8 place-items-center rounded-lg border border-zinc-200 text-zinc-500 transition hover:bg-zinc-50 hover:text-blue-600" title="Editar artigo" aria-label={`Editar artigo ${a.titulo}`}>
                      <Pencil size={14} />
                    </button>
                  </div>
                </div>
                <p className="mt-2 line-clamp-3 text-sm">{a.resumo || a.conteudo}</p>
                <p className="mt-2 text-xs text-zinc-400">
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
