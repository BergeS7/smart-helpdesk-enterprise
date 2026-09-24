/**
 * Responsabilidade: portal do solicitante: início, chamados, base de conhecimento, avisos e perfil.
 */
import { ProfileCenter } from "../../components/ProfileCenter";
import { PushNotificationOnboarding } from "../../components/PushNotificationSettings";
import { Bell, Plus, RefreshCw, Search, Star, X } from "lucide-react";
import { Toaster, toast } from "sonner";
import { PerformanceRatingCard } from "../../components/PerformanceRatingCard";
import { Card } from "../../components/shared/FormPrimitives";
import { ModuleBoundary } from "../../components/ModuleBoundary";
import { buscarChamado, enviarAvaliacaoPerformance } from "../../services/api";
import { AvisosSistemaBanner, OperationalDashboard, PatrimonioMapPage, SatisfactionRankingPage, SystemThemeStyle, chamadoIdFromNotification, formatDate, notificacaoClass, notificacaoIcone, variaveisTemaSistema } from "../comum/appShared";
import { UsuarioAvisosPanel, UsuarioBaseConhecimento, UsuarioChamadoLista, UsuarioNovoChamadoModal } from "./PortalComponents";
import { ChamadoDetalhe } from "../chamados/ChamadoDetalhe";
import { useUserPortal, type UserPortalProps } from "./useUserPortal";
import { AbaAcessos } from "./abas/Acessos";
import { AbaRelatorios } from "./abas/Relatorios";
import { AbaInicio } from "./abas/Inicio";
import { SidebarUsuario } from "./layout/Sidebar";
import { NavegacaoMobileUsuario } from "./layout/NavegacaoMobile";
import { MenuMaisUsuario } from "./layout/MenuMais";

// Área do solicitante: abertura, consulta, comentários e acompanhamento.
export function UserPortal(props: UserPortalProps) {
  const portal = useUserPortal(props);
  const {
    usuario,
    onLogout,
    configSistema,
    avisosSistema,
    tab,
    setTab,
    perfil,
    setPerfil,
    tipos,
    base,
    artigosBase,
    novo,
    setNovo,
    selecionado,
    setSelecionado,
    avaliando,
    setAvaliando,
    loading,
    modalChamadoAberto,
    setModalChamadoAberto,
    busca,
    setBusca,
    notificacoes,
    notificacoesAberta,
    setNotificacoesAberta,
    carregandoNotificacoes,
    mostrarPerfil,
    setMostrarPerfil,
    enviandoFoto,
    salvandoPerfil,
    temaEscuroUsuario,
    menuMaisUsuario,
    permissoesUsuario,
    dashboardPermitido,
    usuarioAtual,
    sistemaNome,
    sistemaLogo1,
    fotoPerfil,
    inicialPerfil,
    unread,
    chamadosFiltrados,
    podeAcessarRelatorios,
    activeTab,
    carregarNotificacoesUsuario,
    sincronizarChamadoUsuario,
    sincronizarChamadosUsuario,
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
  } = portal;

  const renderConteudo = () => {
    if (tab === "patrimonio" && permissoesUsuario.includes("visualizar_patrimonio")) {
      return <ModuleBoundary fallback={<div className="ds-empty-state"><RefreshCw className="ds-empty-state__icon animate-spin"/><strong>Carregando patrimônio…</strong></div>}><PatrimonioMapPage dark={temaEscuroUsuario}/></ModuleBoundary>;
    }
    if (tab === "ranking" && permissoesUsuario.includes("visualizar_ranking_satisfacao")) {
      return <ModuleBoundary fallback={<div className="ds-empty-state"><RefreshCw className="ds-empty-state__icon animate-spin"/><strong>Carregando ranking…</strong></div>}><SatisfactionRankingPage dark={temaEscuroUsuario}/></ModuleBoundary>;
    }
    if (tab === "acessos") {
      return <AbaAcessos portal={portal} />;
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
      return <AbaRelatorios portal={portal} />;
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

    return <AbaInicio portal={portal} />;
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
        <SidebarUsuario portal={portal} />

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

      <NavegacaoMobileUsuario portal={portal} />

      {menuMaisUsuario && <MenuMaisUsuario portal={portal} />}

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
