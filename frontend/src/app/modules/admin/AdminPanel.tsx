/**
 * Responsabilidade: painel da equipe: fila, kanban, chamados, relatórios, configurações e demais módulos.
 */
import { usePushNavigation } from "../../hooks/usePushNavigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { GlobalCommandPalette } from "../../components/GlobalCommandPalette";
import { ProfileCenter } from "../../components/ProfileCenter";
import { PushNotificationOnboarding } from "../../components/PushNotificationSettings";
import { PermissionDialog } from "../../components/PermissionDialog";
import { Activity, AlertTriangle, BarChart3, Bell, BookOpen, BrainCircuit, Building2, Camera, Clock3, Download, Filter, History, Headphones, LayoutDashboard, ListChecks, LogOut, MapPinned, Menu, MessageSquare, Moon, RefreshCw, Search, Settings, ShieldCheck, Star, Sun, Ticket, Trash2, Upload, User, UserCheck, UserCog, Users, X } from "lucide-react";
import { Toaster, toast } from "sonner";
import { municipiosMaranhao } from "../../data/municipiosMaranhao";
import { TICKET_STATUS, canonicalTicketStatus, ticketStatusLabel } from "../../domain/ticketStatus";
import { useModuleRoute } from "../../routes/useModuleRoute";
import { ADMIN_ROUTES, buildAdminNavigation } from "../../navigation/adminNavigation";
import { WorkspaceNavigation } from "../../components/WorkspaceNavigation";
import { TicketWorkspaceToolbar } from "../../components/TicketWorkspaceToolbar";
import { Badge, Button, Card, Field, Input, Modal, Select, Textarea } from "../../components/shared/FormPrimitives";
import { UserAssetsField } from "../../components/patrimonio/UserAssetsField";
import { ModuleBoundary } from "../../components/ModuleBoundary";
import { aprovarUsuario, assumirChamado, atualizarChamado, atualizarMeuPerfil, atualizarUsuarioAdmin, atualizarMinhaFotoPerfil, atualizarUsuarioLocal, atualizarAvisoSistema, baixarRelatorio, buscarChamado, criarArtigoBase, criarAvisoSistema, criarCatalogo, criarRespostaRapida, criarTeam, excluirAvisoSistema, excluirUsuarioAdmin, listarAvisosSistemaAdmin, listarAvisosSistemaAtivos, listarBaseConhecimento, listarCatalogo, listarFiltrosSalvos, listarChamados, listarNotificacoes, listarRespostasRapidas, listarTeams, listarUsuariosAdmin, marcarNotificacoesLidas, obterDashboard, obterMinhasPermissoes, obterConfiguracoesSistema, salvarConfiguracoesSistema, atualizarLogoSistema1, salvarFiltroChamados, removerMinhaFotoPerfil, rejeitarUsuario, type ApiAvisoSistema, type ApiChamado, type ApiUsuario, type ArtigoBase, type CatalogoItem, type DashboardResumo, type FiltrosChamados, type Notificacao, type RespostaRapida, type FiltroSalvo, type ConfiguracoesSistema, type ApiTeam, type UsuarioLogado, type PermissionKey } from "../../services/api";
import { AvisosSistemaBanner, CONFIG_SISTEMA_PADRAO, ChamadosListModule, DevelopmentWorkspace, FilaChamadosView, IndicatorsWorkspace, KanbanWorkspace, MySatisfactionPage, OperationalDashboard, PERFIS, PRIORIDADES, PatrimonioMapPage, ReportsWorkspace, STATUS_OPCOES, SatisfactionAnalyticsPage, SettingsWorkspace, SystemDiagnosticsPage, SystemThemeStyle, UsersModule, UsuarioSistemaAvatar, chamadoIdFromNotification, corPrincipalSistema, emailSuporteSistema, formatDate, isAdminApp, isDevApp, isEquipeApp, logoSistema1, nomeSistema, normalizarPerfilApp, normalizeStatus, notificacaoClass, notificacaoIcone, perfilLabel, ticketFiltersFromUrl, variaveisTemaSistema } from "../comum/appShared";
import type { AdminTab } from "../comum/appShared";
import { MobileMoreAction, MobileMoreSheet, MobileNavButton } from "../portal/PortalComponents";
import { CarteiraEquipeView, HistoricoEquipeView } from "./EquipeViews";
import { ChamadoDetalhe } from "../chamados/ChamadoDetalhe";

