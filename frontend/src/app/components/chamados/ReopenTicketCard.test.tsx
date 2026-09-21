// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { ReopenTicketCard } from "./ReopenTicketCard";
import { canonicalTicketStatus, isFinalTicketStatus } from "../../domain/ticketStatus";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

let root: Root;
let container: HTMLDivElement;
const type = async (value: string) => {
  const area = container.querySelector("textarea") as HTMLTextAreaElement;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(area, value);
    area.dispatchEvent(new Event("input", { bubbles: true }));
  });
};
const submit = () => act(async () => { container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });

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

it("a API devolve códigos (CLOSED/RESOLVED/CANCELED): todos contam como concluídos", () => {
  for (const status of ["CLOSED", "RESOLVED", "CANCELED", "Concluído", "Concluido", "Resolvido", "Cancelado"]) expect(isFinalTicketStatus(status), status).toBe(true);
  for (const status of ["OPEN", "IN_PROGRESS", "WAITING_USER", "REOPENED", "Em andamento"]) expect(isFinalTicketStatus(status), status).toBe(false);
  expect(canonicalTicketStatus("CLOSED")).toBe("CLOSED");
});

it("exige o motivo e não chama a API sem ele", async () => {
  const onReopen = vi.fn().mockResolvedValue(undefined);
  await act(async () => root.render(<ReopenTicketCard onReopen={onReopen} />));
  await type("   ");
  await submit();
  expect(onReopen).not.toHaveBeenCalled();
  expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Explique"));
});

it("envia o motivo, limpa o campo e evita duplo envio enquanto reabre", async () => {
  let finish: () => void = () => undefined;
  const onReopen = vi.fn().mockImplementation(() => new Promise<void>((resolve) => { finish = resolve; }));
  await act(async () => root.render(<ReopenTicketCard onReopen={onReopen} />));
  await type("  Voltou a falhar  ");
  await submit();
  expect(onReopen).toHaveBeenCalledWith("Voltou a falhar");
  expect((container.querySelector("button") as HTMLButtonElement).disabled).toBe(true);
  await act(async () => finish());
  expect((container.querySelector("textarea") as HTMLTextAreaElement).value).toBe("");
});

it("mostra a mensagem do servidor quando a reabertura é recusada", async () => {
  const onReopen = vi.fn().mockRejectedValue(new Error("Registro histórico disponível somente para leitura."));
  await act(async () => root.render(<ReopenTicketCard onReopen={onReopen} />));
  await type("Motivo");
  await submit();
  expect(toast.error).toHaveBeenCalledWith("Registro histórico disponível somente para leitura.");
  expect((container.querySelector("textarea") as HTMLTextAreaElement).value).toBe("Motivo");
});
