/**
 * Responsabilidade: confirmação do técnico extra (acima da faixa do plano) antes de criar, aprovar ou
 * editar alguém da equipe. A ação chama o servidor; se ele responder TECNICO_EXTRA, o modal mostra o
 * impacto na mensalidade e, confirmado, a ação é repetida com a confirmação.
 */
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ApiError } from "../../services/api";
import { Button, Modal } from "./FormPrimitives";

export type ImpactoTecnicoExtra = {
  plano_nome: string;
  tecnicos_incluidos: number;
  tecnicos_depois: number;
  valor_tecnico_extra: number;
  mensalidade_atual: number;
  mensalidade_nova: number;
};

type Pedido = { impacto: ImpactoTecnicoExtra; responder: (confirmado: boolean) => void };

// Um host por tela; o modal é aberto por promessa para caber no meio de qualquer ação assíncrona.
let mostrar: ((pedido: Pedido) => void) | null = null;

function perguntar(abrir: (pedido: Pedido) => void, impacto: ImpactoTecnicoExtra) {
  return new Promise<boolean>((responder) => abrir({ impacto, responder }));
}

/**
 * Executa a ação e, se o servidor avisar que ela cria um técnico além da faixa do plano (cobrado à parte),
 * pergunta ao admin e repete com a confirmação. Recusou: devolve null e nada muda.
 */
export async function comConfirmacaoDeTecnicoExtra<T>(
  acao: (confirmarExtra: boolean) => Promise<T>,
): Promise<T | null> {
  try {
    return await acao(false);
  } catch (error) {
    // Sem o host na tela, o aviso do servidor aparece como erro comum em vez de sumir.
    if (!(error instanceof ApiError) || error.dados?.codigo !== "TECNICO_EXTRA" || !mostrar) throw error;
    if (!(await perguntar(mostrar, error.dados.impacto as ImpactoTecnicoExtra))) return null;
    return acao(true);
  }
}

const reais = (valor: number) => valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function ConfirmacaoTecnicoExtraHost() {
  const [pedido, setPedido] = useState<Pedido | null>(null);

  useEffect(() => {
    mostrar = setPedido;
    return () => {
      if (mostrar === setPedido) mostrar = null;
    };
  }, []);

  useEffect(() => {
    if (!pedido) return;
    const aoTeclar = (event: KeyboardEvent) => event.key === "Escape" && responder(false);
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  });

  function responder(confirmado: boolean) {
    pedido?.responder(confirmado);
    setPedido(null);
  }

  if (!pedido) return null;
  const { impacto } = pedido;
  // Portal: dentro de abas animadas o transform prende o position fixed.
  return createPortal(
    <Modal title="Técnico além do plano" onClose={() => responder(false)}>
      <div className="space-y-4 text-sm text-zinc-700">
        <p>
          O plano <strong>{impacto.plano_nome}</strong> inclui {impacto.tecnicos_incluidos} técnicos. Com esta
          alteração a equipe passa a ter <strong>{impacto.tecnicos_depois}</strong>, e cada técnico extra custa{" "}
          {reais(impacto.valor_tecnico_extra)}/mês.
        </p>
        <dl className="grid grid-cols-2 gap-3 rounded-xl border border-zinc-200 p-4">
          <div>
            <dt className="text-xs font-bold text-zinc-500">Mensalidade atual</dt>
            <dd className="text-base font-black">{reais(impacto.mensalidade_atual)}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold text-zinc-500">Nova mensalidade</dt>
            <dd className="text-base font-black text-amber-700">{reais(impacto.mensalidade_nova)}</dd>
          </div>
        </dl>
        <p className="text-xs text-zinc-500">O técnico extra entra na próxima cobrança.</p>
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" autoFocus onClick={() => responder(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => responder(true)}>
            Confirmar técnico extra
          </Button>
        </div>
      </div>
    </Modal>,
    document.body,
  );
}
