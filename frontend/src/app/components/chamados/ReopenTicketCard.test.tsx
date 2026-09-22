// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { ReopenTicketCard } from "./ReopenTicketCard";
import { canonicalTicketStatus, isFinalTicketStatus, isReopenWindowOpen, reopenDeadline } from "../../domain/ticketStatus";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

let root: Root;
let container: HTMLDivElement;
const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
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

it("reopenDeadline/isReopenWindowOpen espelham a janela de 7 dias do backend", () => {
  expect(reopenDeadline(null)).toBeNull();
  expect(reopenDeadline("2026-09-01T10:00:00Z")!.toISOString()).toBe("2026-09-08T10:00:00.000Z");
  expect(isReopenWindowOpen(null)).toBe(true);
  expect(isReopenWindowOpen("2026-09-01T10:00:00Z", new Date("2026-09-08T10:00:00Z"))).toBe(true);
  expect(isReopenWindowOpen("2026-09-01T10:00:00Z", new Date("2026-09-08T10:00:01Z"))).toBe(false);
});

it("exige o motivo e não chama a API sem ele", async () => {
  const onReopen = vi.fn().mockResolvedValue(undefined);
  await act(async () => root.render(<ReopenTicketCard finalizadoEm={daysAgo(1)} onReopen={onReopen} />));
  await type("   ");
  await submit();
  expect(onReopen).not.toHaveBeenCalled();
  expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Explique"));
});

it("envia o motivo, limpa o campo e evita duplo envio enquanto reabre", async () => {
  let finish: () => void = () => undefined;
  const onReopen = vi.fn().mockImplementation(() => new Promise<void>((resolve) => { finish = resolve; }));
  await act(async () => root.render(<ReopenTicketCard finalizadoEm={daysAgo(1)} onReopen={onReopen} />));
  await type("  Voltou a falhar  ");
  await submit();
  expect(onReopen).toHaveBeenCalledWith("Voltou a falhar");
  expect((container.querySelector("button") as HTMLButtonElement).disabled).toBe(true);
  await act(async () => finish());
  expect((container.querySelector("textarea") as HTMLTextAreaElement).value).toBe("");
});

it("mostra a mensagem do servidor quando a reabertura é recusada", async () => {
  const onReopen = vi.fn().mockRejectedValue(new Error("Registro histórico disponível somente para leitura."));
  await act(async () => root.render(<ReopenTicketCard finalizadoEm={daysAgo(1)} onReopen={onReopen} />));
  await type("Motivo");
  await submit();
  expect(toast.error).toHaveBeenCalledWith("Registro histórico disponível somente para leitura.");
  expect((container.querySelector("textarea") as HTMLTextAreaElement).value).toBe("Motivo");
});

it("dentro dos 7 dias mostra o formulário com o prazo final", async () => {
  await act(async () => root.render(<ReopenTicketCard finalizadoEm={daysAgo(3)} onReopen={vi.fn()} />));
  expect(container.querySelector("textarea")).not.toBeNull();
  expect(container.textContent).toContain("Disponível até");
});

it("depois de 7 dias esconde o formulário e explica o prazo, sem chamar a API", async () => {
  const onReopen = vi.fn();
  await act(async () => root.render(<ReopenTicketCard finalizadoEm={daysAgo(8)} onReopen={onReopen} />));
  expect(container.querySelector("textarea")).toBeNull();
  expect(container.querySelector("form")).toBeNull();
  expect(container.textContent).toContain("O prazo de 7 dias");
  expect(onReopen).not.toHaveBeenCalled();
});

it("admin continua com acesso irrestrito mesmo depois de 7 dias", async () => {
  await act(async () => root.render(<ReopenTicketCard finalizadoEm={daysAgo(400)} isAdmin onReopen={vi.fn()} />));
  expect(container.querySelector("textarea")).not.toBeNull();
});

it("sem finalizado_em (compatibilidade) mostra o formulário normalmente", async () => {
  await act(async () => root.render(<ReopenTicketCard onReopen={vi.fn()} />));
  expect(container.querySelector("textarea")).not.toBeNull();
});
