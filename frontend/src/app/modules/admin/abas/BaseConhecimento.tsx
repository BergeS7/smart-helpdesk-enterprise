/**
 * Responsabilidade: aba Base de Conhecimento: artigos da equipe.
 */
import { BookOpen, RefreshCw } from "lucide-react";
import { Button, Card, Field, Input, Textarea } from "../../../components/shared/FormPrimitives";
import type { PainelAdmin } from "../useAdminPanel";

export function AbaBaseConhecimento({ painel }: { painel: PainelAdmin }) {
  const { base, baseCarregando, erroBase, novoArtigo, setNovoArtigo, carregar, criarArtigo } = painel;
  return (
    <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <Card>
        <h3 className="mb-4 font-black">Novo artigo</h3>
        <form onSubmit={criarArtigo} className="space-y-3">
          <Field label="Título">
            <Input
              required
              value={novoArtigo.titulo}
              onChange={(e) =>
                setNovoArtigo({
                  ...novoArtigo,
                  titulo: e.target.value,
                })
              }
            />
          </Field>
          <Field label="Categoria">
            <Input
              value={novoArtigo.categoria}
              onChange={(e) =>
                setNovoArtigo({
                  ...novoArtigo,
                  categoria: e.target.value,
                })
              }
            />
          </Field>
          <Field label="Palavras-chave">
            <Input
              value={novoArtigo.palavras_chave}
              onChange={(e) =>
                setNovoArtigo({
                  ...novoArtigo,
                  palavras_chave: e.target.value,
                })
              }
            />
          </Field>
          <Field label="Conteúdo">
            <Textarea
              required
              value={novoArtigo.conteudo}
              onChange={(e) =>
                setNovoArtigo({
                  ...novoArtigo,
                  conteudo: e.target.value,
                })
              }
            />
          </Field>
          <Button>Criar artigo</Button>
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
          {base.map((a) => (
            <div key={a.id} className="rounded-2xl border p-4">
              <p className="font-black">{a.titulo}</p>
              <p className="text-sm text-zinc-500">
                {a.categoria} • {a.palavras_chave}
              </p>
              <p className="mt-2 text-sm">{a.conteudo}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
