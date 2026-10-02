/**
 * Responsabilidade: aba Empresas da plataforma: cadastrar clientes, liberar o acesso do responsável e acompanhar cada empresa.
 */
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { BarChart3, Building2, Copy, Link2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Badge, Button, Card, Field, Input, Select } from "../../components/shared/FormPrimitives";
import { formatDate } from "../comum/appShared";
import { OperacaoEmpresa } from "./OperacaoEmpresa";
import {
  atualizarEmpresaPlataforma,
  criarEmpresaPlataforma,
  gerarConviteEmpresa,
  linkAtivacaoEmpresa,
  linkCadastroEmpresa,
  listarEmpresasPlataforma,
  type ConviteEmpresa,
  type EmpresaPlataforma,
  type NovaEmpresa,
  type PlanoEmpresa,
} from "../../services/api";

// Preços e faixas vêm do servidor (domain/planos.js); aqui só o nome de cada plano.
const PLANOS: { valor: PlanoEmpresa; nome: string }[] = [
  { valor: "base", nome: "Base" },
  { valor: "plus", nome: "Plus" },
  { valor: "pro", nome: "Pro" },
];
const MOEDA = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const STATUS_CLASSE = { ativa: "border-emerald-200 bg-emerald-50 text-emerald-700", suspensa: "border-amber-200 bg-amber-50 text-amber-700", cancelada: "border-zinc-200 bg-zinc-100 text-zinc-600" };
const STATUS_NOME = { ativa: "Ativa", suspensa: "Suspensa", cancelada: "Cancelada" };
const VAZIO: NovaEmpresa = { nome: "", cnpj: "", plano: "base", email_responsavel: "" };
const EMPRESA_PRINCIPAL = 1;

async function copiar(texto: string, descricao: string) {
  try {
    await navigator.clipboard.writeText(texto);
    toast.success(`${descricao} copiado.`);
  } catch {
    toast.error("Não foi possível copiar. Selecione o link e copie manualmente.");
  }
}

