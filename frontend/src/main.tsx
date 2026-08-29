/**
 * Responsabilidade: Módulo de main; implementa esta responsabilidade dentro do Smart HelpDesk.
 */

  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import { AppErrorBoundary } from "./app/components/AppErrorBoundary.tsx";
  import { reportFrontendError } from "./app/services/api.ts";
  import "./styles/index.css";

  const CHUNK_RECOVERY_KEY = "smart-helpdesk:chunk-recovery";
  const recoverFromStaleChunk = () => {
    const lastRecovery = Number(sessionStorage.getItem(CHUNK_RECOVERY_KEY) || 0);
    if (Date.now() - lastRecovery < 30_000) return;
    sessionStorage.setItem(CHUNK_RECOVERY_KEY, String(Date.now()));
    const url = new URL(window.location.href);
    url.searchParams.set("app-update", String(Date.now()));
    window.location.replace(url.toString());
  };

  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault();
    recoverFromStaleChunk();
  });

  window.addEventListener("error", (event) => {
    const error = event.error instanceof Error ? event.error : new Error(event.message || "Erro global do frontend");
    void reportFrontendError(error);
  });
  window.addEventListener("unhandledrejection", (event) => {
    const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason || "Promise rejeitada sem tratamento"));
    if (/dynamically imported module|failed to fetch.*module|importing a module script/i.test(error.message)) {
      event.preventDefault();
      recoverFromStaleChunk();
      return;
    }
    void reportFrontendError(error);
  });

  createRoot(document.getElementById("root")!).render(<AppErrorBoundary><App /></AppErrorBoundary>);

  if ("serviceWorker" in navigator && window.isSecureContext) {
    window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined));
  }
  
