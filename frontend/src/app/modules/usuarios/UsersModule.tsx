/**
 * Responsabilidade: Módulo funcional de users module; reúne interface e ações do respectivo fluxo.
 */
import { useEffect, useRef, useState, type FormEvent } from "react";
import { MapPin, Search, ShieldCheck, Trash2, UserCog } from "lucide-react";
import { toast } from "sonner";
import { criarUsuarioAdmin, type ApiUsuario, type PerfilUsuario } from "../../services/api";
import { PermissionMatrixPage } from "../../components/PermissionMatrixPage";
import { SeletorUnidade } from "../../components/shared/SeletorUnidade";
import { useLocalidades } from "../../hooks/useLocalidades";

const initial = {
  nome: "",
  email: "",
  senha: "",
  perfil: "usuario" as PerfilUsuario,
  departamento: "",
  cargo: "",
  municipio: "",
  unidade: "",
};
const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";
const locationLabel = (municipio?: string | null, unidade?: string | null) => {
  const city = municipio?.trim() || "Cidade não informada";
  let unit = unidade?.trim() || "";
  const suffix = ` - ${city}`;
  if (unit.toLocaleLowerCase("pt-BR").endsWith(suffix.toLocaleLowerCase("pt-BR"))) {
    unit = unit.slice(0, -suffix.length).trim();
  }
  if (unit.toLocaleLowerCase("pt-BR") === city.toLocaleLowerCase("pt-BR")) unit = "";
  return unit ? `${city} · ${unit}` : city;
};
type Props = {
  users: ApiUsuario[];
  currentUser: ApiUsuario;
  admin: boolean;
  /** A conta dona da plataforma só é editável por ela mesma e nunca é apagada por aqui. */
  platformOwner?: boolean;
  initialMode?: "list" | "access";
  onModeChange?: (mode: "list" | "access") => void;
  onRefresh: () => Promise<void> | void;
  onEdit: (u: ApiUsuario) => void;
  onPermissions: (u: ApiUsuario) => void;
  onApprove: (id: number) => Promise<void>;
  onReject: (id: number) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
};

