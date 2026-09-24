// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ProblemasRecorrentes } from "./ProblemasRecorrentes";
import type { ProblemaRecorrente } from "../../../services/api";

const base = { dias: 30, primeiro_em: "2026-09-01T00:00:00Z", ultimo_em: "2026-09-20T00:00:00Z", exemplos: [{ id: 9, numero_chamado: "#HD-9", titulo: "VPN caiu" }] };
const VPN: ProblemaRecorrente = { ...base, quantidade: 23, titulo: "Não conecta na VPN", artigo: null, situacao: "sem_artigo" };
const ERP: ProblemaRecorrente = { ...base, quantidade: 8, titulo: "ERP lento", artigo: { id: 4, titulo: "Sistema ERP lento", visibilidade: "publico", recomendacoes: 12, autoatendimentos: 1, taxa_sucesso: 0.08, revisar: true, confianca: 0.7 }, situacao: "artigo_pouco_efetivo" };
const IMPRESSORA: ProblemaRecorrente = { ...base, quantidade: 5, titulo: "Impressora", artigo: { id: 1, titulo: "Impressora não imprime", visibilidade: "publico", recomendacoes: 0, autoatendimentos: 0, taxa_sucesso: null, revisar: false, confianca: 0.8 }, situacao: "coberto" };

let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });

const botao = (texto: string) => [...container.querySelectorAll("button")].find((b) => b.textContent?.includes(texto));

it("recomenda criar tutorial para problema recorrente sem artigo", async () => {
  const onCriarArtigo = vi.fn();
  await act(async () => root.render(<ProblemasRecorrentes problemas={[IMPRESSORA, ERP, VPN]} podePublicar={false} onCriarArtigo={onCriarArtigo} onRevisarArtigo={vi.fn()} />));
  const texto = container.textContent || "";
  expect(texto).toContain("23 chamados semelhantes nos últimos 30 dias.");
  expect(texto).toContain("Nenhum artigo adequado foi localizado.");
  expect(texto).toContain("Recomendamos criar um tutorial.");
  expect(texto.indexOf("VPN")).toBeLessThan(texto.indexOf("ERP lento"));
  await act(async () => botao("Criar tutorial")!.click());
  expect(onCriarArtigo).toHaveBeenCalledWith(VPN);
});

it("sinaliza artigo pouco efetivo e só oferece revisão a quem publica", async () => {
  const onRevisarArtigo = vi.fn();
  await act(async () => root.render(<ProblemasRecorrentes problemas={[ERP, IMPRESSORA]} podePublicar={false} onCriarArtigo={vi.fn()} onRevisarArtigo={onRevisarArtigo} />));
  expect(container.textContent).toContain("sucesso 8%");
  expect(botao("Revisar artigo")).toBeUndefined();
  expect(container.textContent).toContain("ainda não foi recomendado");
  await act(async () => root.render(<ProblemasRecorrentes problemas={[ERP]} podePublicar onCriarArtigo={vi.fn()} onRevisarArtigo={onRevisarArtigo} />));
  await act(async () => botao("Revisar artigo")!.click());
  expect(onRevisarArtigo).toHaveBeenCalledWith(4);
});
