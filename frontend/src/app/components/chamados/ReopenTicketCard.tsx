/**
 * Responsabilidade: Cartão de reabertura de chamado concluído, com validação do motivo e retorno de erros ao usuário.
 */
import { RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button, Card, Textarea } from "../shared/FormPrimitives";
import { REOPEN_WINDOW_DAYS, isReopenWindowOpen, reopenDeadline } from "../../domain/ticketStatus";

export function ReopenTicketCard({
  finalizadoEm,
  isAdmin = false,
  onReopen,
}: {
  finalizadoEm?: string | null;
  isAdmin?: boolean;
  onReopen: (motivo: string) => Promise<void>;
}) {
  const [motivo, setMotivo] = useState("");
  const [sending, setSending] = useState(false);
  // O admin mantém o acesso irrestrito que já tinha antes desta janela de prazo.
  const dentroDoPrazo = isAdmin || isReopenWindowOpen(finalizadoEm);
  const prazo = reopenDeadline(finalizadoEm);

  async function submit() {
    if (!motivo.trim()) {
      toast.error("Explique por que o problema não foi resolvido para reabrir o chamado.");
      return;
    }
    try {
      setSending(true);
      await onReopen(motivo.trim());
      setMotivo("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível reabrir o chamado.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Card>
      <h3 className="mb-3 flex items-center gap-2 font-black">
        <RotateCcw size={18} />
        Reabrir chamado
      </h3>
      {dentroDoPrazo ? (
        // Sem <form>: o registro histórico é aberto em modo leitura, que oculta formulários,
        // mas reabrir continua permitido dentro do prazo — só a edição do conteúdo fica bloqueada.
        <div className="space-y-3">
          <Textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Explique por que o problema não foi resolvido"
            aria-label="Motivo da reabertura"
          />
          <Button type="button" variant="secondary" className="w-full" disabled={sending} onClick={() => void submit()}>
            {sending ? "Reabrindo..." : "Reabrir"}
          </Button>
          {prazo && (
            <p className="text-center text-[11px] text-zinc-500">
              Disponível até {prazo.toLocaleDateString("pt-BR")}.
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-zinc-500">
          O prazo de {REOPEN_WINDOW_DAYS} dias para reabertura terminou
          {prazo ? ` em ${prazo.toLocaleDateString("pt-BR")}` : ""}. Abra um novo chamado se o
          problema continuar.
        </p>
      )}
    </Card>
  );
}
