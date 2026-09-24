/**
 * Responsabilidade: estado e ações do portal do solicitante (chamados, notificações, perfil, relatórios e avaliação).
 */
import { usePushNavigation } from "../../hooks/usePushNavigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { BarChart3, Bell, BookOpen, Download, LayoutDashboard, MapPinned, ShieldCheck, Ticket, Trophy } from "lucide-react";
import { toast } from "sonner";
import { TICKET_STATUS, canonicalTicketStatus } from "../../domain/ticketStatus";
import { PORTAL_ROUTES, useModuleRoute } from "../../routes/useModuleRoute";
import { atualizarChamado, atualizarMeuPerfil, atualizarMinhaFotoPerfil, atualizarUsuarioLocal, baixarRelatorio, buscarChamado, criarChamado, criarDemandaDesenvolvimento, listarBaseConhecimento, listarCatalogo, listarChamadosDoUsuario, listarNotificacoes, marcarNotificacoesLidas, obterDashboard, obterMeuPerfil, obterMinhasPermissoes, reportFrontendError, removerMinhaFotoPerfil, type ApiAvisoSistema, type ApiChamado, type ApiUsuario, type ArtigoBase, type CatalogoItem, type DashboardResumo, type Notificacao, type ConfiguracoesSistema, type UsuarioLogado, type PermissionKey } from "../../services/api";
import { STATUS_COLUNAS, chamadoIdFromNotification, emailSuporteSistema, logoSistema1, nomeSistema, normalizeStatus } from "../comum/appShared";
import type { UsuarioTab } from "../comum/appShared";

export type UserPortalProps = {
  usuario: UsuarioLogado;
  setUsuario: (u: UsuarioLogado) => void;
  onLogout: () => void;
  configSistema: ConfiguracoesSistema;
  avisosSistema: ApiAvisoSistema[];
};

