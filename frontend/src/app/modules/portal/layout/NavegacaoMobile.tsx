/**
 * Responsabilidade: barra de navegação inferior do portal no celular.
 */
import { BookOpen, LayoutDashboard, Menu, Plus, Ticket } from "lucide-react";
import { MobileNavButton } from "../PortalComponents";
import type { PainelPortal } from "../useUserPortal";

export function NavegacaoMobileUsuario({ portal }: { portal: PainelPortal }) {
  const { tab, setTab, setModalChamadoAberto, setNotificacoesAberta, menuMaisUsuario, setMenuMaisUsuario, unread } = portal;
  return (
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
  );
}