function formatarCnpj(cnpj: string | null) {
  if (!cnpj) return "CNPJ não informado";
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

// O token só é devolvido na hora em que o link é gerado; depois disso, só um novo link.
function LinkGerado({ empresa, convite, onFechar }: { empresa: string; convite: ConviteEmpresa; onFechar: () => void }) {
  const link = linkAtivacaoEmpresa(convite.token);
  return (
    <Card className="border-blue-200 bg-blue-50/60">
      <h3 className="flex items-center gap-2 font-black"><Link2 size={18} /> Link de liberação: {empresa}</h3>
      <p className="mt-1 text-sm text-zinc-600">
        Envie para <b>{convite.email}</b>. Ao abrir, o responsável cria a senha e vira o administrador da empresa.
        Vale uma única vez, até {formatDate(convite.expira_em)}.
      </p>
      <div className="mt-3 flex gap-2">
        <Input readOnly value={link} onFocus={(e) => e.currentTarget.select()} aria-label="Link de liberação" />
        <Button type="button" onClick={() => void copiar(link, "Link de liberação")}><Copy size={16} /> Copiar</Button>
      </div>
      <p className="mt-2 text-xs text-zinc-500">Este link não aparece de novo. Se ele se perder, gere outro na lista de empresas.</p>
      <Button type="button" variant="ghost" className="mt-2" onClick={onFechar}>Fechar</Button>
    </Card>
  );
}

export function PlataformaEmpresas() {
  const [empresas, setEmpresas] = useState<EmpresaPlataforma[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [form, setForm] = useState<NovaEmpresa>(VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [emAndamento, setEmAndamento] = useState<number | null>(null);
  const [linkGerado, setLinkGerado] = useState<{ empresa: string; convite: ConviteEmpresa } | null>(null);
  const [operacaoDe, setOperacaoDe] = useState<number | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      setEmpresas(await listarEmpresasPlataforma());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao carregar empresas.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  async function cadastrar(event: FormEvent) {
    event.preventDefault();
    setSalvando(true);
    try {
      const { empresa, convite } = await criarEmpresaPlataforma({ ...form, cnpj: form.cnpj?.trim() || undefined });
      setLinkGerado({ empresa: empresa.nome, convite });
      setForm(VAZIO);
      toast.success(`Empresa ${empresa.nome} cadastrada.`);
      await carregar();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao cadastrar empresa.");
    } finally {
      setSalvando(false);
    }
  }

  async function executar(empresa: EmpresaPlataforma, acao: () => Promise<unknown>, sucesso: string) {
    setEmAndamento(empresa.id);
    try {
      await acao();
      toast.success(sucesso);
      await carregar();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível concluir a ação.");
    } finally {
      setEmAndamento(null);
    }
  }

  const novoLink = (empresa: EmpresaPlataforma) =>
    executar(empresa, async () => {
      const { convite } = await gerarConviteEmpresa(empresa.id);
      setLinkGerado({ empresa: empresa.nome, convite });
    }, "Novo link gerado. O anterior deixou de valer.");

  const alternarStatus = (empresa: EmpresaPlataforma) => {
    const suspender = empresa.status === "ativa";
    if (suspender && !confirm(`Suspender ${empresa.nome}? Os usuários dela perdem o acesso até a reativação.`)) return;
    void executar(empresa, () => atualizarEmpresaPlataforma(empresa.id, { status: suspender ? "suspensa" : "ativa" }),
      suspender ? "Empresa suspensa." : "Empresa reativada.");
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[400px_1fr]">
      <div className="space-y-4">
        <Card>
          <h3 className="mb-1 flex items-center gap-2 font-black"><Building2 size={18} /> Nova empresa</h3>
          <p className="mb-4 text-sm text-zinc-500">Cadastre o cliente e envie o link de liberação para o responsável.</p>
          <form onSubmit={cadastrar} className="space-y-3">
            <Field label="Nome da empresa">
              <Input required minLength={2} maxLength={160} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </Field>
            <Field label="CNPJ (opcional)">
              <Input inputMode="numeric" placeholder="00.000.000/0000-00" value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} />
            </Field>
            <Field label="Plano">
              <Select value={form.plano} onChange={(e) => setForm({ ...form, plano: e.target.value as PlanoEmpresa })}>
                {PLANOS.map((plano) => <option key={plano.valor} value={plano.valor}>{plano.nome}</option>)}
              </Select>
            </Field>
            <Field label="E-mail do responsável">
              <Input required type="email" value={form.email_responsavel} onChange={(e) => setForm({ ...form, email_responsavel: e.target.value })} />
            </Field>
            <Button type="submit" disabled={salvando} className="w-full">{salvando ? "Cadastrando…" : "Cadastrar e gerar link"}</Button>
          </form>
        </Card>
        {linkGerado && <LinkGerado {...linkGerado} onFechar={() => setLinkGerado(null)} />}
      </div>

      <Card className="overflow-hidden p-0">
        <header className="flex items-center justify-between border-b border-zinc-100 p-4">
          <div>
            <h3 className="font-black">Empresas clientes</h3>
            <p className="text-xs text-zinc-500">{empresas.length} empresa(s)</p>
          </div>
          <Button type="button" variant="secondary" onClick={() => void carregar()} aria-label="Atualizar lista"><RefreshCw size={16} className={carregando ? "animate-spin" : ""} /></Button>
        </header>
        {carregando && !empresas.length ? (
          <p className="p-6 text-sm text-zinc-500">Carregando empresas…</p>
        ) : (
          <div className="divide-y divide-zinc-100">
            {empresas.map((empresa) => {
              const ocupado = emAndamento === empresa.id;
              const semAdmin = !empresa.admins;
              return (
                <article key={empresa.id} className="space-y-3 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <b className="block truncate">{empresa.nome}{empresa.id === EMPRESA_PRINCIPAL && <span className="ml-2 text-xs font-bold text-blue-600">principal</span>}</b>
                      <p className="text-xs text-zinc-500">{formatarCnpj(empresa.cnpj)} · {empresa.email_responsavel || "sem responsável"} · desde {formatDate(empresa.criado_em)}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={STATUS_CLASSE[empresa.status]}>{STATUS_NOME[empresa.status]}</Badge>
                      <Select
                        aria-label={`Plano de ${empresa.nome}`}
                        className="!h-8 !py-0 text-xs"
                        value={empresa.plano}
                        disabled={ocupado}
                        onChange={(e) => void executar(empresa, () => atualizarEmpresaPlataforma(empresa.id, { plano: e.target.value as PlanoEmpresa }), "Plano atualizado.")}
                      >
                        {PLANOS.map((plano) => <option key={plano.valor} value={plano.valor}>{plano.nome}</option>)}
                      </Select>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-600">
                    {empresa.usuarios_ativos ?? 0} usuário(s) ativo(s) · {empresa.tecnicos ?? 0} técnico(s) · {empresa.chamados_abertos ?? 0} chamado(s) aberto(s) · {empresa.ativos ?? 0} ativo(s)
                  </p>
                  {empresa.mensalidade && (
                    <p className="text-xs text-zinc-600">
                      Mensalidade: <b className="text-zinc-900">{MOEDA.format(empresa.mensalidade.total)}</b>
                      {" · "}{empresa.mensalidade.tecnicos} de {empresa.mensalidade.tecnicosIncluidos} técnico(s) incluído(s)
                      {empresa.mensalidade.tecnicosExtras > 0 && ` + ${empresa.mensalidade.tecnicosExtras} extra(s) (${MOEDA.format(empresa.mensalidade.valorExtras)})`}
                    </p>
                  )}
                  {semAdmin && (
                    <p className="text-xs font-bold text-amber-700">
                      {empresa.convite_pendente_ate
                        ? `Aguardando o responsável ativar o acesso (link válido até ${formatDate(empresa.convite_pendente_ate)}).`
                        : "Sem administrador e sem link válido: gere um novo link de liberação."}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" className="!h-9 text-xs" onClick={() => setOperacaoDe(empresa.id)}>
                      <BarChart3 size={14} /> Ver operação
                    </Button>
                    <Button type="button" variant="secondary" className="!h-9 text-xs" onClick={() => void copiar(linkCadastroEmpresa(empresa.slug), "Link de cadastro da equipe")}>
                      <Copy size={14} /> Link de cadastro da equipe
                    </Button>
                    {semAdmin && (
                      <Button type="button" variant="secondary" className="!h-9 text-xs" disabled={ocupado || empresa.status !== "ativa"} onClick={() => void novoLink(empresa)}>
                        <Link2 size={14} /> Gerar novo link de liberação
                      </Button>
                    )}
                    {empresa.id !== EMPRESA_PRINCIPAL && (
                      <Button type="button" variant={empresa.status === "ativa" ? "ghost" : "secondary"} className="!h-9 text-xs" disabled={ocupado} onClick={() => alternarStatus(empresa)}>
                        {empresa.status === "ativa" ? "Suspender" : "Reativar"}
                      </Button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Card>
      {operacaoDe !== null && <OperacaoEmpresa empresaId={operacaoDe} onFechar={() => setOperacaoDe(null)} />}
    </div>
  );
}
