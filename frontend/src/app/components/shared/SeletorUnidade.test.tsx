// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SeletorUnidade } from "./SeletorUnidade";

const UNIDADES = [
  { id: 1, nome: "Filial Boa Viagem", municipio: "Recife", latitude: null, longitude: null },
  { id: 2, nome: "Filial Centro", municipio: "Recife", latitude: -8.06, longitude: -34.88 },
  { id: 3, nome: "Matriz", municipio: "Olinda", latitude: null, longitude: null },
];

let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

it("agrupa as unidades da empresa por município e devolve município e unidade juntos", async () => {
  const onChange = vi.fn();
  await act(async () => root.render(<SeletorUnidade unidades={UNIDADES} carregando={false} value={{}} onChange={onChange} />));
  expect([...container.querySelectorAll("optgroup")].map((g) => g.label)).toEqual(["Recife", "Olinda"]);

  const select = container.querySelector("select")!;
  await act(async () => {
    select.value = "3";
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
  expect(onChange).toHaveBeenCalledWith({ municipio: "Olinda", unidade: "Matriz" });
});

it("mostra quando o valor salvo não é mais uma unidade ativa", async () => {
  await act(async () => root.render(<SeletorUnidade unidades={UNIDADES} carregando={false} value={{ municipio: "Santa Inês", unidade: "Maranhão Motos - Santa Inês" }} onChange={vi.fn()} />));
  expect(container.textContent).toContain("Maranhão Motos - Santa Inês (Santa Inês): não está mais ativa");
});

it("empresa sem unidades vê o aviso em vez de um campo obrigatório vazio", async () => {
  await act(async () => root.render(<SeletorUnidade required unidades={[]} carregando={false} value={{}} onChange={vi.fn()} />));
  expect(container.querySelector("select")).toBeNull();
  expect(container.textContent).toContain("ainda não cadastrou unidades");
});
