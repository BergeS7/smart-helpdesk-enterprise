// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { PerguntasSemResposta } from "./PerguntasSemResposta";
import type { LacunasAssistente } from "../../../services/api";

let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });

const LACUNAS: LacunasAssistente = {
  dias: 30,
  resumo: { perguntas: 10, resolvidas: 7, sem_resposta: 3, tokens_entrada: 2000, tokens_saida: 400 },
  itens: [
    { pergunta: "IHS não abre", quantidade: 2, usuarios: 2, ultima_em: "2026-09-20T10:00:00Z", exemplos: ["erro no IHS ao logar"], artigo: null },
    { pergunta: "impressora sem toner", quantidade: 1, usuarios: 1, ultima_em: "2026-09-18T10:00:00Z", exemplos: [], artigo: { id: 4, titulo: "Trocar toner" } },
  ],
};

it("mostra o resumo, as pendentes com botão de tutorial e as já cobertas", async () => {
  const onCriarArtigo = vi.fn();
  await act(async () => root.render(<PerguntasSemResposta lacunas={LACUNAS} onCriarArtigo={onCriarArtigo} />));

  expect(container.textContent).toContain("70%");
  expect(container.textContent).toContain("2.400");
  expect(container.textContent).toContain("Perguntado 2 vezes por 2 pessoas");
  expect(container.textContent).toContain("Também perguntaram: “erro no IHS ao logar”");
  expect(container.textContent).toContain("agora coberto por “Trocar toner”");
  const botoes = [...container.querySelectorAll("button")];
  expect(botoes).toHaveLength(1);
  await act(async () => botoes[0].click());
  expect(onCriarArtigo).toHaveBeenCalledWith(LACUNAS.itens[0]);
});

it("não aparece quando o painel não carregou (sem permissão ou erro)", async () => {
  await act(async () => root.render(<PerguntasSemResposta lacunas={null} onCriarArtigo={vi.fn()} />));
  expect(container.textContent).toBe("");
});
