// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { UsersModule } from "./UsersModule";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("../../components/PermissionMatrixPage", () => ({ PermissionMatrixPage: () => null }));
let root: Root;
let container: HTMLDivElement;
const onApprove = vi.fn();
const onReject = vi.fn();
beforeEach(async () => {
  vi.resetAllMocks();
  Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root.render(<UsersModule
    users={[{ id: 2, nome: "Usuário pendente", email: "user@example.com", perfil: "usuario", status: "pendente" }]}
    currentUser={{ id: 1, nome: "Admin", email: "admin@example.com", perfil: "admin" }}
    developer={false} onRefresh={vi.fn()} onEdit={vi.fn()} onPermissions={vi.fn()}
    onApprove={onApprove} onReject={onReject} onDelete={vi.fn()}
  />));
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});
const button = (text: string) => Array.from(container.querySelectorAll("button")).find((item) => item.textContent === text)!;

it("mostra a recusa da API e permite tentar novamente", async () => {
  onApprove.mockRejectedValueOnce(new Error("Usuário não encontrado ou e-mail ainda não confirmado."));
  await act(async () => button("Aprovar").click());
  expect(onApprove).toHaveBeenCalledWith(2);
  expect(toast.error).toHaveBeenCalledWith("Usuário não encontrado ou e-mail ainda não confirmado.");
  expect(toast.success).not.toHaveBeenCalled();
  expect(button("Aprovar").disabled).toBe(false);
  onApprove.mockResolvedValueOnce(undefined);
  await act(async () => button("Aprovar").click());
  expect(toast.success).toHaveBeenCalledWith("Usuário aprovado com sucesso.");
});

it("bloqueia ações duplicadas enquanto aguarda a aprovação", async () => {
  let finish!: () => void;
  onApprove.mockReturnValue(new Promise<void>((resolve) => { finish = resolve; }));
  await act(async () => { button("Aprovar").click(); button("Aprovar").click(); });
  expect(onApprove).toHaveBeenCalledTimes(1);
  expect(button("Aprovando…").disabled).toBe(true);
  expect(button("Rejeitar").disabled).toBe(true);
  expect(toast.success).not.toHaveBeenCalled();
  await act(async () => finish());
  expect(button("Aprovar").disabled).toBe(false);
  expect(toast.success).toHaveBeenCalledOnce();
});

it("também exibe erros ao rejeitar", async () => {
  onReject.mockRejectedValue(new Error("Você não tem permissão para executar esta ação."));
  await act(async () => button("Rejeitar").click());
  expect(onReject).toHaveBeenCalledWith(2);
  expect(toast.error).toHaveBeenCalledWith("Você não tem permissão para executar esta ação.");
  expect(button("Rejeitar").disabled).toBe(false);
});
