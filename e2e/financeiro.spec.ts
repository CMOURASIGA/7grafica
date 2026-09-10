import { expect, test } from "@playwright/test";

test("despesa, baixa, indicadores e resultado por pedido persistem", async ({ page }, info) => {
  const erros: string[] = []; page.on("pageerror", (erro) => erros.push(erro.message));
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill("gerente@graficanovaera.com.br");
  await page.getByLabel("Senha", { exact: true }).fill("demo123");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.goto("/financeiro");
  await page.getByLabel("Descrição").fill("Frete do pedido");
  await page.getByLabel("Categoria").fill("Logística");
  await page.getByLabel("Valor").fill("25");
  await page.getByLabel("Vencimento").fill("2026-09-20");
  await page.getByLabel("Competência").fill("2026-09");
  await page.getByLabel("Pedido relacionado, opcional").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Registrar despesa" }).click();
  await expect(page.getByText("Frete do pedido", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Baixar hoje" }).click();
  await expect(page.getByText("pago", { exact: true }).first()).toBeVisible();
  await page.reload();
  await expect(page.getByText("Frete do pedido", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: info.outputPath("financeiro.png"), fullPage: true });
  expect(erros).toEqual([]);
});
