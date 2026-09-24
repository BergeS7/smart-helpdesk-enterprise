/**
 * Responsabilidade: painel de avisos e notificações do solicitante.
 */
import { CheckCircle2, RefreshCw } from "lucide-react";
import { Button } from "../../../components/shared/FormPrimitives";
import { type Notificacao } from "../../../services/api";
import { formatDate, notificacaoClass, notificacaoIcone } from "../../comum/appShared";

export function UsuarioAvisosPanel({
  notificacoes,
  carregando,
  onAbrir,
  onMarcarTodas,
  onAtualizar,
}: {
  notificacoes: Notificacao[];
  carregando: boolean;
  onAbrir: (notificacao: Notificacao) => void;
  onMarcarTodas: () => void;
  onAtualizar: () => Promise<void>;
}) {
  const unread = notificacoes.filter((n) => !n.lida).length;
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-black text-zinc-900">Notificações</h3>
          <p className="text-sm text-zinc-500">{unread} não lida(s)</p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => onAtualizar()}
          >
            <RefreshCw size={16} />
            Atualizar
          </Button>
          <Button type="button" disabled={unread === 0} onClick={onMarcarTodas}>
            <CheckCircle2 size={16} />
            Marcar lidas
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {carregando && notificacoes.length === 0 && (
          <div className="rounded-2xl bg-zinc-50 p-8 text-center text-sm text-zinc-500">
            Carregando notificações...
          </div>
        )}
        {!carregando && notificacoes.length === 0 && (
          <div className="rounded-2xl bg-zinc-50 p-8 text-center text-sm text-zinc-500">
            Nenhuma notificação por enquanto.
          </div>
        )}
        {notificacoes.map((notificacao) => (
          <button
            key={notificacao.id}
            type="button"
            onClick={() => onAbrir(notificacao)}
            className={`flex w-full gap-3 rounded-2xl border p-4 text-left transition ${notificacao.lida ? "border-zinc-200 bg-white hover:bg-zinc-50" : "border-blue-100 bg-blue-50 hover:bg-blue-100"}`}
          >
            <span
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${notificacaoClass(notificacao.tipo)}`}
            >
              {notificacaoIcone(notificacao.tipo)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-start justify-between gap-2">
                <span className="font-black text-zinc-900">
                  {notificacao.titulo}
                </span>
                {!notificacao.lida && (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                )}
              </span>
              <span className="mt-1 block text-sm leading-6 text-zinc-500">
                {notificacao.mensagem}
              </span>
              <span className="mt-2 block text-xs font-bold text-zinc-400">
                {formatDate(notificacao.criado_em)}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
