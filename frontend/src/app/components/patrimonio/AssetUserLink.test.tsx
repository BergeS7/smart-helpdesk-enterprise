// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AssetUserLink, ASSET_USER_LINKED_EVENT } from "./AssetUserLink";
import { MyAssetsCard } from "./MyAssetsCard";
import { getMyAssets, searchAssignableUsers, setDeviceUser } from "../../services/deviceService";
import type { Device } from "../../types/device";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("../../services/deviceService", () => ({ getMyAssets: vi.fn(), searchAssignableUsers: vi.fn(), setDeviceUser: vi.fn() }));

let root: Root;
let container: HTMLDivElement;
const device = (extra: Partial<Device> = {}) => ({ id: "5", hostname: "PC-5", usuario: "DOM\\joao", ...extra }) as Device;
const flush = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 300)); });

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

it("mostra 'Não vinculado' por padrão e o responsável quando existe", async () => {
  await act(async () => root.render(<AssetUserLink device={device()} />));
  expect(container.textContent).toContain("Não vinculado");
  expect(container.textContent).toContain("Vincular");
  await act(async () => root.render(<AssetUserLink device={device({ usuarioVinculado: { id: 9, nome: "João", email: "joao@x.test" } })} />));
  expect(container.textContent).toContain("João");
  expect(container.textContent).toContain("Alterar");
});

it("busca, vincula e avisa a página com o ativo atualizado", async () => {
  const updated = device({ usuarioVinculado: { id: 9, nome: "João", email: "joao@x.test" } });
  vi.mocked(searchAssignableUsers).mockResolvedValue([{ id: 9, nome: "João", email: "joao@x.test" }]);
  vi.mocked(setDeviceUser).mockResolvedValue(updated);
  const received = vi.fn();
  window.addEventListener(ASSET_USER_LINKED_EVENT, (e) => received((e as CustomEvent).detail));
  await act(async () => root.render(<AssetUserLink device={device()} />));
  await act(async () => (container.querySelector("button") as HTMLButtonElement).click());
  await flush();
  expect(searchAssignableUsers).toHaveBeenCalledWith("");
  const option = Array.from(container.querySelectorAll("li button")).find((b) => b.textContent?.includes("João")) as HTMLButtonElement;
  await act(async () => option.click());
  expect(setDeviceUser).toHaveBeenCalledWith("5", 9);
  expect(received).toHaveBeenCalledWith(updated);
});

it("permite remover o vínculo", async () => {
  vi.mocked(searchAssignableUsers).mockResolvedValue([]);
  vi.mocked(setDeviceUser).mockResolvedValue(device());
  await act(async () => root.render(<AssetUserLink device={device({ usuarioVinculado: { id: 9, nome: "João", email: null } })} />));
  await act(async () => (container.querySelector("button") as HTMLButtonElement).click());
  await flush();
  const remove = Array.from(container.querySelectorAll("button")).find((b) => b.textContent?.includes("Remover vínculo")) as HTMLButtonElement;
  await act(async () => remove.click());
  expect(setDeviceUser).toHaveBeenCalledWith("5", null);
});

it("cartão 'Meus ativos' só aparece quando há ativos vinculados", async () => {
  vi.mocked(getMyAssets).mockResolvedValue([]);
  await act(async () => root.render(<MyAssetsCard />));
  await flush();
  expect(container.textContent).toBe("");
  vi.mocked(getMyAssets).mockResolvedValue([{ id: "5", hostname: "PC-5", patrimonio: "P-1", fabricante: "Dell", modelo: "Optiplex", municipio: "Cidade", unidade: "UBS", sistemaOperacional: null, status: "online", ultimoHeartbeat: null }]);
  await act(async () => root.render(<MyAssetsCard key="com-ativos" />));
  await flush();
  expect(container.textContent).toContain("Meus ativos");
  expect(container.textContent).toContain("PC-5");
  expect(container.textContent).toContain("Dell Optiplex");
});

it("cartão 'Meus ativos' não quebra nem aparece se a consulta falhar", async () => {
  vi.mocked(getMyAssets).mockRejectedValue(new Error("falha"));
  await act(async () => root.render(<MyAssetsCard />));
  await flush();
  expect(container.textContent).toBe("");
});
