// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { PushNotificationSettings } from "./PushNotificationSettings";
import { usePushNavigation } from "../hooks/usePushNavigation";
import { obterPushConfig, registrarPush } from "../services/api";

vi.mock("../services/api", () => ({ obterPushConfig: vi.fn(), obterPushStatus: vi.fn(), registrarPush: vi.fn(), removerPush: vi.fn(), testarPush: vi.fn() }));
let root: Root;
let container: HTMLDivElement;
let permission: ReturnType<typeof vi.fn>;
let subscribe: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  Object.defineProperty(window, "isSecureContext", { configurable: true, value: true });
  Object.defineProperty(window, "PushManager", { configurable: true, value: class {} });
  permission = vi.fn().mockResolvedValue("granted");
  Object.defineProperty(window, "Notification", { configurable: true, value: { permission: "default", requestPermission: permission } });
  Object.defineProperty(window, "matchMedia", { configurable: true, value: () => ({ matches: true }) });
  subscribe = vi.fn().mockResolvedValue({ toJSON: () => ({ endpoint: "https://fcm.googleapis.com/test" }), unsubscribe: vi.fn() });
  const registration = { pushManager: { getSubscription: vi.fn().mockResolvedValue(null), subscribe } };
  Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: { getRegistration: vi.fn().mockResolvedValue(registration), register: vi.fn().mockResolvedValue(registration), ready: Promise.resolve(registration) } });
  vi.mocked(obterPushConfig).mockResolvedValue({ publicKey: "BA".repeat(43) + "A" });
  vi.mocked(registrarPush).mockResolvedValue({});
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); window.history.replaceState(null, "", "/"); });

it("pede permissão somente após toque e registra o aparelho", async () => {
  await act(async () => root.render(<PushNotificationSettings userId={7}/>));
  expect(permission).not.toHaveBeenCalled();
  await act(async () => container.querySelector("button")!.click());
  expect(permission).toHaveBeenCalledOnce();
  expect(subscribe).toHaveBeenCalledWith(expect.objectContaining({ userVisibleOnly: true }));
  expect(registrarPush).toHaveBeenCalledOnce();
  expect(localStorage.getItem("smart_helpdesk_push_owner")).toBe("7");
  expect(container.textContent).toContain("Desativar neste aparelho");
});

it("permissão negada não cria inscrição", async () => {
  permission.mockResolvedValue("denied");
  await act(async () => root.render(<PushNotificationSettings userId={7}/>));
  await act(async () => container.querySelector("button")!.click());
  expect(subscribe).not.toHaveBeenCalled();
  expect(registrarPush).not.toHaveBeenCalled();
  expect(container.textContent).toContain("Permita as notificações");
});

it("abre o chamado do push após login e não abre para outra conta", async () => {
  const open = vi.fn();
  function Harness({ userId }: { userId: number }) { usePushNavigation(userId, open); return null; }
  window.history.replaceState(null, "", "/?pushUser=7&pushTicket=42");
  await act(async () => root.render(<Harness userId={7}/>));
  expect(open).toHaveBeenCalledWith(42);
  expect(window.location.search).toBe("");
  open.mockClear();
  window.history.replaceState(null, "", "/?pushUser=7&pushTicket=42");
  await act(async () => root.render(<Harness userId={8}/>));
  expect(open).not.toHaveBeenCalled();
});

it("convite push abre a avaliação em vez dos detalhes", async () => {
  const open = vi.fn(), rate = vi.fn();
  function Harness() { usePushNavigation(7, open, rate); return null; }
  window.history.replaceState(null, "", "/?pushUser=7&pushTicket=42&pushAction=avaliar");
  await act(async () => root.render(<Harness/>));
  expect(rate).toHaveBeenCalledWith(42);
  expect(open).not.toHaveBeenCalled();
  expect(window.location.search).toBe("");
});
