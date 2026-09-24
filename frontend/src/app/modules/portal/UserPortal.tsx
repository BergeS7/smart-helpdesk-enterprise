/**
 * Responsabilidade: portal do solicitante: início, chamados, base de conhecimento, avisos e perfil.
 */
import { usePushNavigation } from "../../hooks/usePushNavigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ProfileCenter } from "../../components/ProfileCenter";
import { PushNotificationOnboarding } from "../../components/PushNotificationSettings";
import { ArrowRight, BarChart3, Bell, BookOpen, CheckCircle2, Download, FileText, Filter, KeyRound, LayoutDashboard, Phone, LockKeyhole, LogOut, MapPinned, Menu, Moon, Plus, RefreshCw, Search, ShieldCheck, Star, Sun, Ticket, Trophy, User, X } from "lucide-react";
import { Toaster, toast } from "sonner";
import { PerformanceRatingCard } from "../../components/PerformanceRatingCard";
import { TICKET_STATUS, canonicalTicketStatus, ticketStatusLabel } from "../../domain/ticketStatus";
import { PORTAL_ROUTES, useModuleRoute } from "../../routes/useModuleRoute";
import { Card } from "../../components/shared/FormPrimitives";
import { ModuleBoundary } from "../../components/ModuleBoundary";
import { atualizarChamado, atualizarMeuPerfil, atualizarMinhaFotoPerfil, atualizarUsuarioLocal, baixarRelatorio, buscarChamado, criarChamado, criarDemandaDesenvolvimento, enviarAvaliacaoPerformance, listarBaseConhecimento, listarCatalogo, listarChamadosDoUsuario, listarNotificacoes, marcarNotificacoesLidas, obterDashboard, obterMeuPerfil, obterMinhasPermissoes, reportFrontendError, removerMinhaFotoPerfil, type ApiAvisoSistema, type ApiChamado, type ApiUsuario, type ArtigoBase, type CatalogoItem, type DashboardResumo, type Notificacao, type ConfiguracoesSistema, type UsuarioLogado, type PermissionKey } from "../../services/api";
import { AvisosSistemaBanner, OperationalDashboard, PatrimonioMapPage, STATUS_COLUNAS, SatisfactionRankingPage, SystemThemeStyle, chamadoIdFromNotification, emailSuporteSistema, formatDate, logoSistema1, nomeSistema, normalizeStatus, notificacaoClass, notificacaoIcone, variaveisTemaSistema } from "../comum/appShared";
import type { UsuarioTab } from "../comum/appShared";
import { MobileMoreAction, MobileMoreSheet, MobileNavButton, UsuarioAvisosPanel, UsuarioBaseConhecimento, UsuarioChamadoLista, UsuarioKanbanLeitura, UsuarioNovoChamadoModal, UsuarioSidebarButton } from "./PortalComponents";
import { ChamadoDetalhe } from "../chamados/ChamadoDetalhe";

