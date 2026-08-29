/**
 * Responsabilidade: Módulo de authenticated flow spec; implementa esta responsabilidade dentro do Smart HelpDesk.
 */
import { expect, test } from "@playwright/test";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

test("usuário autenticado alcança o painel sem erro de sessão", async ({ page }) => {
  test.skip(!email || !password, "Defina E2E_EMAIL e E2E_PASSWORD no ambiente de homologação.");
  await page.goto("/");
  await page.getByPlaceholder(/empresa\.com/).fill(email!);
  await page.getByPlaceholder("Digite sua senha").fill(password!);
  await page.getByRole("button", { name: "Avançar" }).click();
  await expect(page.getByText(/Central de Atendimento|Painel administrativo/).first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Não foi possível exibir esta tela")).toHaveCount(0);
});

