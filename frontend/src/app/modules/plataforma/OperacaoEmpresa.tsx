/**
 * Responsabilidade: visão da operação de uma empresa cliente para a plataforma — só leitura, com acesso registrado.
 */
import { useEffect, useState } from "react";
import { Eye, RefreshCw, ShieldCheck } from "lucide-react";
import { Badge, Card, Modal } from "../../components/shared/FormPrimitives";
import { formatDate, prioridadeClass, statusClass } from "../comum/appShared";
import { ticketStatusLabel } from "../../domain/ticketStatus";
import { consultarOperacaoEmpresa, listarAcessosPlataforma, type AcessoPlataforma, type OperacaoEmpresa as Operacao } from "../../services/api";

const PERFIL_NOME: Record<string, string> = { admin: "Administradores", supervisor: "Supervisores", tecnico: "Técnicos", usuario: "Usuários" };

function Indicador({ titulo, valor, alerta = false }: { titulo: string; valor: string | number; alerta?: boolean }) {
  return (
    <Card className={alerta ? "border-red-200 bg-red-50/60" : ""}>
      <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">{titulo}</p>
      <p className={`mt-1 text-2xl font-black ${alerta ? "text-red-700" : "text-zinc-900"}`}>{valor}</p>
    </Card>
  );
}

export function OperacaoEmpresa({ empresaId, onFechar }: { empresaId: number; onFechar: () => void }) {
  const [dados, setDados] = useState<Operacao | null>(null);
  const [acessos, setAcessos] = useState<AcessoPlataforma[]>([]);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let ativo = true;
    // A consulta da operação registra o acesso; o histórico vem depois para já incluir este.
    consultarOperacaoEmpresa(empresaId)
      .then(async (operacao) => {
        if (!ativo) return;
        setDados(operacao);
        const historico = await listarAcessosPlataforma(empresaId).catch(() => []);
        if (ativo) setAcessos(historico);
      })
      .catch((error) => ativo && setErro(error instanceof Error ? error.message : "Erro ao carregar a operação."));
    return () => { ativo = false; };
  }, [empresaId]);

  const c = dados?.chamados;
  return (
    <Modal title={dados ? `Operação: ${dados.empresa.nome}` : "Operação da empresa"} onClose={onFechar} wide>
      <p className="mb-4 flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-slate-700">
        <ShieldCheck size={16} className="shrink-0 text-blue-600" />
        Visualização somente leitura. Este acesso fica registrado no histórico da empresa.
      </p>

      {erro && <p className="text-sm font-bold text-red-700">{erro}</p>}
      {!dados && !erro && <p className="flex items-center gap-2 text-sm text-zinc-500"><RefreshCw size={16} className="animate-spin" /> Carregando…</p>}

      {dados && c && (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Indicador titulo="Chamados abertos" valor={c.abertos} />
            <Indicador titulo="SLA vencido" valor={c.sla_vencido} alerta={c.sla_vencido > 0} />
            <Indicador titulo="Sem responsável" valor={c.sem_responsavel} alerta={c.sem_responsavel > 0} />
            <Indicador titulo="Tempo médio de resolução (30 dias)" valor={c.horas_media_resolucao_30d ? `${c.horas_media_resolucao_30d} h` : "—"} />
            <Indicador titulo="Abertos nos últimos 30 dias" valor={c.criados_30d} />
            <Indicador titulo="Resolvidos nos últimos 30 dias" valor={c.resolvidos_30d} />
            <Indicador titulo="Satisfação (90 dias)" valor={dados.satisfacao_90d.media ? `${dados.satisfacao_90d.media} (${dados.satisfacao_90d.avaliacoes})` : "Sem avaliações"} />
            <Indicador titulo="Ativos comunicando (24h)" valor={`${dados.ativos.comunicando_24h} de ${dados.ativos.total}`} />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
            <Card className="overflow-hidden p-0">
              <h3 className="border-b border-zinc-100 px-4 py-3 font-black">Chamados recentes</h3>
              {c.recentes.length === 0 ? (
                <p className="p-4 text-sm text-zinc-500">Nenhum chamado ainda.</p>
              ) : (
                <div className="divide-y divide-zinc-100">
                  {c.recentes.map((chamado) => (
                    <div key={chamado.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-bold">{chamado.numero_chamado || `#${chamado.id}`} · {chamado.titulo}</p>
                        <p className="text-xs text-zinc-500">{formatDate(chamado.criado_em)} · {chamado.responsavel || "sem responsável"}</p>
                      </div>
                      <div className="flex gap-2">
                        {chamado.sla_vencido && <Badge className="border-red-200 bg-red-50 text-red-700">SLA vencido</Badge>}
                        {chamado.prioridade && <Badge className={prioridadeClass(chamado.prioridade)}>{chamado.prioridade}</Badge>}
                        <Badge className={statusClass(chamado.status)}>{ticketStatusLabel(chamado.status)}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <div className="space-y-4">
              <Card>
                <h3 className="mb-2 font-black">Abertos por situação</h3>
                {c.por_status.length === 0 ? <p className="text-sm text-zinc-500">Nenhum chamado aberto.</p> : (
                  <ul className="space-y-1 text-sm">
                    {c.por_status.map((item) => <li key={item.status} className="flex justify-between"><span>{ticketStatusLabel(item.status)}</span><b>{item.total}</b></li>)}
                  </ul>
                )}
              </Card>
              <Card>
                <h3 className="mb-2 font-black">Pessoas</h3>
                <ul className="space-y-1 text-sm">
                  {dados.usuarios.map((grupo) => (
                    <li key={grupo.perfil} className="flex justify-between">
                      <span>{PERFIL_NOME[grupo.perfil] || grupo.perfil}</span>
                      <b>{grupo.ativos}{grupo.pendentes ? ` (+${grupo.pendentes} aguardando)` : ""}</b>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-zinc-500">{dados.base.publicados} artigo(s) publicado(s) na base.</p>
              </Card>
            </div>
          </div>

          <Card>
            <h3 className="mb-2 flex items-center gap-2 font-black"><Eye size={16} /> Acessos da plataforma a esta empresa</h3>
            {acessos.length === 0 ? <p className="text-sm text-zinc-500">Nenhum acesso registrado.</p> : (
              <ul className="max-h-48 space-y-1 overflow-auto text-xs text-zinc-600">
                {acessos.map((acesso) => (
                  <li key={acesso.id}>{formatDate(acesso.criado_em)} · {acesso.usuario_email} · {acesso.recurso === "operacao" ? "visualizou a operação" : acesso.recurso}{acesso.ip ? ` · IP ${acesso.ip}` : ""}</li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </Modal>
  );
}
