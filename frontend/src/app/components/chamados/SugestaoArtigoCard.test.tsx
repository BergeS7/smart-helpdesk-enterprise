// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SugestaoArtigoCard } from "./SugestaoArtigoCard";
import { criarRascunhoDoChamado, obterSugestaoArtigoDoChamado } from "../../services/api";

vi.mock("../../services/api", () => ({ obterSugestaoArtigoDoChamado: vi.fn(), criarRascunhoDoChamado: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });

it("sugere e cria apenas um rascunho quando o problema é recorrente", async () => {
  vi.mocked(obterSugestaoArtigoDoChamado).mockResolvedValue({ sugerir: true, motivo: "problema_recorrente", recorrencia: { quantidade: 6, dias: 30 } });
  vi.mocked(criarRascunhoDoChamado).mockResolvedValue({ id: 12, titulo: "VPN caiu", conteudo: "x", status: "rascunho" });
  await act(async () => root.render(<SugestaoArtigoCard chamadoId={9} />));
  expect(container.textContent).toContain("Transformar esta resolução em artigo da Base de Conhecimento?");
  expect(container.textContent).toContain("6 chamados semelhantes nos últimos 30 dias");
  await act(async () => container.querySelector("button")!.click());
  expect(criarRascunhoDoChamado).toHaveBeenCalledWith(9);
  expect(container.textContent).toContain("“VPN caiu” (rascunho)");
  expect(container.querySelector("button")).toBeNull();
});

it("não aparece quando não faz sentido ou sem permissão", async () => {
  vi.mocked(obterSugestaoArtigoDoChamado).mockResolvedValue({ sugerir: false, motivo: "sem_recorrencia" });
  await act(async () => root.render(<SugestaoArtigoCard chamadoId={9} />));
  expect(container.textContent).toBe("");
  vi.mocked(obterSugestaoArtigoDoChamado).mockRejectedValue(new Error("Você não possui permissão para esta função."));
  await act(async () => root.render(<SugestaoArtigoCard chamadoId={10} />));
  expect(container.textContent).toBe("");
});
