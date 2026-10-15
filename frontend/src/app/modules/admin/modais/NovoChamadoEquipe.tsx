/**
 * Responsabilidade: abertura de chamado pela equipe em nome do usuário atendido (telefone, presencial, e-mail).
 * O usuário escolhido vira o solicitante: acompanha, conversa e avalia pelo portal, e o roteamento usa o setor dele.
 */
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowRight, Search, UserRound } from "lucide-react";
import { Button, Field, Input, Modal, Select, Textarea } from "../../../components/shared/FormPrimitives";
import { criarChamado, listarCatalogo, listarUsuariosAdmin, type ApiChamado, type ApiUsuario, type UsuarioLogado } from "../../../services/api";

export const CANAIS_ATENDIMENTO = [
  { valor: "telefone", rotulo: "Telefone" },
  { valor: "presencial", rotulo: "Presencial" },
  { valor: "email", rotulo: "E-mail" },
  { valor: "whatsapp", rotulo: "WhatsApp" },
  { valor: "outro", rotulo: "Outro" },
] as const;

const TIPOS_PADRAO = ["Incidente", "Solicitação", "Dúvida", "Acesso", "Equipamento"];
const LIMITE_RESULTADOS = 8;

function normalizar(texto?: string | null) {
  return String(texto || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function ModalNovoChamadoEquipe({
  usuarioLogado,
  onClose,
  onCriado,
}: {
  usuarioLogado: UsuarioLogado;
  onClose: () => void;
  onCriado: (chamado: ApiChamado) => void;
}) {
  const [usuarios, setUsuarios] = useState<ApiUsuario[]>([]);
  const [tipos, setTipos] = useState<string[]>(TIPOS_PADRAO);
  const [busca, setBusca] = useState("");
  const [solicitante, setSolicitante] = useState<ApiUsuario | null>(null);
  const [canal, setCanal] = useState<string>("telefone");
  const [tipo, setTipo] = useState(TIPOS_PADRAO[0]);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    listarUsuariosAdmin({ status: "ativo" }).then(setUsuarios).catch(() => setUsuarios([]));
    listarCatalogo("tipos")
      .then((lista) => {
        const nomes = lista.filter((item) => item.ativo !== false).map((item) => item.nome);
        if (nomes.length) { setTipos(nomes); setTipo(nomes[0]); }
      })
      .catch(() => {});
  }, []);

  const resultados = useMemo(() => {
    const termo = normalizar(busca.trim());
    const ativos = usuarios.filter((u) => (u.status || "ativo") === "ativo");
    if (!termo) return ativos.slice(0, LIMITE_RESULTADOS);
    return ativos
      .filter((u) => [u.nome, u.email, u.departamento, u.unidade].some((campo) => normalizar(campo).includes(termo)))
      .slice(0, LIMITE_RESULTADOS);
  }, [busca, usuarios]);

  const semDepartamento = Boolean(solicitante && !solicitante.departamento);

  async function enviar(event: FormEvent) {
    event.preventDefault();
    if (!solicitante) { setErro("Escolha o usuário que está sendo atendido."); return; }
    setErro("");
    setEnviando(true);
    try {
      const chamado = await criarChamado({
        titulo,
        descricao,
        tipo_chamado: tipo,
        solicitante_id: solicitante.id,
        canal_abertura: canal,
      });
      onCriado(chamado);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível abrir o chamado.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal title="Novo chamado em nome do usuário" onClose={onClose}>
      <form onSubmit={enviar} className="space-y-4">
        <Field label="Solicitante">
          {solicitante ? (
            <div className="flex items-start justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50/60 p-3">
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-100 text-blue-700"><UserRound size={18} /></span>
                <div className="min-w-0 text-sm">
                  <p className="font-black text-zinc-800">{solicitante.nome}{Number(solicitante.id) === Number(usuarioLogado.id) ? " (você)" : ""}</p>
                  <p className="truncate text-zinc-600">{solicitante.email}</p>
                  <p className="text-xs text-zinc-500">
                    {[solicitante.departamento || "Sem departamento", solicitante.unidade, solicitante.telefone].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </div>
              <Button type="button" variant="secondary" className="!h-9 shrink-0" onClick={() => setSolicitante(null)}>Trocar</Button>
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-200">
              <div className="flex items-center gap-2 border-b border-zinc-100 px-3">
                <Search size={16} className="shrink-0 text-zinc-400" />
                <input
                  autoFocus
                  aria-label="Buscar solicitante"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar por nome, e-mail, departamento ou unidade"
                  className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none"
                />
              </div>
              <ul className="max-h-56 overflow-auto py-1" role="listbox" aria-label="Usuários encontrados">
                {resultados.length === 0 && <li className="px-3 py-3 text-sm text-zinc-500">Nenhum usuário ativo encontrado.</li>}
                {resultados.map((u) => (
                  <li key={u.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={false}
                      onClick={() => setSolicitante(u)}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-blue-50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-bold text-zinc-800">{u.nome}{Number(u.id) === Number(usuarioLogado.id) ? " (você)" : ""}</span>
                        <span className="block truncate text-xs text-zinc-500">{u.email}</span>
                      </span>
                      <span className="shrink-0 text-xs text-zinc-500">{u.departamento || "Sem departamento"}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Field>

        {semDepartamento && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800" role="alert">
            Este usuário está sem departamento no cadastro. Atualize o cadastro antes de abrir o chamado, pois o roteamento depende do setor.
          </p>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Canal do atendimento">
            <Select value={canal} onChange={(e) => setCanal(e.target.value)}>
              {CANAIS_ATENDIMENTO.map((c) => <option key={c.valor} value={c.valor}>{c.rotulo}</option>)}
            </Select>
          </Field>
          <Field label="Tipo do chamado">
            <Select value={tipo} onChange={(e) => setTipo(e.target.value)}>
              {tipos.map((t) => <option key={t}>{t}</option>)}
            </Select>
          </Field>
        </div>

        <Field label="Título">
          <Input required value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Usuário sem acesso ao e-mail" />
        </Field>
        <Field label="Descrição">
          <Textarea required value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Registre o que o usuário relatou..." className="min-h-[130px]" />
        </Field>

        {erro && <p className="text-sm font-bold text-red-600" role="alert">{erro}</p>}

        <div className="flex items-center justify-end gap-3 border-t border-zinc-100 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button disabled={enviando || !solicitante || semDepartamento}>
            {enviando ? "Abrindo..." : "Abrir chamado"}
            {!enviando && <ArrowRight size={17} />}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
