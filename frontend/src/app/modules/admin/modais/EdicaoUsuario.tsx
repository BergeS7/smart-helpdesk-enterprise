/**
 * Responsabilidade: modal de edição de usuário (desenvolvedor): dados, perfil, localidade e senha.
 */
import { UserCheck } from "lucide-react";
import { municipiosMaranhao } from "../../../data/municipiosMaranhao";
import { Button, Field, Input, Modal, Select } from "../../../components/shared/FormPrimitives";
import { UserAssetsField } from "../../../components/patrimonio/UserAssetsField";
import { PERFIS, UsuarioSistemaAvatar, perfilLabel } from "../../comum/appShared";
import type { PainelAdmin } from "../useAdminPanel";

export function ModalEdicaoUsuario({ painel }: { painel: PainelAdmin }) {
  const { usuarioEditando, setUsuarioEditando, usuarioForm, setUsuarioForm, salvandoUsuarioAdmin, salvarEdicaoUsuario } = painel;
  return (
    <Modal
      title={`Editar usuário - ${usuarioEditando.nome}`}
      onClose={() => setUsuarioEditando(null)}
    >
      <form onSubmit={salvarEdicaoUsuario} className="space-y-4">
        <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
          <UsuarioSistemaAvatar usuario={usuarioEditando} size="lg" />
          <div className="min-w-0">
            <p className="font-black text-zinc-900">
              {usuarioEditando.nome}
            </p>
            <p className="truncate text-sm text-zinc-500">
              {usuarioEditando.email}
            </p>
            <p className="mt-1 text-xs font-bold text-blue-600">
              Perfil atual: {perfilLabel(usuarioEditando.perfil)}
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome">
            <Input
              required
              value={usuarioForm.nome}
              onChange={(e) =>
                setUsuarioForm({ ...usuarioForm, nome: e.target.value })
              }
            />
          </Field>
          <Field label="E-mail">
            <Input
              required
              type="email"
              value={usuarioForm.email}
              onChange={(e) =>
                setUsuarioForm({ ...usuarioForm, email: e.target.value })
              }
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tipo de usuário">
            <Select
              value={usuarioForm.perfil}
              onChange={(e) =>
                setUsuarioForm({ ...usuarioForm, perfil: e.target.value })
              }
            >
              {PERFIS.map((p) => (
                <option key={p} value={p}>
                  {perfilLabel(p)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status">
            <Select
              value={usuarioForm.status}
              onChange={(e) =>
                setUsuarioForm({ ...usuarioForm, status: e.target.value })
              }
            >
              <option value="ativo">Ativo</option>
              <option value="pendente">Pendente</option>
              <option value="inativo">Inativo</option>
              <option value="rejeitado">Rejeitado</option>
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Telefone">
            <Input
              value={usuarioForm.telefone}
              onChange={(e) =>
                setUsuarioForm({ ...usuarioForm, telefone: e.target.value })
              }
              placeholder="(00) 00000-0000"
            />
          </Field>
          <Field label="Cargo">
            <Input
              value={usuarioForm.cargo}
              onChange={(e) =>
                setUsuarioForm({ ...usuarioForm, cargo: e.target.value })
              }
              placeholder="Cargo do usuário"
            />
          </Field>
        </div>

        <Field label="Departamento">
          <Input
            value={usuarioForm.departamento}
            onChange={(e) =>
              setUsuarioForm({
                ...usuarioForm,
                departamento: e.target.value,
              })
            }
            placeholder="Departamento"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Cidade / área de atuação">
            <Select required value={usuarioForm.municipio} onChange={(e)=>{const municipio=e.target.value;setUsuarioForm({...usuarioForm,municipio,unidade:municipio?`Maranhão Motos - ${municipio}`:""})}}>
              <option value="">Selecione</option>
              {municipiosMaranhao.map((item)=><option key={item.nome} value={item.nome}>{item.nome}</option>)}
            </Select>
          </Field>
          <Field label="Unidade / local padrão">
            <Input readOnly value={usuarioForm.unidade} placeholder="Definida pela cidade" />
          </Field>
        </div>

        <Field label="Nova senha opcional">
          <Input
            type="password"
            minLength={8}
            title="Use no mínimo 8 caracteres."
            value={usuarioForm.senha}
            onChange={(e) =>
              setUsuarioForm({ ...usuarioForm, senha: e.target.value })
            }
            placeholder="Deixe em branco para manter a senha atual"
          />
        </Field>

        <UserAssetsField userId={usuarioEditando.id} userName={usuarioEditando.nome} />

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setUsuarioEditando(null)}
          >
            Cancelar
          </Button>
          <Button disabled={salvandoUsuarioAdmin}>
            <UserCheck size={16} />
            {salvandoUsuarioAdmin ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
