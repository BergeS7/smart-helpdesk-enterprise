/**
 * Responsabilidade: aba Equipes: criação, membros, gerente e distribuição automática.
 */
import { Badge, Button, Card, Field, Input, Select, Textarea } from "../../../components/shared/FormPrimitives";
import { type ApiTeam } from "../../../services/api";
import type { PainelAdmin } from "../useAdminPanel";

export function AbaEquipes({ painel }: { painel: PainelAdmin }) {
  const { teams, novaTeam, setNovaTeam, equipe, criarNovaTeam } = painel;
  return (
    <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <Card>
        <h3 className="mb-4 font-black">Nova equipe</h3>
        <form onSubmit={criarNovaTeam} className="space-y-3">
          <Field label="Nome">
            <Input
              required
              value={novaTeam.name}
              onChange={(e) =>
                setNovaTeam({ ...novaTeam, name: e.target.value })
              }
              placeholder="Ex.: Infraestrutura"
            />
          </Field>
          <Field label="Descrição">
            <Textarea
              value={novaTeam.description}
              onChange={(e) =>
                setNovaTeam({
                  ...novaTeam,
                  description: e.target.value,
                })
              }
            />
          </Field>
          <Field label="Gerente">
            <Select
              value={novaTeam.manager_id}
              onChange={(e) =>
                setNovaTeam({
                  ...novaTeam,
                  manager_id: e.target.value,
                })
              }
            >
              <option value="">Definir depois</option>
              {equipe.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.nome}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Distribuição">
            <Select
              value={novaTeam.distribution_mode}
              onChange={(e) =>
                setNovaTeam({
                  ...novaTeam,
                  distribution_mode: e.target
                    .value as ApiTeam["distribution_mode"],
                })
              }
            >
              <option value="manual">Manual</option>
              <option value="round_robin">Round robin</option>
              <option value="least_load">Menor carga</option>
            </Select>
          </Field>
          <Field label="Cor">
            <Input
              type="color"
              value={novaTeam.color}
              onChange={(e) =>
                setNovaTeam({ ...novaTeam, color: e.target.value })
              }
            />
          </Field>
          <Button>Criar equipe</Button>
        </form>
      </Card>
      <Card>
        <h3 className="mb-4 font-black">Equipes cadastradas</h3>
        <div className="space-y-3">
          {teams.map((team) => (
            <div key={team.id} className="rounded-2xl border p-4">
              <div className="flex items-center gap-3">
                <span
                  className="h-4 w-4 rounded-full"
                  style={{ backgroundColor: team.color }}
                />
                <div>
                  <p className="font-black">{team.name}</p>
                  <p className="text-sm text-zinc-500">
                    {team.manager_name || "Sem gerente"} ·{" "}
                    {team.members_count || 0} membro(s)
                  </p>
                </div>
              </div>
              <p className="mt-2 text-sm text-zinc-600">
                {team.description || "Sem descrição"}
              </p>
              <Badge className="mt-3">
                {team.distribution_mode.replace("_", " ")}
              </Badge>
            </div>
          ))}
          {teams.length === 0 && (
            <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-zinc-500">
              Nenhuma equipe cadastrada.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
