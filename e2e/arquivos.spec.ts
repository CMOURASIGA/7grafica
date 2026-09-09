import { test, expect, type Page } from "@playwright/test";
import { PDFDocument } from "pdf-lib";

async function login(page: Page, papel = "gerente") {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(`${papel}@graficanovaera.com.br`);
  await page.getByLabel("Senha", { exact: true }).fill("demo123");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
}
async function semOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
}

test("arte pronta, nova versão, aprovação pública, persistência e layout", async ({ page }, info) => {
  const erros: string[] = [];
  page.on("pageerror", (error) => erros.push(error.message));
  await login(page);
  await page.goto("/trabalhos/trabalho-1");
  await page.getByRole("button", { name: /Acabamento/ }).click();
  await expect(page.getByText(/Etapa "Acabamento" bloqueada/)).toBeVisible();
  await page.locator("#arquivo-btn-aprovar-arquivo-1").click();
  await page.locator("#arquivo-btn-liberar-arquivo-1").click();
  await expect(page.getByText("Liberado para produção", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Acabamento/ }).click();
  await expect(page.getByText('Trabalho movido para "Acabamento".', { exact: true })).toBeVisible();
  await page.locator("#arquivo-btn-nova-versao-arquivo-1").click();
  await page.getByLabel("Comentário desta versão").fill("Ajuste solicitado pelo cliente");
  await page.getByLabel("Briefing da arte").fill("Preservar identidade e revisar telefone");
  const pdf = await PDFDocument.create(); pdf.addPage([90 * 72 / 25.4, 50 * 72 / 25.4]); pdf.addPage([90 * 72 / 25.4, 50 * 72 / 25.4]);
  await page.locator("#arquivo-local").setInputFiles({ name: "cartao_v2.pdf", mimeType: "application/pdf", buffer: Buffer.from(await pdf.save()) });
  await expect(page.getByLabel("Nome do arquivo", { exact: true })).toHaveValue("cartao_v2.pdf");
  await semOverflow(page);
  await page.locator("#arquivo-form-btn-salvar").click();
  await page.getByRole("button", { name: "Enviar para aprovação do cliente", exact: true }).click();
  const href = await page.locator('a[href^="/portal/arte/"]').getAttribute("href");
  expect(href).toBeTruthy();
  await page.goto(href!);
  await page.getByLabel("Comentário (opcional)").fill("Conferido");
  await page.getByRole("button", { name: "Aprovar arte", exact: true }).click();
  await expect(page.getByText(/Aprovação registrada/)).toBeVisible();
  await semOverflow(page);
  await page.goto("/trabalhos/trabalho-1");
  await page.getByRole("button", { name: "Aprovar tecnicamente", exact: true }).click();
  await page.getByRole("button", { name: "Liberar para produção", exact: true }).click();
  await page.reload();
  await expect(page.getByText("Liberado para produção", { exact: true })).toBeVisible();
  await page.getByText("Histórico de versões (1)", { exact: true }).click();
  await expect(page.getByText(/v1.*cartao_sabor_cia_v1.pdf/)).toBeVisible();
  await semOverflow(page);
  await page.screenshot({ path: info.outputPath("trabalho.png"), fullPage: true });
  expect(erros).toEqual([]);
});

test("operador não vê arquivo pendente nem ações de liberação", async ({ page }) => {
  await login(page, "operador");
  await page.goto("/trabalhos/trabalho-1");
  await expect(page.getByText("Nenhum arquivo recebido ainda para este Trabalho.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Adicionar arquivo", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Liberar para produção", exact: true })).toHaveCount(0);
});
