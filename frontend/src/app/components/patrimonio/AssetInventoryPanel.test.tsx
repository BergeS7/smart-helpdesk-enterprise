// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AssetInventoryPanel } from "./AssetInventoryPanel";
import { getDeviceAlerts, getDeviceChanges, getDeviceInventory, getDeviceSnapshots } from "../../services/deviceService";
import type { AssetInventory, Device } from "../../types/device";

vi.mock("../../services/deviceService", () => ({
  getDeviceInventory: vi.fn(),
  getDeviceChanges: vi.fn(),
  getDeviceAlerts: vi.fn(),
  getDeviceSnapshots: vi.fn(),
  acknowledgeDeviceAlert: vi.fn(),
}));

let root: Root;
let container: HTMLDivElement;

const device = { id: "5", hostname: "PC-5", communicationStatus: "recent" } as Device;
const inventory: AssetInventory = {
  schemaVersion: 1,
  reportId: "r1",
  collectedAt: "2026-01-15T10:00:00Z",
  agentVersion: "2.1.0",
  computer: { hostname: "PC-5", manufacturer: "Dell Inc.", model: "Inspiron 15 5510", serialNumber: "4LGCMS3", domain: "WORKGROUP", loggedUser: "SIBPM01\\PROCESSOS" },
  memory: { totalBytes: 8589934592, modules: [{ bank: "BANK 0", capacityBytes: 8589934592 }] },
  network: {
    primaryIpv4: "192.168.0.10",
    primaryMac: "AA:BB:CC:DD:EE:FF",
    adapters: [{ description: "Ethernet", mac: "AA:BB:CC:DD:EE:FF", dhcpEnabled: true, ipAddresses: ["192.168.0.10"], gateways: ["192.168.0.1"], dnsServers: ["8.8.8.8"] }],
  },
  security: {
    defender: { status: "ENABLED", signaturesUpdated: true },
    firewall: { status: "DISABLED", profiles: [{ name: "Domain", enabled: false }] },
  },
};

async function renderPanel(tab?: string) {
  vi.mocked(getDeviceInventory).mockResolvedValue(inventory);
  vi.mocked(getDeviceChanges).mockResolvedValue([]);
  vi.mocked(getDeviceAlerts).mockResolvedValue([]);
  vi.mocked(getDeviceSnapshots).mockResolvedValue([]);
  await act(async () => root.render(<AssetInventoryPanel device={device} />));
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
  if (tab) {
    const button = Array.from(container.querySelectorAll("button")).find((b) => b.textContent === tab) as HTMLButtonElement;
    await act(async () => button.click());
  }
}

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

it("Visão geral: rótulos traduzidos, não as chaves cruas do agente (hostname/loggedUser/...)", async () => {
  await renderPanel();
  const text = container.textContent || "";
  expect(text).toContain("Nome do computador");
  expect(text).toContain("Usuário logado");
  expect(text).toContain("Número de série");
  expect(text).not.toContain("LOGGEDUSER");
  expect(text).not.toContain("SERIALNUMBER");
  // "Comunicação" usa o mesmo rótulo traduzido do card do topo, não o enum cru.
  expect(text).toContain("Recente");
  expect(text).not.toContain("recent<");
});

it("Hardware: capacidade do módulo de memória aparece em GB, não o número de bytes cru", async () => {
  await renderPanel("Hardware");
  const text = container.textContent || "";
  expect(text).toContain("8.00 GB");
  expect(text).not.toContain("8589934592");
});

it("Rede: adaptadores viram cartões legíveis, não um JSON cru na tela", async () => {
  await renderPanel("Rede");
  const text = container.textContent || "";
  expect(text).not.toContain("{\"description\"");
  expect(text).not.toContain("[{");
  expect(text).toContain("Ethernet");
  expect(text).toContain("192.168.0.10");
  expect(text).toContain("Sim"); // dhcpEnabled: true
});

it("Segurança: título e status traduzidos, sem duplicar o status cru dentro da ficha", async () => {
  await renderPanel("Segurança");
  const text = container.textContent || "";
  expect(text).toContain("Antivírus (Windows Defender): Ativado");
  expect(text).toContain("Firewall: Desativado");
  expect(text).not.toContain("ENABLED");
  expect(text).not.toContain("DISABLED");
  // profiles (array de objetos) também vira cartão, não JSON
  expect(text).not.toContain("{\"name\"");
});
