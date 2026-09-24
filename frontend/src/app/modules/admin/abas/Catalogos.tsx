/**
 * Responsabilidade: aba Catálogos: itens do catálogo de serviços.
 */
import { Button, Card, Field, Input, Select, Textarea } from "../../../components/shared/FormPrimitives";
import type { PainelAdmin } from "../useAdminPanel";

export function AbaCatalogos({ painel }: { painel: PainelAdmin }) {
  const { departamentos, tipos, novoCatalogo, setNovoCatalogo, criarItemCatalogo } = painel;
  return (
    <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <Card>
        <h3 className="mb-4 font-black">Novo item</h3>
        <form onSubmit={criarItemCatalogo} className="space-y-3">
          <Field label="Catálogo">
            <Select
              value={novoCatalogo.tipo}
              onChange={(e) =>
                setNovoCatalogo({
                  ...novoCatalogo,
                  tipo: e.target.value as "departamentos" | "tipos",
                })
              }
            >
              <option value="departamentos">Departamentos</option>
              <option value="tipos">Tipos de chamados</option>
            </Select>
          </Field>
          <Field label="Nome">
            <Input
              required
              value={novoCatalogo.nome}
              onChange={(e) =>
                setNovoCatalogo({
                  ...novoCatalogo,
                  nome: e.target.value,
                })
              }
            />
          </Field>
          <Field label="Descrição">
            <Textarea
              value={novoCatalogo.descricao}
              onChange={(e) =>
                setNovoCatalogo({
                  ...novoCatalogo,
                  descricao: e.target.value,
                })
              }
            />
          </Field>
          <Button>Criar</Button>
        </form>
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 font-black">Departamentos</h3>
          {departamentos.map((d) => (
            <p key={d.id} className="mb-2 rounded-xl border p-3">
              <b>{d.nome}</b>
              <br />
              <span className="text-sm text-zinc-500">
                {d.descricao}
              </span>
            </p>
          ))}
        </Card>
        <Card>
          <h3 className="mb-3 font-black">Tipos</h3>
          {tipos.map((t) => (
            <p key={t.id} className="mb-2 rounded-xl border p-3">
              <b>{t.nome}</b>
              <br />
              <span className="text-sm text-zinc-500">
                {t.descricao}
              </span>
            </p>
          ))}
        </Card>
      </div>
    </div>
  );
}
