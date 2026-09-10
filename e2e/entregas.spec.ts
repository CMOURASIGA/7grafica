import { expect, test } from "@playwright/test";

test("expedição apresenta entregas e permanece responsiva", async ({ page }, info) => {
  const erros: string[] = [];
  page.on("pageerror", (erro) => erros.push(erro.message));
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill("gerente@graficanovaera.com.br");
  await page.getByLabel("Senha", { exact: true }).fill("demo123");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.goto("/entregas");
  await expect(page.getByRole("heading", { name: "Entregas" })).toBeVisible();
  await expect(page.getByText("Preparar Pedido pronto")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: info.outputPath("entregas.png"), fullPage: true });
  expect(erros).toEqual([]);
});
