// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getSessaoPersistida,
  getToken,
  getUsuarioLogado,
  limparSessao,
  obterMeuPerfil,
  salvarSessao,
  type UsuarioLogado,
} from "./api";

const usuario: UsuarioLogado = {
  id: 7,
  nome: "Técnico de teste",
  email: "tecnico@empresa.com",
  perfil: "tecnico",
};

describe("sessão do frontend", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    limparSessao();
    vi.useRealTimers();
  });

  it("persiste e recupera token e usuário como uma única sessão", () => {
    salvarSessao({ token: "jwt-valido", usuario });

    expect(getToken()).toBe("jwt-valido");
    expect(getUsuarioLogado()).toEqual(usuario);
    expect(getSessaoPersistida()).toEqual({ token: "jwt-valido", usuario });
  });

  it("remove uma sessão parcial para não montar painéis protegidos", () => {
    localStorage.setItem("smart_helpdesk_usuario", JSON.stringify(usuario));

    expect(getSessaoPersistida()).toBeNull();
    expect(getUsuarioLogado()).toBeNull();
    expect(getToken()).toBeNull();
  });

  it("envia o token ao validar o perfil salvo", async () => {
    salvarSessao({ token: "jwt-valido", usuario });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(usuario), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(obterMeuPerfil()).resolves.toEqual(usuario);
    const [, options] = fetchMock.mock.calls[0];
    expect(new Headers(options?.headers).get("Authorization")).toBe(
      "Bearer jwt-valido",
    );
  });

  it("limpa imediatamente a sessão quando o servidor informa token expirado", async () => {
    vi.useFakeTimers();
    salvarSessao({ token: "jwt-expirado", usuario });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ erro: "Token expirado" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(obterMeuPerfil()).rejects.toThrow("sessão expirou");
    expect(getSessaoPersistida()).toBeNull();
  });
});
