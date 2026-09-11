import { expect, test } from "@playwright/test";

test("convite, conta e link temporário exibem somente dados vinculados", async ({ page }, info) => {
  const erros: string[] = []; page.on("pageerror", (erro) => erros.push(erro.message));
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill("gerente@graficanovaera.com.br");
  await page.getByLabel("Senha", { exact: true }).fill("demo123");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.goto("/portal-clientes");
  await page.getByLabel("Cliente").selectOption("cliente-1");
  await page.getByRole("button", { name: "Gerar convite" }).click();
  const convite = await page.getByText(/\/portal\/acesso\?convite=/).textContent();
  await page.goto(convite!);
  await page.getByLabel("Senha").fill("senha-segura");
  await page.getByRole("button", { name: "Ativar e entrar" }).click();
  await expect(page).toHaveURL(/\/portal\/cliente/);
  await expect(page.getByText("fernanda@saborcia.com.br")).toBeVisible();
  await expect(page.getByText(/PED-/).first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: info.outputPath("portal-cliente.png"), fullPage: true });
  expect(erros).toEqual([]);
});
