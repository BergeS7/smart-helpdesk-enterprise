/**
 * Responsabilidade: Cartão de reabertura de chamado concluído, com validação do motivo e retorno de erros ao usuário.
 */
import { RotateCcw } from "lucide-react";
import { useState, type FormEvent } from "react";
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

  async function submit(event: FormEvent) {
    event.preventDefault();
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
        <form onSubmit={submit} className="space-y-3">
          <Textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Explique por que o problema não foi resolvido"
            aria-label="Motivo da reabertura"
          />
          <Button variant="secondary" className="w-full" disabled={sending}>
            {sending ? "Reabrindo..." : "Reabrir"}
          </Button>
          {prazo && (
            <p className="text-center text-[11px] text-zinc-500">
              Disponível até {prazo.toLocaleDateString("pt-BR")}.
            </p>
          )}
        </form>
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
