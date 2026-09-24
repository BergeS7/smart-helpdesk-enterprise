/**
 * Responsabilidade: Componente de interface de app error boundary; apresenta dados e interações do usuário.
 */
import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, RotateCcw } from "lucide-react";
import { reportFrontendError } from "../services/api";
import { isStaleChunkError, recoverFromStaleChunk } from "../utils/chunkRecovery";

type State = { error: Error | null };

export class AppErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State { return { error }; }

  componentDidCatch(error: Error, info: ErrorInfo) {
    void reportFrontendError(error, info.componentStack || undefined);
    if (isStaleChunkError(error)) recoverFromStaleChunk();
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    return <main className="grid min-h-screen place-items-center bg-slate-50 p-5 text-slate-900">
      <section className="ds-card w-full max-w-lg p-7 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-red-50 text-red-600"><AlertTriangle /></span>
        <h1 className="mt-4 text-xl font-black">Não foi possível exibir esta tela</h1>
        <p className="mt-2 text-sm text-slate-500">O erro foi registrado para diagnóstico. Você pode tentar novamente sem perder sua sessão.</p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <button className="ds-button ds-button--primary inline-flex items-center justify-center gap-2" onClick={this.reset}><RotateCcw size={16}/>Tentar novamente</button>
          <button className="ds-button ds-button--secondary inline-flex items-center justify-center gap-2" onClick={() => window.location.reload()}><RefreshCw size={16}/>Recarregar sistema</button>
        </div>
        <details className="mt-5 rounded-xl bg-slate-100 p-3 text-left text-xs text-slate-600"><summary className="cursor-pointer font-bold">Informação técnica</summary><code className="mt-2 block break-words">{this.state.error.message}</code></details>
      </section>
    </main>;
  }
}
