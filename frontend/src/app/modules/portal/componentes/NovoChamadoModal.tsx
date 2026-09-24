/**
 * Responsabilidade: modal de abertura de chamado pelo solicitante.
 */
import type { Dispatch, FormEvent, SetStateAction } from "react";
import { ArrowRight, BookOpen, FileText, X } from "lucide-react";
import { Button, Field, Input, Select, Textarea } from "../../../components/shared/FormPrimitives";
import { type ApiUsuario, type ArtigoBase, type CatalogoItem, type UsuarioLogado } from "../../../services/api";

export function UsuarioNovoChamadoModal({
  perfil,
  tipos,
  novo,
  setNovo,
  base,
  loading,
  onClose,
  onSubmit,
}: {
  perfil: UsuarioLogado | ApiUsuario;
  tipos: CatalogoItem[];
  novo: { titulo: string; descricao: string; tipo_chamado: string; processo_atual:string; problema:string; resultado_esperado:string; frequencia:string; pessoas:string; tempo_minutos:string; sistemas:string; impacto_nao_execucao:string; beneficios:string };
  setNovo: Dispatch<
    SetStateAction<{ titulo: string; descricao: string; tipo_chamado: string; processo_atual:string; problema:string; resultado_esperado:string; frequencia:string; pessoas:string; tempo_minutos:string; sistemas:string; impacto_nao_execucao:string; beneficios:string }>
  >;
  base: ArtigoBase[];
  loading: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  const tiposDisponiveis =
    tipos.length > 0
      ? tipos.map((tipo) => tipo.nome)
      : [
          "Incidente",
          "Solicitação",
          "Dúvida",
          "Melhoria",
          "Acesso",
          "Equipamento",
        ];
  const allTypes=Array.from(new Set([...tiposDisponiveis,"Bug","Melhoria","Automação","Integração","Dashboard / Relatório","Novo Sistema"]));
  const developmentType=["Bug","Melhoria","Automação","Integração","Dashboard / Relatório","Novo Sistema"].includes(novo.tipo_chamado);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-4xl overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-zinc-100 px-6 py-5">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
              <FileText size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-zinc-800">
                Abrir novo chamado
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Preencha as informações abaixo para abrir um novo chamado
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-2xl p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800"
          >
            <X size={22} />
          </button>
        </div>

        <form
          onSubmit={onSubmit}
          className="max-h-[78vh] overflow-auto px-6 py-6"
        >
          <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <UsuarioCampoReadOnly label="Nome" value={perfil.nome || "-"} />
            <UsuarioCampoReadOnly label="E-mail" value={perfil.email || "-"} />
            <UsuarioCampoReadOnly
              label="Telefone"
              value={perfil.telefone || "-"}
            />
            <UsuarioCampoReadOnly label="Cargo" value={perfil.cargo || "-"} />
            <UsuarioCampoReadOnly label="Cidade / área de atuação" value={perfil.municipio || "Atualize seu perfil"} />
            <UsuarioCampoReadOnly label="Unidade / local padrão" value={perfil.unidade || "Atualize seu perfil"} />
          </div>

          <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Tipo do chamado">
              <Select
                value={novo.tipo_chamado}
                onChange={(e) =>
                  setNovo((prev) => ({ ...prev, tipo_chamado: e.target.value }))
                }
              >
                {allTypes.map((tipo) => (
                  <option key={tipo}>{tipo}</option>
                ))}
              </Select>
            </Field>
            <UsuarioCampoReadOnly
              label="Departamento"
              value={
                perfil.departamento ||
                "Atualize seu perfil antes de abrir chamado"
              }
            />
          </div>

          <div className="space-y-4">
            <Field label="Título">
              <Input
                required
                value={novo.titulo}
                onChange={(e) =>
                  setNovo((prev) => ({ ...prev, titulo: e.target.value }))
                }
                placeholder="Ex.: Não consigo acessar o sistema"
              />
            </Field>
            <Field label="Descrição">
              <Textarea
                required
                value={novo.descricao}
                onChange={(e) =>
                  setNovo((prev) => ({ ...prev, descricao: e.target.value }))
                }
                placeholder="Descreva com detalhes o problema ou sua solicitação..."
                className="min-h-[150px]"
              />
            </Field>
            {developmentType && <div className="grid gap-4 rounded-2xl border border-violet-200 bg-violet-50/50 p-4 md:grid-cols-2">
              <div className="md:col-span-2"><p className="font-black text-violet-900">Conte-nos sobre o resultado que você precisa</p><p className="text-sm text-violet-700">Não é necessário conhecer a solução técnica. A equipe de TI fará essa análise.</p></div>
              <Field label="Como o processo funciona atualmente?"><Textarea required value={novo.processo_atual} onChange={e=>setNovo(prev=>({...prev,processo_atual:e.target.value}))} placeholder="Ex.: Recebo as solicitações por e-mail, copio os dados para uma planilha e envio o relatório ao gestor." className="min-h-24"/></Field>
              <Field label="Qual problema você quer resolver?"><Textarea required value={novo.problema} onChange={e=>setNovo(prev=>({...prev,problema:e.target.value}))} placeholder="Ex.: O preenchimento manual demora, gera erros e dificulta acompanhar solicitações pendentes." className="min-h-24"/></Field>
              <Field label="Resultado esperado"><Textarea value={novo.resultado_esperado} onChange={e=>setNovo(prev=>({...prev,resultado_esperado:e.target.value}))} placeholder="Ex.: Ter uma tela que reúna as solicitações e gere o relatório automaticamente."/></Field>
              <Field label="Frequência"><Select value={novo.frequencia} onChange={e=>setNovo(prev=>({...prev,frequencia:e.target.value}))}><option value="">Selecione (ex.: diariamente)</option><option value="varias_dia">Várias vezes ao dia</option><option value="diaria">Diariamente</option><option value="semanal">Semanalmente</option><option value="mensal">Mensalmente</option><option value="ocasional">Ocasionalmente</option><option value="outro">Outro</option></Select></Field>
              <Field label="Pessoas envolvidas"><Input type="number" min="0" value={novo.pessoas} onChange={e=>setNovo(prev=>({...prev,pessoas:e.target.value}))} placeholder="Ex.: 5"/></Field>
              <Field label="Tempo atual por execução (minutos)"><Input type="number" min="0" value={novo.tempo_minutos} onChange={e=>setNovo(prev=>({...prev,tempo_minutos:e.target.value}))} placeholder="Ex.: 30"/></Field>
              <Field label="Sistemas envolvidos"><Input value={novo.sistemas} onChange={e=>setNovo(prev=>({...prev,sistemas:e.target.value}))} placeholder="Ex.: ERP, Excel, e-mail e Power BI"/></Field>
              <Field label="Impacto se não for executada"><Textarea value={novo.impacto_nao_execucao} onChange={e=>setNovo(prev=>({...prev,impacto_nao_execucao:e.target.value}))} placeholder="Ex.: Atraso no atendimento, risco de perder informações e dificuldade para cumprir o prazo."/></Field>
              <Field label="Benefícios esperados"><Input value={novo.beneficios} onChange={e=>setNovo(prev=>({...prev,beneficios:e.target.value}))} placeholder="Ex.: Reduzir tempo, erros e retrabalho; melhorar o acompanhamento."/></Field>
            </div>}
          </div>

          {base.length > 0 && (
            <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <div className="mb-3 flex items-center gap-2 text-blue-800">
                <BookOpen size={18} />
                <p className="font-black">Sugestões da base de conhecimento</p>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {base.slice(0, 3).map((artigo) => (
                  <div
                    key={artigo.id}
                    className="rounded-2xl bg-white p-3 shadow-sm"
                  >
                    <p className="text-sm font-black text-zinc-800">
                      {artigo.titulo}
                    </p>
                    <p className="mt-1 line-clamp-3 text-xs leading-5 text-zinc-500">
                      {artigo.conteudo}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center justify-end gap-3 border-t border-zinc-100 pt-5">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button disabled={loading}>
              {loading ? "Criando..." : "Criar chamado"}
              {!loading && <ArrowRight size={17} />}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function UsuarioCampoReadOnly({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-zinc-500">
        {label}
      </span>
      <div className="flex h-11 items-center rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm font-semibold text-zinc-700">
        {value}
      </div>
    </div>
  );
}
