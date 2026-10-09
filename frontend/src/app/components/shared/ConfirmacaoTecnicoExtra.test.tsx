/**
 * Responsabilidade: modal de confirmação do técnico extra (acima da faixa do plano) antes de criar,
 * aprovar ou editar alguém da equipe.
 */
// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../services/api";
import { ConfirmacaoTecnicoExtraHost, comConfirmacaoDeTecnicoExtra } from "./ConfirmacaoTecnicoExtra";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const impacto = {
  plano: "base", plano_nome: "Base", tecnicos_incluidos: 3, tecnicos_depois: 4,
  valor_tecnico_extra: 49, mensalidade_atual: 399, mensalidade_nova: 448,
};
const avisoExtra = () =>
  new ApiError("Este técnico passa da faixa do plano Base.", 409, { codigo: "TECNICO_EXTRA", erro: "Este técnico passa da faixa do plano Base.", impacto });

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<ConfirmacaoTecnicoExtraHost />));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const botao = (texto: string) =>
  [...document.querySelectorAll("button")].find((b) => b.textContent === texto) as HTMLButtonElement;

// Dispara a ação e espera o modal abrir; o resultado vem embrulhado para não ser aguardado aqui.
async function iniciar<T>(acao: (confirmar: boolean) => Promise<T>) {
  let resultado!: Promise<T | null>;
  await act(async () => { resultado = comConfirmacaoDeTecnicoExtra(acao); });
  return { resultado };
}

describe("confirmação de técnico extra", () => {
  it("dentro da faixa executa direto, sem abrir o modal", async () => {
    const acao = vi.fn(async () => "ok");
    await expect((await iniciar(acao)).resultado).resolves.toBe("ok");
    expect(acao).toHaveBeenCalledWith(false);
    expect(document.body.textContent).not.toContain("Técnico além do plano");
  });

  it("acima da faixa mostra a mensalidade nova e, confirmado, repete com a confirmação", async () => {
    const acao = vi.fn(async (confirmado: boolean) => {
      if (!confirmado) throw avisoExtra();
      return "criado";
    });
    const { resultado } = await iniciar(acao);
    expect(document.body.textContent).toContain("Técnico além do plano");
    expect(document.body.textContent).toMatch(/R\$\s?399,00/);
    expect(document.body.textContent).toMatch(/R\$\s?448,00/);
    await act(async () => botao("Confirmar técnico extra").click());
    await expect(resultado).resolves.toBe("criado");
    expect(acao).toHaveBeenLastCalledWith(true);
    expect(document.body.textContent).not.toContain("Técnico além do plano");
  });

  it("se o admin cancela, nada é refeito", async () => {
    const acao = vi.fn(async () => { throw avisoExtra(); });
    const { resultado } = await iniciar(acao);
    await act(async () => botao("Cancelar").click());
    await expect(resultado).resolves.toBeNull();
    expect(acao).toHaveBeenCalledTimes(1);
  });

  it("Esc também cancela", async () => {
    const acao = vi.fn(async () => { throw avisoExtra(); });
    const { resultado } = await iniciar(acao);
    await act(async () => { window.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape" })); });
    await expect(resultado).resolves.toBeNull();
  });

  it("outros erros seguem para quem chamou", async () => {
    await expect(comConfirmacaoDeTecnicoExtra(async () => { throw new ApiError("E-mail duplicado", 409, { erro: "E-mail duplicado" }); }))
      .rejects.toThrow("E-mail duplicado");
  });

  it("sem o modal na tela, o aviso aparece como erro comum", async () => {
    act(() => root.unmount());
    await expect(comConfirmacaoDeTecnicoExtra(async () => { throw avisoExtra(); })).rejects.toThrow("plano Base");
    root = createRoot(container);
  });
});
