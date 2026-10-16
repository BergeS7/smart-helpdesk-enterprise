// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it } from "vitest";
import { AnaliseIAPrioridade, confiancaIA } from "./AnaliseIAPrioridade";
import type { ApiChamado } from "../../services/api";

const CHAMADO = {
  id: 1,
  titulo: "Sem internet",
  descricao: "Internet caiu",
  prioridade: "Media",
  prioridade_ia: "Media",
  status: "OPEN",
  prioridade_ia_motivo: "Regra decisiva: Caso empresarial: Lentidão. Confiança: 55%. | Usuário indicou urgência: agora.",
  // O banco devolve NUMERIC como texto.
  prioridade_ia_confianca: "55.00" as unknown as number,
  ia_responsavel_sugerido: "Infraestrutura / Redes",
  ia_resposta_inicial: "Olá, recebemos seu chamado.",
  prioridade_ia_analise: {
    pontuacao: 30,
    confianca: 55,
    dimensoes: { impacto: 20, urgencia: 7, abrangencia: 8, risco: 0 },
    sinais: ["sem acesso"],
    perguntas_pendentes: ["Quantas pessoas ou unidades estão afetadas?"],
    regra_decisiva: "Caso empresarial: Lentidão.",
    requer_triagem: true,
  },
} as ApiChamado;

let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });

async function renderizar(chamado: ApiChamado, detalhada: boolean) {
  await act(async () => root.render(<AnaliseIAPrioridade chamado={chamado} detalhada={detalhada} />));
  return container.textContent || "";
}

it("mostra para a equipe a triagem, a confiança, as dimensões, os sinais e as perguntas", async () => {
  const texto = await renderizar(CHAMADO, true);
  expect(texto).toContain("Requer triagem");
  expect(texto).toContain("55%");
  expect(texto).toContain("Caso empresarial: Lentidão.");
  expect(texto).toContain("Impacto");
  expect(texto).toContain("20/40");
  expect(texto).toContain("sem acesso");
  expect(texto).toContain("Quantas pessoas ou unidades estão afetadas?");
  expect(container.querySelectorAll("ul li").length).toBeGreaterThanOrEqual(3);
});

it("o solicitante vê motivo e resposta, mas não os dados de triagem", async () => {
  const texto = await renderizar(CHAMADO, false);
  expect(texto).toContain("Usuário indicou urgência: agora.");
  expect(texto).toContain("Infraestrutura / Redes");
  expect(texto).not.toContain("Requer triagem");
  expect(texto).not.toContain("Perguntar ao solicitante");
  expect(texto).not.toContain("20/40");
});

it("chamado antigo sem análise mostra só o essencial", async () => {
  const texto = await renderizar({ ...CHAMADO, prioridade_ia_analise: undefined, prioridade_ia_confianca: undefined, prioridade_ia_motivo: undefined }, true);
  expect(texto).toContain("Não disponível");
  expect(texto).not.toContain("Requer triagem");
});

it("confiança aceita texto, fração antiga e ausência", () => {
  expect(confiancaIA(CHAMADO)).toBe(55);
  expect(confiancaIA({ ...CHAMADO, prioridade_ia_confianca: 0.82 })).toBe(82);
  expect(confiancaIA({ ...CHAMADO, prioridade_ia_confianca: undefined, prioridade_ia_analise: undefined })).toBeNull();
});