// Shell autenticado da equipe, responsável por navegação e dados operacionais.
export function AdminPanel({
  usuario,
  setUsuario,
  onLogout,
  configSistemaInicial,
  onConfigSistemaChange,
  avisosSistema,
  onAvisosSistemaChange,
}: {
  usuario: UsuarioLogado;
  setUsuario: (u: UsuarioLogado) => void;
  onLogout: () => void;
  configSistemaInicial: ConfiguracoesSistema;
  onConfigSistemaChange: (config: ConfiguracoesSistema) => void;
  avisosSistema: ApiAvisoSistema[];
  onAvisosSistemaChange: (avisos: ApiAvisoSistema[]) => void;
}) {
  const [tab, setTab] = useModuleRoute<AdminTab>(ADMIN_ROUTES, "fila");
  const [dark, setDark] = useState(
    () => localStorage.getItem("smart_helpdesk_admin_theme") === "dark",
  );
  const [modoCompacto, setModoCompacto] = useState(
    () => localStorage.getItem("smart_helpdesk_compact_mode_v2") !== "off",
  );
  const [dashboard, setDashboard] = useState<DashboardResumo | null>(null);
  const [chamados, setChamados] = useState<ApiChamado[]>([]);
  const [filaChamados, setFilaChamados] = useState<ApiChamado[]>([]);
  const [carteiraEquipe, setCarteiraEquipe] = useState<ApiChamado[]>([]);
  const [historicoEquipe, setHistoricoEquipe] = useState<ApiChamado[]>([]);
  const [chamadosRelatorio, setChamadosRelatorio] = useState<ApiChamado[]>([]);
  const [usuarios, setUsuarios] = useState<ApiUsuario[]>([]);
  const [teams, setTeams] = useState<ApiTeam[]>([]);
  const [novaTeam, setNovaTeam] = useState({
    name: "",
    description: "",
    manager_id: "",
    color: "#2563eb",
    distribution_mode: "manual" as ApiTeam["distribution_mode"],
  });
  const [departamentos, setDepartamentos] = useState<CatalogoItem[]>([]);
  const [tipos, setTipos] = useState<CatalogoItem[]>([]);
  const [base, setBase] = useState<ArtigoBase[]>([]);
  const [baseCarregando, setBaseCarregando] = useState(false);
  const [erroBase, setErroBase] = useState("");
  const [respostasRapidas, setRespostasRapidas] = useState<RespostaRapida[]>(
    [],
  );
  const [avisosAdmin, setAvisosAdmin] = useState<ApiAvisoSistema[]>([]);
  const [filtrosSalvos, setFiltrosSalvos] = useState<FiltroSalvo[]>([]);
  const [novoFiltroNome, setNovoFiltroNome] = useState("");
  const [novaResposta, setNovaResposta] = useState({
    titulo: "",
    mensagem: "",
    categoria: "Atendimento",
  });
  const [novoAviso, setNovoAviso] = useState({
    titulo: "Manutenção programada",
    mensagem: "O sistema passará por manutenção em breve.",
    tipo: "warning",
    ativo: true,
    inicio_em: "",
    fim_em: "",
  });
  const [configSistema, setConfigSistema] = useState<ConfiguracoesSistema>({
    ...CONFIG_SISTEMA_PADRAO,
    ...configSistemaInicial,
  });
  const [enviandoLogoSistema, setEnviandoLogoSistema] = useState<
    "" | "logo1" | "logo2"
  >("");
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [notificacoesAberta, setNotificacoesAberta] = useState(false);
  const [carregandoNotificacoes, setCarregandoNotificacoes] = useState(false);
  const [filtros, setFiltros] = useState<FiltrosChamados>(ticketFiltersFromUrl);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [selecionado, setSelecionado] = useState<ApiChamado | null>(null);
  const [detalheSomenteLeitura, setDetalheSomenteLeitura] = useState(false);
  const [dragId, setDragId] = useState<number | null>(null);
  const [usuarioEditando, setUsuarioEditando] = useState<ApiUsuario | null>(
    null,
  );
  const [usuarioForm, setUsuarioForm] = useState({
    nome: "",
    email: "",
    perfil: "usuario",
    status: "ativo",
    telefone: "",
    departamento: "",
    municipio: "",
    unidade: "",
    cargo: "",
    senha: "",
  });
  const [salvandoUsuarioAdmin, setSalvandoUsuarioAdmin] = useState(false);
  const [novoCatalogo, setNovoCatalogo] = useState({
    nome: "",
    descricao: "",
    tipo: "departamentos" as "departamentos" | "tipos",
  });
  const [novoArtigo, setNovoArtigo] = useState({
    titulo: "",
    categoria: "",
    palavras_chave: "",
    conteudo: "",
  });
  const [mostrarPerfil, setMostrarPerfil] = useState(false);
  const [menuMaisAdmin, setMenuMaisAdmin] = useState(false);
  const [buscaGlobalAberta, setBuscaGlobalAberta] = useState(false);
  const atalhoG = useRef(false);
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [perfilForm, setPerfilForm] = useState({
    nome: usuario.nome || "",
    telefone: usuario.telefone || "",
    departamento: usuario.departamento || "",
    cargo: usuario.cargo || "",
  });
  const [permissoesAtuais, setPermissoesAtuais] = useState<PermissionKey[]>([]);
  const [permissoesCarregadas, setPermissoesCarregadas] = useState(false);
  const [usuarioPermissoes, setUsuarioPermissoes] = useState<ApiUsuario | null>(
    null,
  );
  const sincronizandoTelaRef = useRef(false);
  const abaPendenteRef = useRef<AdminTab | null>(null);

  const perfilAtual = normalizarPerfilApp(usuario.perfil);
  const desenvolvedor = isDevApp(usuario.perfil);
  const administrador = isAdminApp(usuario.perfil);
  const tecnico = perfilAtual === "tecnico";

  const equipe = useMemo(
    () => usuarios.filter((u) => isEquipeApp(u.perfil) && u.status === "ativo"),
    [usuarios],
  );
  const pendentes = useMemo(
    () => usuarios.filter((u) => u.status === "pendente"),
    [usuarios],
  );
  const dadosRelatorio = useMemo(() => {
    const registros = [...chamadosRelatorio, ...historicoEquipe];
    return Array.from(
      new Map(registros.map((chamado) => [chamado.id, chamado])).values(),
    );
  }, [chamadosRelatorio, historicoEquipe]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const editing = ["INPUT", "TEXTAREA", "SELECT"].includes(
        (event.target as HTMLElement)?.tagName,
      );
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setBuscaGlobalAberta(true);
        return;
      }
      if (event.key === "Escape") {
        setBuscaGlobalAberta(false);
        setMostrarFiltros(false);
        return;
      }
      if (editing) return;
      const key = event.key.toLowerCase();
      if (key === "g") {
        atalhoG.current = true;
        window.setTimeout(() => {
          atalhoG.current = false;
        }, 1200);
        return;
      }
      if (atalhoG.current && key === "d") {
        setTab("dashboard");
        atalhoG.current = false;
      } else if (atalhoG.current && key === "f") {
        setTab("fila");
        atalhoG.current = false;
      } else if (key === "n") setTab("chamados");
      else if (key === "/") {
        event.preventDefault();
        setMostrarFiltros(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    setPerfilForm({
      nome: usuario.nome || "",
      telefone: usuario.telefone || "",
      departamento: usuario.departamento || "",
      cargo: usuario.cargo || "",
    });
  }, [usuario.nome, usuario.telefone, usuario.departamento, usuario.cargo]);

  useEffect(() => {
    setConfigSistema((atual) => ({
      ...CONFIG_SISTEMA_PADRAO,
      ...atual,
      ...configSistemaInicial,
    }));
  }, [configSistemaInicial]);

  function sincronizarUsuario(atualizado: UsuarioLogado | ApiUsuario) {
    atualizarUsuarioLocal(atualizado);
    setUsuario(atualizado);
  }

  function sincronizarChamadoEquipe(atualizado: ApiChamado) {
    const substituir = (lista: ApiChamado[]) => lista.map((item) => Number(item.id) === Number(atualizado.id) ? { ...item, ...atualizado } : item);
    setChamados(substituir);
    setFilaChamados(substituir);
    setCarteiraEquipe(substituir);
    setHistoricoEquipe(substituir);
    setChamadosRelatorio(substituir);
    setSelecionado((atual) => atual && Number(atual.id) === Number(atualizado.id) ? { ...atual, ...atualizado } : atual);
  }

  async function carregar(aba: AdminTab = tab, filtrosAtuais: FiltrosChamados = filtros) {
    if (sincronizandoTelaRef.current) { abaPendenteRef.current = aba; return; }
    sincronizandoTelaRef.current = true;
    try {
      if (aba === "dashboard") {
        setDashboard(await obterDashboard().catch(() => null));
        return;
      }
      if (aba === "fila") {
        const [fila, carteira, users, teamsLista, respostas] = await Promise.all([
          listarChamados({ ...filtrosAtuais, fila: true }),
          administrador ? listarChamados(filtrosAtuais) : Promise.resolve([]),
          listarUsuariosAdmin().catch(() => []),
          listarTeams().catch(() => []),
          listarRespostasRapidas().catch(() => []),
        ]);
        setFilaChamados(fila); setCarteiraEquipe(carteira); setUsuarios(users); setTeams(teamsLista); setRespostasRapidas(respostas);
        return;
      }
      if (["kanban", "chamados"].includes(aba)) {
        const [lista, salvos] = await Promise.all([
          listarChamados({ ...filtrosAtuais, meus: true }),
          listarFiltrosSalvos().catch(() => []),
        ]);
        setChamados(lista); setFiltrosSalvos(salvos);
        return;
      }
      if (aba === "historico") { setHistoricoEquipe(await listarChamados({ ...filtrosAtuais, historico: true, closed: true })); return; }
      if (aba === "carteira") {
        const [lista, users] = await Promise.all([listarChamados(filtrosAtuais), listarUsuariosAdmin().catch(() => [])]);
        setCarteiraEquipe(lista); setUsuarios(users); return;
      }
      if (["usuarios", "acessos"].includes(aba)) { setUsuarios(await listarUsuariosAdmin().catch(() => [])); return; }
      if (aba === "teams") {
        const [users, teamsLista] = await Promise.all([listarUsuariosAdmin().catch(() => []), listarTeams().catch(() => [])]);
        setUsuarios(users); setTeams(teamsLista); return;
      }
      if (aba === "catalogos") {
        const [deps, tiposLista] = await Promise.all([listarCatalogo("departamentos").catch(() => []), listarCatalogo("tipos").catch(() => [])]);
        setDepartamentos(deps); setTipos(tiposLista); return;
      }
      if (aba === "base") {
        setBaseCarregando(true);
        setErroBase("");
        try {
          setBase(await listarBaseConhecimento());
        } catch (error) {
          setBase([]);
          setErroBase(error instanceof Error ? error.message : "Não foi possível carregar os artigos.");
        } finally {
          setBaseCarregando(false);
        }
        return;
      }
      if (["configuracoes", "config_sla", "config_integracoes"].includes(aba)) {
        const [configLista, respostas] = await Promise.all([obterConfiguracoesSistema().catch(() => null), listarRespostasRapidas().catch(() => [])]);
        setRespostasRapidas(respostas);
        if (configLista) { const completo = { ...CONFIG_SISTEMA_PADRAO, ...configLista }; setConfigSistema(completo); onConfigSistemaChange(completo); }
        return;
      }
      if (aba === "manutencao") { setAvisosAdmin(await listarAvisosSistemaAdmin().catch(() => []) as ApiAvisoSistema[]); return; }
      if (["indicadores_operacao", "indicadores_sla", "indicadores_tecnicos", "indicadores_ativos", "relatorios"].includes(aba)) {
        const [relatorio, historico] = await Promise.all([listarChamados({ closed: true }), listarChamados({ ...filtrosAtuais, historico: true, closed: true })]);
        setChamadosRelatorio(relatorio); setHistoricoEquipe(historico);
      }
    } finally {
      sincronizandoTelaRef.current = false;
      const pendente = abaPendenteRef.current;
      abaPendenteRef.current = null;
      if (pendente) void carregar(pendente);
    }
  }

  async function criarNovaTeam(event: FormEvent) {
    event.preventDefault();
    try {
      await criarTeam({
        ...novaTeam,
        manager_id: novaTeam.manager_id
          ? Number(novaTeam.manager_id)
          : undefined,
      });
      setNovaTeam({
        name: "",
        description: "",
        manager_id: "",
        color: "#2563eb",
        distribution_mode: "manual",
      });
      toast.success("Equipe criada.");
      await carregar();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao criar equipe.",
      );
    }
  }

  async function carregarNotificacoes(silencioso = true) {
    if (!silencioso) setCarregandoNotificacoes(true);
    try {
      setNotificacoes(await listarNotificacoes());
    } catch (e) {
      if (!silencioso)
        toast.error(
          e instanceof Error ? e.message : "Erro ao carregar notificações.",
        );
    } finally {
      if (!silencioso) setCarregandoNotificacoes(false);
    }
  }

  useEffect(() => {
    carregar(tab).catch((e) => toast.error(e.message));
  }, [tab]);
  useEffect(() => {
    obterMinhasPermissoes()
      .then(({ permissions }) => setPermissoesAtuais(permissions))
      .catch(() => setPermissoesAtuais([]))
      .finally(() => setPermissoesCarregadas(true));
  }, []);
  useEffect(() => {
    if(!permissoesCarregadas)return;
    const teamTabs:AdminTab[]=["usuarios","acessos","carteira","teams"];
    const developerTabs:AdminTab[]=["configuracoes","config_sla","config_integracoes","manutencao","diagnostico"];
    const analyticsTabs:AdminTab[]=["indicadores_operacao","indicadores_sla","indicadores_tecnicos","indicadores_ativos","relatorios"];
    const deniedDashboard=tab==="dashboard"&&!permissoesAtuais.includes("visualizar_dashboard");
    const deniedTeam=teamTabs.includes(tab)&&!administrador;
    const deniedDeveloper=developerTabs.includes(tab)&&!desenvolvedor;
    const deniedCatalog=tab==="catalogos"&&!administrador;
    const deniedAnalytics=analyticsTabs.includes(tab)&&!administrador&&!permissoesAtuais.includes("visualizar_relatorios")&&!permissoesAtuais.includes("baixar_relatorios");
    const deniedAssets=tab==="patrimonio"&&!permissoesAtuais.includes("visualizar_patrimonio");
    const deniedKnowledge=tab==="base"&&!permissoesAtuais.includes("gerenciar_base");
    const deniedDevelopment=["desenvolvimento","projetos"].includes(tab)&&!administrador&&!desenvolvedor&&!permissoesAtuais.includes("desenvolvimento_visualizar");
    if(deniedDashboard||deniedTeam||deniedDeveloper||deniedCatalog||deniedAnalytics||deniedAssets||deniedKnowledge||deniedDevelopment)setTab("fila");
  }, [administrador,desenvolvedor,permissoesAtuais,permissoesCarregadas,tab]);

  useEffect(() => {
    carregarNotificacoes().catch(() => {});
    const timer = window.setInterval(() => carregarNotificacoes(), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const sincronizavel = ["dashboard", "fila", "kanban", "chamados", "historico", "carteira"].includes(tab);
    if (!sincronizavel) return;
    const sincronizarSeVisivel = () => { if (document.visibilityState === "visible") void carregar(tab); };
    const timer = window.setInterval(sincronizarSeVisivel, 60000);
    document.addEventListener("visibilitychange", sincronizarSeVisivel);
    window.addEventListener("focus", sincronizarSeVisivel);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", sincronizarSeVisivel); window.removeEventListener("focus", sincronizarSeVisivel); };
  },[tab]);

  useEffect(() => {
    localStorage.setItem("smart_helpdesk_admin_theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    localStorage.setItem(
      "smart_helpdesk_compact_mode_v2",
      modoCompacto ? "on" : "off",
    );
  }, [modoCompacto]);

  useEffect(()=>{
    if(!["fila","kanban","chamados","historico"].includes(tab))return;
    const params=new URLSearchParams();
    Object.entries(filtros).forEach(([key,value])=>{if(value!==undefined&&value!==null&&value!==""&&value!==false)params.set(key,String(value))});
    const search=params.toString();
    window.history.replaceState(window.history.state,"",`${window.location.pathname}${search?`?${search}`:""}`);
  },[filtros,tab]);

  async function aplicarFiltros(event?: FormEvent,override?:FiltrosChamados) {
    event?.preventDefault();
    const applied=override??filtros;
    try {
      setFiltros(applied);
      await carregar(tab, applied);
      setMostrarFiltros(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao filtrar.");
    }
  }

  async function executarPesquisa(event?: FormEvent) {
    event?.preventDefault();
    const termo = String(filtros.q || "").trim();
    const novosFiltros = { ...filtros, q: termo };
    if (!termo) delete novosFiltros.q;
    try {
      setTab("kanban");
      setFiltros(novosFiltros);
      await carregar("kanban", novosFiltros);
      toast.success(termo ? "Pesquisa aplicada." : "Pesquisa limpa.");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Erro ao pesquisar chamados.",
      );
    }
  }

  async function limparPesquisa() {
    const { q: _q, ...novosFiltros } = filtros;
    try {
      setFiltros(novosFiltros);
      await carregar(tab, novosFiltros);
      toast.success("Pesquisa limpa.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao limpar pesquisa.");
    }
  }

  async function limparFiltros() {
    try {
      setFiltros({});
      await carregar(tab, {});
      setMostrarFiltros(false);
      toast.success("Filtros limpos.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao limpar filtros.");
    }
  }

  async function salvarFiltroAtual() {
    const nome =
      novoFiltroNome.trim() ||
      `Filtro ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
    try {
      await salvarFiltroChamados(nome, filtros);
      setNovoFiltroNome("");
      setFiltrosSalvos(await listarFiltrosSalvos());
      toast.success("Filtro salvo.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar filtro.");
    }
  }

  async function aplicarFiltroSalvo(filtro: FiltroSalvo) {
    const filtrosDoBanco = filtro.filtros || {};
    setFiltros(filtrosDoBanco);
    setChamados(await listarChamados({ ...filtrosDoBanco, meus: true }));
    setMostrarFiltros(false);
    toast.success(`Filtro aplicado: ${filtro.nome}`);
  }

  async function assumirChamadoAdmin(id: number) {
    try {
      const atualizado = await assumirChamado(id);
      sincronizarChamadoEquipe(atualizado);
      toast.success("Chamado assumido.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao assumir chamado.");
    }
  }

  async function criarRespostaRapidaAdmin(event: FormEvent) {
    event.preventDefault();
    if (!novaResposta.titulo.trim() || !novaResposta.mensagem.trim()) return;
    try {
      await criarRespostaRapida(novaResposta);
      setNovaResposta({ titulo: "", mensagem: "", categoria: "Atendimento" });
      setRespostasRapidas(await listarRespostasRapidas());
      toast.success("Resposta rápida criada.");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Erro ao criar resposta rápida.",
      );
    }
  }

  async function salvarConfiguracoesAdmin(event: FormEvent) {
    event.preventDefault();
    try {
      const atualizado = {
        ...CONFIG_SISTEMA_PADRAO,
        ...(await salvarConfiguracoesSistema(configSistema)),
      };
      setConfigSistema(atualizado);
      onConfigSistemaChange(atualizado);
      toast.success("Configurações salvas e aplicadas no sistema.");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Erro ao salvar configurações.",
      );
    }
  }

  async function trocarLogoSistema(
    event: React.ChangeEvent<HTMLInputElement>,
    logo: "logo1" | "logo2",
  ) {
    const arquivo = event.target.files?.[0];
    event.target.value = "";
    if (!arquivo) return;
    if (logo !== "logo1") return;
    if (!arquivo.type.startsWith("image/")) {
      toast.error("Envie uma logo em PNG, JPG, JPEG ou WEBP.");
      return;
    }
    if (arquivo.size > 3 * 1024 * 1024) {
      toast.error("A logo precisa ter até 3 MB.");
      return;
    }
    try {
      setEnviandoLogoSistema(logo);
      const atualizado = {
        ...CONFIG_SISTEMA_PADRAO,
        ...(await atualizarLogoSistema1(arquivo)),
      };
      setConfigSistema(atualizado);
      onConfigSistemaChange(atualizado);
      toast.success("Logo atualizada e aplicada no sistema.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao atualizar logo.");
    } finally {
      setEnviandoLogoSistema("");
    }
  }

  async function salvarPerfilAdmin(event: FormEvent) {
    event.preventDefault();
    try {
      setSalvandoPerfil(true);
      const atualizado = await atualizarMeuPerfil(perfilForm);
      sincronizarUsuario(atualizado);
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

    try {
      setEnviandoFoto(true);
      const atualizado = await atualizarMinhaFotoPerfil(arquivo);
      sincronizarUsuario(atualizado);
      toast.success("Foto do perfil atualizada.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao atualizar foto.");
    } finally {
      setEnviandoFoto(false);
    }
  }

  async function removerFotoPerfil() {
    try {
      setEnviandoFoto(true);
      const atualizado = await removerMinhaFotoPerfil();
      sincronizarUsuario(atualizado);
      toast.success("Foto removida.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao remover foto.");
    } finally {
      setEnviandoFoto(false);
    }
  }

  usePushNavigation(usuario.id, abrirDetalhe);
  async function abrirDetalhe(id: number, somenteLeitura = false) {
    const resumo = [chamados, filaChamados, carteiraEquipe, historicoEquipe]
      .flat()
      .find((item) => Number(item.id) === Number(id));
    setDetalheSomenteLeitura(somenteLeitura);
    if (resumo) setSelecionado(resumo);
    if (!usuarios.length) listarUsuariosAdmin().then(setUsuarios).catch(() => {});
    if (!respostasRapidas.length) listarRespostasRapidas().then(setRespostasRapidas).catch(() => {});
    try {
      const detalhe = await buscarChamado(id);
      setSelecionado((atual) => (Number(atual?.id) === Number(id) || (!resumo && atual === null)) ? detalhe : atual);
    } catch (e) {
      setSelecionado((atual) => Number(atual?.id) === Number(id) ? null : atual);
      toast.error(e instanceof Error ? e.message : "Erro ao abrir chamado.");
    }
  }
  async function moverChamado(id: number, status: string) {
    const anterior = chamados.find((chamado) => Number(chamado.id) === Number(id));
    if (!anterior || canonicalTicketStatus(anterior.status) === canonicalTicketStatus(status)) return;

    const otimista: ApiChamado = {
      ...anterior,
      status: canonicalTicketStatus(status),
      atualizado_em: new Date().toISOString(),
      ...(canonicalTicketStatus(status) === TICKET_STATUS.CLOSED
        ? { finalizado_em: new Date().toISOString() }
        : {}),
    };
    setChamados((atuais) => atuais.map((chamado) => Number(chamado.id) === Number(id) ? otimista : chamado));
    setSelecionado((atual) => atual && Number(atual.id) === Number(id) ? { ...atual, ...otimista } : atual);

    try {
      const atualizado = await atualizarChamado(id, { status: canonicalTicketStatus(status) });
      setChamados((atuais) => atuais.map((chamado) => Number(chamado.id) === Number(id) ? { ...chamado, ...atualizado } : chamado));
      setSelecionado((atual) => atual && Number(atual.id) === Number(id) ? { ...atual, ...atualizado } : atual);
      toast.success("Status atualizado.");
      obterDashboard().then(setDashboard).catch(() => {});
    } catch (e) {
      setChamados((atuais) => atuais.map((chamado) =>
        Number(chamado.id) === Number(id) && canonicalTicketStatus(chamado.status) === canonicalTicketStatus(status)
          ? anterior
          : chamado,
      ));
      setSelecionado((atual) => atual && Number(atual.id) === Number(id) ? anterior : atual);
      toast.error(e instanceof Error ? e.message : "Erro ao mover chamado.");
    }
  }

  async function abrirPainelNotificacoes() {
    const proximoEstado = !notificacoesAberta;
    setMostrarPerfil(false);
    setNotificacoesAberta(proximoEstado);
    if (proximoEstado) await carregarNotificacoes(false);
  }

  async function marcarTodasComoLidas() {
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

  async function abrirNotificacao(notificacao: Notificacao) {
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
        setTab("kanban");
        await abrirDetalhe(chamadoId);
      }
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Erro ao abrir notificação.",
      );
    }
  }

  function abrirEdicaoUsuario(u: ApiUsuario) {
    setUsuarioEditando(u);
    setUsuarioForm({
      nome: u.nome || "",
      email: u.email || "",
      perfil: normalizarPerfilApp(u.perfil),
      status: u.status || "ativo",
      telefone: u.telefone || "",
      departamento: u.departamento || "",
      municipio: u.municipio || "",
      unidade: u.unidade || "",
      cargo: u.cargo || "",
      senha: "",
    });
  }

  async function salvarEdicaoUsuario(event: FormEvent) {
    event.preventDefault();
    if (!usuarioEditando) return;
    setSalvandoUsuarioAdmin(true);
    try {
      const payload: Partial<ApiUsuario> & { senha?: string } = {
        nome: usuarioForm.nome,
        email: usuarioForm.email,
        perfil: usuarioForm.perfil as ApiUsuario["perfil"],
        status: usuarioForm.status,
        telefone: usuarioForm.telefone,
        departamento: usuarioForm.departamento,
        municipio: usuarioForm.municipio,
        unidade: usuarioForm.unidade,
        cargo: usuarioForm.cargo,
      };
      if (usuarioForm.senha.trim()) payload.senha = usuarioForm.senha.trim();

      const atualizado = await atualizarUsuarioAdmin(
        usuarioEditando.id,
        payload,
      );
      setUsuarios((lista) =>
        lista.map((item) =>
          Number(item.id) === Number(atualizado.id) ? atualizado : item,
        ),
      );
      setUsuarioEditando(null);
      toast.success("Dados do usuário atualizados.");
      await carregar();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Erro ao atualizar usuário.",
      );
    } finally {
      setSalvandoUsuarioAdmin(false);
    }
  }

  async function criarItemCatalogo(event: FormEvent) {
    event.preventDefault();
    try {
      await criarCatalogo(novoCatalogo.tipo, {
        nome: novoCatalogo.nome,
        descricao: novoCatalogo.descricao,
      });
      toast.success("Item criado.");
      setNovoCatalogo({ ...novoCatalogo, nome: "", descricao: "" });
      await carregar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar item.");
    }
  }

  async function criarArtigo(event: FormEvent) {
    event.preventDefault();
    try {
      await criarArtigoBase(novoArtigo);
      toast.success("Artigo criado.");
      setNovoArtigo({
        titulo: "",
        categoria: "",
        palavras_chave: "",
        conteudo: "",
      });
      await carregar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar artigo.");
    }
  }

  async function criarAvisoManutencao(event: FormEvent) {
    event.preventDefault();
    try {
      const criado = await criarAvisoSistema(novoAviso);
      toast.success("Aviso de manutenção criado.");
      setNovoAviso({
        titulo: "Manutenção programada",
        mensagem: "O sistema passará por manutenção em breve.",
        tipo: "warning",
        ativo: true,
        inicio_em: "",
        fim_em: "",
      });
      const lista = await listarAvisosSistemaAdmin().catch(() => [criado]);
      setAvisosAdmin(lista);
      const ativos = await listarAvisosSistemaAtivos().catch(
        () => avisosSistema,
      );
      onAvisosSistemaChange(ativos);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar aviso.");
    }
  }

  async function alternarAvisoManutencao(aviso: ApiAvisoSistema) {
    try {
      await atualizarAvisoSistema(aviso.id, { ativo: !aviso.ativo });
      const [lista, ativos] = await Promise.all([
        listarAvisosSistemaAdmin().catch(() => []),
        listarAvisosSistemaAtivos().catch(() => avisosSistema),
      ]);
      setAvisosAdmin(lista);
      onAvisosSistemaChange(ativos);
      toast.success(!aviso.ativo ? "Aviso ativado." : "Aviso desativado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao atualizar aviso.");
    }
  }

  async function removerAvisoManutencao(id: number) {
    if (!confirm("Apagar este aviso de manutenção?")) return;
    try {
      await excluirAvisoSistema(id);
      const [lista, ativos] = await Promise.all([
        listarAvisosSistemaAdmin().catch(() => []),
        listarAvisosSistemaAtivos().catch(() => avisosSistema),
      ]);
      setAvisosAdmin(lista);
      onAvisosSistemaChange(ativos);
      toast.success("Aviso apagado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao apagar aviso.");
    }
  }

  const adminTabs = [
    {
      key: "desenvolvimento" as AdminTab,
      icon: BrainCircuit,
      label: "Demandas",
      title: "Desenvolvimento",
      show: administrador || desenvolvedor || permissoesAtuais.includes("desenvolvimento_visualizar"),
    },
    {
      key: "projetos" as AdminTab,
      icon: ListChecks,
      label: "Projetos",
      title: "Projetos de desenvolvimento",
      show: administrador || desenvolvedor || permissoesAtuais.includes("desenvolvimento_visualizar"),
    },
    ...(["indicadores_operacao","indicadores_sla","indicadores_tecnicos","indicadores_ativos"] as AdminTab[]).map((key)=>({
      key,
      icon: BarChart3,
      label: key.replace("indicadores_", ""),
      title: "Indicadores",
      show: administrador || permissoesAtuais.includes("visualizar_relatorios"),
    })),
    {
      key: "satisfacao" as AdminTab,
      icon: Star,
      label: tecnico ? "Minha avaliação" : "Satisfação",
      title: tecnico ? "Minha avaliação" : "Satisfação do cliente interno",
      show: administrador || tecnico,
    },
    {
      key: "dashboard" as AdminTab,
      icon: LayoutDashboard,
      label: "Início",
      title: "Dashboard",
      show: permissoesAtuais.includes("visualizar_dashboard"),
    },
    {
      key: "fila" as AdminTab,
      icon: Bell,
      label: "Fila",
      title: "Novos chamados",
      show: true,
    },
    {
      key: "kanban" as AdminTab,
      icon: ListChecks,
      label: "Meu Kanban",
      title: "Meus chamados",
      show: true,
    },
    {
      key: "carteira" as AdminTab,
      icon: Users,
      label: "Técnicos",
      title: "Chamados por técnico",
      show: administrador,
    },
    {
      key: "chamados" as AdminTab,
      icon: Ticket,
      label: "Chamados",
      title: "Chamados",
      show: true,
    },
    {
      key: "historico" as AdminTab,
      icon: History,
      label: "Histórico",
      title: "Histórico da equipe",
      show: true,
    },
    {
      key: "usuarios" as AdminTab,
      icon: Users,
      label: "Usuários",
      title: "Usuários e atendentes",
      show: administrador,
    },
    {
      key: "acessos" as AdminTab,
      icon: ShieldCheck,
      label: "Acessos",
      title: "Matriz de acessos",
      show: administrador,
    },
    {
      key: "teams" as AdminTab,
      icon: Users,
      label: "Equipes",
      title: "Equipes de atendimento",
      show: administrador,
    },
    {
      key: "catalogos" as AdminTab,
      icon: Building2,
      label: "Catálogos",
      title: "Departamentos e tipos",
      show: administrador,
    },
    {
      key: "base" as AdminTab,
      icon: BookOpen,
      label: "Base",
      title: "Base de conhecimento",
      show: permissoesAtuais.includes("gerenciar_base"),
    },
    {
      key: "relatorios" as AdminTab,
      icon: Download,
      label: "Relatórios",
      title: "Relatórios",
      show: permissoesAtuais.includes("visualizar_relatorios") || permissoesAtuais.includes("baixar_relatorios"),
    },
    {
      key: "patrimonio" as AdminTab,
      icon: MapPinned,
      label: "Ativos",
      title: "Monitoramento de ativos",
      show: permissoesAtuais.includes("visualizar_patrimonio"),
    },
    {
      key: "diagnostico" as AdminTab,
      icon: Activity,
      label: "Diagnóstico",
      title: "Saúde do sistema",
      show: desenvolvedor,
    },
    {
      key: "configuracoes" as AdminTab,
      icon: Settings,
      label: "Ajustes",
      title: "Configurações",
      show: desenvolvedor,
    },
    {
      key: "config_sla" as AdminTab,
      icon: Clock3,
      label: "SLA",
      title: "SLA e prioridades",
      show: desenvolvedor,
    },
    {
      key: "config_integracoes" as AdminTab,
      icon: Settings,
      label: "Integrações",
      title: "Integrações",
      show: desenvolvedor,
    },
    {
      key: "manutencao" as AdminTab,
      icon: AlertTriangle,
      label: "Manutenção",
      title: "Avisos de manutenção",
      show: desenvolvedor,
    },
  ].filter((item) => item.show);

  const navigationAreas = buildAdminNavigation({
    administrador,
    desenvolvedor,
    tecnico,
    permissions: permissoesAtuais,
  });
  const activeArea = navigationAreas.find((area) => area.tabs.includes(tab));

  const activeTab = adminTabs.find((item) => item.key === tab) ?? adminTabs[1];
  const sistemaNome = nomeSistema(configSistema);
  const sistemaLogo1 = logoSistema1(configSistema);
  // Alias somente para o renderer antigo já oculto; a aplicação possui uma única logo configurável.
  const sistemaLogo2 = sistemaLogo1;
  const ActiveIcon = activeArea?.icon ?? activeTab.icon;
  const unread = notificacoes.filter((n) => !n.lida).length;
  const filtrosAtivos = useMemo(
    () =>
      Object.values(filtros).filter(
        (valor) =>
          valor !== undefined &&
          valor !== null &&
          valor !== "" &&
          valor !== false,
      ).length,
    [filtros],
  );
  const rootClass = `${dark ? "admin-theme-dark min-h-screen bg-[#0b1120] text-white" : "min-h-screen bg-[#f4f6f8] text-[#202a33]"} ${modoCompacto ? "app-compact" : ""}`;
  const headerClass = dark
    ? "border-white/10 bg-[#101827] text-white"
    : "border-zinc-200 bg-white text-[#202a33]";
  const mutedText = dark ? "text-white/55" : "text-zinc-500";
  const fotoPerfil = usuario.foto_url || "";
  const inicialPerfil = String(usuario.nome || "A")
    .slice(0, 1)
    .toUpperCase();

  return (
    <div
      className={`shd-app nectar-shell smart-helpdesk-config-theme ${rootClass}`}
      style={variaveisTemaSistema(configSistema)}
    >
      <SystemThemeStyle />
      <Toaster position="top-right" richColors />
      <GlobalCommandPalette
        open={buscaGlobalAberta}
        onClose={() => setBuscaGlobalAberta(false)}
        chamados={[...chamados, ...filaChamados, ...carteiraEquipe]}
        usuarios={usuarios}
        artigos={base}
        onTicket={abrirDetalhe}
        onNavigate={(next) => setTab(next as AdminTab)}
        dark={dark}
      />
      <div className="fixed inset-x-0 top-3 z-50 mx-auto w-[min(920px,calc(100vw-32px))]">
        <AvisosSistemaBanner avisos={avisosSistema} dark={dark} />
      </div>
      <div className="flex h-screen overflow-hidden">
        <aside className="nectar-sidebar hidden w-14 shrink-0 flex-col border-r lg:flex">
          <button type="button" onClick={() => setTab("dashboard")} aria-label={`${sistemaNome} — Início`} title="Ir para Início" className="grid h-14 shrink-0 cursor-pointer place-items-center border-b focus-visible:outline-2 focus-visible:outline-blue-500">
            <img
              src={sistemaLogo1}
              alt={sistemaNome}
              className="h-11 w-12 object-contain"
            />
          </button>

          <nav className="min-h-0 flex-1 overflow-y-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {navigationAreas.map((item) => {
              const Icon = item.icon;
              const ativo = item.tabs.includes(tab);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.defaultTab)}
                  title={item.title}
                  className={`nectar-nav-button relative flex h-12 min-h-12 w-full items-center justify-center transition ${ativo ? "is-active" : ""}`}
                >
                  {ativo && (
                    <span className="absolute left-0 top-0 h-full w-[3px] bg-blue-500" />
                  )}
                  <Icon size={19} strokeWidth={2.1} />
                  <span className="sr-only">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="shrink-0 border-t border-white/10 py-1">
            <button
              onClick={() => setDark(!dark)}
              className="nectar-nav-button flex h-10 w-full items-center justify-center transition"
              title={dark ? "Tema claro" : "Tema escuro"}
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              onClick={onLogout}
              className="nectar-nav-button flex h-10 w-full items-center justify-center transition hover:!text-red-500"
              title="Sair"
            >
              <LogOut size={18} />
            </button>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header
            className={`nectar-topbar sticky top-0 z-[60] h-14 overflow-visible border-b ${headerClass}`}
          >
            <div className="grid h-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 sm:gap-4 sm:px-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                  <h1 title={sistemaNome} className="line-clamp-2 break-words text-sm font-bold leading-tight tracking-tight lg:block lg:truncate">
                    <button type="button" onClick={() => setTab("dashboard")} title="Ir para Início" className="max-w-full cursor-pointer text-left lg:truncate focus-visible:outline-2 focus-visible:outline-blue-500">{sistemaNome}</button>
                  </h1>
                  <p className={`hidden text-xs ${mutedText}`}>
                    Painel administrativo
                  </p>
                </div>
              </div>

              <div className="pointer-events-none hidden max-w-56 truncate px-3 text-center text-sm font-semibold text-sky-500 lg:block">
                {activeArea?.title || "Dashboard"}
              </div>

              <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-3">
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    setBuscaGlobalAberta(true);
                  }}
                  className={`${["service","assets"].includes(activeArea?.id||"") ? "hidden" : "hidden md:flex"} min-w-0 w-[430px] max-w-full items-center`}
                >
                  <div
                    className={`ds-search flex h-10 w-full items-center overflow-hidden rounded-full border shadow-sm transition focus-within:border-blue-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/10 ${dark ? "border-white/10 bg-white/5" : "border-zinc-200 bg-white"}`}
                  >
                    <button
                      type="submit"
                      className={`grid h-full w-11 shrink-0 place-items-center transition ${dark ? "text-white/45 hover:text-white" : "text-zinc-400 hover:text-blue-600"}`}
                      title="Pesquisar"
                      aria-label="Pesquisar chamados"
                    >
                      <Search size={18} />
                    </button>
                    <input
                      aria-label="Pesquisar chamados"
                      onFocus={() => setBuscaGlobalAberta(true)}
                      value={filtros.q || ""}
                      onChange={(e) =>
                        setFiltros({ ...filtros, q: e.target.value })
                      }
                      placeholder="Buscar em todo o sistema...  Ctrl K"
                      className={`h-full min-w-0 flex-1 border-0 bg-transparent pr-2 text-sm font-semibold outline-none placeholder:font-medium ${dark ? "text-white placeholder:text-white/35" : "text-zinc-800 placeholder:text-zinc-400"}`}
                    />
                    {filtros.q && (
                      <button
                        type="button"
                        onClick={limparPesquisa}
                        className={`mr-1 grid h-8 w-8 shrink-0 place-items-center rounded-full transition ${dark ? "text-white/45 hover:bg-white/10 hover:text-white" : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"}`}
                        title="Limpar pesquisa"
                        aria-label="Limpar pesquisa"
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>
                </form>

                <div className="nectar-top-actions flex shrink-0 items-center gap-1.5 sm:gap-2">
                  {!["service","assets"].includes(activeArea?.id||"") && <button
                    type="button"
                    onClick={() => {
                      setTab("kanban");
                      setNotificacoesAberta(false);
                      setMostrarPerfil(false);
                      setMostrarFiltros(true);
                    }}
                    className={`relative rounded-xl p-2.5 transition ${mostrarFiltros ? "bg-blue-50 text-blue-700" : dark ? "text-white/70 hover:bg-white/10 hover:text-white" : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"}`}
                    title="Filtros"
                    aria-label="Abrir filtros"
                  >
                    <Filter size={20} />
                    {filtrosAtivos > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-blue-600 px-1 text-[10px] font-black text-white">
                        {filtrosAtivos}
                      </span>
                    )}
                  </button>}
                  {!["service","assets"].includes(activeArea?.id||"") && <button
                    onClick={() => carregar()}
                    className={`rounded-xl p-2.5 transition ${dark ? "text-white/70 hover:bg-white/10 hover:text-white" : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"}`}
                    title="Atualizar"
                  >
                    <RefreshCw size={20} />
                  </button>}
                  <button
                    onClick={() => setModoCompacto((valor) => !valor)}
                    className={`hidden rounded-xl p-2.5 transition sm:grid ${modoCompacto ? "bg-blue-50 text-blue-700" : dark ? "text-white/70 hover:bg-white/10 hover:text-white" : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"}`}
                    title={
                      modoCompacto ? "Visual confortável" : "Visual compacto"
                    }
                  >
                    <ListChecks size={20} />
                  </button>
                  <div className="relative">
                    {notificacoesAberta && (
                      <button
                        type="button"
                        aria-label="Fechar notificações"
                        className="notification-dismiss fixed inset-0 z-[61] cursor-default bg-slate-950/5"
                        onClick={() => setNotificacoesAberta(false)}
                      />
                    )}
                    <button
                      onClick={abrirPainelNotificacoes}
                      className={`relative z-[63] grid h-10 w-10 place-items-center rounded-xl p-0 transition ${notificacoesAberta ? "bg-blue-50 text-blue-700" : dark ? "text-white/70 hover:bg-white/10 hover:text-white" : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"}`}
                      title="Notificações"
                    >
                      <Bell size={20} />
                      {unread > 0 && (
                        <span className="absolute -right-0.5 -top-0.5 rounded-full bg-red-500 px-1.5 text-[10px] font-black text-white">
                          {unread}
                        </span>
                      )}
                    </button>

                    {notificacoesAberta && (
                      <div
                        className={`notification-popover fixed inset-x-3 bottom-[calc(76px+env(safe-area-inset-bottom))] top-[72px] z-[70] flex w-auto flex-col overflow-hidden rounded-2xl border shadow-2xl sm:absolute sm:inset-auto sm:right-0 sm:top-[calc(100%+8px)] sm:z-[63] sm:block sm:w-[400px] ${dark ? "border-white/10 bg-[#101827] text-white" : "border-zinc-200 bg-white text-zinc-900"}`}
                      >
                        <div
                          className={`flex items-center justify-between gap-3 border-b p-4 ${dark ? "border-white/10" : "border-zinc-100"}`}
                        >
                          <div>
                            <p className="text-sm font-black">Notificações</p>
                            <p className={`text-xs ${mutedText}`}>
                              {unread > 0
                                ? `${unread} não lida(s)`
                                : "Tudo em dia"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={marcarTodasComoLidas}
                              disabled={unread === 0}
                              className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-black text-zinc-600 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Marcar lidas
                            </button>
                          </div>
                        </div>

                        <div className="min-h-0 flex-1 overflow-auto overscroll-contain p-2 sm:max-h-[min(520px,calc(100vh-88px))]">
                          {carregandoNotificacoes &&
                            notificacoes.length === 0 && (
                              <div
                                className={`p-6 text-center text-sm ${mutedText}`}
                              >
                                Carregando notificações...
                              </div>
                            )}
                          {!carregandoNotificacoes &&
                            notificacoes.length === 0 && (
                              <div
                                className={`p-6 text-center text-sm ${mutedText}`}
                              >
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
                                onClick={() => abrirNotificacao(notificacao)}
                                className={`mb-2 flex w-full gap-3 rounded-xl border p-3 text-left transition ${notificacao.lida ? (dark ? "border-white/10 bg-white/5 hover:bg-white/10" : "border-zinc-100 bg-white hover:bg-zinc-50") : dark ? "border-blue-400/30 bg-blue-500/10 hover:bg-blue-500/15" : "border-blue-100 bg-blue-50 hover:bg-blue-100"}`}
                              >
                                <span
                                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border ${notificacaoClass(notificacao.tipo)}`}
                                >
                                  {notificacaoIcone(notificacao.tipo)}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="flex items-start justify-between gap-2">
                                    <span className="line-clamp-1 text-sm font-black">
                                      {notificacao.titulo}
                                    </span>
                                    {!notificacao.lida && (
                                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                                    )}
                                  </span>
                                  <span
                                    className={`mt-1 block line-clamp-2 text-xs leading-5 ${mutedText}`}
                                  >
                                    {notificacao.mensagem}
                                  </span>
                                  <span
                                    className={`mt-2 flex items-center justify-between gap-2 text-[11px] font-bold ${mutedText}`}
                                  >
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
                      setMostrarPerfil((aberto) => !aberto);
                      setMostrarFiltros(false);
                      setNotificacoesAberta(false);
                    }}
                    className={`grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border shadow-sm transition ${dark ? "border-white/10 bg-white/10 hover:ring-4 hover:ring-white/10" : "border-zinc-200 bg-white hover:ring-4 hover:ring-blue-500/10"}`}
                    title="Perfil do administrador"
                    aria-label="Abrir perfil do administrador"
                  >
                    {fotoPerfil ? (
                      <img
                        src={fotoPerfil}
                        alt={usuario.nome}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="grid h-full w-full place-items-center bg-gradient-to-br from-blue-500 to-sky-400 text-sm font-black text-white">
                        {inicialPerfil}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </header>

          <main
            className={`h-[calc(100vh-56px)] overflow-auto px-4 pb-24 pt-0 lg:pb-5 ${["configuracoes","config_sla"].includes(tab) ? "settings-workspace" : ""}`}
          >
            {activeArea && (
              <WorkspaceNavigation
                area={activeArea}
                current={tab}
                onNavigate={setTab}
                onRefresh={activeArea.id === "service" ? ()=>void carregar() : undefined}
                tools={activeArea.id === "service" ? <TicketWorkspaceToolbar filters={filtros} onChange={setFiltros} onApply={next=>void aplicarFiltros(undefined,next)} dark={dark} embedded/> : activeArea.id === "assets" ? <div className="flex items-center justify-end gap-2"><button type="button" onClick={()=>window.dispatchEvent(new Event("assets-invite"))} className="ds-button ds-button--primary whitespace-nowrap">Gerar convite do agente</button><button type="button" onClick={()=>window.dispatchEvent(new Event("assets-agent-updates"))} className="ds-button ds-button--secondary whitespace-nowrap">Atualizações do agente</button><button type="button" onClick={()=>window.dispatchEvent(new Event("assets-filters"))} className="ds-button ds-button--secondary inline-flex items-center gap-2 whitespace-nowrap"><Filter size={16}/>Filtros</button><button type="button" onClick={()=>window.dispatchEvent(new Event("assets-refresh"))} className="ds-button ds-button--secondary grid !w-10 place-items-center !px-0" title="Atualizar ativos" aria-label="Atualizar ativos"><RefreshCw size={16}/></button></div> : undefined}
                dark={dark}
              />
            )}

            {filtrosAtivos > 0 &&
              ["kanban", "fila", "chamados", "carteira"].includes(tab) && (
                <div
                  className="mb-3 flex flex-wrap items-center gap-2"
                  aria-label="Filtros ativos"
                >
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    Filtros
                  </span>
                  {Object.entries(filtros)
                    .filter(
                      ([, value]) =>
                        value !== undefined &&
                        value !== null &&
                        value !== "" &&
                        value !== false,
                    )
                    .map(([key, value]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() =>
                          setFiltros((current) => ({
                            ...current,
                            [key]: undefined,
                          }))
                        }
                        className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-black text-blue-700"
                        title="Remover filtro"
                      >
                        {key.replaceAll("_", " ")}: {String(value)}{" "}
                        <X size={12} />
                      </button>
                    ))}
                  <button
                    type="button"
                    onClick={() => setFiltros({})}
                    className="text-[11px] font-black text-zinc-500 hover:text-red-600"
                  >
                    Limpar todos
                  </button>
                </div>
              )}

            {tab === "dashboard" && dashboard && (
              <ModuleBoundary fallback={<div className="ds-empty-state"><RefreshCw className="ds-empty-state__icon animate-spin"/><strong>Carregando dashboard…</strong></div>}><OperationalDashboard
                initial={dashboard}
                dark={dark}
                onNavigate={setTab}
                onOpenTicket={abrirDetalhe}
              /></ModuleBoundary>
            )}

            {tab === "satisfacao" && (
              <ModuleBoundary
                fallback={
                  <div className="grid min-h-[420px] place-items-center">
                    <RefreshCw className="animate-spin text-blue-600" />
                  </div>
                }
              >
                {tecnico ? (
                  <MySatisfactionPage
                    dark={dark}
                    onBack={() => setTab("fila")}
                  />
                ) : (
                  <SatisfactionAnalyticsPage
                    dark={dark}
                    onBack={() => setTab("dashboard")}
                  />
                )}
              </ModuleBoundary>
            )}

            {["indicadores_operacao","indicadores_sla","indicadores_tecnicos","indicadores_ativos"].includes(tab) && (
              <ModuleBoundary fallback={<div className="ds-empty-state"><RefreshCw className="ds-empty-state__icon animate-spin"/><strong>Carregando indicadores…</strong></div>}>
                <IndicatorsWorkspace
                  section={tab==="indicadores_sla"?"sla":tab==="indicadores_tecnicos"?"technicians":tab==="indicadores_ativos"?"assets":"operation"}
                  chamados={dadosRelatorio}
                  onOpen={abrirDetalhe}
                />
              </ModuleBoundary>
            )}

            {tab === "patrimonio" && (
              <ModuleBoundary
                fallback={
                  <div className="grid min-h-[520px] place-items-center rounded-2xl border border-zinc-200 bg-white">
                    <div className="text-center">
                      <RefreshCw className="mx-auto animate-spin text-blue-600" />
                      <p className="mt-3 text-sm font-bold text-zinc-500">
                        Carregando mapa de ativos...
                      </p>
                    </div>
                  </div>
                }
              >
                <PatrimonioMapPage dark={dark} />
              </ModuleBoundary>
            )}

            {desenvolvedor &&
              ["teams", "catalogos", "manutencao"].includes(tab) && (
                <div
                  className={`mb-4 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${dark ? "border-white/10 bg-white/5" : "border-zinc-200 bg-white"}`}
                >
                  <button
                    type="button"
                    onClick={() => setTab("configuracoes")}
                    className="flex items-center gap-2 font-black text-blue-600"
                  >
                    <Settings size={16} />
                    Configurações
                  </button>
                  <span className="text-zinc-300">/</span>
                  <span className="font-bold text-zinc-500">
                    {activeTab.title}
                  </span>
                </div>
              )}

            {tab === "configuracoes" && (
              <div
                className={`mb-5 rounded-2xl border p-2 shadow-sm ${dark ? "border-white/10 bg-white/5" : "border-zinc-200 bg-white"}`}
              >
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  <button
                    type="button"
                    className="flex items-center gap-3 rounded-xl bg-blue-600 p-3 text-left text-white shadow-lg shadow-blue-100"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/15">
                      <Settings size={19} />
                    </span>
                    <span>
                      <b className="block text-sm">Sistema</b>
                      <span className="text-xs text-white/70">
                        Identidade, SLA e respostas
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab("teams")}
                    className={`flex items-center gap-3 rounded-xl p-3 text-left transition ${dark ? "hover:bg-white/10" : "hover:bg-zinc-50"}`}
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-700">
                      <Users size={19} />
                    </span>
                    <span>
                      <b className="block text-sm">Equipes</b>
                      <span className="text-xs text-zinc-500">
                        Estrutura e distribuição
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab("catalogos")}
                    className={`flex items-center gap-3 rounded-xl p-3 text-left transition ${dark ? "hover:bg-white/10" : "hover:bg-zinc-50"}`}
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                      <Building2 size={19} />
                    </span>
                    <span>
                      <b className="block text-sm">Catálogos</b>
                      <span className="text-xs text-zinc-500">
                        Departamentos e tipos
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab("manutencao")}
                    className={`flex items-center gap-3 rounded-xl p-3 text-left transition ${dark ? "hover:bg-white/10" : "hover:bg-zinc-50"}`}
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-700">
                      <AlertTriangle size={19} />
                    </span>
                    <span>
                      <b className="block text-sm">Manutenção</b>
                      <span className="text-xs text-zinc-500">
                        Avisos e comunicados
                      </span>
                    </span>
                  </button>
                </div>
              </div>
            )}

            {tab === "fila" && (
              <ModuleBoundary fallback={<div className="ds-empty-state"><RefreshCw className="ds-empty-state__icon animate-spin"/><strong>Carregando fila…</strong></div>}><FilaChamadosView
                chamados={filaChamados}
                carteira={carteiraEquipe}
                equipe={equipe}
                teams={teams}
                dark={dark}
                administrador={administrador}
                onAbrir={abrirDetalhe}
                onAssumir={assumirChamadoAdmin}
                onAtualizar={() => carregar()}
              /></ModuleBoundary>
            )}

            {tab === "carteira" && administrador && (
              <CarteiraEquipeView
                equipe={equipe}
                chamados={carteiraEquipe}
                dark={dark}
                onAbrir={abrirDetalhe}
                onRedistribuir={async (chamadoId, tecnicoId) => {
                  const atualizado = await atualizarChamado(chamadoId, {
                    responsavel_id: tecnicoId,
                  });
                  sincronizarChamadoEquipe(atualizado);
                  toast.success("Chamado redistribuído.");
                }}
              />
            )}

            {tab === "teams" && (
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
            )}

            {tab === "kanban" && (
              <ModuleBoundary fallback={<div className="ds-empty-state"><RefreshCw className="ds-empty-state__icon animate-spin"/><strong>Carregando Kanban…</strong></div>}><KanbanWorkspace
                chamados={chamados}
                dark={dark}
                dragId={dragId}
                setDragId={setDragId}
                onMover={moverChamado}
                onAbrir={abrirDetalhe}
              /></ModuleBoundary>
            )}

            {tab === "chamados" && <ModuleBoundary fallback={<div className="ds-empty-state"><RefreshCw className="ds-empty-state__icon animate-spin"/><strong>Carregando chamados…</strong></div>}><ChamadosListModule chamados={chamados} onOpen={abrirDetalhe} dark={dark}/></ModuleBoundary>}
            {["desenvolvimento","projetos"].includes(tab) && <ModuleBoundary fallback={<div className="ds-empty-state"><RefreshCw className="ds-empty-state__icon animate-spin"/><strong>Carregando desenvolvimento…</strong></div>}><DevelopmentWorkspace dark={dark} initialMode={tab==="projetos"?"projects":"kanban"}/></ModuleBoundary>}
            {tab === "historico" && (
              <HistoricoEquipeView
                chamados={historicoEquipe}
                dark={dark}
                administrador={administrador}
                onAbrir={(id) => abrirDetalhe(id, true)}
                onAtualizar={() => carregar()}
              />
            )}

            {["usuarios","acessos"].includes(tab) && administrador && <ModuleBoundary fallback={<div className="ds-empty-state"><RefreshCw className="ds-empty-state__icon animate-spin"/><strong>Carregando usuários…</strong></div>}><UsersModule users={usuarios} currentUser={usuario} developer={desenvolvedor} initialMode={tab==="acessos"?"access":"list"} onModeChange={mode=>setTab(mode==="access"?"acessos":"usuarios")} onRefresh={carregar} onEdit={abrirEdicaoUsuario} onPermissions={setUsuarioPermissoes} onApprove={async id=>{await aprovarUsuario(id);await carregar()}} onReject={async id=>{await rejeitarUsuario(id);await carregar()}} onDelete={async id=>{await excluirUsuarioAdmin(id);await carregar();toast.success("Usuário apagado.")}}/></ModuleBoundary>}
            {tab === "catalogos" && (
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
            )}

            {tab === "base" && (
              <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
                <Card>
                  <h3 className="mb-4 font-black">Novo artigo</h3>
                  <form onSubmit={criarArtigo} className="space-y-3">
                    <Field label="Título">
                      <Input
                        required
                        value={novoArtigo.titulo}
                        onChange={(e) =>
                          setNovoArtigo({
                            ...novoArtigo,
                            titulo: e.target.value,
                          })
                        }
                      />
                    </Field>
                    <Field label="Categoria">
                      <Input
                        value={novoArtigo.categoria}
                        onChange={(e) =>
                          setNovoArtigo({
                            ...novoArtigo,
                            categoria: e.target.value,
                          })
                        }
                      />
                    </Field>
                    <Field label="Palavras-chave">
                      <Input
                        value={novoArtigo.palavras_chave}
                        onChange={(e) =>
                          setNovoArtigo({
                            ...novoArtigo,
                            palavras_chave: e.target.value,
                          })
                        }
                      />
                    </Field>
                    <Field label="Conteúdo">
                      <Textarea
                        required
                        value={novoArtigo.conteudo}
                        onChange={(e) =>
                          setNovoArtigo({
                            ...novoArtigo,
                            conteudo: e.target.value,
                          })
                        }
                      />
                    </Field>
                    <Button>Criar artigo</Button>
                  </form>
                </Card>
                <Card>
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-black">Artigos cadastrados</h3>
                      <p className="mt-1 text-xs text-zinc-500">{baseCarregando ? "Carregando…" : `${base.length} artigo(s)`}</p>
                    </div>
                    <button type="button" onClick={() => void carregar("base")} disabled={baseCarregando} className="grid h-9 w-9 place-items-center rounded-lg border border-zinc-200 text-zinc-500 transition hover:bg-zinc-50 hover:text-blue-600 disabled:opacity-50" title="Atualizar artigos" aria-label="Atualizar artigos">
                      <RefreshCw size={16} className={baseCarregando ? "animate-spin" : ""} />
                    </button>
                  </div>
                  {baseCarregando && base.length === 0 && (
                    <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/60 text-center">
                      <div><RefreshCw size={24} className="mx-auto animate-spin text-blue-600"/><p className="mt-3 text-sm font-bold text-zinc-600">Carregando artigos…</p></div>
                    </div>
                  )}
                  {!baseCarregando && erroBase && (
                    <div className="grid min-h-64 place-items-center rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
                      <div><BookOpen size={28} className="mx-auto text-red-500"/><p className="mt-3 text-sm font-black text-red-700">Não foi possível carregar os artigos</p><p className="mt-1 max-w-sm text-xs text-red-600">{erroBase}</p><button type="button" onClick={() => void carregar("base")} className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-xs font-black text-white hover:bg-red-700">Tentar novamente</button></div>
                    </div>
                  )}
                  {!baseCarregando && !erroBase && base.length === 0 && (
                    <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/60 p-6 text-center">
                      <div><BookOpen size={30} className="mx-auto text-zinc-400"/><p className="mt-3 text-sm font-black text-zinc-700">Nenhum artigo cadastrado</p><p className="mt-1 text-xs text-zinc-500">Preencha o formulário ao lado para publicar o primeiro artigo.</p></div>
                    </div>
                  )}
                  <div className="space-y-3">
                    {base.map((a) => (
                      <div key={a.id} className="rounded-2xl border p-4">
                        <p className="font-black">{a.titulo}</p>
                        <p className="text-sm text-zinc-500">
                          {a.categoria} • {a.palavras_chave}
                        </p>
                        <p className="mt-2 text-sm">{a.conteudo}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {tab === "configuracoes" && (
              <div className="grid gap-6 xl:grid-cols-[440px_1fr]">
                <div className="space-y-6">
                  <Card>
                    <h3 className="mb-4 flex items-center gap-2 font-black">
                      <UserCog size={18} />
                      Configurações do sistema
                    </h3>
                    <form
                      onSubmit={salvarConfiguracoesAdmin}
                      className="space-y-3"
                    >
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="flex items-center gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                          <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white p-1 ring-1 ring-zinc-200">
                            <img
                              src={sistemaLogo1}
                              alt={`${sistemaNome} - logo 1`}
                              className="h-full w-full object-contain"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-black">Logo 1</p>
                            <p className="truncate text-xs text-zinc-500">
                              Usada na lateral esquerda.
                            </p>
                            <label className="mt-2 inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-black text-zinc-700 transition hover:border-blue-200 hover:text-blue-700">
                              <Upload size={15} />
                              {enviandoLogoSistema === "logo1"
                                ? "Enviando..."
                                : "Trocar logo 1"}
                              <input
                                type="file"
                                accept="image/png,image/jpeg,image/jpg,image/webp"
                                className="hidden"
                                onChange={(event) =>
                                  trocarLogoSistema(event, "logo1")
                                }
                                disabled={Boolean(enviandoLogoSistema)}
                              />
                            </label>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                          <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white p-1 ring-1 ring-zinc-200">
                            <img
                              src={sistemaLogo2}
                              alt={`${sistemaNome} - logo 2`}
                              className="h-full w-full object-contain"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-black">Logo 2</p>
                            <p className="truncate text-xs text-zinc-500">
                              Usada ao lado do nome do sistema.
                            </p>
                            <label className="mt-2 inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-black text-zinc-700 transition hover:border-blue-200 hover:text-blue-700">
                              <Upload size={15} />
                              {enviandoLogoSistema === "logo2"
                                ? "Enviando..."
                                : "Trocar logo 2"}
                              <input
                                type="file"
                                accept="image/png,image/jpeg,image/jpg,image/webp"
                                className="hidden"
                                onChange={(event) =>
                                  trocarLogoSistema(event, "logo2")
                                }
                                disabled={Boolean(enviandoLogoSistema)}
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                      <Field label="Nome do sistema">
                        <Input
                          value={String(configSistema.nome_sistema || "")}
                          onChange={(e) =>
                            setConfigSistema({
                              ...configSistema,
                              nome_sistema: e.target.value,
                            })
                          }
                        />
                      </Field>
                      <Field label="E-mail de suporte">
                        <Input
                          type="email"
                          value={String(configSistema.email_suporte || "")}
                          onChange={(e) =>
                            setConfigSistema({
                              ...configSistema,
                              email_suporte: e.target.value,
                            })
                          }
                        />
                      </Field>
                      <Field label="Cor principal">
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={corPrincipalSistema(configSistema)}
                            onChange={(e) =>
                              setConfigSistema({
                                ...configSistema,
                                cor_principal: e.target.value,
                              })
                            }
                            className="w-16 p-1"
                          />
                          <Input
                            value={String(
                              configSistema.cor_principal || "#2563eb",
                            )}
                            onChange={(e) =>
                              setConfigSistema({
                                ...configSistema,
                                cor_principal: e.target.value,
                              })
                            }
                          />
                        </div>
                      </Field>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="SLA alta resposta">
                          <Input
                            type="number"
                            min="1"
                            value={String(
                              configSistema.sla_alta_resposta || 60,
                            )}
                            onChange={(e) =>
                              setConfigSistema({
                                ...configSistema,
                                sla_alta_resposta: e.target.value,
                              })
                            }
                          />
                        </Field>
                        <Field label="SLA alta resolução">
                          <Input
                            type="number"
                            min="1"
                            value={String(
                              configSistema.sla_alta_resolucao || 480,
                            )}
                            onChange={(e) =>
                              setConfigSistema({
                                ...configSistema,
                                sla_alta_resolucao: e.target.value,
                              })
                            }
                          />
                        </Field>
                        <Field label="SLA média resposta">
                          <Input
                            type="number"
                            min="1"
                            value={String(
                              configSistema.sla_media_resposta || 240,
                            )}
                            onChange={(e) =>
                              setConfigSistema({
                                ...configSistema,
                                sla_media_resposta: e.target.value,
                              })
                            }
                          />
                        </Field>
                        <Field label="SLA média resolução">
                          <Input
                            type="number"
                            min="1"
                            value={String(
                              configSistema.sla_media_resolucao || 1440,
                            )}
                            onChange={(e) =>
                              setConfigSistema({
                                ...configSistema,
                                sla_media_resolucao: e.target.value,
                              })
                            }
                          />
                        </Field>
                        <Field label="SLA baixa resposta">
                          <Input
                            type="number"
                            min="1"
                            value={String(
                              configSistema.sla_baixa_resposta || 1440,
                            )}
                            onChange={(e) =>
                              setConfigSistema({
                                ...configSistema,
                                sla_baixa_resposta: e.target.value,
                              })
                            }
                          />
                        </Field>
                        <Field label="SLA baixa resolução">
                          <Input
                            type="number"
                            min="1"
                            value={String(
                              configSistema.sla_baixa_resolucao || 2880,
                            )}
                            onChange={(e) =>
                              setConfigSistema({
                                ...configSistema,
                                sla_baixa_resolucao: e.target.value,
                              })
                            }
                          />
                        </Field>
                      </div>
                      <Button>Salvar e aplicar</Button>
                    </form>
                  </Card>
                  <Card>
                    <h3 className="mb-4 flex items-center gap-2 font-black">
                      <MessageSquare size={18} />
                      Nova resposta rápida
                    </h3>
                    <form
                      onSubmit={criarRespostaRapidaAdmin}
                      className="space-y-3"
                    >
                      <Field label="Título">
                        <Input
                          value={novaResposta.titulo}
                          onChange={(e) =>
                            setNovaResposta({
                              ...novaResposta,
                              titulo: e.target.value,
                            })
                          }
                          placeholder="Ex.: Solicitar print"
                        />
                      </Field>
                      <Field label="Categoria">
                        <Input
                          value={novaResposta.categoria}
                          onChange={(e) =>
                            setNovaResposta({
                              ...novaResposta,
                              categoria: e.target.value,
                            })
                          }
                        />
                      </Field>
                      <Field label="Mensagem">
                        <Textarea
                          value={novaResposta.mensagem}
                          onChange={(e) =>
                            setNovaResposta({
                              ...novaResposta,
                              mensagem: e.target.value,
                            })
                          }
                          placeholder="Texto que será usado no chat do chamado"
                        />
                      </Field>
                      <Button>Criar resposta</Button>
                    </form>
                  </Card>
                </div>
                <Card>
                  <h3 className="mb-4 font-black">Prévia aplicada</h3>
                  <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-zinc-200 p-4">
                        <p className="mb-2 text-xs font-bold text-zinc-500">
                          Logo 1 / lateral
                        </p>
                        <img
                          src={sistemaLogo1}
                          alt="Logo 1"
                          className="h-12 w-12 rounded-xl object-contain ring-1 ring-zinc-200"
                        />
                      </div>
                      <div className="rounded-2xl border border-zinc-200 p-4">
                        <p className="mb-2 text-xs font-bold text-zinc-500">
                          Logo 2 / topo
                        </p>
                        <img
                          src={sistemaLogo2}
                          alt="Logo 2"
                          className="h-12 w-12 rounded-xl object-contain ring-1 ring-zinc-200"
                        />
                      </div>
                    </div>
                    <div className="rounded-2xl border border-zinc-200 p-4">
                      <p className="text-xs font-bold text-zinc-500">Nome</p>
                      <p className="text-xl font-black">{sistemaNome}</p>
                    </div>
                    <div className="rounded-2xl border border-zinc-200 p-4">
                      <p className="text-xs font-bold text-zinc-500">Suporte</p>
                      <p className="font-black text-blue-600">
                        {emailSuporteSistema(configSistema)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-zinc-200 p-4">
                      <p className="text-xs font-bold text-zinc-500">
                        Cor principal
                      </p>
                      <div className="mt-2 h-10 rounded-xl bg-blue-600" />
                    </div>
                    <h3 className="pt-3 font-black">
                      Respostas rápidas cadastradas
                    </h3>
                    {respostasRapidas.map((r) => (
                      <div key={r.id} className="rounded-2xl border p-4">
                        <p className="font-black">{r.titulo}</p>
                        <p className="text-xs font-bold text-blue-600">
                          {r.categoria}
                        </p>
                        <p className="mt-2 text-sm text-zinc-600">
                          {r.mensagem}
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {["configuracoes","config_sla"].includes(tab) && (
              <ModuleBoundary fallback={<div className="ds-empty-state"><RefreshCw className="ds-empty-state__icon animate-spin"/><strong>Carregando configurações…</strong></div>}><SettingsWorkspace
                config={configSistema}
                setConfig={setConfigSistema}
                initialSection={tab==="config_sla"?"sla":"identidade"}
                logo={sistemaLogo1}
                uploading={enviandoLogoSistema === "logo1"}
                onLogo={(event) => trocarLogoSistema(event, "logo1")}
                onSave={salvarConfiguracoesAdmin}
                quick={novaResposta}
                setQuick={setNovaResposta}
                onCreateQuick={criarRespostaRapidaAdmin}
                responses={respostasRapidas}
                onNavigate={setTab}
              /></ModuleBoundary>
            )}

            {tab === "config_integracoes" && desenvolvedor && (
              <section className="ds-card p-6"><h3 className="font-black">Integrações</h3><p className="mt-2 text-sm text-slate-500">Nenhuma integração externa está configurada. Esta área permanece reservada para conexões autenticadas e auditáveis.</p></section>
            )}

            {tab === "manutencao" && desenvolvedor && (
              <div className="grid gap-6 xl:grid-cols-[440px_1fr]">
                <Card>
                  <h3 className="mb-2 flex items-center gap-2 font-black">
                    <AlertTriangle size={18} />
                    Novo aviso de manutenção
                  </h3>
                  <p className="mb-4 text-sm text-zinc-500">
                    A mensagem aparece para usuários, técnicos e administradores
                    enquanto estiver ativa e dentro do período configurado.
                  </p>
                  <form onSubmit={criarAvisoManutencao} className="space-y-3">
                    <Field label="Título">
                      <Input
                        required
                        value={novoAviso.titulo}
                        onChange={(e) =>
                          setNovoAviso({ ...novoAviso, titulo: e.target.value })
                        }
                      />
                    </Field>
                    <Field label="Mensagem">
                      <Textarea
                        required
                        value={novoAviso.mensagem}
                        onChange={(e) =>
                          setNovoAviso({
                            ...novoAviso,
                            mensagem: e.target.value,
                          })
                        }
                      />
                    </Field>
                    <Field label="Tipo">
                      <Select
                        value={novoAviso.tipo}
                        onChange={(e) =>
                          setNovoAviso({ ...novoAviso, tipo: e.target.value })
                        }
                      >
                        <option value="info">Informativo</option>
                        <option value="warning">Atenção</option>
                        <option value="danger">Crítico</option>
                        <option value="success">Sucesso</option>
                      </Select>
                    </Field>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Início opcional">
                        <Input
                          type="datetime-local"
                          value={novoAviso.inicio_em}
                          onChange={(e) =>
                            setNovoAviso({
                              ...novoAviso,
                              inicio_em: e.target.value,
                            })
                          }
                        />
                      </Field>
                      <Field label="Fim opcional">
                        <Input
                          type="datetime-local"
                          value={novoAviso.fim_em}
                          onChange={(e) =>
                            setNovoAviso({
                              ...novoAviso,
                              fim_em: e.target.value,
                            })
                          }
                        />
                      </Field>
                    </div>
                    <label className="flex items-center gap-2 text-sm font-bold">
                      <input
                        type="checkbox"
                        checked={novoAviso.ativo}
                        onChange={(e) =>
                          setNovoAviso({
                            ...novoAviso,
                            ativo: e.target.checked,
                          })
                        }
                      />{" "}
                      Ativo imediatamente
                    </label>
                    <Button className="w-full">
                      <AlertTriangle size={16} />
                      Publicar aviso
                    </Button>
                  </form>
                </Card>

                <Card>
                  <h3 className="mb-4 font-black">Avisos cadastrados</h3>
                  <div className="space-y-3">
                    {avisosAdmin.length === 0 && (
                      <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-zinc-500">
                        Nenhum aviso cadastrado.
                      </p>
                    )}
                    {avisosAdmin.map((aviso) => (
                      <div
                        key={aviso.id}
                        className={`rounded-2xl border p-4 ${dark ? "border-white/10 bg-white/5" : "border-zinc-200 bg-white"}`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-black">{aviso.titulo}</p>
                            <p className={`mt-1 text-sm ${mutedText}`}>
                              {aviso.mensagem}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Badge>{aviso.tipo}</Badge>
                              <Badge
                                className={
                                  aviso.ativo
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                    : "border-zinc-200 bg-zinc-50 text-zinc-600"
                                }
                              >
                                {aviso.ativo ? "Ativo" : "Inativo"}
                              </Badge>
                              {aviso.inicio_em && (
                                <Badge>
                                  Início: {formatDate(aviso.inicio_em)}
                                </Badge>
                              )}
                              {aviso.fim_em && (
                                <Badge>Fim: {formatDate(aviso.fim_em)}</Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => alternarAvisoManutencao(aviso)}
                            >
                              {aviso.ativo ? "Desativar" : "Ativar"}
                            </Button>
                            <Button
                              type="button"
                              variant="danger"
                              onClick={() => removerAvisoManutencao(aviso.id)}
                            >
                              <Trash2 size={16} />
                              Apagar
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {tab === "relatorios" && (
              <ModuleBoundary fallback={<div className="ds-empty-state"><RefreshCw className="ds-empty-state__icon animate-spin"/><strong>Carregando relatórios…</strong></div>}><ReportsWorkspace
                chamados={dadosRelatorio}
                dark={dark}
                onDownload={(format, filtrosRelatorio) =>
                  baixarRelatorio(format, filtrosRelatorio)
                }
              /></ModuleBoundary>
            )}
            {tab === "diagnostico" && <ModuleBoundary fallback={<div className="ds-empty-state"><RefreshCw className="ds-empty-state__icon animate-spin"/><strong>Carregando diagnóstico…</strong></div>}><SystemDiagnosticsPage dark={dark} /></ModuleBoundary>}
          </main>
        </div>
      </div>
      <nav
        className={`fixed inset-x-0 bottom-0 z-40 border-t px-2 pb-[calc(env(safe-area-inset-bottom)+6px)] pt-2 shadow-[0_-10px_28px_rgba(15,23,42,0.16)] backdrop-blur lg:hidden ${dark ? "border-white/10 bg-[#101827]/95" : "border-zinc-200 bg-white/95"}`}
      >
        <div className="mx-auto grid max-w-md grid-cols-6 items-end gap-1">
          <MobileNavButton
            icon={<LayoutDashboard size={21} />}
            label="Início"
            active={tab === "dashboard"}
            dark={dark}
            onClick={() => {
              setTab("dashboard");
              setMenuMaisAdmin(false);
            }}
          />
          <MobileNavButton
            icon={<Headphones size={21} />}
            label="Atendimento"
            active={["fila","kanban","chamados","historico"].includes(tab)}
            dark={dark}
            onClick={() => {
              setTab("fila");
              setMenuMaisAdmin(false);
            }}
            badge={
              filaChamados.length ? String(filaChamados.length) : undefined
            }
          />
          {administrador ? (
            <MobileNavButton
              icon={<Users size={21} />}
              label="Equipe"
              active={["usuarios","acessos","carteira","teams"].includes(tab)}
              dark={dark}
              onClick={() => {
                setTab("usuarios");
                setMenuMaisAdmin(false);
              }}
            />
          ) : (
            <MobileNavButton
              icon={<Star size={21} />}
              label="Avaliação"
              active={tab === "satisfacao"}
              dark={dark}
              onClick={() => {
                setTab("satisfacao");
                setMenuMaisAdmin(false);
              }}
            />
          )}
          <MobileNavButton
            icon={<BarChart3 size={21} />}
            label="Indicadores"
            active={["relatorios","satisfacao","indicadores_operacao","indicadores_sla","indicadores_tecnicos","indicadores_ativos"].includes(tab)}
            dark={dark}
            onClick={() => {
              setTab(tecnico?"satisfacao":"indicadores_operacao");
              setMenuMaisAdmin(false);
            }}
          />
          <MobileNavButton
            icon={<BookOpen size={21} />}
            label="Base"
            active={tab === "base"}
            dark={dark}
            onClick={() => {
              setTab("base");
              setMenuMaisAdmin(false);
            }}
          />
          <MobileNavButton
            icon={<Menu size={21} />}
            label="Mais"
            active={
              menuMaisAdmin ||
              [
                "patrimonio",
                "catalogos",
                "configuracoes",
                "config_sla",
                "config_integracoes",
                "manutencao",
                "diagnostico",
              ].includes(tab)
            }
            dark={dark}
            onClick={() => setMenuMaisAdmin(true)}
            badge={unread > 0 ? String(unread) : undefined}
          />
        </div>
      </nav>

      {menuMaisAdmin && (
        <MobileMoreSheet
          title="Mais opções"
          dark={dark}
          onClose={() => setMenuMaisAdmin(false)}
        >
          <MobileMoreAction
            icon={<Filter size={18} />}
            label="Filtros"
            badge={filtrosAtivos > 0 ? `${filtrosAtivos} ativo(s)` : undefined}
            onClick={() => {
              setTab("kanban");
              setMostrarFiltros(true);
              setMenuMaisAdmin(false);
            }}
          />
          <MobileMoreAction
            icon={<Bell size={18} />}
            label="Notificações"
            badge={unread > 0 ? `${unread} nova(s)` : undefined}
            onClick={() => {
              setMenuMaisAdmin(false);
              abrirPainelNotificacoes();
            }}
          />
          <MobileMoreAction
            icon={<MapPinned size={18} />}
            label="Ativos"
            onClick={() => {
              setTab("patrimonio");
              setMenuMaisAdmin(false);
            }}
          />
          {(administrador||desenvolvedor) && (
            <MobileMoreAction
              icon={<Settings size={18} />}
              label="Ajustes"
              onClick={() => {
                setTab(desenvolvedor?"configuracoes":"catalogos");
                setMenuMaisAdmin(false);
              }}
            />
          )}
          <MobileMoreAction
            icon={dark ? <Sun size={18} /> : <Moon size={18} />}
            label={dark ? "Tema claro" : "Tema escuro"}
            onClick={() => setDark((valor) => !valor)}
          />
          <MobileMoreAction
            icon={<ListChecks size={18} />}
            label={modoCompacto ? "Visual confortável" : "Visual compacto"}
            onClick={() => setModoCompacto((valor) => !valor)}
          />
          <MobileMoreAction
            icon={<User size={18} />}
            label="Perfil"
            onClick={() => {
              setMostrarPerfil(true);
              setMenuMaisAdmin(false);
            }}
          />
          <MobileMoreAction
            icon={<LogOut size={18} />}
            label="Sair"
            danger
            onClick={() => {
              setMenuMaisAdmin(false);
              onLogout();
            }}
          />
        </MobileMoreSheet>
      )}

      {mostrarFiltros && (
        <div className="fixed inset-x-0 bottom-0 top-14 z-50 flex justify-end">
          <button
            type="button"
            aria-label="Fechar filtros"
            className="absolute inset-0 bg-slate-950/35 backdrop-blur-[1px]"
            onClick={() => setMostrarFiltros(false)}
          />

          <aside
            className={`relative z-10 flex h-full w-full max-w-[420px] flex-col border-l shadow-2xl ${dark ? "border-white/10 bg-[#101827] text-white" : "border-zinc-200 bg-white text-zinc-900"}`}
          >
            <div
              className={`flex items-start justify-between gap-3 border-b px-5 py-4 ${dark ? "border-white/10" : "border-zinc-100"}`}
            >
              <div>
                <p className="flex items-center gap-2 text-base font-black">
                  <Filter size={18} />
                  Filtros de chamados
                </p>
                <p className={`mt-1 text-xs ${mutedText}`}>
                  Refine o Kanban sem ocupar espaço da tela.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMostrarFiltros(false)}
                className={`rounded-xl p-2 transition ${dark ? "text-white/60 hover:bg-white/10 hover:text-white" : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"}`}
                title="Fechar filtros"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={aplicarFiltros}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="min-h-0 flex-1 space-y-4 overflow-auto px-5 py-5">
                <Field label="Pesquisa">
                  <div className="relative">
                    <Search
                      className="absolute left-3 top-3 text-zinc-400"
                      size={16}
                    />
                    <Input
                      placeholder="Número, título ou descrição"
                      value={filtros.q || ""}
                      onChange={(e) =>
                        setFiltros({ ...filtros, q: e.target.value })
                      }
                      className="pl-9"
                    />
                  </div>
                </Field>

                {filtrosSalvos.length > 0 && (
                  <Field label="Filtros salvos">
                    <div className="grid gap-2">
                      {filtrosSalvos.slice(0, 5).map((filtro) => (
                        <button
                          key={filtro.id}
                          type="button"
                          onClick={() => aplicarFiltroSalvo(filtro)}
                          className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-left text-xs font-bold text-zinc-700 hover:bg-blue-50 hover:text-blue-700"
                        >
                          {filtro.nome}
                        </button>
                      ))}
                    </div>
                  </Field>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Status">
                    <Select
                      value={filtros.status || ""}
                      onChange={(e) =>
                        setFiltros({ ...filtros, status: e.target.value })
                      }
                    >
                      <option value="">Todos</option>
                      {STATUS_OPCOES.map((s) => (
                        <option key={s} value={s}>{ticketStatusLabel(s)}</option>
                      ))}
                    </Select>
                  </Field>

                  <Field label="Prioridade">
                    <Select
                      value={filtros.prioridade || ""}
                      onChange={(e) =>
                        setFiltros({ ...filtros, prioridade: e.target.value })
                      }
                    >
                      <option value="">Todas</option>
                      {PRIORIDADES.map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                    </Select>
                  </Field>
                </div>

                <Field label="Departamento">
                  <Select
                    value={filtros.departamento || ""}
                    onChange={(e) =>
                      setFiltros({ ...filtros, departamento: e.target.value })
                    }
                  >
                    <option value="">Todos os departamentos</option>
                    {departamentos.map((d) => (
                      <option key={d.id}>{d.nome}</option>
                    ))}
                  </Select>
                </Field>

                <Field label="Técnico responsável">
                  <Select
                    value={String(filtros.responsavel_id || "")}
                    onChange={(e) =>
                      setFiltros({ ...filtros, responsavel_id: e.target.value })
                    }
                  >
                    <option value="">Todos os técnicos</option>
                    {equipe.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nome}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label="Tipo de chamado">
                  <Select
                    value={filtros.tipo_chamado || ""}
                    onChange={(e) =>
                      setFiltros({ ...filtros, tipo_chamado: e.target.value })
                    }
                  >
                    <option value="">Todos os tipos</option>
                    {tipos.map((t) => (
                      <option key={t.id}>{t.nome}</option>
                    ))}
                  </Select>
                </Field>

                <Field label="Solicitante">
                  <Input
                    placeholder="Nome ou e-mail do solicitante"
                    value={filtros.usuario || ""}
                    onChange={(e) =>
                      setFiltros({ ...filtros, usuario: e.target.value })
                    }
                  />
                </Field>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Data inicial">
                    <Input
                      type="date"
                      value={filtros.data_inicio || ""}
                      onChange={(e) =>
                        setFiltros({ ...filtros, data_inicio: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Data final">
                    <Input
                      type="date"
                      value={filtros.data_fim || ""}
                      onChange={(e) =>
                        setFiltros({ ...filtros, data_fim: e.target.value })
                      }
                    />
                  </Field>
                </div>

                <label
                  className={`flex items-center gap-3 rounded-2xl border p-4 text-sm font-bold ${dark ? "border-white/10 bg-white/5 text-white/75" : "border-zinc-200 bg-zinc-50 text-zinc-700"}`}
                >
                  <input
                    type="checkbox"
                    checked={Boolean(filtros.vencidos)}
                    onChange={(e) =>
                      setFiltros({ ...filtros, vencidos: e.target.checked })
                    }
                  />
                  Mostrar somente chamados vencidos
                </label>
              </div>

              <div
                className={`flex gap-3 border-t p-5 ${dark ? "border-white/10" : "border-zinc-100"}`}
              >
                <Button className="flex-1">
                  <Search size={16} />
                  Aplicar
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={limparFiltros}
                >
                  Limpar
                </Button>
              </div>
            </form>
          </aside>
        </div>
      )}

      {mostrarPerfil && (
        <ProfileCenter
          profile={usuario as ApiUsuario}
          draft={perfilForm}
          setDraft={(draft) => setPerfilForm({ ...perfilForm, ...draft })}
          photo={fotoPerfil}
          initials={inicialPerfil}
          uploading={enviandoFoto}
          saving={salvandoPerfil}
          dark={dark}
          stats={{
            abertos: chamados.filter(
              (item) => normalizeStatus(item.status) === TICKET_STATUS.OPEN,
            ).length,
            andamento: chamados.filter(
              (item) => normalizeStatus(item.status) === TICKET_STATUS.IN_PROGRESS,
            ).length,
            concluidos: chamados.filter(
              (item) => normalizeStatus(item.status) === TICKET_STATUS.CLOSED,
            ).length,
            atrasados: chamados.filter((item) => Boolean(item.vencido)).length,
          }}
          onSave={salvarPerfilAdmin}
          onPhoto={trocarFotoPerfil}
          onRemovePhoto={removerFotoPerfil}
          onClose={() => setMostrarPerfil(false)}
          onLogout={onLogout}
        />
      )}

      <PushNotificationOnboarding userId={usuario.id} />

      {false && mostrarPerfil && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            aria-label="Fechar perfil"
            className="absolute inset-0 bg-slate-950/35 backdrop-blur-[1px]"
            onClick={() => setMostrarPerfil(false)}
          />

          <aside
            className={`relative z-10 flex h-full w-full max-w-[430px] flex-col border-l shadow-2xl ${dark ? "border-white/10 bg-[#101827] text-white" : "border-zinc-200 bg-white text-zinc-900"}`}
          >
            <div
              className={`flex items-start justify-between gap-3 border-b px-5 py-4 ${dark ? "border-white/10" : "border-zinc-100"}`}
            >
              <div>
                <p className="flex items-center gap-2 text-base font-black">
                  <UserCog size={18} />
                  Perfil do administrador
                </p>
                <p className={`mt-1 text-xs ${mutedText}`}>
                  Foto, dados pessoais e acesso da conta.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMostrarPerfil(false)}
                className={`rounded-xl p-2 transition ${dark ? "text-white/60 hover:bg-white/10 hover:text-white" : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"}`}
                title="Fechar perfil"
              >
                <X size={18} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-auto px-5 py-5">
              <div
                className={`rounded-3xl border p-5 text-center ${dark ? "border-white/10 bg-white/5" : "border-zinc-200 bg-zinc-50"}`}
              >
                <div className="mx-auto mb-3 grid h-28 w-28 place-items-center overflow-hidden rounded-full border-4 border-white bg-gradient-to-br from-blue-500 to-sky-400 text-4xl font-black text-white shadow-xl">
                  {fotoPerfil ? (
                    <img
                      src={fotoPerfil}
                      alt={usuario.nome}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    inicialPerfil
                  )}
                </div>
                <h3 className="text-lg font-black">{usuario.nome}</h3>
                <p className={`text-sm ${mutedText}`}>{usuario.email}</p>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  <Badge className="border-blue-200 bg-blue-50 text-blue-700">
                    {perfilLabel(usuario.perfil)}
                  </Badge>
                  {usuario.departamento && (
                    <Badge className="border-zinc-200 bg-white text-zinc-600">
                      {usuario.departamento}
                    </Badge>
                  )}
                </div>

                <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                  <label
                    className={`inline-flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition ${enviandoFoto ? "pointer-events-none opacity-60" : ""} ${dark ? "bg-white text-zinc-900 hover:bg-white/90" : "bg-blue-600 text-white shadow-lg shadow-blue-100 hover:bg-blue-700"}`}
                  >
                    <Camera size={16} />
                    {enviandoFoto
                      ? "Enviando..."
                      : fotoPerfil
                        ? "Trocar foto"
                        : "Adicionar foto"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      className="hidden"
                      onChange={trocarFotoPerfil}
                    />
                  </label>
                  {fotoPerfil && (
                    <Button
                      type="button"
                      variant="secondary"
                      className="flex-1"
                      disabled={enviandoFoto}
                      onClick={removerFotoPerfil}
                    >
                      <Trash2 size={16} />
                      Remover
                    </Button>
                  )}
                </div>
                <p className={`mt-3 text-xs ${mutedText}`}>
                  Use PNG, JPG, JPEG ou WEBP até 3 MB.
                </p>
              </div>

              <form onSubmit={salvarPerfilAdmin} className="mt-5 space-y-4">
                <Field label="Nome">
                  <Input
                    required
                    value={perfilForm.nome}
                    onChange={(e) =>
                      setPerfilForm({ ...perfilForm, nome: e.target.value })
                    }
                  />
                </Field>

                <Field label="E-mail">
                  <Input
                    value={usuario.email}
                    disabled
                    className="cursor-not-allowed bg-zinc-100 text-zinc-500"
                  />
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Telefone">
                    <Input
                      value={perfilForm.telefone}
                      onChange={(e) =>
                        setPerfilForm({
                          ...perfilForm,
                          telefone: e.target.value,
                        })
                      }
                      placeholder="(00) 00000-0000"
                    />
                  </Field>
                  <Field label="Cargo">
                    <Input
                      value={perfilForm.cargo}
                      onChange={(e) =>
                        setPerfilForm({ ...perfilForm, cargo: e.target.value })
                      }
                      placeholder="Administrador"
                    />
                  </Field>
                </div>

                <Field label="Departamento">
                  <Input
                    value={perfilForm.departamento}
                    onChange={(e) =>
                      setPerfilForm({
                        ...perfilForm,
                        departamento: e.target.value,
                      })
                    }
                    placeholder="TI, Suporte, Operações..."
                  />
                </Field>

                <Button className="w-full" disabled={salvandoPerfil}>
                  <UserCheck size={16} />
                  {salvandoPerfil ? "Salvando..." : "Salvar perfil"}
                </Button>
              </form>
            </div>

            <div
              className={`border-t p-5 ${dark ? "border-white/10" : "border-zinc-100"}`}
            >
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={onLogout}
              >
                <LogOut size={16} />
                Sair da conta
              </Button>
            </div>
          </aside>
        </div>
      )}

      {usuarioPermissoes && (
        <PermissionDialog
          user={usuarioPermissoes}
          dark={dark}
          onClose={() => setUsuarioPermissoes(null)}
          onSaved={() => toast.success("Permissões atualizadas.")}
        />
      )}

      {usuarioEditando && desenvolvedor && (
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
      )}

      {selecionado && (
        <ChamadoDetalhe
          chamado={selecionado}
          usuario={usuario}
          equipe={equipe}
          respostasRapidas={respostasRapidas}
          onAssumir={assumirChamadoAdmin}
          somenteLeitura={detalheSomenteLeitura}
          onClose={() => {
            setSelecionado(null);
            setDetalheSomenteLeitura(false);
          }}
          onRefresh={async () => {
            const atualizado = await buscarChamado(selecionado.id);
            sincronizarChamadoEquipe(atualizado);
          }}
        />
      )}
    </div>
  );
}
