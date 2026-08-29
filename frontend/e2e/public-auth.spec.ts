/**
 * Responsabilidade: Módulo de public auth spec; implementa esta responsabilidade dentro do Smart HelpDesk.
 */
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/configuracoes", (route) => route.fulfill({ json: {} }));
  await page.route("**/api/avisos/ativos", (route) => route.fulfill({ json: [] }));
});

test("login é legível e utilizável sem rolagem horizontal", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Olá, seja bem-vindo!" })).toBeVisible();
  await expect(page.getByPlaceholder(/empresa\.com/)).toBeVisible();
  await expect(page.getByPlaceholder("Digite sua senha")).toBeVisible();
  await expect(page.getByRole("button", { name: "Avançar" })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});

test("sessão parcial é removida antes de montar áreas protegidas", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("smart_helpdesk_usuario", JSON.stringify({ id: 1, nome: "Inválido", email: "x@x.com", perfil: "admin" })));
  const protectedRequests: string[] = [];
  page.on("request", (request) => {
    if (/\/api\/(chamados|dashboard|usuarios|notificacoes|permissoes)/.test(request.url())) protectedRequests.push(request.url());
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Olá, seja bem-vindo!" })).toBeVisible();
  expect(protectedRequests).toEqual([]);
  expect(await page.evaluate(() => localStorage.getItem("smart_helpdesk_usuario"))).toBeNull();
});

