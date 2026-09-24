/**
 * Responsabilidade: detalhe completo do chamado para a equipe.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { BrainCircuit, CheckCircle2, Clock3, Download, FileText, History, LockKeyhole, MessageSquare, Paperclip, Star, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { PerformanceRatingCard } from "../../components/PerformanceRatingCard";
import { isFinalTicketStatus, ticketStatusLabel } from "../../domain/ticketStatus";
import { Badge, Button, Card, Field, Input, Modal, Select, Textarea } from "../../components/shared/FormPrimitives";
import { ReopenTicketCard } from "../../components/chamados/ReopenTicketCard";
import { adicionarComentario, anexarArquivos, atualizarChamado, baixarAnexoChamado, baixarHistoricoChamadoPdf, encerrarChamado, enviarAvaliacaoPerformance, obterBlobAnexoChamado, reabrirChamado, type ApiChamado, type ApiComentario, type ApiUsuario, type RespostaRapida, type UsuarioLogado } from "../../services/api";
import { PRIORIDADES, ResponsavelAvatar, STATUS_OPCOES, formatDate, formatarMinutos, iniciaisPessoa, isAdminApp, isDevApp, isEquipeApp, nomeResponsavelChamado, prioridadeClass, statusClass } from "../comum/appShared";

// Visão consolidada do chamado com histórico, anexos e ações autorizadas.
export function ChamadoDetalhe({
  chamado,
  usuario,
  equipe = [],
  respostasRapidas = [],
  onAssumir,
  onClose,
  onRefresh,
  somenteLeitura = false,
}: {
  chamado: ApiChamado;
  usuario: UsuarioLogado;
  equipe?: ApiUsuario[];
  respostasRapidas?: RespostaRapida[];
  onAssumir?: (id: number) => Promise<void>;
  onClose: () => void;
  onRefresh: () => Promise<void>;
  somenteLeitura?: boolean;
}) {
  const [mensagem, setMensagem] = useState("");
  const [enviandoMensagem, setEnviandoMensagem] = useState(false);
  const [comentarios, setComentarios] = useState<ApiComentario[]>(chamado.comentarios || []);
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [previewsAnexos, setPreviewsAnexos] = useState<Record<number, string>>({});
  const arquivoInputRef = useRef<HTMLInputElement>(null);
  const arquivosComPrevia = useMemo(
    () => arquivos.map((arquivo) => ({
      arquivo,
      url: arquivo.type.startsWith("image/") ? URL.createObjectURL(arquivo) : "",
    })),
    [arquivos],
  );
  useEffect(
    () => () => arquivosComPrevia.forEach(({ url }) => url && URL.revokeObjectURL(url)),
    [arquivosComPrevia],
  );
  useEffect(() => setComentarios(chamado.comentarios || []), [chamado.comentarios]);
  useEffect(() => {
    let ativo = true;
    const urls: string[] = [];
    const anexosImagem = (chamado.anexos || []).filter((anexo) =>
      String(anexo.mime_type || "").startsWith("image/") || /\.(png|jpe?g|webp)$/i.test(anexo.nome_original || ""),
    );
    Promise.all(anexosImagem.map(async (anexo) => {
      try {
        const blob = await obterBlobAnexoChamado(chamado.id, anexo);
        const url = URL.createObjectURL(blob);
        urls.push(url);
        return [anexo.id, url] as const;
      } catch {
        return null;
      }
    })).then((items) => {
      if (ativo) setPreviewsAnexos(Object.fromEntries(items.filter(Boolean) as Array<readonly [number, string]>));
    });
    return () => {
      ativo = false;
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [chamado.id, chamado.anexos]);
  const [mostrarIA, setMostrarIA] = useState(false);
  const [mostrarHistorico, setMostrarHistorico] = useState(false);
  const [edit, setEdit] = useState({
    status: chamado.status,
    prioridade: chamado.prioridade,
    responsavel_id: String(chamado.responsavel_id || ""),
    prioridade_manual_motivo: "",
  });
  const isEquipe = !somenteLeitura && isEquipeApp(usuario.perfil);
  const isDev = isDevApp(usuario.perfil);
  const isAdmin = isAdminApp(usuario.perfil);
  const podeGerenciar =
    !somenteLeitura &&
    (isAdmin || Number(chamado.responsavel_id) === Number(usuario.id));
  const concluido = isFinalTicketStatus(chamado.status);
  const slaTexto = concluido
    ? "SLA encerrado"
    : chamado.sla_status === "pausado"
      ? chamado.sla_pausa_motivo === "fora_expediente" ? "SLA pausado · fora do expediente" : "SLA pausado · aguardando usuário"
      : chamado.vencido
      ? `Vencido há ${formatarMinutos(Math.abs(Number(chamado.sla_minutos_restantes || 0)))}`
      : chamado.sla_minutos_restantes != null
        ? formatarMinutos(chamado.sla_minutos_restantes)
        : "SLA não calculado";

  async function enviarComentario(event: FormEvent) {
    event.preventDefault();
    const texto = mensagem.trim();
    if (!texto || enviandoMensagem) return;
    const idTemporario = -Date.now();
    const otimista: ApiComentario = {
      id: idTemporario,
      chamado_id: chamado.id,
      usuario_id: usuario.id,
      autor_nome: usuario.nome,
      autor_perfil: usuario.perfil,
      mensagem: texto,
      criado_em: new Date().toISOString(),
    };
    setEnviandoMensagem(true);
    setMensagem("");
    setComentarios((atuais) => [...atuais, otimista]);
    try {
      const comentario = await adicionarComentario(chamado.id, texto);
      setComentarios((atuais) => atuais.map((item) => item.id === idTemporario ? comentario : item));
      void onRefresh().catch(() => undefined);
    } catch (error) {
      setComentarios((atuais) => atuais.filter((item) => item.id !== idTemporario));
      setMensagem(texto);
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar a mensagem.");
    } finally {
      setEnviandoMensagem(false);
    }
  }
  async function upload(event: FormEvent) {
    event.preventDefault();
    if (!arquivos.length) return;
    await anexarArquivos(chamado.id, arquivos);
    setArquivos([]);
    if (arquivoInputRef.current) arquivoInputRef.current.value = "";
    await onRefresh();
  }
  async function salvarAdmin(event: FormEvent) {
    event.preventDefault();
    try {
      await atualizarChamado(chamado.id, {
        status: edit.status,
        prioridade: edit.prioridade,
        ...(isAdmin && edit.responsavel_id
          ? { responsavel_id: Number(edit.responsavel_id) }
          : {}),
        prioridade_manual_motivo: edit.prioridade_manual_motivo,
      } as Partial<ApiChamado>);
      toast.success("Chamado atualizado.");
      await onRefresh();
    } catch (e) {
      // Sem isso, uma rejeição (ex.: prazo de 7 dias para reabrir) ficava sem nenhuma
      // mensagem na tela — o formulário parecia simplesmente não fazer nada.
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar as alterações.");
    }
  }

  return (
    <Modal
      title={`${chamado.numero_chamado || `#${chamado.id}`} · ${chamado.titulo}`}
      onClose={onClose}
      wide
      readOnly={somenteLeitura}
    >
      {somenteLeitura && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700">
          <LockKeyhole size={18} />
          <div className="min-w-0 flex-1">
            <b className="block text-sm">
              Registro histórico — somente leitura
            </b>
            <span className="text-xs">
              As informações, mensagens, anexos e movimentações não podem ser
              modificados nesta tela. Reabrir o chamado continua disponível
              dentro do prazo.
            </span>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="shrink-0"
            onClick={() => baixarHistoricoChamadoPdf(chamado).catch((error) => toast.error(error.message))}
          >
            <Download size={16} />
            Baixar PDF
          </Button>
        </div>
      )}
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <Card className="overflow-hidden !p-0">
            <div className="border-b border-zinc-100 bg-zinc-50/70 px-5 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={statusClass(chamado.status)}>
                  {ticketStatusLabel(chamado.status)}
                </Badge>
                <Badge className={prioridadeClass(chamado.prioridade)}>
                  {chamado.prioridade}
                </Badge>
                <span
                  className={`ml-auto inline-flex items-center gap-1.5 text-xs font-black ${chamado.vencido ? "text-red-600" : concluido ? "text-zinc-500" : "text-emerald-600"}`}
                >
                  <Clock3 size={14} />
                  {slaTexto}
                </span>
              </div>
            </div>
            <div className="p-5">
              <p className="whitespace-pre-wrap text-[15px] leading-7 text-zinc-700">
                {chamado.descricao}
              </p>
              <div className="mt-5 grid gap-x-6 gap-y-4 border-t border-zinc-100 pt-5 text-sm sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <span className="block text-[10px] font-black uppercase tracking-wider text-zinc-400">
                    Solicitante
                  </span>
                  <b className="mt-1 block text-zinc-800">
                    {chamado.solicitante}
                  </b>
                </div>
                <div>
                  <span className="block text-[10px] font-black uppercase tracking-wider text-zinc-400">
                    Departamento
                  </span>
                  <b className="mt-1 block text-zinc-800">
                    {chamado.setor || "Não informado"}
                  </b>
                </div>
                <div>
                  <span className="block text-[10px] font-black uppercase tracking-wider text-zinc-400">Origem do solicitante / área</span>
                  <b className="mt-1 block text-zinc-800">{[chamado.municipio_solicitante,chamado.unidade_solicitante].filter(Boolean).join(" · ")||"Não informada"}</b>
                </div>
                <div>
                  <span className="block text-[10px] font-black uppercase tracking-wider text-zinc-400">Local do atendimento</span>
                  <b className="mt-1 block text-zinc-800">{[chamado.ativo_municipio||chamado.municipio_solicitante,chamado.ativo_unidade||chamado.unidade_solicitante].filter(Boolean).join(" · ")||"Não informado"}</b>
                </div>
                {chamado.ativo_id&&<div>
                  <span className="block text-[10px] font-black uppercase tracking-wider text-zinc-400">Ativo / máquina</span>
                  <b className="mt-1 block text-emerald-700">{chamado.ativo_hostname||"Ativo"} · {chamado.ativo_patrimonio||`#${chamado.ativo_id}`}</b>
                </div>}
                <div>
                  <span className="block text-[10px] font-black uppercase tracking-wider text-zinc-400">
                    Tipo
                  </span>
                  <b className="mt-1 block text-zinc-800">
                    {chamado.tipo_chamado}
                  </b>
                </div>
                <div>
                  <span className="block text-[10px] font-black uppercase tracking-wider text-zinc-400">
                    Categoria
                  </span>
                  <b className="mt-1 block text-zinc-800">
                    {chamado.categoria_ia || "Não classificada"}
                  </b>
                </div>
                <div>
                  <span className="block text-[10px] font-black uppercase tracking-wider text-zinc-400">
                    Responsável
                  </span>
                  <span className="mt-1 flex items-center gap-2 font-bold text-zinc-800">
                    <ResponsavelAvatar chamado={chamado} size="sm" />
                    {nomeResponsavelChamado(chamado) || "Não definido"}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-black uppercase tracking-wider text-zinc-400">
                    Aberto em
                  </span>
                  <b className="mt-1 block text-zinc-800">
                    {formatDate(chamado.criado_em)}
                  </b>
                </div>
              </div>
            </div>
          </Card>
          {chamado.demanda_desenvolvimento && (() => {
            const demanda = chamado.demanda_desenvolvimento;
            const frequencias: Record<string, string> = { varias_dia: "Várias vezes ao dia", diaria: "Diariamente", semanal: "Semanalmente", mensal: "Mensalmente", ocasional: "Ocasionalmente", outro: "Outro" };
            const naturezas: Record<string, string> = { bug: "Bug", melhoria: "Melhoria", automacao: "Automação", integracao: "Integração", dashboard_relatorio: "Dashboard / Relatório", novo_sistema: "Novo sistema" };
            const info = [
              ["Como funciona atualmente", demanda.current_process],
              ["Problema a resolver", demanda.problem],
              ["Resultado esperado", demanda.expected_result],
              ["Frequência", frequencias[demanda.frequency || ""] || demanda.frequency],
              ["Pessoas envolvidas", demanda.people_involved?.toString()],
              ["Tempo atual por execução", demanda.current_time_minutes != null ? `${demanda.current_time_minutes} minutos` : ""],
              ["Sistemas envolvidos", demanda.systems?.join(", ")],
              ["Impacto se não for executada", demanda.no_delivery_impact],
              ["Benefícios esperados", demanda.expected_benefits?.join(", ")],
            ];
            return <Card className="overflow-hidden !p-0">
              <div className="flex flex-wrap items-center gap-3 border-b border-violet-100 bg-violet-50 px-5 py-4">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-600 text-white"><FileText size={18}/></span>
                <span className="min-w-0 flex-1"><b className="block text-sm text-violet-950">Informações para desenvolvimento</b><span className="text-xs text-violet-700">{demanda.code || "Demanda vinculada"} · {naturezas[demanda.nature || ""] || demanda.nature || "Desenvolvimento"}</span></span>
                <Button type="button" variant="secondary" onClick={() => baixarHistoricoChamadoPdf(chamado).catch((error) => toast.error(error.message))}><Download size={16}/>Baixar relatório PDF</Button>
              </div>
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                {info.map(([label, value]) => <div key={label} className="rounded-xl border border-zinc-100 bg-zinc-50 p-3"><span className="block text-[10px] font-black uppercase tracking-wider text-zinc-400">{label}</span><p className="mt-1 whitespace-pre-wrap text-sm font-semibold leading-6 text-zinc-700">{value || "Não informado"}</p></div>)}
              </div>
            </Card>;
          })()}
          <Card className="!p-0">
            <button
              type="button"
              onClick={() => setMostrarIA((value) => !value)}
              className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-zinc-50"
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-50 text-violet-600">
                <BrainCircuit size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <b className="block text-sm text-zinc-900">Análise da IA</b>
                <span className="block truncate text-xs text-zinc-500">
                  Prioridade sugerida:{" "}
                  {chamado.prioridade_ia || chamado.prioridade}
                </span>
              </span>
              <span className="text-xs font-bold text-zinc-400">
                {mostrarIA ? "Recolher" : "Ver análise"}
              </span>
            </button>
            {mostrarIA && (
              <div className="space-y-3 border-t border-zinc-100 px-5 py-4 text-sm leading-6 text-zinc-600">
                <p>
                  <b className="text-zinc-800">Motivo:</b>{" "}
                  {chamado.prioridade_ia_motivo || "Não disponível"}
                </p>
                <p>
                  <b className="text-zinc-800">Responsável sugerido:</b>{" "}
                  {chamado.ia_responsavel_sugerido || "Não sugerido"}
                </p>
                <div className="rounded-xl bg-zinc-50 p-3">
                  <b className="text-zinc-800">Resposta sugerida:</b>
                  <p className="mt-1">
                    {chamado.ia_resposta_inicial || "Não disponível"}
                  </p>
                </div>
                {chamado.ia_duplicidade_motivo && (
                  <p className="rounded-xl bg-amber-50 p-3 text-amber-800">
                    <b>Possível duplicidade:</b> {chamado.ia_duplicidade_motivo}
                  </p>
                )}
              </div>
            )}
          </Card>
          <Card>
            <h3 className="mb-3 flex items-center gap-2 font-black">
              <MessageSquare size={18} />
              Chat do chamado
            </h3>
            <div className="mb-4 space-y-3">
              {comentarios.length ? (
                comentarios.map((c) => {
                  const atendimento = c.autor_perfil !== "usuario";
                  return (
                    <div
                      key={c.id}
                      className={`flex gap-3 ${atendimento ? "justify-end" : "justify-start"}`}
                    >
                      <span
                        className={`grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full text-xs font-black ${atendimento ? "order-2 bg-blue-600 text-white" : "bg-zinc-200 text-zinc-700"}`}
                      >
                        {c.foto_url ? (
                          <img
                            src={c.foto_url}
                            alt={c.autor_nome || "Participante"}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          iniciaisPessoa(c.autor_nome)
                        )}
                      </span>
                      <div
                        className={`max-w-[82%] rounded-2xl px-4 py-3 shadow-sm ${atendimento ? "rounded-tr-md bg-blue-600 text-white" : "rounded-tl-md bg-zinc-100 text-zinc-800"}`}
                      >
                        <p
                          className={`text-xs font-black ${atendimento ? "text-blue-50" : "text-zinc-700"}`}
                        >
                          {c.autor_nome}{" "}
                          <span
                            className={
                              atendimento
                                ? "font-normal text-blue-100"
                                : "font-normal text-zinc-400"
                            }
                          >
                            • {formatDate(c.criado_em)}
                          </span>
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-6">
                          {c.mensagem}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="rounded-2xl border border-dashed border-zinc-200 p-6 text-center text-sm text-zinc-500">
                  Nenhuma mensagem ainda.
                </p>
              )}
            </div>
            {isEquipe && respostasRapidas.length > 0 && (
              <div className="mb-3">
                <p className="mb-2 text-xs font-black uppercase tracking-wide text-zinc-500">
                  Respostas rápidas
                </p>
                <div className="flex flex-wrap gap-2">
                  {respostasRapidas.slice(0, 8).map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setMensagem(r.mensagem)}
                      className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-black text-blue-700 hover:bg-blue-100"
                    >
                      {r.categoria ? `${r.categoria}: ` : ""}
                      {r.titulo}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <form onSubmit={enviarComentario} className="flex gap-2">
              <Input
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                placeholder="Escreva uma resposta..."
                disabled={enviandoMensagem}
              />
              <Button disabled={enviandoMensagem}>{enviandoMensagem ? "Enviando…" : "Enviar"}</Button>
            </form>
          </Card>
          <Card>
            <h3 className="mb-3 flex items-center gap-2 font-black">
              <History size={18} />
              Histórico / auditoria do chamado
            </h3>
            <div className="space-y-2">
              {chamado.movimentacoes?.map((m) => (
                <div
                  key={m.id}
                  className="rounded-xl border border-zinc-100 p-3 text-sm"
                >
                  <p>
                    <b>{m.tipo}</b> • {formatDate(m.criado_em)}
                  </p>
                  <p className="text-zinc-600">{m.descricao}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
        <aside className="space-y-5">
          {podeGerenciar && (
            <Card>
              <h3 className="mb-3 font-black">Ações do suporte</h3>
              <form onSubmit={salvarAdmin} className="space-y-3">
                <Field label="Status">
                  <Select
                    value={edit.status}
                    onChange={(e) =>
                      setEdit({ ...edit, status: e.target.value })
                    }
                  >
                    {STATUS_OPCOES.map((s) => (
                        <option key={s} value={s}>{ticketStatusLabel(s)}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Prioridade final">
                  <Select
                    value={edit.prioridade}
                    onChange={(e) =>
                      setEdit({ ...edit, prioridade: e.target.value })
                    }
                  >
                    {PRIORIDADES.map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Motivo da alteração manual">
                  <Textarea
                    value={edit.prioridade_manual_motivo}
                    onChange={(e) =>
                      setEdit({
                        ...edit,
                        prioridade_manual_motivo: e.target.value,
                      })
                    }
                  />
                </Field>
                {isAdmin && (
                  <Field label="Técnico responsável">
                    <Select
                      value={edit.responsavel_id}
                      onChange={(e) =>
                        setEdit({ ...edit, responsavel_id: e.target.value })
                      }
                    >
                      <option value="">Sem responsável</option>
                      {equipe.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nome} - {u.departamento}
                        </option>
                      ))}
                    </Select>
                  </Field>
                )}
                {!chamado.responsavel_id && onAssumir && (
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full"
                    onClick={() => onAssumir(chamado.id)}
                  >
                    Assumir chamado
                  </Button>
                )}
                <Button className="w-full">Salvar alterações</Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={async () => {
                    await encerrarChamado(chamado.id);
                    await onRefresh();
                  }}
                >
                  Finalizar chamado
                </Button>
              </form>
            </Card>
          )}
          <Card>
            <h3 className="mb-3 flex items-center gap-2 font-black">
              <Paperclip size={18} />
              Anexos
            </h3>
            <div className="mb-3 space-y-2">
              {chamado.anexos?.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => baixarAnexoChamado(chamado.id, a).catch((error) => toast.error(error.message))}
                  className="block w-full overflow-hidden rounded-xl border text-left text-sm transition hover:border-blue-300 hover:bg-zinc-50"
                >
                  {previewsAnexos[a.id] && (
                    <img
                      src={previewsAnexos[a.id]}
                      alt={`Prévia de ${a.nome_original}`}
                      className="h-40 w-full border-b bg-white object-contain"
                    />
                  )}
                  <span className="block p-3">
                    <FileText className="mr-2 inline" size={16} />
                    {a.nome_original}
                  </span>
                </button>
              ))}
            </div>
            <form onSubmit={upload} className="space-y-3">
              <input
                ref={arquivoInputRef}
                type="file"
                multiple
                accept="image/png,image/jpeg,image/webp,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
                onClick={(e) => { e.currentTarget.value = ""; }}
                onChange={(e) => setArquivos(Array.from(e.target.files || []).slice(0, 5))}
                className="block w-full cursor-pointer rounded-xl border border-zinc-200 bg-white text-sm file:mr-3 file:border-0 file:bg-zinc-100 file:px-3 file:py-3 file:text-xs file:font-black hover:border-blue-300"
              />
              {arquivosComPrevia.length > 0 && (
                <div className="grid gap-2 sm:grid-cols-2">
                  {arquivosComPrevia.map(({ arquivo, url }, index) => (
                    <div key={`${arquivo.name}-${arquivo.lastModified}-${index}`} className="relative overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
                      {url ? (
                        <img src={url} alt={`Prévia de ${arquivo.name}`} className="h-28 w-full bg-white object-contain" />
                      ) : (
                        <div className="grid h-20 place-items-center text-zinc-400"><FileText size={28} /></div>
                      )}
                      <div className="min-w-0 border-t border-zinc-200 p-2 pr-9">
                        <p className="truncate text-xs font-bold" title={arquivo.name}>{arquivo.name}</p>
                        <p className="mt-0.5 text-[10px] text-zinc-500">{(arquivo.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <button type="button" onClick={() => setArquivos((atuais) => atuais.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remover ${arquivo.name}`} className="absolute bottom-2 right-2 grid h-7 w-7 place-items-center rounded-lg bg-red-50 text-red-600 transition hover:bg-red-100"><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
              <Button className="w-full" disabled={!arquivos.length}>
                <Upload size={16} />
                {arquivos.length ? `Anexar ${arquivos.length} arquivo${arquivos.length > 1 ? "s" : ""}` : "Anexar"}
              </Button>
            </form>
          </Card>
          {concluido && chamado.pode_avaliar && !chamado.avaliacao && (
            <Card>
              <h3 className="mb-3 flex items-center gap-2 font-black">
                <Star size={18} />
                Avalie este atendimento
              </h3>
              <PerformanceRatingCard chamado={chamado} onSubmit={async (dados) => { await enviarAvaliacaoPerformance(chamado.id, dados); toast.success("Avaliação concluída com sucesso!"); await onRefresh(); }} />
            </Card>
          )}
          {concluido && chamado.avaliacao && (
            <Card>
              <div className="flex items-center gap-3 text-emerald-700"><CheckCircle2 size={20} /><div><b className="block text-sm">Atendimento avaliado</b><span className="text-xs">Obrigado por compartilhar sua experiência.</span></div></div>
            </Card>
          )}
          {concluido && (
            <ReopenTicketCard
              finalizadoEm={chamado.finalizado_em || chamado.atualizado_em}
              isAdmin={isAdmin}
              onReopen={async (motivo) => {
                await reabrirChamado(chamado.id, motivo);
                toast.success("Chamado reaberto.");
                await onRefresh();
              }}
            />
          )}
        </aside>
      </div>
    </Modal>
  );
}
