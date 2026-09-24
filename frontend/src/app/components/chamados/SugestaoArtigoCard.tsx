/**
 * Responsabilidade: no chamado resolvido, oferecer à equipe transformar a resolução em rascunho de artigo.
 */
import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import { toast } from "sonner";
import { Button, Card } from "../shared/FormPrimitives";
import { criarRascunhoDoChamado, obterSugestaoArtigoDoChamado, type SugestaoArtigoChamado } from "../../services/api";

const LINK_BASE = "/admin/conhecimento";

export function SugestaoArtigoCard({ chamadoId }: { chamadoId: number }) {
  const [sugestao, setSugestao] = useState<SugestaoArtigoChamado | null>(null);
  const [criando, setCriando] = useState(false);

  // Sem permissão de gerenciar a base (403) ou em erro, o card simplesmente não aparece.
  useEffect(() => {
    let ativo = true;
    obterSugestaoArtigoDoChamado(chamadoId).then((dados) => { if (ativo) setSugestao(dados); }).catch(() => {});
    return () => { ativo = false; };
  }, [chamadoId]);

  async function criar() {
    setCriando(true);
    try {
      const artigo = await criarRascunhoDoChamado(chamadoId);
      setSugestao({ sugerir: false, motivo: "rascunho_existente", rascunho: { id: artigo.id, titulo: artigo.titulo, status: artigo.status || "rascunho" } });
      toast.success("Rascunho criado. Revise na Base de Conhecimento antes de publicar.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível criar o rascunho.");
    } finally {
      setCriando(false);
    }
  }

  if (sugestao?.motivo === "rascunho_existente" && sugestao.rascunho) {
    return (
      <Card>
        <p className="flex items-center gap-2 text-sm font-black"><BookOpen size={16} className="text-blue-600" /> Artigo gerado a partir deste chamado</p>
        <p className="mt-1 text-xs text-zinc-500">“{sugestao.rascunho.titulo}” ({sugestao.rascunho.status}). Revise, retire dados pessoais e publique pela Base de Conhecimento.</p>
        <a href={LINK_BASE} className="mt-2 inline-block text-xs font-black text-blue-700 hover:text-blue-800">Abrir Base de Conhecimento →</a>
      </Card>
    );
  }
  if (!sugestao?.sugerir) return null;

  return (
    <Card>
      <h3 className="mb-2 flex items-center gap-2 font-black"><BookOpen size={18} className="text-blue-600" /> Transformar esta resolução em artigo da Base de Conhecimento?</h3>
      <p className="text-sm text-zinc-600">
        Este chamado faz parte de um problema recorrente: {sugestao.recorrencia?.quantidade} chamados semelhantes nos últimos {sugestao.recorrencia?.dias} dias,
        e nenhum artigo resolve o assunto com boa confiança.
      </p>
      <p className="mt-2 text-xs text-zinc-500">
        O rascunho usa a descrição do chamado e as mensagens da equipe. Ele é criado como rascunho interno e nunca é publicado automaticamente.
      </p>
      <Button type="button" className="mt-3" disabled={criando} onClick={() => void criar()}>{criando ? "Criando…" : "Criar rascunho de artigo"}</Button>
    </Card>
  );
}
