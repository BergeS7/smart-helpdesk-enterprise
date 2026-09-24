// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ModuleBoundary } from "./ModuleBoundary";
import { reportFrontendError } from "../services/api";

vi.mock("../services/api", () => ({ reportFrontendError: vi.fn() }));

let root: Root;
let container: HTMLDivElement;
let quebrar = true;

function ModuloInstavel() {
  if (quebrar) throw new Error("falha no módulo");
  return <p>módulo ok</p>;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true });
  quebrar = true;
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

it("mostra o erro só na área do módulo e mantém o restante da tela", async () => {
  await act(async () => root.render(<div><nav>menu</nav><ModuleBoundary fallback={<p>carregando</p>}><ModuloInstavel /></ModuleBoundary></div>));
  expect(container.textContent).toContain("menu");
  expect(container.textContent).toContain("Não foi possível exibir este módulo");
  expect(container.textContent).toContain("falha no módulo");
  expect(reportFrontendError).toHaveBeenCalledTimes(1);
});

it("tentar novamente renderiza o módulo de novo", async () => {
  await act(async () => root.render(<ModuleBoundary fallback={<p>carregando</p>}><ModuloInstavel /></ModuleBoundary>));
  quebrar = false;
  await act(async () => (container.querySelector("button") as HTMLButtonElement).click());
  expect(container.textContent).toContain("módulo ok");
});
