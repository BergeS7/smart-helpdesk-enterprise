// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AtivacaoEmpresa } from "./AtivacaoEmpresa";
import { ativarConviteEmpresa, consultarConviteEmpresa } from "../../services/api";
import { CONFIG_SISTEMA_PADRAO } from "../comum/appShared";

vi.mock("sonner", () => ({ Toaster: () => null, toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("../../components/LegalComplianceLayer", () => ({ openLegalDocument: vi.fn() }));
vi.mock("../../services/api", () => ({ consultarConviteEmpresa: vi.fn(), ativarConviteEmpresa: vi.fn() }));

let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  vi.resetAllMocks();
  Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

const renderizar = () => act(async () => root.render(<AtivacaoEmpresa token="token-de-teste-com-vinte-chars" configSistema={CONFIG_SISTEMA_PADRAO} />));
const preencher = (seletor: string, valor: string) => {
  const campo = container.querySelector<HTMLInputElement>(seletor)!;
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(campo, valor);
  campo.dispatchEvent(new Event("input", { bubbles: true }));
};

it("link vencido ou usado mostra a mensagem e não o formulário", async () => {
  vi.mocked(consultarConviteEmpresa).mockRejectedValue(new Error("Link de liberação inválido, expirado ou já utilizado."));
  await renderizar();
  expect(container.textContent).toContain("Link indisponível");
  expect(container.querySelector("form")).toBeNull();
});

it("responsável cria a senha e recebe a confirmação com o e-mail de acesso", async () => {
  vi.mocked(consultarConviteEmpresa).mockResolvedValue({ empresa: { nome: "Acme", slug: "acme" }, email: "ti@acme.com" });
  vi.mocked(ativarConviteEmpresa).mockResolvedValue({ mensagem: "ok", email: "ti@acme.com", empresa: { nome: "Acme", slug: "acme" } });
  await renderizar();
  expect(container.textContent).toContain("Acme");
  expect(container.textContent).toContain("ti@acme.com");

  await act(async () => {
    preencher("input:not([type])", "Responsável Acme");
    preencher("input[type=password]", "senhaforte1");
    container.querySelector<HTMLInputElement>("input[type=checkbox]")!.click();
  });
  await act(async () => container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));

  expect(ativarConviteEmpresa).toHaveBeenCalledWith("token-de-teste-com-vinte-chars", expect.objectContaining({ nome: "Responsável Acme", senha: "senhaforte1", aceitaTermos: true }));
  expect(container.textContent).toContain("Acesso liberado");
});
