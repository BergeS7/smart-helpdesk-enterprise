/**
 * Responsabilidade: barra lateral do portal (desktop): navegação entre as áreas do solicitante.
 */
import { BarChart3, BookOpen, Download, LayoutDashboard, Phone, LogOut, MapPinned, Moon, ShieldCheck, Sun, Ticket, Trophy } from "lucide-react";
import { UsuarioSidebarButton } from "../PortalComponents";
import type { PainelPortal } from "../useUserPortal";

export function SidebarUsuario({ portal }: { portal: PainelPortal }) {
  const { onLogout, tab, setTab, setNotificacoesAberta, setMostrarPerfil, temaEscuroUsuario, setTemaEscuroUsuario, permissoesUsuario, usuarioAtual, sistemaNome, sistemaLogo1, suporteEmail, fotoPerfil, inicialPerfil, podeAcessarRelatorios, abrirSuporteUsuario } = portal;
  return (
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
  );
}
