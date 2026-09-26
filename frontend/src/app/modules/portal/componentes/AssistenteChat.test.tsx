// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AssistenteChat } from "./AssistenteChat";
import { perguntarAssistente, responderRecomendacao, type ArtigoBase } from "../../../services/api";

vi.mock("../../../services/api", () => ({ perguntarAssistente: vi.fn(), responderRecomendacao: vi.fn(), registrarCliqueRecomendacao: vi.fn() }));
vi.mock("./ArtigoDetalhe", () => ({ ArtigoDetalhe: () => null }));

let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });

const ARTIGOS: ArtigoBase[] = [
  { id: 1, titulo: "[DEMO] Impressora não imprime", resumo: "Fila travada", conteudo: "x", visualizacoes: 3 },
  { id: 2, titulo: "Configurar e-mail no celular", resumo: "Outlook", conteudo: "x", visualizacoes: 9 },
  { id: 3, titulo: "Pouco acessado", conteudo: "x", visualizacoes: 1 },
];

const botao = (texto: string) => [...container.querySelectorAll("button")].find((b) => b.textContent?.includes(texto) || b.getAttribute("aria-label") === texto)!;

function renderizar(props: Partial<React.ComponentProps<typeof AssistenteChat>> = {}) {
  return act(async () => root.render(
    <AssistenteChat aberto onFechar={vi.fn()} nomeUsuario="Marina Lopes" artigos={ARTIGOS} onAbrirChamado={vi.fn()} {...props} />,
  ));
}

async function perguntar(texto: string) {
  const campo = container.querySelector("textarea")!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(campo, texto);
    campo.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await act(async () => botao("Enviar pergunta").click());
}

it("cumprimenta pelo primeiro nome e sugere os artigos mais acessados", async () => {
  vi.mocked(perguntarAssistente).mockResolvedValue({ resposta: "1. Abra o Outlook", situacao: "resolvido", artigos: [] });
  await renderizar();
  expect(container.textContent).toContain("Olá, Marina.");
  expect(container.textContent).toContain("Configurar e-mail no celular");
  expect(container.textContent).toContain("Impressora não imprime");
  expect(container.textContent).not.toContain("[DEMO]");
  expect(container.textContent).not.toContain("Pouco acessado");

  await act(async () => botao("Configurar e-mail no celular").click());
  expect(perguntarAssistente).toHaveBeenCalledWith("Configurar e-mail no celular", []);
});

it("responde com passo a passo, mostra o vídeo e registra se resolveu", async () => {
  vi.mocked(perguntarAssistente).mockResolvedValue({
    resposta: "1. Abra o FortiClient\n2. Clique em Conectar",
    situacao: "resolvido",
    artigos: [{ id: 6, titulo: "Não consigo conectar na VPN", video_url: "https://youtu.be/x", recomendacao_id: 3 }],
  });
  vi.mocked(responderRecomendacao).mockResolvedValue(null);
  await renderizar();
  await perguntar("vpn nao conecta");

  expect(perguntarAssistente).toHaveBeenCalledWith("vpn nao conecta", []);
  expect(container.textContent).toContain("1. Abra o FortiClient");
  expect(container.querySelector("a")?.getAttribute("href")).toBe("https://youtu.be/x");
  await act(async () => botao("Resolveu").click());
  expect(responderRecomendacao).toHaveBeenCalledWith(3, true);
  expect(container.textContent).toContain("Que bom!");
  expect(botao("Não resolveu").disabled).toBe(true);
});

it("sem solução na base, oferece abrir chamado com a conversa e fecha o painel", async () => {
  vi.mocked(perguntarAssistente).mockResolvedValue({ resposta: "Não encontrei uma solução para isso.", situacao: "sem_artigo", artigos: [] });
  const onAbrirChamado = vi.fn();
  const onFechar = vi.fn();
  await renderizar({ onAbrirChamado, onFechar });
  await perguntar("impressora do 2º andar travou");
  await act(async () => botao("Abrir chamado com esta conversa").click());

  expect(onAbrirChamado).toHaveBeenCalledWith({
    titulo: "impressora do 2º andar travou",
    descricao: expect.stringContaining("Assistente: Não encontrei uma solução para isso."),
  });
  expect(onFechar).toHaveBeenCalled();
});

it("fechado, o painel some mas guarda a conversa; Esc fecha", async () => {
  vi.mocked(perguntarAssistente).mockResolvedValue({ resposta: "Resposta guardada", situacao: "esclarecer", artigos: [] });
  const onFechar = vi.fn();
  await renderizar({ onFechar });
  await perguntar("minha dúvida");
  await act(async () => window.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape" })));
  expect(onFechar).toHaveBeenCalled();

  await renderizar({ aberto: false, onFechar });
  expect(container.querySelector("aside")!.hidden).toBe(true);
  await renderizar({ aberto: true, onFechar });
  expect(container.textContent).toContain("Resposta guardada");
});