export function UsersModule({
  users,
  currentUser,
  admin,
  platformOwner = false,
  initialMode = "list",
  onRefresh,
  onEdit,
  onPermissions,
  onApprove,
  onReject,
  onDelete,
}: Props) {
  const localidades = useLocalidades();
  const [mode, setMode] = useState<"list" | "access">(initialMode),
    [form, setForm] = useState(initial),
    [saving, setSaving] = useState(false),
    [query, setQuery] = useState(""),
    [municipio, setMunicipio] = useState("");
  const pendingActions = useRef(new Set<number>());
  const [actions, setActions] = useState<Record<number, "approve" | "reject">>({});
  async function changeStatus(id: number, action: "approve" | "reject") {
    if (pendingActions.current.has(id)) return;
    pendingActions.current.add(id);
    setActions((current) => ({ ...current, [id]: action }));
    try {
      await (action === "approve" ? onApprove(id) : onReject(id));
      toast.success(action === "approve" ? "Usuário aprovado com sucesso." : "Usuário rejeitado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar o usuário. Tente novamente.");
    } finally {
      pendingActions.current.delete(id);
      setActions((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
    }
  }
  const visibleUsers = users.filter((u) => {
    const q = query.trim().toLowerCase();
    return (
      (!municipio || u.municipio === municipio) &&
      (!q ||
        [u.nome, u.email, u.departamento, u.cargo, u.municipio, u.unidade].some(
          (value) =>
            String(value || "")
              .toLowerCase()
              .includes(q),
        ))
    );
  });
  useEffect(() => setMode(initialMode), [initialMode]);
  async function create(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await criarUsuarioAdmin(form);
      setForm(initial);
      await onRefresh();
      toast.success("Usuário criado com sucesso.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao criar usuário",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <div>
      {mode === "access" ? (
        <PermissionMatrixPage
          users={users.filter((u) => u.status === "ativo")}
          onEdit={onPermissions}
        />
      ) : (
        <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
          <form onSubmit={create} className="ds-card space-y-3 p-5">
            <h3 className="flex items-center gap-2 font-black">
              <UserCog size={18} />
              Criar usuário
            </h3>
            {[
              ["nome", "Nome", "text"],
              ["email", "E-mail", "email"],
              ["senha", "Senha inicial", "password"],
              ["departamento", "Departamento", "text"],
              ["cargo", "Cargo", "text"],
            ].map(([key, label, type]) => (
              <label
                key={key}
                className="block text-xs font-bold text-slate-600"
              >
                {label}
                <input
                  required={["nome", "email", "senha"].includes(key)}
                  minLength={key === "senha" ? 8 : undefined}
                  type={type}
                  value={form[key as keyof typeof form]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className="mt-1 w-full px-3"
                />
              </label>
            ))}
            <label className="block text-xs font-bold text-slate-600">
              Unidade
              <SeletorUnidade
                required
                unidades={localidades.unidades}
                carregando={localidades.carregando}
                value={form}
                onChange={({ municipio, unidade }) => setForm({ ...form, municipio, unidade })}
                className="mt-1 w-full px-3"
              />
            </label>
            <label className="block text-xs font-bold text-slate-600">
              Perfil
              <select
                value={form.perfil}
                onChange={(e) => setForm({ ...form, perfil: e.target.value as PerfilUsuario })}
                className="mt-1 w-full px-3"
              >
                <option value="usuario">Usuário</option>
                <option value="tecnico">Técnico</option>
                <option value="supervisor">Supervisor</option>
                {admin ? <option value="admin">Administrador</option> : null}
              </select>
            </label>
            <button
              disabled={saving}
              className="ds-button ds-button--primary w-full"
            >
              {saving ? "Criando…" : "Criar usuário"}
            </button>
          </form>
          <section className="ds-card overflow-hidden">
            <header className="border-b p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-black">Usuários cadastrados</h3>
                  <p className="text-xs text-slate-500">
                    {visibleUsers.length} de {users.length} registro(s)
                  </p>
                </div>
                <div className="flex gap-2">
                  <label className="ds-search flex items-center gap-2 rounded-xl border px-3">
                    <Search size={15} />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Nome, cidade, unidade..."
                      className="h-9 w-44"
                    />
                  </label>
                  <select
                    value={municipio}
                    onChange={(e) => setMunicipio(e.target.value)}
                    className="h-10 rounded-xl border px-3 text-xs font-bold"
                  >
                    <option value="">Todas as áreas</option>
                    {localidades.municipios.map((nome) => (
                      <option key={nome}>{nome}</option>
                    ))}
                  </select>
                </div>
              </div>
            </header>
            <div className="divide-y">
              {visibleUsers.map((u) => {
                const protectedRole = u.perfil === "admin";
                const contaPlataforma = u.plataforma === true;
                return (
                  <article
                    key={u.id}
                    className="flex flex-wrap items-center justify-between gap-3 p-4"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full border border-slate-200 bg-gradient-to-br from-blue-500 to-sky-400 text-xs font-black text-white shadow-sm">
                        {u.foto_url ? (
                          <img
                            src={u.foto_url}
                            alt={`Foto de ${u.nome}`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          initials(u.nome)
                        )}
                      </span>
                      <div className="min-w-0">
                        <b className="block truncate">{u.nome}</b>
                        <p className="truncate text-xs text-slate-500">
                          {u.email} · {u.departamento || "Sem departamento"}
                        </p>
                        <p className="mt-1 flex items-center gap-1 truncate text-xs font-bold text-blue-700">
                          <MapPin size={12} />
                          {locationLabel(u.municipio, u.unidade)}
                        </p>
                        <div className="mt-2 flex gap-2">
                          <span className="ds-badge ds-status--neutral capitalize">
                            {u.perfil}
                          </span>
                          <span
                            className={`ds-badge ds-status--${u.status === "ativo" ? "success" : "warning"}`}
                          >
                            {u.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {!protectedRole ? (
                        <button
                          className="ds-button ds-button--secondary"
                          onClick={() => onPermissions(u)}
                          title="Editar permissões"
                          aria-label={`Editar permissões de ${u.nome}`}
                        >
                          <ShieldCheck size={15} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="ds-button ds-button--secondary cursor-not-allowed opacity-60"
                          title="Este perfil possui acesso total por padrão"
                          aria-label={`${u.nome} possui acesso total por padrão`}
                        >
                          <ShieldCheck size={15} />
                        </button>
                      )}
                      {admin && (!contaPlataforma || platformOwner) ? (
                        <button
                          className="ds-button ds-button--secondary"
                          onClick={() => onEdit(u)}
                        >
                          Editar
                        </button>
                      ) : null}
                      {u.status === "pendente" ? (
                        <>
                          <button
                            className="ds-button ds-button--primary"
                            type="button"
                            disabled={Boolean(actions[u.id])}
                            onClick={() => void changeStatus(u.id, "approve")}
                          >
                            {actions[u.id] === "approve" ? "Aprovando…" : "Aprovar"}
                          </button>
                          <button
                            className="ds-button ds-button--danger"
                            type="button"
                            disabled={Boolean(actions[u.id])}
                            onClick={() => void changeStatus(u.id, "reject")}
                          >
                            {actions[u.id] === "reject" ? "Rejeitando…" : "Rejeitar"}
                          </button>
                        </>
                      ) : null}
                      {admin && u.id !== currentUser.id && !contaPlataforma ? (
                        <button
                          className="ds-button ds-button--danger"
                          onClick={() =>
                            confirm(`Apagar ${u.nome}?`) && void onDelete(u.id)
                          }
                        >
                          <Trash2 size={15} />
                        </button>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
