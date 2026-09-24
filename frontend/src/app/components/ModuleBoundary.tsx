/**
 * Responsabilidade: Isola falhas de um módulo (Fila, Kanban, Relatórios...); o erro aparece só na área do módulo, sem derrubar o sistema.
 */
import { Component, Suspense, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, RotateCcw } from "lucide-react";
import { reportFrontendError } from "../services/api";
import { isStaleChunkError, recoverFromStaleChunk } from "../utils/chunkRecovery";

type Props = { children: ReactNode; fallback: ReactNode };
type State = { error: Error | null };

// Mesmo uso do <Suspense fallback>, acrescentando a captura de erros do módulo carregado.
export class ModuleBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State { return { error }; }

  componentDidCatch(error: Error, info: ErrorInfo) {
    void reportFrontendError(error, info.componentStack || undefined);
    if (isStaleChunkError(error)) recoverFromStaleChunk();
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return <Suspense fallback={this.props.fallback}>{this.props.children}</Suspense>;
    return <div className="ds-empty-state min-h-[320px]" role="alert">
      <AlertTriangle className="ds-empty-state__icon text-red-600"/>
      <strong>Não foi possível exibir este módulo</strong>
      <p>O erro foi registrado para diagnóstico. O restante do sistema continua funcionando.</p>
      <div className="flex flex-col justify-center gap-2 sm:flex-row">
        <button className="ds-button ds-button--primary inline-flex items-center justify-center gap-2" onClick={this.reset}><RotateCcw size={16}/>Tentar novamente</button>
        <button className="ds-button ds-button--secondary inline-flex items-center justify-center gap-2" onClick={() => window.location.reload()}><RefreshCw size={16}/>Recarregar sistema</button>
      </div>
      <details className="max-w-full text-left text-xs text-slate-500"><summary className="cursor-pointer font-bold">Informação técnica</summary><code className="mt-2 block break-words">{this.state.error.message}</code></details>
    </div>;
  }
}
