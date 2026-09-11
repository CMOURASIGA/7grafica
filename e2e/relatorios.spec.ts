import { expect, test } from "@playwright/test";

test("dashboard, relatórios e administração carregam com layout responsivo", async ({ page }, info) => {
  const erros: string[] = [];
  page.on("pageerror", (erro) => erros.push(erro.message));
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill("admin@graficanovaera.com.br");
  await page.getByLabel("Senha", { exact: true }).fill("demo123");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByText("Faturamento de Pedidos")).toBeVisible();
  await page.goto("/relatorios");
  await expect(page.getByRole("heading", { name: "Relatórios" })).toBeVisible();
  await expect(page.getByText("Critérios de leitura")).toBeVisible();
  await page.goto("/configuracoes");
  await expect(page.getByText("Segurança, perfis e permissões")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: info.outputPath("relatorios-admin.png"), fullPage: true });
  expect(erros).toEqual([]);
});
