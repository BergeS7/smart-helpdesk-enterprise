/**
 * Responsabilidade: menu Mais do portal no celular (áreas extras, tema e sair).
 */
import { Bell, Phone, LogOut, MapPinned, Moon, ShieldCheck, Sun, Trophy, User } from "lucide-react";
import { MobileMoreAction, MobileMoreSheet } from "../PortalComponents";
import type { PainelPortal } from "../useUserPortal";

export function MenuMaisUsuario({ portal }: { portal: PainelPortal }) {
  const { onLogout, setTab, setMostrarPerfil, temaEscuroUsuario, setTemaEscuroUsuario, setMenuMaisUsuario, permissoesUsuario, suporteEmail, unread, abrirSuporteUsuario } = portal;
  return (
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
  );
}
