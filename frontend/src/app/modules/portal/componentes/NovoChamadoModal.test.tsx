// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { UsuarioNovoChamadoModal } from "./NovoChamadoModal";
import { obterArtigoBase, registrarCliqueRecomendacao, registrarVisualizacaoArtigo, responderRecomendacao, type ArtigoSugerido } from "../../../services/api";

vi.mock("../../../services/api", () => ({ obterArtigoBase: vi.fn(), registrarVisualizacaoArtigo: vi.fn(), registrarCliqueRecomendacao: vi.fn(), responderRecomendacao: vi.fn() }));

const NOVO = { titulo: "Impressora", descricao: "Não imprime", tipo_chamado: "Incidente", processo_atual: "", problema: "", resultado_esperado: "", frequencia: "", pessoas: "", tempo_minutos: "", sistemas: "", impacto_nao_execucao: "", beneficios: "" };
const SUGESTAO: ArtigoSugerido = { id: 3, titulo: "Impressora não imprime", resumo: "Reinicie o spooler.", video_url: "https://youtu.be/x", confianca: 0.9, nivel: "alta", recomendacao_id: 41 };

let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.mocked(registrarCliqueRecomendacao).mockResolvedValue(null);
  vi.mocked(responderRecomendacao).mockResolvedValue(null);
  vi.mocked(registrarVisualizacaoArtigo).mockResolvedValue({ ...SUGESTAO, conteudo: "" });
  vi.mocked(obterArtigoBase).mockResolvedValue({ ...SUGESTAO, conteudo: "Detalhes", passos: [{ texto: "Abra services.msc" }] });
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });

const botao = (texto: string) => [...document.body.querySelectorAll("button")].find((b) => b.textContent?.includes(texto))!;

async function renderizar(props: Partial<React.ComponentProps<typeof UsuarioNovoChamadoModal>> = {}) {
  const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
  await act(async () => root.render(
    <UsuarioNovoChamadoModal perfil={{ id: 1, nome: "Ana", email: "ana@x.com", perfil: "usuario" }} tipos={[]} novo={NOVO} setNovo={vi.fn()} sugestoes={[SUGESTAO]} loading={false} onClose={vi.fn()} onSubmit={onSubmit} onResolvido={vi.fn()} {...props} />,
  ));
  return onSubmit;
}

it("recomenda a solução sem impedir a abertura do chamado", async () => {
  const onSubmit = await renderizar();
  expect(container.textContent).toContain("Encontramos uma possível solução para o seu problema");
  expect(container.textContent).toContain("Alta relevância");
  await act(async () => container.querySelector("form")!.requestSubmit());
  expect(onSubmit).toHaveBeenCalledOnce();
});

it("abre o artigo completo com o passo a passo", async () => {
  await renderizar();
  const verSolucao = [...container.querySelectorAll("button")].find((b) => b.textContent?.includes("Ver solução"))!;
  await act(async () => verSolucao.click());
  expect(obterArtigoBase).toHaveBeenCalledWith(3);
  expect(document.body.textContent).toContain("Abra services.msc");
});

it("não mostra sugestões em demandas de desenvolvimento nem quando não há correspondência", async () => {
  await renderizar({ novo: { ...NOVO, tipo_chamado: "Melhoria" } });
  expect(container.textContent).not.toContain("possível solução");
  await renderizar({ sugestoes: [] });
  expect(container.textContent).not.toContain("possível solução");
});

it("\"Sim\" registra a resolução e oferece fechar sem abrir chamado", async () => {
  const onResolvido = vi.fn();
  await renderizar({ onResolvido });
  await act(async () => botao("Ver solução").click());
  expect(registrarCliqueRecomendacao).toHaveBeenCalledWith(41);
  await act(async () => botao("Sim").click());
  expect(responderRecomendacao).toHaveBeenCalledWith(41, true);
  expect(container.textContent).toContain("Que bom que resolveu!");
  expect(onResolvido).not.toHaveBeenCalled();
  await act(async () => botao("Fechar sem abrir chamado").click());
  expect(onResolvido).toHaveBeenCalledOnce();
});

it("\"Não\" registra a resposta e o chamado continua normalmente", async () => {
  const onSubmit = await renderizar();
  await act(async () => botao("Ver solução").click());
  await act(async () => botao("Não").click());
  expect(responderRecomendacao).toHaveBeenCalledWith(41, false);
  expect(container.textContent).toContain("Continue preenchendo e crie o chamado");
  await act(async () => container.querySelector("form")!.requestSubmit());
  expect(onSubmit).toHaveBeenCalledOnce();
});
