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
import { UserPortal } from "./modules/portal/UserPortal";
import { AdminPanel } from "./modules/admin/AdminPanel";

export default function App() {
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

  const content = !sessaoVerificada ? (
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
