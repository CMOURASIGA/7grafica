import { expect, test, type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill("gerente@graficanovaera.com.br");
  await page.getByLabel("Senha", { exact: true }).fill("demo123");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
}

test("fluxo completo do Cliente aos Relatórios preserva uma única cadeia de domínio", async ({ page }, info) => {
  const erros: string[] = [];
  page.on("pageerror", (erro) => erros.push(erro.message));
  await login(page);

  await page.goto("/orcamentos/orc-1");
  await expect(page.getByText("Orcamento ORC-0001 — V1", { exact: true })).toBeVisible();
  await expect(page.getByText(/Aprovado/).first()).toBeVisible();
  await page.goto("/pedidos/pedido-1");
  await expect(page.getByText("PED-0001")).toBeVisible();
  await expect(page.getByText("Padaria Sabor & Cia LTDA")).toBeVisible();

  await page.goto("/caixa");
  await page.getByLabel("Valor de abertura (dinheiro)").fill("100");
  await page.getByRole("button", { name: "Abrir caixa", exact: true }).click();
  await expect(page.getByText("Caixa aberto.", { exact: true })).toBeVisible();

  await page.goto("/compras");
  await page.getByLabel("Fornecedor", { exact: true }).selectOption("fornecedor-1");
  await page.getByLabel("Material da compra").selectOption("material-1");
  await page.getByLabel("Quantidade na unidade de compra").fill("1");
  await page.getByLabel("Preço por unidade de compra (R$)").fill("40");
  await page.getByRole("button", { name: "Adicionar item", exact: true }).click();
  await page.getByRole("button", { name: "Criar pedido de compra", exact: true }).click();
  await page.getByRole("button", { name: "Receber ou cancelar PC-0001" }).click();
  await page.getByLabel(/Receber Papel Couche/).fill("1");
  await page.getByLabel("Documento do recebimento").fill("NF-FLUXO-MVP");
  await page.getByLabel("Vencimento da conta a pagar").fill("2026-10-10");
  await page.getByRole("button", { name: "Confirmar recebimento", exact: true }).click();
  await expect(page.getByText(/NF-FLUXO-MVP/)).toBeVisible();

  await page.goto("/trabalhos/trabalho-1");
  await page.locator("#arquivo-btn-aprovar-arquivo-1").click();
  await page.locator("#arquivo-btn-liberar-arquivo-1").click();
  await expect(page.getByText("Liberado para produção", { exact: true })).toBeVisible();
  await page.getByLabel("Material do consumo").selectOption("material-1");
  await page.getByLabel(/Quantidade operacional/).fill("100");
  await page.getByRole("button", { name: "Salvar previsão" }).click();
  await page.getByLabel("Motivo do movimento").fill("Fluxo integral do MVP");
  await page.getByRole("button", { name: "Reservar material" }).click();
  await page.getByRole("button", { name: "Registrar consumo" }).click();
  await expect(page.getByText(/Real: 100/)).toBeVisible();
  await page.getByRole("button", { name: /Acabamento/ }).click();
  await expect(page.getByText('Trabalho movido para "Acabamento".', { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Conferencia final/ }).click();
  await expect(page.getByText('Trabalho movido para "Conferencia final".', { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Concluir Trabalho", exact: true }).click();
  await expect(page.getByText("Trabalho concluído.", { exact: true })).toBeVisible();

  await page.goto("/pedidos/pedido-1");
  await page.getByLabel("Forma de pagamento").selectOption({ index: 1 });
  await page.getByLabel("Valor", { exact: true }).fill("180");
  await page.getByRole("button", { name: "Registrar recebimento", exact: true }).click();
  await expect(page.getByText("R$ 180.00", { exact: true }).first()).toBeVisible();

  await page.goto("/entregas");
  await page.getByLabel("Pedido").selectOption("pedido-1");
  await page.getByLabel("Modalidade").selectOption("retirada");
  await page.getByRole("button", { name: "Preparar entrega", exact: true }).click();
  await page.getByRole("button", { name: "Aguardar retirada", exact: true }).click();
  await page.getByLabel(/Recebedor/).fill("Fernanda Cliente");
  await page.getByLabel(/Referência do comprovante/).fill("COMP-MVP-001");
  await page.getByRole("button", { name: "Confirmar entrega", exact: true }).click();
  await expect(page.getByText(/Recebido por Fernanda Cliente/)).toBeVisible();

  await page.goto("/portal-clientes");
  await page.getByLabel("Cliente").selectOption("cliente-1");
  await page.getByRole("button", { name: "Gerar convite" }).click();
  const convite = await page.getByText(/\/portal\/acesso\?convite=/).textContent();
  await page.goto(convite!);
  await page.getByLabel("Senha").fill("senha-fluxo-mvp");
  await page.getByRole("button", { name: "Ativar e entrar" }).click();
  await expect(page.getByText("PED-0001")).toBeVisible();
  await expect(page.getByText(/Entregue/).first()).toBeVisible();

  await page.goto("/relatorios");
  await page.getByLabel("Início").fill("2026-01-01");
  await page.getByLabel("Fim").fill("2026-12-31");
  await expect(page.getByText("Padaria Sabor & Cia LTDA")).toBeVisible();
  await expect(page.getByText(/R\$\s*180,00/).first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: info.outputPath("fluxo-mvp-completo.png"), fullPage: true });
  expect(erros).toEqual([]);
});
