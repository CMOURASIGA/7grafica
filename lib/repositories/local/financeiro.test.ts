import { beforeEach, describe, expect, it } from "vitest";
import { restaurarDadosDemo } from "@/lib/mock/reset";
import { EMPRESA_DEMO_ID } from "@/lib/mock/seed-data";
import { protegerRepositories, PermissaoNegadaError } from "@/lib/repositories/authorization";
import { criarRepositoriesLocal } from "./index";

const empresa = EMPRESA_DEMO_ID, usuario = "usuario-gerente";

describe("SPEC 09 financeiro operacional", () => {
  beforeEach(() => restaurarDadosDemo());

  it("deriva contas a receber dos Pedidos e Recebimentos consolidados", async () => {
    const repos = criarRepositoriesLocal(), pedido = (await repos.pedidos.listar(empresa))[0];
    const antes = (await repos.financeiro.listarContasReceber(empresa)).find((c) => c.pedidoId === pedido.id)!;
    const forma = (await repos.formasPagamento.listar(empresa))[0], caixa = await repos.caixa.abrir({ empresaId: empresa, usuarioId: usuario, valorAberturaDinheiro: 0, observacoes: null });
    await repos.recebimentos.criar({ empresaId: empresa, pedidoId: pedido.id, caixaId: caixa.id, formaPagamentoId: forma.id, valor: Math.min(10, antes.saldo), valorEntregueDinheiro: null, registradoPorUsuarioId: usuario });
    const depois = (await repos.financeiro.listarContasReceber(empresa)).find((c) => c.pedidoId === pedido.id)!;
    expect(depois.recebido).toBe(antes.recebido + Math.min(10, antes.saldo));
    expect(depois.saldo).toBe(antes.saldo - Math.min(10, antes.saldo));
  });

  it("registra, vincula e baixa despesa sem alterar o Pedido", async () => {
    const repos = criarRepositoriesLocal(), pedido = (await repos.pedidos.listar(empresa))[0], forma = (await repos.formasPagamento.listar(empresa))[0];
    await repos.financeiro.criarDespesa(empresa, { descricao: "Frete", categoria: "Logística", valor: 25, vencimento: "2026-09-20", competencia: "2026-09", pedidoId: pedido.id, operacaoId: "desp-1" }, usuario);
    await repos.financeiro.criarDespesa(empresa, { descricao: "Frete", categoria: "Logística", valor: 25, vencimento: "2026-09-20", competencia: "2026-09", pedidoId: pedido.id, operacaoId: "desp-1" }, usuario);
    const despesa = (await repos.financeiro.listarDespesas(empresa))[0];
    expect(await repos.financeiro.obterResultadoPedido(empresa, pedido.id)).toMatchObject({ despesasDiretas: 25 });
    await repos.financeiro.pagarDespesa(empresa, { despesaId: despesa.id, formaPagamentoId: forma.id, pagoEm: "2026-09-10", operacaoId: "pag-1" }, usuario);
    expect((await repos.financeiro.listarContasPagar(empresa)).find((c) => c.id === despesa.id)).toMatchObject({ situacao: "pago", saldo: 0 });
  });

  it("liquida a ContaPagarCompra existente sem criar título paralelo", async () => {
    const repos = criarRepositoriesLocal(), forma = (await repos.formasPagamento.listar(empresa))[0];
    await repos.compras.criar(empresa, { fornecedorId: "fornecedor-1", cotacao: null, operacaoId: "pc-1", itens: [{ materialId: "material-1", unidadeId: "unidade-resma", quantidade: 1, precoUnitario: 40 }] }, usuario);
    const compra = (await repos.compras.listar(empresa))[0];
    await repos.compras.receber(empresa, { compraId: compra.id, documento: "NF-09", vencimento: "2026-09-20", operacaoId: "rec-1", itens: [{ itemId: compra.itens[0].id, quantidade: 1 }] }, usuario);
    const origem = (await repos.compras.listarContasPagar(empresa))[0];
    expect((await repos.financeiro.listarContasPagar(empresa)).find((c) => c.id === origem.id)).toMatchObject({ origem: "compra", saldo: 40 });
    await repos.financeiro.pagarContaCompra(empresa, { contaPagarCompraId: origem.id, formaPagamentoId: forma.id, pagoEm: "2026-09-10", operacaoId: "pag-pc-1" }, usuario);
    expect((await repos.financeiro.listarContasPagar(empresa)).find((c) => c.id === origem.id)).toMatchObject({ situacao: "pago", saldo: 0 });
    expect(await repos.compras.listarContasPagar(empresa)).toHaveLength(1);
  });

  it("calcula indicadores por período e aplica RBAC no repository", async () => {
    const base = criarRepositoriesLocal(), forma = (await base.formasPagamento.listar(empresa))[0];
    await base.financeiro.criarDespesa(empresa, { descricao: "Energia", categoria: "Fixa", valor: 100, vencimento: "2026-09-10", competencia: "2026-09", operacaoId: "d-1" }, usuario);
    const despesa = (await base.financeiro.listarDespesas(empresa))[0];
    await base.financeiro.pagarDespesa(empresa, { despesaId: despesa.id, formaPagamentoId: forma.id, pagoEm: "2026-09-10", operacaoId: "p-1" }, usuario);
    expect(await base.financeiro.obterResumo(empresa, "2026-09-01", "2026-09-30")).toMatchObject({ despesasPagas: 100 });
    await expect(protegerRepositories(base, "operador", "usuario-operador", empresa).financeiro.listarContasPagar(empresa)).rejects.toBeInstanceOf(PermissaoNegadaError);
    await expect(protegerRepositories(base, "gerente", usuario, empresa).financeiro.listarContasPagar("outra-empresa")).rejects.toBeInstanceOf(PermissaoNegadaError);
  });
});
