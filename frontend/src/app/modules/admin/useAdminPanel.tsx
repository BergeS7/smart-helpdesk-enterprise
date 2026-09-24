/**
 * Responsabilidade: estado e ações do painel da equipe (carregamentos, filtros, formulários e operações).
 */
import { usePushNavigation } from "../../hooks/usePushNavigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Activity, AlertTriangle, BarChart3, Bell, BookOpen, BrainCircuit, Building2, Clock3, Download, History, LayoutDashboard, ListChecks, MapPinned, Settings, ShieldCheck, Star, Ticket, Users } from "lucide-react";
import { toast } from "sonner";
import { TICKET_STATUS, canonicalTicketStatus } from "../../domain/ticketStatus";
import { useModuleRoute } from "../../routes/useModuleRoute";
import { ADMIN_ROUTES, buildAdminNavigation } from "../../navigation/adminNavigation";
import { assumirChamado, atualizarChamado, atualizarMeuPerfil, atualizarUsuarioAdmin, atualizarMinhaFotoPerfil, atualizarUsuarioLocal, atualizarAvisoSistema, buscarChamado, criarArtigoBase, criarAvisoSistema, criarCatalogo, criarRespostaRapida, criarTeam, excluirAvisoSistema, listarAvisosSistemaAdmin, listarAvisosSistemaAtivos, listarBaseConhecimento, listarCatalogo, listarFiltrosSalvos, listarChamados, listarNotificacoes, listarRespostasRapidas, listarTeams, listarUsuariosAdmin, marcarNotificacoesLidas, obterDashboard, obterMinhasPermissoes, obterConfiguracoesSistema, salvarConfiguracoesSistema, atualizarLogoSistema1, removerMinhaFotoPerfil, type ApiAvisoSistema, type ApiChamado, type ApiUsuario, type ArtigoBase, type CatalogoItem, type DashboardResumo, type FiltrosChamados, type Notificacao, type RespostaRapida, type FiltroSalvo, type ConfiguracoesSistema, type ApiTeam, type UsuarioLogado, type PermissionKey } from "../../services/api";
import { CONFIG_SISTEMA_PADRAO, chamadoIdFromNotification, isAdminApp, isDevApp, isEquipeApp, logoSistema1, nomeSistema, normalizarPerfilApp, ticketFiltersFromUrl } from "../comum/appShared";
import type { AdminTab } from "../comum/appShared";

export type AdminPanelProps = {
  usuario: UsuarioLogado;
  setUsuario: (u: UsuarioLogado) => void;
  onLogout: () => void;
  configSistemaInicial: ConfiguracoesSistema;
  onConfigSistemaChange: (config: ConfiguracoesSistema) => void;
  avisosSistema: ApiAvisoSistema[];
  onAvisosSistemaChange: (avisos: ApiAvisoSistema[]) => void;
};

// Estado, carregamentos e ações do painel da equipe. O AdminPanel e as abas recebem tudo daqui.
export function useAdminPanel({
  usuario,
  setUsuario,
  onLogout,
  configSistemaInicial,
  onConfigSistemaChange,
  avisosSistema,
  onAvisosSistemaChange,
}: AdminPanelProps) {
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

  return {
    usuario,
    onLogout,
    avisosSistema,
    tab,
    setTab,
    dark,
    setDark,
    modoCompacto,
    setModoCompacto,
    dashboard,
    chamados,
    filaChamados,
    carteiraEquipe,
    historicoEquipe,
    usuarios,
    teams,
    novaTeam,
    setNovaTeam,
    departamentos,
    tipos,
    base,
    baseCarregando,
    erroBase,
    respostasRapidas,
    avisosAdmin,
    filtrosSalvos,
    novaResposta,
    setNovaResposta,
    novoAviso,
    setNovoAviso,
    configSistema,
    setConfigSistema,
    enviandoLogoSistema,
    notificacoes,
    notificacoesAberta,
    setNotificacoesAberta,
    carregandoNotificacoes,
    filtros,
    setFiltros,
    mostrarFiltros,
    setMostrarFiltros,
    selecionado,
    setSelecionado,
    detalheSomenteLeitura,
    setDetalheSomenteLeitura,
    dragId,
    setDragId,
    usuarioEditando,
    setUsuarioEditando,
    usuarioForm,
    setUsuarioForm,
    salvandoUsuarioAdmin,
    novoCatalogo,
    setNovoCatalogo,
    novoArtigo,
    setNovoArtigo,
    mostrarPerfil,
    setMostrarPerfil,
    menuMaisAdmin,
    setMenuMaisAdmin,
    buscaGlobalAberta,
    setBuscaGlobalAberta,
    salvandoPerfil,
    enviandoFoto,
    perfilForm,
    setPerfilForm,
    usuarioPermissoes,
    setUsuarioPermissoes,
    desenvolvedor,
    administrador,
    tecnico,
    equipe,
    dadosRelatorio,
    sincronizarChamadoEquipe,
    carregar,
    criarNovaTeam,
    aplicarFiltros,
    limparPesquisa,
    limparFiltros,
    aplicarFiltroSalvo,
    assumirChamadoAdmin,
    criarRespostaRapidaAdmin,
    salvarConfiguracoesAdmin,
    trocarLogoSistema,
    salvarPerfilAdmin,
    trocarFotoPerfil,
    removerFotoPerfil,
    abrirDetalhe,
    moverChamado,
    abrirPainelNotificacoes,
    marcarTodasComoLidas,
    abrirNotificacao,
    abrirEdicaoUsuario,
    salvarEdicaoUsuario,
    criarItemCatalogo,
    criarArtigo,
    criarAvisoManutencao,
    alternarAvisoManutencao,
    removerAvisoManutencao,
    navigationAreas,
    activeArea,
    activeTab,
    sistemaNome,
    sistemaLogo1,
    sistemaLogo2,
    unread,
    filtrosAtivos,
    rootClass,
    headerClass,
    mutedText,
    fotoPerfil,
    inicialPerfil,
  };
}

export type PainelAdmin = ReturnType<typeof useAdminPanel>;
