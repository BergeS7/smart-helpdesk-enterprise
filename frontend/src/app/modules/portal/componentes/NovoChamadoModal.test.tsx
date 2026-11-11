// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { UsuarioNovoChamadoModal } from "./NovoChamadoModal";
import { obterArtigoBase, registrarCliqueRecomendacao, registrarVisualizacaoArtigo, responderRecomendacao, type ArtigoSugerido } from "../../../services/api";

vi.mock("../../../services/api", () => ({ obterArtigoBase: vi.fn(), registrarVisualizacaoArtigo: vi.fn(), registrarCliqueRecomendacao: vi.fn(), responderRecomendacao: vi.fn() }));
// Liga e desliga o módulo de desenvolvimento por teste (no build ele vem de VITE_MODULO_DESENVOLVIMENTO).
const modulo = vi.hoisted(() => ({ ativo: false }));
vi.mock("../../../domain/desenvolvimento", async (original) => {
  const real = await original<typeof import("../../../domain/desenvolvimento")>();
  return {
    ...real,
    get MODULO_DESENVOLVIMENTO_ATIVO() { return modulo.ativo; },
    tiposParaAbertura: (tipos: string[]) => real.tiposParaAbertura(tipos, modulo.ativo),
  };
});

const NOVO = { titulo: "Impressora", descricao: "Não imprime", tipo_chamado: "Incidente", processo_atual: "", problema: "", resultado_esperado: "", frequencia: "", pessoas: "", tempo_minutos: "", sistemas: "", impacto_nao_execucao: "", beneficios: "" };
const SUGESTAO: ArtigoSugerido = { id: 3, titulo: "Impressora não imprime", resumo: "Reinicie o spooler.", video_url: "https://youtu.be/x", confianca: 0.9, nivel: "alta", recomendacao_id: 41 };

let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  vi.clearAllMocks();
  modulo.ativo = false;
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

it("com o módulo de desenvolvimento ativo, demandas de desenvolvimento não mostram sugestões", async () => {
  modulo.ativo = true;
  await renderizar({ novo: { ...NOVO, tipo_chamado: "Melhoria" } });
  expect(container.textContent).not.toContain("possível solução");
  expect(container.textContent).toContain("Conte-nos sobre o resultado que você precisa");
});

it("não mostra sugestões quando não há correspondência", async () => {
  await renderizar({ sugestoes: [] });
  expect(container.textContent).not.toContain("possível solução");
});

it("com o módulo de desenvolvimento oculto, os tipos dele não aparecem, nem vindos do catálogo", async () => {
  await renderizar({ tipos: [{ id: 1, nome: "Incidente" }, { id: 2, nome: "Melhoria" }, { id: 3, nome: "Acesso" }] as never });
  const opcoes = [...container.querySelectorAll("option")].map((o) => o.textContent);
  expect(opcoes).toEqual(["Incidente", "Acesso"]);
});

it("com o módulo ativo, os tipos de desenvolvimento voltam a ser oferecidos", async () => {
  modulo.ativo = true;
  await renderizar();
  const opcoes = [...container.querySelectorAll("option")].map((o) => o.textContent);
  expect(opcoes).toEqual(expect.arrayContaining(["Bug", "Melhoria", "Novo Sistema"]));
});

it("avaliação pendente substitui o formulário pela mensagem e leva à avaliação", async () => {
  const onResolverBloqueio = vi.fn();
  await renderizar({
    bloqueio: { codigo: "AVALIACAO_PENDENTE", erro: "Avalie o atendimento do chamado #HD-2026-0008 antes de abrir um novo.", chamado_id: 8, numero_chamado: "#HD-2026-0008" },
    onResolverBloqueio,
  });
  expect(container.querySelector("form")).toBeNull();
  expect(container.textContent).toContain("Avalie o atendimento anterior");
  expect(container.textContent).toContain("#HD-2026-0008");
  await act(async () => botao("Avaliar agora").click());
  expect(onResolverBloqueio).toHaveBeenCalledOnce();
});

it("chamado em andamento mostra a mensagem e o atalho para o chamado", async () => {
  await renderizar({
    bloqueio: { codigo: "CHAMADO_EM_ABERTO", erro: "Você já tem o chamado #HD-2026-0012 em andamento.", chamado_id: 12, numero_chamado: "#HD-2026-0012" },
    onResolverBloqueio: vi.fn(),
  });
  expect(container.textContent).toContain("Você já tem um chamado em andamento");
  expect(botao("Ver chamado #HD-2026-0012")).toBeTruthy();
});

it("enquanto confirma se pode abrir, o botão de criar fica desabilitado", async () => {
  await renderizar({ verificandoAbertura: true });
  expect(botao("Criar chamado").disabled).toBe(true);
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
