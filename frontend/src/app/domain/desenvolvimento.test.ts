import { describe, expect, it } from "vitest";
import { MODULO_DESENVOLVIMENTO_ATIVO, ehTipoDesenvolvimento, tiposParaAbertura } from "./desenvolvimento";

describe("módulo de desenvolvimento", () => {
  it("fica oculto por padrão (sem VITE_MODULO_DESENVOLVIMENTO=true)", () => {
    expect(MODULO_DESENVOLVIMENTO_ATIVO).toBe(false);
  });

  it("reconhece os tipos de desenvolvimento com ou sem acento e maiúsculas", () => {
    expect(ehTipoDesenvolvimento("Melhoria")).toBe(true);
    expect(ehTipoDesenvolvimento("automacao")).toBe(true);
    expect(ehTipoDesenvolvimento(" Novo Sistema ")).toBe(true);
    expect(ehTipoDesenvolvimento("Incidente")).toBe(false);
    expect(ehTipoDesenvolvimento(undefined)).toBe(false);
  });

  it("oculto, tira os tipos de desenvolvimento do formulário", () => {
    expect(tiposParaAbertura(["Incidente", "Melhoria", "Acesso"], false)).toEqual(["Incidente", "Acesso"]);
  });

  it("ativo, acrescenta os tipos de desenvolvimento sem repetir", () => {
    const tipos = tiposParaAbertura(["Incidente", "Melhoria"], true);
    expect(tipos.filter((tipo) => tipo === "Melhoria")).toHaveLength(1);
    expect(tipos).toEqual(expect.arrayContaining(["Incidente", "Bug", "Novo Sistema"]));
  });
});
