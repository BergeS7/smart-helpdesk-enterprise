/**
 * Responsabilidade: confirmação do técnico extra (acima da faixa do plano) antes de criar, aprovar ou editar.
 */
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./http";
import { comConfirmacaoDeTecnicoExtra } from "./usuarios";

const avisoExtra = () =>
  new ApiError("Este técnico passa da faixa do plano Base.", 409, {
    codigo: "TECNICO_EXTRA",
    erro: "Este técnico passa da faixa do plano Base.",
  });

describe("confirmação de técnico extra", () => {
  afterEach(() => vi.restoreAllMocks());

  it("dentro da faixa executa direto, sem perguntar", async () => {
    const confirmar = vi.spyOn(window, "confirm");
    const acao = vi.fn(async () => "ok");
    await expect(comConfirmacaoDeTecnicoExtra(acao)).resolves.toBe("ok");
    expect(acao).toHaveBeenCalledWith(false);
    expect(confirmar).not.toHaveBeenCalled();
  });

  it("acima da faixa pergunta e repete com a confirmação", async () => {
    const confirmar = vi.spyOn(window, "confirm").mockReturnValue(true);
    const acao = vi.fn(async (confirmado: boolean) => {
      if (!confirmado) throw avisoExtra();
      return "criado";
    });
    await expect(comConfirmacaoDeTecnicoExtra(acao)).resolves.toBe("criado");
    expect(confirmar.mock.calls[0][0]).toContain("plano Base");
    expect(acao).toHaveBeenLastCalledWith(true);
  });

  it("se o admin desiste, nada é refeito", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const acao = vi.fn(async () => { throw avisoExtra(); });
    await expect(comConfirmacaoDeTecnicoExtra(acao)).resolves.toBeNull();
    expect(acao).toHaveBeenCalledTimes(1);
  });

  it("outros erros seguem para quem chamou", async () => {
    const confirmar = vi.spyOn(window, "confirm");
    await expect(comConfirmacaoDeTecnicoExtra(async () => { throw new ApiError("E-mail duplicado", 409, { erro: "E-mail duplicado" }); }))
      .rejects.toThrow("E-mail duplicado");
    expect(confirmar).not.toHaveBeenCalled();
  });
});
