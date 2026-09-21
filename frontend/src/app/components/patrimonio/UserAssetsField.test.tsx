// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { UserAssetsField } from "./UserAssetsField";
import { UserAvatar } from "./UserAvatar";
import { getDevices, setDeviceUser } from "../../services/deviceService";
import type { Device } from "../../types/device";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("../../services/deviceService", () => ({ getDevices: vi.fn(), setDeviceUser: vi.fn() }));

let root: Root;
let container: HTMLDivElement;
const device = (id: string, extra: Partial<Device> = {}) =>
  ({ id, hostname: `PC-${id}`, patrimonio: `P-${id}`, unidade: "UBS", municipio: "Cidade", usuario: "DOM\\x", ...extra }) as Device;
const settle = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
const type = async (input: HTMLInputElement, value: string) => {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

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

it("lista os ativos do usuário e permite desvincular", async () => {
  const mine = device("1", { usuarioVinculado: { id: 7, nome: "Ana", email: "ana@x.test" } });
  vi.mocked(getDevices).mockResolvedValue([mine, device("2")]);
  vi.mocked(setDeviceUser).mockResolvedValue(device("1", { usuarioVinculado: null }));
  await act(async () => root.render(<UserAssetsField userId={7} userName="Ana" />));
  await settle();
  expect(container.textContent).toContain("PC-1");
  expect(container.textContent).not.toContain("PC-2");
  await act(async () => (container.querySelector('button[aria-label="Desvincular PC-1"]') as HTMLButtonElement).click());
  expect(setDeviceUser).toHaveBeenCalledWith("1", null);
  await settle();
  expect(container.textContent).toContain("Nenhum ativo vinculado");
});

it("busca e vincula um ativo livre ao usuário", async () => {
  vi.mocked(getDevices).mockResolvedValue([device("2", { hostname: "RECEPCAO-01" })]);
  vi.mocked(setDeviceUser).mockResolvedValue(device("2", { hostname: "RECEPCAO-01", usuarioVinculado: { id: 7, nome: "Ana", email: null } }));
  await act(async () => root.render(<UserAssetsField userId={7} userName="Ana" />));
  await settle();
  await type(container.querySelector("input") as HTMLInputElement, "recep");
  const option = Array.from(container.querySelectorAll("li button")).find((b) => b.textContent?.includes("RECEPCAO-01")) as HTMLButtonElement;
  await act(async () => option.click());
  expect(setDeviceUser).toHaveBeenCalledWith("2", 7);
  await settle();
  expect(container.querySelector('button[aria-label="Desvincular RECEPCAO-01"]')).not.toBeNull();
});

it("pede confirmação antes de transferir um ativo de outro usuário", async () => {
  vi.mocked(getDevices).mockResolvedValue([device("3", { usuarioVinculado: { id: 9, nome: "Bruno", email: null } })]);
  vi.mocked(setDeviceUser).mockResolvedValue(device("3"));
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  await act(async () => root.render(<UserAssetsField userId={7} userName="Ana" />));
  await settle();
  await type(container.querySelector("input") as HTMLInputElement, "pc-3");
  expect(container.textContent).toContain("Vinculado a Bruno");
  const option = container.querySelector("li button") as HTMLButtonElement;
  await act(async () => option.click());
  expect(confirm).toHaveBeenCalled();
  expect(setDeviceUser).not.toHaveBeenCalled();
  confirm.mockReturnValue(true);
  await act(async () => option.click());
  expect(setDeviceUser).toHaveBeenCalledWith("3", 7);
  confirm.mockRestore();
});

it("mostra mensagem quando não é possível listar os ativos (sem permissão)", async () => {
  vi.mocked(getDevices).mockRejectedValue(new Error("Sem permissão"));
  await act(async () => root.render(<UserAssetsField userId={7} userName="Ana" />));
  await settle();
  expect(container.textContent).toContain("Sem permissão");
  expect(container.querySelector("input")).toBeNull();
});

it("avatar usa a foto quando existe e iniciais quando não", async () => {
  await act(async () => root.render(<><UserAvatar name="Sergio Bergê" photoUrl="https://f.test/a.jpg" /><UserAvatar name="Sergio Bergê" /></>));
  expect(container.querySelector("img")?.getAttribute("src")).toBe("https://f.test/a.jpg");
  expect(container.textContent).toBe("SB");
});