// Área do solicitante: abertura, consulta, comentários e acompanhamento.
export function UserPortal({
  usuario,
  setUsuario,
  onLogout,
  configSistema,
  avisosSistema,
}: {
  usuario: UsuarioLogado;
  setUsuario: (u: UsuarioLogado) => void;
  onLogout: () => void;
  configSistema: ConfiguracoesSistema;
  avisosSistema: ApiAvisoSistema[];
}) {
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

  const renderConteudo = () => {
    if (tab === "patrimonio" && permissoesUsuario.includes("visualizar_patrimonio")) {
      return <ModuleBoundary fallback={<div className="ds-empty-state"><RefreshCw className="ds-empty-state__icon animate-spin"/><strong>Carregando patrimônio…</strong></div>}><PatrimonioMapPage dark={temaEscuroUsuario}/></ModuleBoundary>;
    }
    if (tab === "ranking" && permissoesUsuario.includes("visualizar_ranking_satisfacao")) {
      return <ModuleBoundary fallback={<div className="ds-empty-state"><RefreshCw className="ds-empty-state__icon animate-spin"/><strong>Carregando ranking…</strong></div>}><SatisfactionRankingPage dark={temaEscuroUsuario}/></ModuleBoundary>;
    }
    if (tab === "acessos") {
      return <section className="space-y-4">
        <Card><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Transparência de acesso</p><h2 className="mt-1 text-xl font-black">O que seu perfil permite</h2><p className="mt-2 text-sm text-zinc-500">Seu perfil é <b className="capitalize text-zinc-700">{usuarioAtual.perfil || "usuário"}</b>. A equipe administradora pode conceder acessos adicionais quando necessário.</p></div><span className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-xs font-black text-blue-700"><ShieldCheck size={16}/>{acessosVisiveis.filter((item) => item.allowed).length} de {acessosVisiveis.length} recursos</span></div></Card>
        <div className="grid gap-3 md:grid-cols-2">{acessosVisiveis.map((item) => <article key={item.label} className={`rounded-2xl border p-4 ${item.allowed ? "border-emerald-200 bg-emerald-50/50" : "border-zinc-200 bg-zinc-50"}`}><div className="flex items-start gap-3"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${item.allowed ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-500"}`}>{item.allowed ? <CheckCircle2 size={18}/> : <LockKeyhole size={18}/>}</span><div><h3 className="text-sm font-black">{item.label}</h3><p className="mt-1 text-xs leading-5 text-zinc-500">{item.description}</p><span className={`mt-3 inline-block text-[10px] font-black uppercase tracking-wide ${item.allowed ? "text-emerald-700" : "text-zinc-500"}`}>{item.allowed ? "Acesso liberado" : "Acesso não concedido"}</span></div></div></article>)}</div>
        <Card><div className="flex items-center gap-3"><KeyRound className="text-blue-600" size={20}/><div><h3 className="text-sm font-black">Precisa de outro acesso?</h3><p className="mt-1 text-xs text-zinc-500">Entre em contato com o suporte ou com o administrador. As permissões são liberadas de acordo com sua função.</p></div></div></Card>
      </section>;
    }
    if (
      tab === "dashboard" &&
      permissoesUsuario.includes("visualizar_dashboard")
    ) {
      return dashboardPermitido ? (
        <ModuleBoundary fallback={<div className="ds-empty-state"><RefreshCw className="ds-empty-state__icon animate-spin"/><strong>Carregando dashboard…</strong></div>}><OperationalDashboard
          initial={dashboardPermitido}
          dark={temaEscuroUsuario}
          onNavigate={() => {}}
          onOpenTicket={(id) => abrirDetalhe(id)}
        /></ModuleBoundary>
      ) : (
        <Card>
          <p className="p-8 text-center text-sm text-zinc-500">
            Carregando dashboard...
          </p>
        </Card>
      );
    }
    if (
      tab === "relatorios" &&
      podeAcessarRelatorios
    ) {
      return (
        <section className="space-y-3">
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <header className="flex items-center gap-3 border-b border-zinc-100 px-5 py-4"><span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-blue-700"><Filter size={17}/></span><div><h2 className="text-base font-black">Filtros do relatório</h2><p className="text-xs text-zinc-500">Os filtros abaixo também serão aplicados ao arquivo baixado.</p></div></header>
            <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-4">
              <label><span className="mb-1.5 block text-[10px] font-black uppercase text-zinc-500">Mês</span><input type="month" required value={mesRelatorio} max={new Date().toISOString().slice(0, 7)} onChange={(event) => { if (event.target.value) setMesRelatorio(event.target.value); }} className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm font-bold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"/></label>
              <label><span className="mb-1.5 block text-[10px] font-black uppercase text-zinc-500">Status</span><select value={statusRelatorio} onChange={(event) => setStatusRelatorio(event.target.value)} className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-blue-400"><option value="">Todos</option>{statusDisponiveisRelatorio.map((status) => <option key={status} value={status}>{ticketStatusLabel(status)}</option>)}</select></label>
              <label><span className="mb-1.5 block text-[10px] font-black uppercase text-zinc-500">Tipo</span><select value={tipoRelatorio} onChange={(event) => setTipoRelatorio(event.target.value)} className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-blue-400"><option value="">Todos</option>{tiposDisponiveisRelatorio.map((tipo) => <option key={tipo}>{tipo}</option>)}</select></label>
              <label><span className="mb-1.5 block text-[10px] font-black uppercase text-zinc-500">Pesquisar</span><span className="flex h-10 items-center gap-2 rounded-lg border border-zinc-200 px-3 focus-within:border-blue-400"><Search size={15} className="text-zinc-400"/><input value={buscaRelatorio} onChange={(event) => setBuscaRelatorio(event.target.value)} placeholder="Número, título..." className="min-w-0 flex-1 bg-transparent text-sm outline-none"/></span></label>
            </div>
            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 bg-zinc-50/70 px-5 py-3"><span className="text-xs text-zinc-500">{new Date(`${intervaloRelatorio.data_inicio}T12:00:00`).toLocaleDateString("pt-BR")} — {new Date(`${intervaloRelatorio.data_fim}T12:00:00`).toLocaleDateString("pt-BR")}</span><button type="button" onClick={() => { setStatusRelatorio(""); setTipoRelatorio(""); setBuscaRelatorio(""); }} className="h-9 rounded-lg border border-zinc-200 bg-white px-4 text-xs font-black text-zinc-600 hover:bg-zinc-100">Limpar filtros</button></footer>
          </div>

          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4"><div><h3 className="text-base font-black">Resultado da pesquisa</h3><p className="mt-0.5 text-xs text-zinc-500">{chamadosRelatorioFiltrados.length} registro(s) encontrado(s)</p></div>{podeBaixarRelatorios ? <div className="flex flex-wrap gap-1.5">{(["csv", "excel", "pdf"] as const).map((formato) => <button key={formato} type="button" disabled={Boolean(formatoBaixando)} onClick={() => void baixarRelatorioDoMes(formato)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-black uppercase text-white hover:bg-blue-700 disabled:opacity-50">{formatoBaixando === formato ? <RefreshCw size={14} className="animate-spin"/> : <Download size={14}/>} {formato === "excel" ? "Excel" : formato.toUpperCase()}</button>)}</div> : <span className="text-xs font-bold text-amber-700">Sem permissão para exportar</span>}</header>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-xs"><thead className="bg-zinc-50 text-[10px] uppercase tracking-wide text-zinc-500"><tr><th className="px-4 py-3">Chamado</th><th className="px-4 py-3">Título</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Prioridade</th><th className="px-4 py-3">Responsável</th><th className="px-4 py-3">Abertura</th></tr></thead><tbody className="divide-y divide-zinc-100">{chamadosRelatorioFiltrados.slice(0, 10).map((chamado) => <tr key={chamado.id} className="hover:bg-blue-50/40"><td className="whitespace-nowrap px-4 py-3 font-black text-blue-700">{chamado.numero_chamado || `#${chamado.id}`}</td><td className="max-w-72 truncate px-4 py-3 font-bold">{chamado.titulo}</td><td className="px-4 py-3">{ticketStatusLabel(chamado.status)}</td><td className="px-4 py-3">{chamado.prioridade || "—"}</td><td className="px-4 py-3">{chamado.responsavel_nome || chamado.responsavel || "Não atribuído"}</td><td className="whitespace-nowrap px-4 py-3">{chamado.criado_em ? new Date(chamado.criado_em).toLocaleDateString("pt-BR") : "—"}</td></tr>)}{!chamadosRelatorioFiltrados.length && <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-zinc-500">Nenhum chamado corresponde aos filtros selecionados.</td></tr>}</tbody></table>
            </div>
            <footer className="flex items-center justify-between border-t border-zinc-100 px-5 py-3 text-xs text-zinc-500"><span>Exibindo {Math.min(10, chamadosRelatorioFiltrados.length)} de {chamadosRelatorioFiltrados.length}</span><span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-emerald-600"/>Somente seus chamados</span></footer>
          </div>
        </section>
      );
    }
    if (tab === "base") {
      return (
        <UsuarioBaseConhecimento
          artigos={artigosBase}
          busca={busca}
          setBusca={setBusca}
        />
      );
    }

    if (tab === "avisos") {
      return (
        <UsuarioAvisosPanel
          notificacoes={notificacoes}
          carregando={carregandoNotificacoes}
          onAbrir={abrirNotificacaoUsuario}
          onMarcarTodas={marcarTodasComoLidasUsuario}
          onAtualizar={carregarNotificacoesUsuario}
        />
      );
    }

    if (tab === "chamados") {
      return (
        <UsuarioChamadoLista
          chamados={chamadosFiltrados}
          onAbrir={abrirDetalhe}
          onAvaliar={abrirAvaliacao}
          busca={busca}
        />
      );
    }

    return (
      <div className="min-h-full lg:flex lg:h-full lg:flex-col lg:overflow-hidden">
        <section className="mb-4 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Central do solicitante</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-zinc-900">Olá, {String(usuarioAtual.nome || "Usuário").split(" ")[0]}</h2>
            <p className="mt-1 text-sm text-zinc-500">Acompanhe seus atendimentos e encontre soluções em um só lugar.</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-500">
            <span className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 shadow-sm"><span className="h-2 w-2 rounded-full bg-emerald-500"/>Central online</span>
            <span className="hidden rounded-xl border border-zinc-200 bg-white px-3 py-2 shadow-sm sm:inline-flex">{usuarioAtual.departamento || "Seu departamento"}</span>
          </div>
        </section>
        <section className="grid min-h-full flex-1 gap-4 lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_280px] 2xl:grid-cols-[minmax(0,1fr)_310px]">
          <div className="flex min-w-0 flex-col gap-4 lg:min-h-0">
            <UsuarioKanbanLeitura
              colunas={chamadosBoardUsuario}
              onAbrir={abrirDetalhe}
              onAvaliar={abrirAvaliacao}
              onVerTodos={() => setTab("chamados")}
            />
          </div>

          <aside className="flex min-h-0 flex-col gap-4">
            <div className="min-h-0 flex-1 overflow-hidden rounded-[20px] border border-zinc-200 bg-white p-4 shadow-sm shadow-slate-200/60">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="font-black text-zinc-900">Artigos sugeridos</h3>
                <BookOpen size={18} className="text-blue-600" />
              </div>

              <div className="divide-y divide-zinc-100">
                {artigosSugeridos.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => setTab("base")}
                    className="flex w-full items-center gap-3 rounded-2xl bg-zinc-50 p-4 text-left transition hover:bg-blue-50"
                  >
                    <FileText size={19} className="text-blue-600" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-black text-zinc-900">
                        Consultar base de conhecimento
                      </span>
                      <span className="mt-1 block text-xs font-medium text-zinc-500">
                        Soluções e tutoriais
                      </span>
                    </span>
                    <ArrowRight size={16} className="text-zinc-400" />
                  </button>
                ) : (
                  artigosSugeridos.map((artigo) => (
                    <button
                      key={artigo.id}
                      type="button"
                      onClick={() => setTab("base")}
                      className="flex w-full items-center gap-3 py-4 text-left transition hover:text-blue-700"
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700">
                        <FileText size={18} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 text-sm font-black text-zinc-900">
                          {artigo.titulo}
                        </span>
                        <span className="mt-1 block truncate text-xs font-medium text-zinc-500">
                          {artigo.categoria || "Solução"}
                        </span>
                      </span>
                      <ArrowRight
                        size={16}
                        className="shrink-0 text-zinc-400"
                      />
                    </button>
                  ))
                )}
              </div>

              <button
                type="button"
                onClick={() => setTab("base")}
                className="mt-4 flex items-center gap-2 text-sm font-black text-blue-700 transition hover:text-blue-900"
              >
                Ver todos os artigos <ArrowRight size={16} />
              </button>
            </div>
          </aside>
        </section>
      </div>
    );
  };

  return (
    <div
      className={`smart-helpdesk-config-theme h-screen overflow-hidden ${temaEscuroUsuario ? "usuario-theme-dark bg-[#0b1220] text-zinc-100" : "bg-[#f7f9fc] text-[#17212b]"}`}
      style={variaveisTemaSistema(configSistema)}
    >
      <SystemThemeStyle />
      <style>{`
        .usuario-theme-dark .bg-white { background-color: #111827 !important; }
        .usuario-theme-dark .bg-zinc-50,
        .usuario-theme-dark .bg-zinc-100 { background-color: #0f172a !important; }
        .usuario-theme-dark .border-zinc-100,
        .usuario-theme-dark .border-zinc-200 { border-color: #334155 !important; }
        .usuario-theme-dark .text-zinc-900,
        .usuario-theme-dark .text-zinc-800,
        .usuario-theme-dark .text-zinc-700 { color: #f8fafc !important; }
        .usuario-theme-dark .text-zinc-600,
        .usuario-theme-dark .text-zinc-500,
        .usuario-theme-dark .text-zinc-400 { color: #94a3b8 !important; }
        .usuario-theme-dark input,
        .usuario-theme-dark textarea,
        .usuario-theme-dark select { background-color: #0f172a !important; color: #e5e7eb !important; border-color: #334155 !important; }
        .usuario-theme-dark input::placeholder,
        .usuario-theme-dark textarea::placeholder { color: #64748b !important; }
        .usuario-theme-dark .shadow-sm,
        .usuario-theme-dark .shadow-md,
        .usuario-theme-dark .shadow-lg,
        .usuario-theme-dark .shadow-2xl { box-shadow: 0 18px 45px rgba(0,0,0,.22) !important; }
      `}</style>
      <Toaster position="top-right" richColors />
      <div className="fixed inset-x-0 top-3 z-50 mx-auto w-[min(920px,calc(100vw-32px))]">
        <AvisosSistemaBanner avisos={avisosSistema} dark={temaEscuroUsuario} />
      </div>
      <div className="flex h-screen overflow-hidden">
        <aside className="hidden w-14 shrink-0 flex-col border-r border-white/5 bg-gradient-to-b from-[#101c29] via-[#0d1925] to-[#08131d] text-white shadow-2xl lg:flex">
          <button type="button" onClick={() => setTab("home")} aria-label={`${sistemaNome} — Início`} title="Ir para Início" className="grid h-14 shrink-0 cursor-pointer place-items-center border-b border-white/8 focus-visible:outline-2 focus-visible:outline-blue-500">
            <img
              src={sistemaLogo1}
              alt={sistemaNome}
              className="h-11 w-12 object-contain"
              title={sistemaNome}
            />
          </button>

          <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-1.5 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <UsuarioSidebarButton
              compact
              ativo={tab === "home"}
              icon={<LayoutDashboard size={22} />}
              label="Início"
              onClick={() => {
                setTab("home");
                setNotificacoesAberta(false);
              }}
            />
            <UsuarioSidebarButton
              compact
              ativo={tab === "chamados"}
              icon={<Ticket size={22} />}
              label="Meus Chamados"
              onClick={() => {
                setTab("chamados");
                setNotificacoesAberta(false);
              }}
            />
            <UsuarioSidebarButton
              compact
              ativo={tab === "base"}
              icon={<BookOpen size={22} />}
              label="Base de Conhecimento"
              onClick={() => {
                setTab("base");
                setNotificacoesAberta(false);
              }}
            />
            {permissoesUsuario.includes("visualizar_ranking_satisfacao") && (
              <UsuarioSidebarButton
                compact
                ativo={tab === "ranking"}
                icon={<Trophy size={22} />}
                label="Ranking de satisfação"
                onClick={() => setTab("ranking")}
              />
            )}
            {permissoesUsuario.includes("visualizar_dashboard") && (
              <UsuarioSidebarButton
                compact
                ativo={tab === "dashboard"}
                icon={<BarChart3 size={22} />}
                label="Dashboard"
                onClick={() => setTab("dashboard")}
              />
            )}
            {permissoesUsuario.includes("visualizar_patrimonio") && (
              <UsuarioSidebarButton
                compact
                ativo={tab === "patrimonio"}
                icon={<MapPinned size={22} />}
                label="Patrimônio"
                onClick={() => setTab("patrimonio")}
              />
            )}
            {podeAcessarRelatorios && (
              <UsuarioSidebarButton
                compact
                ativo={tab === "relatorios"}
                icon={<Download size={22} />}
                label="Relatórios"
                onClick={() => setTab("relatorios")}
              />
            )}

            <div className="mx-1 my-2 border-t border-white/10" />

            <UsuarioSidebarButton
              compact
              ativo={tab === "acessos"}
              icon={<ShieldCheck size={22} />}
              label="Meus acessos"
              onClick={() => setTab("acessos")}
            />

            <UsuarioSidebarButton
              compact
              icon={temaEscuroUsuario ? <Sun size={22} /> : <Moon size={22} />}
              label={temaEscuroUsuario ? "Tema claro" : "Tema escuro"}
              title="Alternar tema"
              onClick={() => setTemaEscuroUsuario((valor) => !valor)}
            />
          </nav>

          <div className="space-y-1 border-t border-white/8 px-1.5 py-2">
            <button type="button" onClick={()=>setMostrarPerfil(true)} className="grid h-10 w-full place-items-center rounded-xl transition hover:bg-white/10" title={`${usuarioAtual.nome} — ${usuarioAtual.departamento||"Solicitante"}`} aria-label="Abrir meu perfil"><span className="grid h-8 w-8 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-sky-400 text-xs font-black">{fotoPerfil?<img src={fotoPerfil} alt={usuarioAtual.nome} className="h-full w-full object-cover"/>:inicialPerfil}</span></button>
            <button
              type="button"
              onClick={onLogout}
              className="grid h-10 w-full place-items-center rounded-xl text-white/65 transition hover:bg-red-500/15 hover:text-red-100"
              title="Sair do site"
              aria-label="Sair do site"
            >
              <LogOut size={19} />
            </button>
            <button
              type="button"
              onClick={() => {
                abrirSuporteUsuario();
                setNotificacoesAberta(false);
              }}
              className="grid h-10 w-full place-items-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-900/30 transition hover:bg-blue-500"
              title={`Falar com o suporte: ${suporteEmail}`}
              aria-label={`Falar com o suporte: ${suporteEmail}`}
            >
              <Phone size={19} />
            </button>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/95 shadow-sm backdrop-blur">
            <div className="relative flex h-14 items-center gap-3 px-4 lg:px-5">
              <div className="flex min-w-0 items-center gap-3 lg:hidden">
                <button type="button" onClick={() => setTab("home")} aria-label={`${sistemaNome} — Início`} title="Ir para Início" className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200 focus-visible:outline-2 focus-visible:outline-blue-500">
                  <img
                    src={sistemaLogo1}
                    alt={sistemaNome}
                    className="h-full w-full object-contain"
                  />
                </button>
                <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                  <h1 className="truncate text-base font-black tracking-tight">
                    <button type="button" onClick={() => setTab("home")} title="Ir para Início" className="max-w-full cursor-pointer truncate text-left focus-visible:outline-2 focus-visible:outline-blue-500">{sistemaNome}</button>
                  </h1>
                  <p className="text-xs text-zinc-500">{activeTab.title}</p>
                </div>
              </div>

              <div className="pointer-events-none absolute left-1/2 hidden -translate-x-1/2 lg:block"><p className="text-sm font-black text-zinc-800">{activeTab.title}</p></div>
              <form
                onSubmit={executarPesquisa}
                className="hidden min-w-[240px] max-w-[430px] flex-1 md:flex lg:max-w-[360px] xl:max-w-[430px]"
              >
                <div className="ds-search flex h-10 w-full items-center overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm shadow-slate-200/50 transition focus-within:border-blue-300 focus-within:ring-4 focus-within:ring-blue-500/10">
                  <button
                    type="submit"
                    className="grid h-full w-14 shrink-0 place-items-center text-zinc-400 transition hover:text-blue-600"
                    title="Pesquisar"
                    aria-label="Pesquisar chamados"
                  >
                    <Search size={18} />
                  </button>
                  <input
                    aria-label="Pesquisar chamados"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Pesquisar chamados..."
                    className="h-full min-w-0 flex-1 border-0 bg-transparent pr-2 text-sm font-semibold text-zinc-800 outline-none placeholder:font-medium placeholder:text-zinc-400"
                  />
                  {busca && (
                    <button
                      type="button"
                      onClick={limparPesquisa}
                      className="mr-2 grid h-8 w-8 shrink-0 place-items-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
                      title="Limpar pesquisa"
                      aria-label="Limpar pesquisa"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>
              </form>

              <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setModalChamadoAberto(true)}
                  className="hidden h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-black text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700 sm:flex"
                  title="Abrir chamado"
                >
                  <Plus size={17} />
                  Abrir Chamado
                </button>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setNotificacoesAberta((valor) => !valor);
                      setMostrarPerfil(false);
                    }}
                    className={`relative grid h-10 w-10 place-items-center rounded-xl transition ${notificacoesAberta ? "bg-blue-50 text-blue-700" : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"}`}
                    title="Notificações"
                    aria-label="Abrir notificações"
                  >
                    <Bell size={19} />
                    {unread > 0 && (
                      <span className="absolute right-2 top-2 grid min-h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-black leading-none text-white">
                        {unread}
                      </span>
                    )}
                  </button>

                  {notificacoesAberta && (
                    <button
                      type="button"
                      aria-label="Fechar notificações"
                      className="fixed inset-0 z-[69] cursor-default bg-slate-950/10 sm:z-40"
                      onClick={() => setNotificacoesAberta(false)}
                    />
                  )}

                  {notificacoesAberta && (
                    <div className="fixed inset-x-3 bottom-[calc(88px+env(safe-area-inset-bottom))] top-[72px] z-[70] flex w-auto flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl shadow-slate-900/20 sm:absolute sm:inset-auto sm:right-0 sm:top-14 sm:z-50 sm:block sm:w-[360px]">
                      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-100 p-3 sm:p-4">
                        <div>
                          <p className="font-black text-zinc-900">
                            Notificações
                          </p>
                          <p className="text-xs text-zinc-500">
                            {unread} não lida(s)
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={marcarTodasComoLidasUsuario}
                          disabled={unread === 0}
                          className="shrink-0 whitespace-nowrap rounded-lg border border-zinc-200 px-3 py-2 text-xs font-black text-zinc-600 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Marcar lidas
                        </button>
                      </div>

                      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 sm:max-h-[430px]">
                        {carregandoNotificacoes &&
                          notificacoes.length === 0 && (
                            <div className="p-6 text-center text-sm text-zinc-500">
                              Carregando notificações...
                            </div>
                          )}
                        {!carregandoNotificacoes &&
                          notificacoes.length === 0 && (
                            <div className="p-6 text-center text-sm text-zinc-500">
                              Nenhuma notificação por enquanto.
                            </div>
                          )}
                        {notificacoes.map((notificacao) => {
                          const chamadoId = chamadoIdFromNotification(
                            notificacao.link,
                          );
                          return (
                            <button
                              type="button"
                              key={notificacao.id}
                              onClick={() =>
                                abrirNotificacaoUsuario(notificacao)
                              }
                              className={`mb-2 flex w-full gap-2.5 rounded-xl border p-3 text-left transition sm:gap-3 ${notificacao.lida ? "border-zinc-100 bg-white hover:bg-zinc-50" : "border-blue-100 bg-blue-50 hover:bg-blue-100"}`}
                            >
                              <span
                                className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border ${notificacaoClass(notificacao.tipo)}`}
                              >
                                {notificacaoIcone(notificacao.tipo)}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="flex items-start justify-between gap-2">
                                  <span className="line-clamp-1 text-sm font-black text-zinc-900">
                                    {notificacao.titulo}
                                  </span>
                                  {!notificacao.lida && (
                                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                                  )}
                                </span>
                                <span className="mt-1 block line-clamp-2 text-xs leading-5 text-zinc-500">
                                  {notificacao.mensagem}
                                </span>
                                <span className="mt-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[11px] font-bold text-zinc-400">
                                  <span>
                                    {formatDate(notificacao.criado_em)}
                                  </span>
                                  {chamadoId && (
                                    <span>Chamado #{chamadoId}</span>
                                  )}
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setMostrarPerfil(true);
                    setNotificacoesAberta(false);
                  }}
                  className="relative grid h-10 w-10 place-items-center rounded-full border border-zinc-200 bg-white shadow-sm transition hover:ring-4 hover:ring-blue-500/10"
                  title="Meu perfil"
                  aria-label="Abrir meu perfil"
                >
                  {fotoPerfil ? (
                    <img
                      src={fotoPerfil}
                      alt={usuarioAtual.nome}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="grid h-full w-full place-items-center overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-sky-400 text-base font-black text-white">
                      {inicialPerfil}
                    </span>
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-[3px] border-white bg-emerald-500 shadow-sm" title="Online" aria-label="Status online" />
                </button>
              </div>
            </div>
          </header>

          <div className="border-b border-zinc-200 bg-white px-4 py-3 md:hidden">
            <form
              onSubmit={executarPesquisa}
              className="ds-search flex h-10 items-center overflow-hidden rounded-full border border-zinc-200 bg-white shadow-sm"
            >
              <button
                type="submit"
                className="grid h-full w-11 place-items-center text-zinc-400"
              >
                <Search size={17} />
              </button>
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Pesquisar chamado..."
                className="h-full min-w-0 flex-1 border-0 bg-transparent text-sm font-semibold outline-none"
              />
              {busca && (
                <button
                  type="button"
                  onClick={limparPesquisa}
                  className="grid h-8 w-8 place-items-center text-zinc-400"
                >
                  <X size={15} />
                </button>
              )}
            </form>
          </div>

          <main className={`h-[calc(100vh-56px)] overflow-auto px-4 pb-24 pt-4 lg:px-5 lg:pb-5 lg:pt-4 ${["dashboard", "ranking", "acessos", "patrimonio", "relatorios"].includes(tab) ? "lg:overflow-auto" : "lg:overflow-hidden"}`}>
            {renderConteudo()}
          </main>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 px-2 pb-[calc(env(safe-area-inset-bottom)+6px)] pt-2 shadow-[0_-10px_28px_rgba(15,23,42,0.12)] backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 items-end gap-1">
          <MobileNavButton
            icon={<LayoutDashboard size={21} />}
            label="Início"
            active={tab === "home"}
            onClick={() => {
              setTab("home");
              setMenuMaisUsuario(false);
              setNotificacoesAberta(false);
            }}
          />
          <MobileNavButton
            icon={<Ticket size={21} />}
            label="Chamados"
            active={tab === "chamados"}
            onClick={() => {
              setTab("chamados");
              setMenuMaisUsuario(false);
              setNotificacoesAberta(false);
            }}
          />
          <button
            type="button"
            onClick={() => {
              setModalChamadoAberto(true);
              setMenuMaisUsuario(false);
              setNotificacoesAberta(false);
            }}
            className="-mt-7 flex flex-col items-center gap-1 text-[11px] font-black text-blue-700"
            aria-label="Abrir chamado"
          >
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-500/30 ring-4 ring-white">
              <Plus size={26} />
            </span>
            <span>Abrir</span>
          </button>
          <MobileNavButton
            icon={<BookOpen size={21} />}
            label="Base"
            active={tab === "base"}
            onClick={() => {
              setTab("base");
              setMenuMaisUsuario(false);
              setNotificacoesAberta(false);
            }}
          />
          <MobileNavButton
            icon={<Menu size={21} />}
            label="Mais"
            active={menuMaisUsuario || ["avisos", "acessos", "ranking", "dashboard", "patrimonio", "relatorios"].includes(tab)}
            onClick={() => {
              setMenuMaisUsuario(true);
              setNotificacoesAberta(false);
            }}
            badge={unread > 0 ? String(unread) : undefined}
          />
        </div>
      </nav>

      {menuMaisUsuario && (
        <MobileMoreSheet
          title="Mais opções"
          onClose={() => setMenuMaisUsuario(false)}
        >
          <MobileMoreAction
            icon={<User size={18} />}
            label="Perfil"
            onClick={() => {
              setMostrarPerfil(true);
              setMenuMaisUsuario(false);
            }}
          />
          <MobileMoreAction
            icon={<Bell size={18} />}
            label="Notificações"
            badge={unread > 0 ? `${unread} nova(s)` : undefined}
            onClick={() => {
              setTab("avisos");
              setMenuMaisUsuario(false);
            }}
          />
          <MobileMoreAction
            icon={<ShieldCheck size={18} />}
            label="Meus acessos"
            onClick={() => { setTab("acessos"); setMenuMaisUsuario(false); }}
          />
          {permissoesUsuario.includes("visualizar_ranking_satisfacao") && <MobileMoreAction
            icon={<Trophy size={18} />}
            label="Ranking de satisfação"
            onClick={() => { setTab("ranking"); setMenuMaisUsuario(false); }}
          />}
          {permissoesUsuario.includes("visualizar_patrimonio") && <MobileMoreAction
            icon={<MapPinned size={18} />}
            label="Patrimônio"
            onClick={() => { setTab("patrimonio"); setMenuMaisUsuario(false); }}
          />}
          <MobileMoreAction
            icon={temaEscuroUsuario ? <Sun size={18} /> : <Moon size={18} />}
            label={temaEscuroUsuario ? "Tema claro" : "Tema escuro"}
            onClick={() => setTemaEscuroUsuario((valor) => !valor)}
          />
          <MobileMoreAction
            icon={<Phone size={18} />}
            label="Suporte"
            badge={suporteEmail}
            onClick={() => {
              abrirSuporteUsuario();
              setMenuMaisUsuario(false);
            }}
          />
          <MobileMoreAction
            icon={<LogOut size={18} />}
            label="Sair do site"
            danger
            onClick={() => {
              setMenuMaisUsuario(false);
              onLogout();
            }}
          />
        </MobileMoreSheet>
      )}

      {mostrarPerfil && perfil && (
        <ProfileCenter
          profile={perfil}
          draft={perfil}
          setDraft={(draft) => setPerfil({ ...perfil, ...draft })}
          photo={fotoPerfil}
          initials={inicialPerfil}
          uploading={enviandoFoto}
          saving={salvandoPerfil}
          onSave={salvarPerfil}
          onPhoto={trocarFotoPerfil}
          onRemovePhoto={removerFotoPerfil}
          onClose={() => setMostrarPerfil(false)}
          onLogout={onLogout}
        />
      )}

      <PushNotificationOnboarding userId={usuario.id} />

      {modalChamadoAberto && (
        <UsuarioNovoChamadoModal
          perfil={usuarioAtual}
          tipos={tipos}
          novo={novo}
          setNovo={setNovo}
          base={base}
          loading={loading}
          onClose={() => setModalChamadoAberto(false)}
          onSubmit={abrirChamado}
        />
      )}

      {selecionado && (
        <ChamadoDetalhe
          chamado={selecionado}
          usuario={usuarioAtual}
          onClose={() => setSelecionado(null)}
          onRefresh={async () => {
            const atualizado = await buscarChamado(selecionado.id);
            sincronizarChamadoUsuario(atualizado);
          }}
        />
      )}
      {avaliando && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/55 p-2 backdrop-blur-sm sm:p-4" role="dialog" aria-modal="true" aria-labelledby="avaliacao-title" onMouseDown={() => setAvaliando(null)}>
          <div className={`flex max-h-[calc(100dvh-16px)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border shadow-2xl sm:max-h-[calc(100dvh-32px)] ${temaEscuroUsuario ? "border-white/10 bg-[#111827] text-white" : "border-zinc-200 bg-white text-zinc-900"}`} onMouseDown={(event) => event.stopPropagation()}>
            <header className={`flex shrink-0 items-start justify-between gap-4 border-b p-4 sm:p-5 ${temaEscuroUsuario ? "border-white/10" : "border-zinc-100"}`}>
              <div><span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700"><Star size={14} fill="currentColor" />Sua opinião importa</span><h2 id="avaliacao-title" className="mt-3 text-xl font-black">Avalie este atendimento</h2><p className={`mt-1 text-sm ${temaEscuroUsuario ? "text-white/55" : "text-zinc-500"}`}>{avaliando.numero_chamado || `#${avaliando.id}`} · {avaliando.titulo}</p></div>
              <button type="button" onClick={() => setAvaliando(null)} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl transition hover:bg-zinc-500/10" aria-label="Fechar avaliação"><X size={19} /></button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-5"><PerformanceRatingCard chamado={avaliando} onSubmit={async (dados) => {
              try {
                await enviarAvaliacaoPerformance(avaliando.id, dados);
              } catch (reason) {
                const message = reason instanceof Error ? reason.message : "";
                if (!message.toLowerCase().includes("já foi avaliado")) throw reason;
              }
              setAvaliando(null);
              window.setTimeout(() => toast.success("Avaliação enviada com sucesso!"), 0);
              void sincronizarChamadosUsuario();
            }} /></div>
          </div>
        </div>
      )}
    </div>
  );
}
