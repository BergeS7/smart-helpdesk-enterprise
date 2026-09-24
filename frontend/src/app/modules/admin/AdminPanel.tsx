/**
 * Responsabilidade: painel da equipe: layout, navegação e abas (estado em useAdminPanel, abas grandes em ./abas).
 */
import { GlobalCommandPalette } from "../../components/GlobalCommandPalette";
import { ProfileCenter } from "../../components/ProfileCenter";
import { PushNotificationOnboarding } from "../../components/PushNotificationSettings";
import { PermissionDialog } from "../../components/PermissionDialog";
import { BarChart3, Bell, BookOpen, Filter, Headphones, LayoutDashboard, ListChecks, LogOut, MapPinned, Menu, Moon, RefreshCw, Search, Settings, Star, Sun, User, Users, X } from "lucide-react";
import { Toaster, toast } from "sonner";
import { TICKET_STATUS } from "../../domain/ticketStatus";
import { WorkspaceNavigation } from "../../components/WorkspaceNavigation";
import { TicketWorkspaceToolbar } from "../../components/TicketWorkspaceToolbar";
import { ModuleBoundary } from "../../components/ModuleBoundary";
import { aprovarUsuario, atualizarChamado, baixarRelatorio, buscarChamado, excluirUsuarioAdmin, rejeitarUsuario, type ApiUsuario } from "../../services/api";
import { AvisosSistemaBanner, ChamadosListModule, DevelopmentWorkspace, FilaChamadosView, IndicatorsWorkspace, KanbanWorkspace, MySatisfactionPage, OperationalDashboard, PatrimonioMapPage, ReportsWorkspace, SatisfactionAnalyticsPage, SettingsWorkspace, SystemDiagnosticsPage, SystemThemeStyle, UsersModule, chamadoIdFromNotification, formatDate, normalizeStatus, notificacaoClass, notificacaoIcone, variaveisTemaSistema } from "../comum/appShared";
import type { AdminTab } from "../comum/appShared";
import { MobileMoreAction, MobileMoreSheet, MobileNavButton } from "../portal/PortalComponents";
import { CarteiraEquipeView, HistoricoEquipeView } from "./EquipeViews";
import { ChamadoDetalhe } from "../chamados/ChamadoDetalhe";
import { useAdminPanel, type AdminPanelProps } from "./useAdminPanel";
import { AbaConfiguracoesAtalhos } from "./abas/ConfiguracoesAtalhos";
import { AbaEquipes } from "./abas/Equipes";
import { AbaCatalogos } from "./abas/Catalogos";
import { AbaBaseConhecimento } from "./abas/BaseConhecimento";
import { AbaConfiguracoesGerais } from "./abas/ConfiguracoesGerais";
import { AbaManutencao } from "./abas/Manutencao";
import { ModalFiltros } from "./modais/Filtros";
import { ModalEdicaoUsuario } from "./modais/EdicaoUsuario";

// Shell autenticado da equipe, responsável por navegação e dados operacionais.
export function AdminPanel(props: AdminPanelProps) {
  const painel = useAdminPanel(props);
  const {
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
    base,
    respostasRapidas,
    novaResposta,
    setNovaResposta,
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
    aplicarFiltros,
    limparPesquisa,
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
    navigationAreas,
    activeArea,
    activeTab,
    sistemaNome,
    sistemaLogo1,
    unread,
    filtrosAtivos,
    rootClass,
    headerClass,
    mutedText,
    fotoPerfil,
    inicialPerfil,
  } = painel;

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

            {tab === "configuracoes" && <AbaConfiguracoesAtalhos painel={painel} />}

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

            {tab === "teams" && <AbaEquipes painel={painel} />}

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
            {tab === "catalogos" && <AbaCatalogos painel={painel} />}

            {tab === "base" && <AbaBaseConhecimento painel={painel} />}

            {tab === "configuracoes" && <AbaConfiguracoesGerais painel={painel} />}

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

            {tab === "manutencao" && desenvolvedor && <AbaManutencao painel={painel} />}

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

      {mostrarFiltros && <ModalFiltros painel={painel} />}

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

      {usuarioPermissoes && (
        <PermissionDialog
          user={usuarioPermissoes}
          dark={dark}
          onClose={() => setUsuarioPermissoes(null)}
          onSaved={() => toast.success("Permissões atualizadas.")}
        />
      )}

      {usuarioEditando && desenvolvedor && <ModalEdicaoUsuario painel={painel} />}

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