// Estado, carregamentos e ações do portal do solicitante. O UserPortal e seus trechos recebem tudo daqui.
export function useUserPortal({
  usuario,
  setUsuario,
  onLogout,
  configSistema,
  avisosSistema,
}: UserPortalProps) {
  const [tab, setTab] = useModuleRoute<UsuarioTab>(PORTAL_ROUTES, "home");
  const [chamados, setChamados] = useState<ApiChamado[]>([]);
  const [perfil, setPerfil] = useState<ApiUsuario | null>(null);
  const [tipos, setTipos] = useState<CatalogoItem[]>([]);
  const [base, setBase] = useState<ArtigoBase[]>([]);
  const [artigosBase, setArtigosBase] = useState<ArtigoBase[]>([]);
  const [novo, setNovo] = useState({
    titulo: "",
    descricao: "",
    tipo_chamado: "Incidente",
    processo_atual: "",
    problema: "",
    resultado_esperado: "",
    frequencia: "",
    pessoas: "",
    tempo_minutos: "",
    sistemas: "",
    impacto_nao_execucao: "",
    beneficios: "",
  });
  const [selecionado, setSelecionado] = useState<ApiChamado | null>(null);
  const [avaliando, setAvaliando] = useState<ApiChamado | null>(null);
  const chamadoSelecionadoUsuarioRef = useRef<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalChamadoAberto, setModalChamadoAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [notificacoesAberta, setNotificacoesAberta] = useState(false);
  const [carregandoNotificacoes, setCarregandoNotificacoes] = useState(false);
  const [mostrarPerfil, setMostrarPerfil] = useState(false);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);
  const [temaEscuroUsuario, setTemaEscuroUsuario] = useState(
    () => localStorage.getItem("smart_helpdesk_user_theme") === "dark",
  );
  const [menuMaisUsuario, setMenuMaisUsuario] = useState(false);
  const [permissoesUsuario, setPermissoesUsuario] = useState<PermissionKey[]>(
    [],
  );
  const [dashboardPermitido, setDashboardPermitido] =
    useState<DashboardResumo | null>(null);
  const [mesRelatorio, setMesRelatorio] = useState(() => new Date().toISOString().slice(0, 7));
  const [statusRelatorio, setStatusRelatorio] = useState("");
  const [tipoRelatorio, setTipoRelatorio] = useState("");
  const [buscaRelatorio, setBuscaRelatorio] = useState("");
  const [formatoBaixando, setFormatoBaixando] = useState<"csv" | "excel" | "pdf" | null>(null);

  const usuarioAtual = perfil || usuario;
  const sistemaNome = nomeSistema(configSistema);
  const sistemaLogo1 = logoSistema1(configSistema);
  const suporteEmail = emailSuporteSistema(configSistema);
  const fotoPerfil = usuarioAtual.foto_url || "";
  const inicialPerfil = String(usuarioAtual.nome || "U")
    .slice(0, 1)
    .toUpperCase();
  const unread = notificacoes.filter((n) => !n.lida).length;
  const intervaloRelatorio = useMemo(() => {
    const [year, month] = mesRelatorio.split("-").map(Number);
    const ultimoDia = new Date(year, month, 0).getDate();
    return {
      data_inicio: `${mesRelatorio}-01`,
      data_fim: `${mesRelatorio}-${String(ultimoDia).padStart(2, "0")}`,
    };
  }, [mesRelatorio]);
  const statusDisponiveisRelatorio = useMemo(() => [...new Set(chamados.map((item) => String(item.status || "")).filter(Boolean))].sort(), [chamados]);
  const tiposDisponiveisRelatorio = useMemo(() => [...new Set(chamados.map((item) => String(item.tipo_chamado || "")).filter(Boolean))].sort(), [chamados]);
  const chamadosRelatorioFiltrados = useMemo(() => {
    const query = buscaRelatorio.trim().toLowerCase();
    return chamados.filter((chamado) => {
      if (String(chamado.criado_em || "").slice(0, 7) !== mesRelatorio) return false;
      if (statusRelatorio && String(chamado.status || "") !== statusRelatorio) return false;
      if (tipoRelatorio && String(chamado.tipo_chamado || "") !== tipoRelatorio) return false;
      if (!query) return true;
      return [chamado.numero_chamado, chamado.titulo, chamado.descricao, chamado.responsavel_nome, chamado.responsavel]
        .some((value) => String(value || "").toLowerCase().includes(query));
    });
  }, [buscaRelatorio, chamados, mesRelatorio, statusRelatorio, tipoRelatorio]);

  const resumoUsuario = useMemo(() => {
    // A API devolve o status como código (OPEN, CLOSED...); o texto legado é tratado pelo mesmo helper.
    const abertos = chamados.filter((c) =>
      [TICKET_STATUS.OPEN, TICKET_STATUS.REOPENED].includes(canonicalTicketStatus(c.status) as typeof TICKET_STATUS.OPEN),
    ).length;
    const andamento = chamados.filter(
      (c) => canonicalTicketStatus(c.status) === TICKET_STATUS.IN_PROGRESS,
    ).length;
    const concluidos = chamados.filter((c) =>
      [TICKET_STATUS.RESOLVED, TICKET_STATUS.CLOSED].includes(canonicalTicketStatus(c.status) as typeof TICKET_STATUS.RESOLVED),
    ).length;
    const atrasados = chamados.filter((c) => Boolean(c.vencido)).length;

    return { abertos, andamento, concluidos, atrasados };
  }, [chamados]);

  const chamadosFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return chamados;
    return chamados.filter((c) =>
      [
        c.numero_chamado,
        c.titulo,
        c.descricao,
        c.status,
        c.prioridade,
        c.tipo_chamado,
        c.responsavel_nome,
        c.responsavel,
      ].some((valor) =>
        String(valor || "")
          .toLowerCase()
          .includes(q),
      ),
    );
  }, [busca, chamados]);

  const chamadosRecentes = useMemo(() => {
    return [...chamadosFiltrados]
      .sort(
        (a, b) =>
          new Date(b.criado_em || 0).getTime() -
          new Date(a.criado_em || 0).getTime(),
      )
      .slice(0, 8);
  }, [chamadosFiltrados]);

  const chamadosPorStatus = useMemo(() => {
    return STATUS_COLUNAS.map((coluna) => ({
      ...coluna,
      chamados: chamadosFiltrados.filter(
        (chamado) => normalizeStatus(chamado.status) === coluna.status,
      ),
    }));
  }, [chamadosFiltrados]);

  const chamadosBoardUsuario = useMemo(() => {
    const colunaAberta = chamadosFiltrados.filter(
      (chamado) => normalizeStatus(chamado.status) === TICKET_STATUS.OPEN,
    );
    const colunaAndamento = chamadosFiltrados.filter((chamado) => {
      const status = normalizeStatus(chamado.status);
      return status === TICKET_STATUS.IN_PROGRESS || status === TICKET_STATUS.WAITING_USER;
    });
    const colunaResolvida = chamadosFiltrados.filter(
      (chamado) =>
        normalizeStatus(chamado.status) === TICKET_STATUS.CLOSED &&
        !chamado.avaliacao &&
        !chamado.avaliacao_nota,
    );

    return [
      {
        id: "abertos",
        titulo: "Abertos",
        resumo: "Aguardando atendimento",
        topBorder: "border-t-sky-500",
        accent: "bg-blue-500",
        badge: "bg-blue-50 text-blue-700",
        chamados: colunaAberta,
      },
      {
        id: "andamento",
        titulo: "Em andamento",
        resumo: "Sendo tratados",
        topBorder: "border-t-amber-500",
        accent: "bg-amber-500",
        badge: "bg-amber-50 text-amber-700",
        chamados: colunaAndamento,
      },
      {
        id: "resolvidos",
        titulo: "Resolvidos",
        resumo: "Últimos 30 dias",
        topBorder: "border-t-emerald-500",
        accent: "bg-emerald-500",
        badge: "bg-emerald-50 text-emerald-700",
        chamados: colunaResolvida,
      },
    ];
  }, [chamadosFiltrados]);

  const artigosSugeridos = useMemo(
    () => artigosBase.slice(0, 3),
    [artigosBase],
  );
  const podeBaixarRelatorios = permissoesUsuario.includes("exportar_dados") || permissoesUsuario.includes("baixar_relatorios");
  const podeAcessarRelatorios = permissoesUsuario.includes("visualizar_relatorios") || podeBaixarRelatorios;

  const usuarioTabs = [
    {
      key: "home" as UsuarioTab,
      icon: LayoutDashboard,
      label: "Início",
      title: "Início",
    },
    {
      key: "chamados" as UsuarioTab,
      icon: Ticket,
      label: "Meus Chamados",
      title: "Meus chamados",
    },
    {
      key: "base" as UsuarioTab,
      icon: BookOpen,
      label: "Base de Conhecimento",
      title: "Base de conhecimento",
    },
    {
      key: "avisos" as UsuarioTab,
      icon: Bell,
      label: "Notificações",
      title: "Notificações",
    },
    {
      key: "acessos" as UsuarioTab,
      icon: ShieldCheck,
      label: "Meus acessos",
      title: "Meus acessos",
    },
    ...(permissoesUsuario.includes("visualizar_ranking_satisfacao")
      ? [{ key: "ranking" as UsuarioTab, icon: Trophy, label: "Ranking de satisfação", title: "Ranking de satisfação" }]
      : []),
    ...(permissoesUsuario.includes("visualizar_dashboard")
      ? [
          {
            key: "dashboard" as UsuarioTab,
            icon: BarChart3,
            label: "Dashboard",
            title: "Dashboard",
          },
        ]
      : []),
    ...(permissoesUsuario.includes("visualizar_patrimonio")
      ? [{ key: "patrimonio" as UsuarioTab, icon: MapPinned, label: "Patrimônio", title: "Patrimônio" }]
      : []),
    ...(podeAcessarRelatorios
      ? [
          {
            key: "relatorios" as UsuarioTab,
            icon: Download,
            label: "Relatórios",
            title: "Relatórios",
          },
        ]
      : []),
  ];

  const activeTab =
    usuarioTabs.find((item) => item.key === tab) ?? usuarioTabs[0];
  const acessosVisiveis = [
    { label: "Abrir e acompanhar chamados", description: "Consulte seus próprios atendimentos, mensagens e anexos.", allowed: true },
    { label: "Base de conhecimento", description: "Consulte orientações e soluções publicadas.", allowed: true },
    { label: "Dashboard operacional", description: "Visualize indicadores autorizados da operação.", allowed: permissoesUsuario.includes("visualizar_dashboard") },
    { label: "Ranking de satisfação", description: "Consulte resultados consolidados da equipe técnica.", allowed: permissoesUsuario.includes("visualizar_ranking_satisfacao") },
    { label: "Visualizar relatórios", description: "Consulte os relatórios dos seus chamados.", allowed: permissoesUsuario.includes("visualizar_relatorios") },
    { label: "Exportar dados", description: "Baixe relatórios em CSV, Excel ou PDF.", allowed: podeBaixarRelatorios },
    { label: "Visualizar patrimônio", description: "Consulte ativos, equipamentos e sua situação operacional.", allowed: permissoesUsuario.includes("visualizar_patrimonio") },
  ];

  function abrirSuporteUsuario() {
    const email = suporteEmail.trim();
    if (email && email.includes("@")) {
      window.location.href = `mailto:${email}?subject=${encodeURIComponent(`Suporte - ${sistemaNome}`)}`;
      return;
    }
    setModalChamadoAberto(true);
  }

  async function carregarNotificacoesUsuario() {
    setCarregandoNotificacoes(true);
    try {
      const lista = await listarNotificacoes();
      setNotificacoes(lista);
    } catch {
      // Notificações não devem bloquear o portal do usuário.
    } finally {
      setCarregandoNotificacoes(false);
    }
  }

  async function carregar() {
    const [me, lista, notificacoesLista] =
      await Promise.all([
        obterMeuPerfil(),
        listarChamadosDoUsuario(),
        listarNotificacoes().catch(() => []),
      ]);

    setPerfil(me);
    setChamados(lista);
    setNotificacoes(notificacoesLista);
    setUsuario(me);
  }

  function sincronizarChamadoUsuario(atualizado: ApiChamado) {
    setChamados((atuais) => atuais.map((item) => Number(item.id) === Number(atualizado.id) ? { ...item, ...atualizado } : item));
    setSelecionado((atual) => atual && Number(atual.id) === Number(atualizado.id) ? { ...atual, ...atualizado } : atual);
  }

  async function sincronizarChamadosUsuario() {
    setChamados(await listarChamadosDoUsuario());
    const selecionadoId = chamadoSelecionadoUsuarioRef.current;
    if (selecionadoId) buscarChamado(selecionadoId).then(sincronizarChamadoUsuario).catch(() => {});
  }

  function sincronizarFotoSolicitanteLocal(usuarioAtualizado: ApiUsuario) {
    const emailAtualizado = String(usuarioAtualizado.email || "").toLowerCase();
    const fotoAtualizada = usuarioAtualizado.foto_url || "";
    const atualizarChamado = (chamado: ApiChamado) => {
      const mesmoUsuario =
        Number(chamado.solicitante_id || chamado.usuario_id || 0) ===
        Number(usuarioAtualizado.id);
      const mesmoEmail =
        emailAtualizado &&
        [chamado.solicitante_email, chamado.email_solicitante].some(
          (email) => String(email || "").toLowerCase() === emailAtualizado,
        );
      if (!mesmoUsuario && !mesmoEmail) return chamado;
      return {
        ...chamado,
        solicitante_id:
          chamado.solicitante_id || chamado.usuario_id || usuarioAtualizado.id,
        solicitante_nome:
          usuarioAtualizado.nome ||
          chamado.solicitante_nome ||
          chamado.solicitante,
        solicitante_email:
          usuarioAtualizado.email ||
          chamado.solicitante_email ||
          chamado.email_solicitante,
        solicitante_foto_url: fotoAtualizada,
      };
    };

    setChamados((atuais) => atuais.map(atualizarChamado));
    setSelecionado((atual) => (atual ? atualizarChamado(atual) : atual));
  }

  useEffect(() => {
    carregar().catch((e) => toast.error(e.message));
    obterMinhasPermissoes()
      .then(async ({ permissions }) => {
        setPermissoesUsuario(permissions);
        if (permissions.includes("visualizar_dashboard"))
          setDashboardPermitido(await obterDashboard().catch(() => null));
      })
      .catch(() => setPermissoesUsuario([]));
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "smart_helpdesk_user_theme",
      temaEscuroUsuario ? "dark" : "light",
    );
  }, [temaEscuroUsuario]);

  useEffect(() => {
    const intervalo = window.setInterval(() => {
      carregarNotificacoesUsuario().catch(() => {});
    }, 30000);
    return () => window.clearInterval(intervalo);
  }, []);

  useEffect(() => {
    if (tab === "base" && !artigosBase.length) listarBaseConhecimento().then(setArtigosBase).catch(() => {});
  }, [tab, artigosBase.length]);

  useEffect(() => {
    if (modalChamadoAberto && !tipos.length) listarCatalogo("tipos").then(setTipos).catch(() => {});
  }, [modalChamadoAberto, tipos.length]);

  useEffect(() => { chamadoSelecionadoUsuarioRef.current = selecionado?.id || null; }, [selecionado?.id]);

  useEffect(() => {
    const sincronizarSeVisivel = () => { if (document.visibilityState === "visible") void sincronizarChamadosUsuario(); };
    const intervalo = window.setInterval(sincronizarSeVisivel, 60000);
    document.addEventListener("visibilitychange", sincronizarSeVisivel);
    window.addEventListener("focus", sincronizarSeVisivel);
    return () => { window.clearInterval(intervalo); document.removeEventListener("visibilitychange", sincronizarSeVisivel); window.removeEventListener("focus", sincronizarSeVisivel); };
  }, []);

  useEffect(() => {
    const q = `${novo.titulo} ${novo.descricao}`.trim();
    if (q.length > 4)
      listarBaseConhecimento(q)
        .then(setBase)
        .catch(() => {});
    else setBase([]);
  }, [novo.titulo, novo.descricao]);

  async function salvarPerfil(event: FormEvent) {
    event.preventDefault();
    if (!perfil) return;

    setSalvandoPerfil(true);
    try {
      const atual = await atualizarMeuPerfil({
        nome: perfil.nome,
        telefone: perfil.telefone || "",
        departamento: perfil.departamento || "",
        municipio: perfil.municipio || "",
        unidade: perfil.unidade || "",
        cargo: perfil.cargo || "",
      });
      setPerfil(atual);
      atualizarUsuarioLocal(atual);
      setUsuario(atual);
      toast.success("Perfil atualizado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao atualizar perfil.");
    } finally {
      setSalvandoPerfil(false);
    }
  }

  async function trocarFotoPerfil(event: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0];
    event.target.value = "";
    if (!arquivo) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(arquivo.type)) {
      toast.error("Envie uma imagem PNG, JPG ou WEBP.");
      return;
    }
    if (arquivo.size > 5 * 1024 * 1024) {
      toast.error("A imagem precisa ter até 5 MB.");
      return;
    }

    setEnviandoFoto(true);
    try {
      const atual = await atualizarMinhaFotoPerfil(arquivo);
      setPerfil(atual);
      atualizarUsuarioLocal(atual);
      setUsuario(atual);
      sincronizarFotoSolicitanteLocal(atual);
      toast.success("Foto do perfil atualizada.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao atualizar foto.");
    } finally {
      setEnviandoFoto(false);
    }
  }

  async function removerFotoPerfil() {
    setEnviandoFoto(true);
    try {
      const atual = await removerMinhaFotoPerfil();
      setPerfil(atual);
      atualizarUsuarioLocal(atual);
      setUsuario(atual);
      sincronizarFotoSolicitanteLocal(atual);
      toast.success("Foto removida.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao remover foto.");
    } finally {
      setEnviandoFoto(false);
    }
  }

  async function marcarTodasComoLidasUsuario() {
    try {
      await marcarNotificacoesLidas();
      setNotificacoes((lista) =>
        lista.map((item) => ({ ...item, lida: true })),
      );
      toast.success("Notificações marcadas como lidas.");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Erro ao marcar notificações.",
      );
    }
  }

  async function abrirNotificacaoUsuario(notificacao: Notificacao) {
    try {
      if (!notificacao.lida) {
        await marcarNotificacoesLidas(notificacao.id);
        setNotificacoes((lista) =>
          lista.map((item) =>
            item.id === notificacao.id ? { ...item, lida: true } : item,
          ),
        );
      }

      setNotificacoesAberta(false);
      const chamadoId = chamadoIdFromNotification(notificacao.link);
      if (chamadoId) {
        const avaliar = new URL(notificacao.link || "/", window.location.origin).searchParams.get("action") === "avaliar"
          || /chamado.*concluído|faça a avaliação/i.test(notificacao.titulo);
        if (avaliar) await abrirAvaliacao(chamadoId);
        else await abrirDetalhe(chamadoId);
      }
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Erro ao abrir notificação.",
      );
    }
  }

  async function abrirChamado(event: FormEvent) {
    event.preventDefault();
    setLoading(true);

    try {
      const criado = await criarChamado(novo);
      const developmentNature:Record<string,string>={"Bug":"bug","Melhoria":"melhoria","Automação":"automacao","Integração":"integracao","Dashboard / Relatório":"dashboard_relatorio","Novo Sistema":"novo_sistema"};
      const nature=developmentNature[novo.tipo_chamado];
      let complementoPendente = false;
      if(nature) {
        try {
          await criarDemandaDesenvolvimento({ticket_id:criado.id,nature,current_process:novo.processo_atual,problem:novo.problema||novo.descricao,expected_result:novo.resultado_esperado,frequency:novo.frequencia,people_involved:novo.pessoas?Number(novo.pessoas):undefined,current_time_minutes:novo.tempo_minutos?Number(novo.tempo_minutos):undefined,systems:novo.sistemas.split(",").map(v=>v.trim()).filter(Boolean),no_delivery_impact:novo.impacto_nao_execucao,expected_benefits:novo.beneficios.split(",").map(v=>v.trim()).filter(Boolean)});
        } catch (error) {
          complementoPendente = true;
          void reportFrontendError(error instanceof Error ? error : new Error("Falha ao registrar dados complementares da demanda"));
        }
      }
      setChamados((atuais) => [criado, ...atuais.filter((item) => Number(item.id) !== Number(criado.id))]);
      setNovo({ titulo: "", descricao: "", tipo_chamado: "Incidente", processo_atual:"", problema:"", resultado_esperado:"", frequencia:"", pessoas:"", tempo_minutos:"", sistemas:"", impacto_nao_execucao:"", beneficios:"" });
      setBase([]);
      setModalChamadoAberto(false);
      setTab("chamados");
      if (complementoPendente) toast.warning("Chamado criado. Os dados complementares serão revisados pela equipe de TI.");
      else toast.success("Chamado criado com sucesso.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar chamado.");
    } finally {
      setLoading(false);
    }
  }

  usePushNavigation(usuarioAtual.id, abrirDetalhe, abrirAvaliacao);
  async function abrirDetalhe(id: number) {
    const resumo = chamados.find((item) => Number(item.id) === Number(id));
    if (resumo) setSelecionado(resumo);
    try {
      const detalhe = await buscarChamado(id);
      setSelecionado((atual) => (Number(atual?.id) === Number(id) || (!resumo && atual === null)) ? detalhe : atual);
    } catch (e) {
      setSelecionado((atual) => Number(atual?.id) === Number(id) ? null : atual);
      toast.error(e instanceof Error ? e.message : "Erro ao buscar chamado.");
    }
  }

  async function abrirAvaliacao(id: number) {
    try {
      const detalhe = await buscarChamado(id);
      if (detalhe.avaliacao || detalhe.avaliacao_nota) {
        sincronizarChamadoUsuario(detalhe);
        toast.info("Este atendimento já foi avaliado.");
        return;
      }
      if (!detalhe.pode_avaliar) {
        toast.error("Este atendimento ainda não está disponível para avaliação.");
        return;
      }
      setSelecionado(null);
      setAvaliando(detalhe);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao abrir avaliação.");
    }
  }

  function executarPesquisa(event: FormEvent) {
    event.preventDefault();
    setTab("chamados");
    setNotificacoesAberta(false);
  }

  function limparPesquisa() {
    setBusca("");
  }

  async function baixarRelatorioDoMes(formato: "csv" | "excel" | "pdf") {
    setFormatoBaixando(formato);
    try {
      await baixarRelatorio(formato, {
        ...intervaloRelatorio,
        solicitante_me: true,
        status: statusRelatorio || undefined,
        tipo_chamado: tipoRelatorio || undefined,
        q: buscaRelatorio.trim() || undefined,
      });
      toast.success(`Relatório de ${mesRelatorio.split("-").reverse().join("/")} baixado com sucesso.`);
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Não foi possível baixar o relatório.");
    } finally {
      setFormatoBaixando(null);
    }
  }

  return {
    usuario,
    setUsuario,
    onLogout,
    configSistema,
    avisosSistema,
    tab,
    setTab,
    chamados,
    setChamados,
    perfil,
    setPerfil,
    tipos,
    setTipos,
    base,
    setBase,
    artigosBase,
    setArtigosBase,
    novo,
    setNovo,
    selecionado,
    setSelecionado,
    avaliando,
    setAvaliando,
    chamadoSelecionadoUsuarioRef,
    loading,
    setLoading,
    modalChamadoAberto,
    setModalChamadoAberto,
    busca,
    setBusca,
    notificacoes,
    setNotificacoes,
    notificacoesAberta,
    setNotificacoesAberta,
    carregandoNotificacoes,
    setCarregandoNotificacoes,
    mostrarPerfil,
    setMostrarPerfil,
    enviandoFoto,
    setEnviandoFoto,
    salvandoPerfil,
    setSalvandoPerfil,
    temaEscuroUsuario,
    setTemaEscuroUsuario,
    menuMaisUsuario,
    setMenuMaisUsuario,
    permissoesUsuario,
    setPermissoesUsuario,
    dashboardPermitido,
    setDashboardPermitido,
    mesRelatorio,
    setMesRelatorio,
    statusRelatorio,
    setStatusRelatorio,
    tipoRelatorio,
    setTipoRelatorio,
    buscaRelatorio,
    setBuscaRelatorio,
    formatoBaixando,
    setFormatoBaixando,
    usuarioAtual,
    sistemaNome,
    sistemaLogo1,
    suporteEmail,
    fotoPerfil,
    inicialPerfil,
    unread,
    intervaloRelatorio,
    statusDisponiveisRelatorio,
    tiposDisponiveisRelatorio,
    chamadosRelatorioFiltrados,
    resumoUsuario,
    chamadosFiltrados,
    chamadosRecentes,
    chamadosPorStatus,
    chamadosBoardUsuario,
    artigosSugeridos,
    podeBaixarRelatorios,
    podeAcessarRelatorios,
    usuarioTabs,
    activeTab,
    acessosVisiveis,
    abrirSuporteUsuario,
    carregarNotificacoesUsuario,
    carregar,
    sincronizarChamadoUsuario,
    sincronizarChamadosUsuario,
    sincronizarFotoSolicitanteLocal,
    salvarPerfil,
    trocarFotoPerfil,
    removerFotoPerfil,
    marcarTodasComoLidasUsuario,
    abrirNotificacaoUsuario,
    abrirChamado,
    abrirDetalhe,
    abrirAvaliacao,
    executarPesquisa,
    limparPesquisa,
    baixarRelatorioDoMes,
  };
}

export type PainelPortal = ReturnType<typeof useUserPortal>;
