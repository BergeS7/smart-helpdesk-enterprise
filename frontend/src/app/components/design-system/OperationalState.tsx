/**
 * Responsabilidade: Componente de interface de operational state; apresenta dados e interações do usuário.
 */
import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Inbox, LoaderCircle, RefreshCw } from "lucide-react";

export function LoadingState({ label="Carregando dados…" }: { label?:string }) {
  return <div className="ds-empty-state" role="status" aria-live="polite"><LoaderCircle className="ds-empty-state__icon animate-spin text-blue-600"/><strong>{label}</strong><p>Aguarde enquanto consultamos o servidor.</p></div>;
}

export function ErrorState({ message="Não foi possível carregar os dados.", onRetry }: { message?:string; onRetry?:()=>void }) {
  return <div className="ds-empty-state" role="alert"><AlertTriangle className="ds-empty-state__icon text-red-600"/><strong>Algo deu errado</strong><p>{message}</p>{onRetry?<button onClick={onRetry} className="ds-button ds-button--secondary inline-flex items-center gap-2"><RefreshCw size={15}/>Tentar novamente</button>:null}</div>;
}

export function EmptyState({ title="Nenhum registro encontrado", description="Não há dados para exibir neste momento.", icon:Icon=Inbox }: { title?:string;description?:string;icon?:LucideIcon }) {
  return <div className="ds-empty-state"><Icon className="ds-empty-state__icon"/><strong>{title}</strong><p>{description}</p></div>;
}
