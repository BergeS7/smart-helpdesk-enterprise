// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { OperacaoEmpresa } from "./OperacaoEmpresa";
import { consultarOperacaoEmpresa, listarAcessosPlataforma } from "../../services/api";

vi.mock("../../services/api", () => ({ consultarOperacaoEmpresa: vi.fn(), listarAcessosPlataforma: vi.fn() }));

let root: Root;
let container: HTMLDivElement;
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

it("mostra os indicadores só para leitura e o histórico que já inclui este acesso", async () => {
  vi.mocked(consultarOperacaoEmpresa).mockResolvedValue({
    empresa: { id: 3, nome: "Acme", slug: "acme", plano: "essencial", status: "ativa" },
    chamados: {
      abertos: 2, sla_vencido: 1, sem_responsavel: 1, criados_30d: 5, resolvidos_30d: 3, horas_media_resolucao_30d: "4.5",
      por_status: [{ status: "OPEN", total: 2 }],
      recentes: [{ id: 9, numero_chamado: "#HD-9", titulo: "Sem internet", status: "OPEN", prioridade: "Alta", tipo_chamado: null, criado_em: "2026-09-28T12:00:00Z", sla_vencido: true, responsavel: null }],
    },
    usuarios: [{ perfil: "usuario", ativos: 4, pendentes: 1 }],
    satisfacao_90d: { media: null, avaliacoes: 0 },
    ativos: { total: 0, comunicando_24h: 0 },
    base: { publicados: 2 },
  });
  vi.mocked(listarAcessosPlataforma).mockResolvedValue([{ id: 1, usuario_email: "dono@plataforma.com", recurso: "operacao", ip: "10.0.0.1", criado_em: "2026-09-28T12:01:00Z" }]);

  await act(async () => root.render(<OperacaoEmpresa empresaId={3} onFechar={vi.fn()} />));

  const texto = document.body.textContent || "";
  expect(texto).toContain("Operação: Acme");
  expect(texto).toContain("somente leitura");
  expect(texto).toContain("Sem internet");
  expect(texto).toContain("SLA vencido");
  expect(texto).toContain("4 (+1 aguardando)");
  expect(texto).toContain("dono@plataforma.com · visualizou a operação");
  expect(consultarOperacaoEmpresa).toHaveBeenCalledWith(3);
  expect(document.body.querySelector("form, input, textarea")).toBeNull();
});
