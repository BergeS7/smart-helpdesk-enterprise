import { expect, it } from "vitest";
import { buildAdminNavigation } from "./adminNavigation";
import { temRecursoApp } from "../modules/comum/appShared";

const admin = { administrador: true, plataforma: false, tecnico: false, permissions: ["gerenciar_base" as const] };

it("a área Base só aparece quando o plano inclui a base de conhecimento", () => {
  expect(buildAdminNavigation({ ...admin, baseConhecimento: true }).some((area) => area.id === "knowledge")).toBe(true);
  expect(buildAdminNavigation({ ...admin, baseConhecimento: false }).some((area) => area.id === "knowledge")).toBe(false);
});

it("sessão sem lista de recursos (anterior aos planos) não esconde nada", () => {
  expect(temRecursoApp({}, "assistente_ia")).toBe(true);
  expect(temRecursoApp({ recursos: ["base_conhecimento"] }, "assistente_ia")).toBe(false);
  expect(temRecursoApp({ recursos: ["base_conhecimento", "assistente_ia"] }, "assistente_ia")).toBe(true);
});
