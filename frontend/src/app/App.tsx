/**
 * Responsabilidade: composição principal da aplicação Smart HelpDesk.
 * Escolhe entre login, portal do solicitante e painel da equipe; cada jornada fica em modules/*.
 */
import { useEffect, useState } from "react";
import { LegalComplianceLayer } from "./components/LegalComplianceLayer";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";
import { LoginMotorcycleLoader } from "./components/LoginMotorcycleLoader";
import { RefreshCw } from "lucide-react";
import { listarAvisosSistemaAtivos, obterConfiguracoesSistema, type ApiAvisoSistema, type ConfiguracoesSistema } from "./services/api";
import { useSmartHelpDeskSession } from "./hooks/useSmartHelpDeskSession";
import { CONFIG_SISTEMA_PADRAO, isEquipeApp } from "./modules/comum/appShared";
import { LoginScreen } from "./modules/login/LoginScreen";
import { AtivacaoEmpresa } from "./modules/login/AtivacaoEmpresa";
import { UserPortal } from "./modules/portal/UserPortal";
import { AdminPanel } from "./modules/admin/AdminPanel";

// Páginas públicas abertas por link: liberação do admin da empresa e cadastro da equipe de uma empresa.
function lerRotaPublica(caminho: string): { ativar?: string; cadastro?: string } {
  const ativar = /^\/ativar\/([A-Za-z0-9_-]{20,})\/?$/.exec(caminho);
  if (ativar) return { ativar: ativar[1] };
  const cadastro = /^\/cadastro\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/.exec(caminho);
  return cadastro ? { cadastro: cadastro[1] } : {};
}

export default function App() {
  const [rotaPublica] = useState(() => lerRotaPublica(window.location.pathname));
  const { usuario, setUsuario, usuarioEntrando, sessaoVerificada, logout, authenticated } = useSmartHelpDeskSession();
  const [configSistemaGlobal, setConfigSistemaGlobal] =
    useState<ConfiguracoesSistema>(CONFIG_SISTEMA_PADRAO);
  const [avisosSistemaGlobal, setAvisosSistemaGlobal] = useState<
    ApiAvisoSistema[]
  >([]);

  useEffect(() => {
    obterConfiguracoesSistema()
      .then((config) =>
        setConfigSistemaGlobal({ ...CONFIG_SISTEMA_PADRAO, ...config }),
      )
      .catch(() => {});
    listarAvisosSistemaAtivos()
      .then(setAvisosSistemaGlobal)
      .catch(() => {});
  }, []);

  const content = rotaPublica.ativar ? (
    <AtivacaoEmpresa token={rotaPublica.ativar} configSistema={configSistemaGlobal} />
  ) : !sessaoVerificada ? (
    <div className="grid min-h-screen place-items-center bg-zinc-50 text-zinc-900">
      <div className="flex items-center gap-3 text-sm font-bold">
        <RefreshCw size={20} className="animate-spin text-blue-600" />
        Validando sessão…
      </div>
    </div>
  ) : !usuario ? (
    <LoginScreen
      onLogin={authenticated}
      configSistema={configSistemaGlobal}
      avisosSistema={avisosSistemaGlobal}
      empresaCadastroSlug={rotaPublica.cadastro}
    />
  ) : isEquipeApp(usuario.perfil) ? (
    <AdminPanel
      usuario={usuario}
      setUsuario={setUsuario}
      onLogout={logout}
      configSistemaInicial={configSistemaGlobal}
      onConfigSistemaChange={setConfigSistemaGlobal}
      avisosSistema={avisosSistemaGlobal}
      onAvisosSistemaChange={setAvisosSistemaGlobal}
    />
  ) : (
    <UserPortal
      usuario={usuario}
      setUsuario={setUsuario}
      onLogout={logout}
      configSistema={configSistemaGlobal}
      avisosSistema={avisosSistemaGlobal}
    />
  );
  return (
    <>
      {content}
      {usuarioEntrando && <LoginMotorcycleLoader name={usuarioEntrando.nome} />}
      <PWAInstallPrompt />
      <LegalComplianceLayer />
    </>
  );
}
