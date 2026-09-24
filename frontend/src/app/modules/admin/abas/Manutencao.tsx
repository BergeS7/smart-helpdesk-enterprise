/**
 * Responsabilidade: aba Manutenção (desenvolvedor): rotinas e limpeza do sistema.
 */
import { AlertTriangle, Trash2 } from "lucide-react";
import { Badge, Button, Card, Field, Input, Select, Textarea } from "../../../components/shared/FormPrimitives";
import { formatDate } from "../../comum/appShared";
import type { PainelAdmin } from "../useAdminPanel";

export function AbaManutencao({ painel }: { painel: PainelAdmin }) {
  const { dark, avisosAdmin, novoAviso, setNovoAviso, criarAvisoManutencao, alternarAvisoManutencao, removerAvisoManutencao, mutedText } = painel;
  return (
    <div className="grid gap-6 xl:grid-cols-[440px_1fr]">
      <Card>
        <h3 className="mb-2 flex items-center gap-2 font-black">
          <AlertTriangle size={18} />
          Novo aviso de manutenção
        </h3>
        <p className="mb-4 text-sm text-zinc-500">
          A mensagem aparece para usuários, técnicos e administradores
          enquanto estiver ativa e dentro do período configurado.
        </p>
        <form onSubmit={criarAvisoManutencao} className="space-y-3">
          <Field label="Título">
            <Input
              required
              value={novoAviso.titulo}
              onChange={(e) =>
                setNovoAviso({ ...novoAviso, titulo: e.target.value })
              }
            />
          </Field>
          <Field label="Mensagem">
            <Textarea
              required
              value={novoAviso.mensagem}
              onChange={(e) =>
                setNovoAviso({
                  ...novoAviso,
                  mensagem: e.target.value,
                })
              }
            />
          </Field>
          <Field label="Tipo">
            <Select
              value={novoAviso.tipo}
              onChange={(e) =>
                setNovoAviso({ ...novoAviso, tipo: e.target.value })
              }
            >
              <option value="info">Informativo</option>
              <option value="warning">Atenção</option>
              <option value="danger">Crítico</option>
              <option value="success">Sucesso</option>
            </Select>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Início opcional">
              <Input
                type="datetime-local"
                value={novoAviso.inicio_em}
                onChange={(e) =>
                  setNovoAviso({
                    ...novoAviso,
                    inicio_em: e.target.value,
                  })
                }
              />
            </Field>
            <Field label="Fim opcional">
              <Input
                type="datetime-local"
                value={novoAviso.fim_em}
                onChange={(e) =>
                  setNovoAviso({
                    ...novoAviso,
                    fim_em: e.target.value,
                  })
                }
              />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm font-bold">
            <input
              type="checkbox"
              checked={novoAviso.ativo}
              onChange={(e) =>
                setNovoAviso({
                  ...novoAviso,
                  ativo: e.target.checked,
                })
              }
            />{" "}
            Ativo imediatamente
          </label>
          <Button className="w-full">
            <AlertTriangle size={16} />
            Publicar aviso
          </Button>
        </form>
      </Card>

      <Card>
        <h3 className="mb-4 font-black">Avisos cadastrados</h3>
        <div className="space-y-3">
          {avisosAdmin.length === 0 && (
            <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-zinc-500">
              Nenhum aviso cadastrado.
            </p>
          )}
          {avisosAdmin.map((aviso) => (
            <div
              key={aviso.id}
              className={`rounded-2xl border p-4 ${dark ? "border-white/10 bg-white/5" : "border-zinc-200 bg-white"}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-black">{aviso.titulo}</p>
                  <p className={`mt-1 text-sm ${mutedText}`}>
                    {aviso.mensagem}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge>{aviso.tipo}</Badge>
                    <Badge
                      className={
                        aviso.ativo
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-zinc-200 bg-zinc-50 text-zinc-600"
                      }
                    >
                      {aviso.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                    {aviso.inicio_em && (
                      <Badge>
                        Início: {formatDate(aviso.inicio_em)}
                      </Badge>
                    )}
                    {aviso.fim_em && (
                      <Badge>Fim: {formatDate(aviso.fim_em)}</Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => alternarAvisoManutencao(aviso)}
                  >
                    {aviso.ativo ? "Desativar" : "Ativar"}
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => removerAvisoManutencao(aviso.id)}
                  >
                    <Trash2 size={16} />
                    Apagar
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
