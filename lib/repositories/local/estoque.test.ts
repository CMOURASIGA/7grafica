import { beforeEach, describe, expect, it, vi } from "vitest";
import { criarRepositoriesLocal } from "./index";
import { restaurarDadosDemo } from "@/lib/mock/reset";
import { EMPRESA_DEMO_ID } from "@/lib/mock/seed-data";
import { protegerRepositories, PermissaoNegadaError } from "../authorization";
import { lerEstoque } from "./estoque";

const empresa = EMPRESA_DEMO_ID, usuario = "usuario-gerente";
const repos = () => criarRepositoriesLocal();
async function mover(tipo: "entrada" | "reserva" | "liberacao" | "consumo" | "perda" | "saida" | "ajuste", quantidade: number, trabalhoId?: string) {
  return repos().estoque.movimentar(empresa, { tipo, quantidade, materialId: "material-1", unidadeId: "unidade-folha", motivo: "Conferência", operacaoId: crypto.randomUUID(), trabalhoId }, usuario);
}
async function comprar(quantidade = 2) {
  const r = repos();
  await r.compras.criar(empresa, { fornecedorId: "fornecedor-1", cotacao: "COT-01", operacaoId: crypto.randomUUID(), itens: [{ materialId: "material-1", unidadeId: "unidade-resma", quantidade, precoUnitario: 40 }] }, usuario);
  return (await r.compras.listar(empresa))[0];
}
describe("SPEC 08 estoque e compras", () => {
  beforeEach(() => { vi.restoreAllMocks(); restaurarDadosDemo(); });
  it("converte resma em folhas e separa reserva do saldo físico", async () => {
    const r = repos();
    await r.estoque.movimentar(empresa, { tipo: "entrada", quantidade: 2, materialId: "material-1", unidadeId: "unidade-resma", unidadeCompra: true, motivo: "Saldo inicial", operacaoId: "entrada-1" }, usuario);
    await mover("reserva", 300, "trabalho-1");
    expect((await r.estoque.listar(empresa)).find((s) => s.materialId === "material-1")).toMatchObject({ fisico: 1000, reservado: 300, disponivel: 700 });
    await mover("consumo", 200, "trabalho-1"); await mover("perda", 10, "trabalho-1");
    await r.estoque.planejar(empresa, { trabalhoId: "trabalho-1", materialId: "material-1", quantidade: 210 }, usuario);
    expect((await r.estoque.listarPorTrabalho(empresa, "trabalho-1"))[0]).toMatchObject({ previsto: 210, real: 200, perda: 10, reservado: 90 });
    await mover("liberacao", 90, "trabalho-1");
    expect((await r.estoque.listar(empresa))[0]).toMatchObject({ fisico: 790, reservado: 0, disponivel: 790 });
  });
  it("preserva reserva de outro trabalho e impede estoque negativo", async () => {
    await mover("entrada", 100); await mover("reserva", 80, "trabalho-1");
    await expect(mover("saida", 21)).rejects.toThrow(/insuficiente/);
    await expect(mover("reserva", 21, "trabalho-1")).rejects.toThrow(/insuficiente/);
    await expect(mover("liberacao", 81, "trabalho-1")).rejects.toThrow(/excede/);
    await mover("consumo", 90, "trabalho-1");
    expect((await repos().estoque.listar(empresa))[0]).toMatchObject({ fisico: 10, reservado: 0 });
  });
  it("ajuste negativo respeita reservas e exige motivo", async () => {
    await mover("entrada", 100); await mover("reserva", 80, "trabalho-1");
    await expect(mover("ajuste", -21)).rejects.toThrow(/insuficiente/);
    await mover("ajuste", -20);
    await expect(repos().estoque.movimentar(empresa, { tipo: "entrada", quantidade: 1, materialId: "material-1", unidadeId: "unidade-folha", motivo: "", operacaoId: "sem-motivo" }, usuario)).rejects.toThrow(/motivo/);
  });
  it("alerta considera disponível e não soma reserva ao físico", async () => {
    const r = repos(); await mover("entrada", 100);
    await r.estoque.configurar(empresa, { materialId: "material-1", minimo: 30, cartucho: false }, usuario);
    await mover("reserva", 80, "trabalho-1");
    expect((await r.estoque.listar(empresa))[0].abaixoMinimo).toBe(true);
  });
  it("recebimento parcial gera entrada e título uma vez, preservando fator contratado", async () => {
    const r = repos(), compra = await comprar();
    await r.conversoesUnidade.atualizar("conv-1", { fator: 100 });
    const dados = { compraId: compra.id, documento: "NF-1", vencimento: "2026-10-10", operacaoId: "rec-1", itens: [{ itemId: compra.itens[0].id, quantidade: 1 }] };
    await r.compras.receber(empresa, dados, usuario); await r.compras.receber(empresa, dados, usuario);
    expect((await r.estoque.listar(empresa))[0].fisico).toBe(500);
    expect((await r.compras.listar(empresa))[0].situacao).toBe("parcial");
    expect(await r.compras.listarContasPagar(empresa)).toHaveLength(1);
    expect((await r.compras.listarContasPagar(empresa))[0].valor).toBe(40);
    await expect(r.compras.receber(empresa, { ...dados, operacaoId: "rec-duplicado" }, usuario)).rejects.toThrow(/já recebido/);
    await r.compras.receber(empresa, { ...dados, documento: "NF-2", operacaoId: "rec-2" }, usuario);
    expect((await r.compras.listar(empresa))[0].situacao).toBe("recebido");
    expect((await r.estoque.listar(empresa))[0].fisico).toBe(1000);
  });
  it("falha em um item não grava estoque nem conta parcial", async () => {
    const r = repos(), compra = await comprar();
    const antes = lerEstoque(empresa);
    await expect(r.compras.receber(empresa, { compraId: compra.id, documento: "NF-1", vencimento: "2026-10-10", operacaoId: "rec-1", itens: [{ itemId: compra.itens[0].id, quantidade: 1 }, { itemId: "inexistente", quantidade: 1 }] }, usuario)).rejects.toThrow(/excede/);
    expect(lerEstoque(empresa)).toEqual(antes);
  });
  it("não confirma operação se a quota do navegador falhar", async () => {
    const compra = await comprar(), antes = lerEstoque(empresa);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("QuotaExceeded"); });
    await expect(repos().compras.receber(empresa, { compraId: compra.id, documento: "NF-1", vencimento: "2026-10-10", operacaoId: "rec-1", itens: [{ itemId: compra.itens[0].id, quantidade: 1 }] }, usuario)).rejects.toThrow(/salvar/);
    expect(lerEstoque(empresa)).toEqual(antes);
  });
  it("cancelar saldo de compra parcial preserva recebido e contas", async () => {
    const r = repos(), compra = await comprar();
    await r.compras.receber(empresa, { compraId: compra.id, documento: "NF-1", vencimento: "2026-10-10", operacaoId: "rec-1", itens: [{ itemId: compra.itens[0].id, quantidade: 1 }] }, usuario);
    await r.compras.cancelar(empresa, { compraId: compra.id, motivo: "Fornecedor sem estoque" }, usuario);
    expect((await r.compras.listar(empresa))[0]).toMatchObject({ situacao: "cancelado" });
    expect((await r.estoque.listar(empresa))[0].fisico).toBe(500);
    expect(await r.compras.listarContasPagar(empresa)).toHaveLength(1);
  });
  it("cartucho opera por item, registra troca e custo estimado", async () => {
    const r = repos(); await r.estoque.configurar(empresa, { materialId: "material-3", minimo: 1, cartucho: true }, usuario);
    await r.estoque.movimentar(empresa, { tipo: "entrada", quantidade: 2, materialId: "material-3", unidadeId: "unidade-unidade", motivo: "Cartuchos recebidos", operacaoId: "cartuchos" }, usuario);
    await r.estoque.registrarTroca(empresa, { materialId: "material-3", equipamentoId: "equip-1", quantidade: 1, motivo: "Cartucho esgotado", operacaoId: "troca-1" }, usuario);
    await r.estoque.configurarCustoPagina(empresa, { equipamentoId: "equip-1", custo: 0.04 }, usuario);
    expect((await r.estoque.listar(empresa)).find((s) => s.materialId === "material-3")).toMatchObject({ fisico: 1, unidadeOperacionalId: "unidade-unidade" });
    expect(await r.estoque.listarCustosPagina(empresa)).toEqual([{ equipamentoId: "equip-1", custo: 0.04 }]);
    await expect(r.estoque.configurar(empresa, { materialId: "material-3", minimo: 0, cartucho: false }, usuario)).rejects.toThrow(/histórico/);
  });
  it("cartucho pode ser comprado sem converter para litros", async () => {
    const r = repos(); await r.estoque.configurar(empresa, { materialId: "material-3", minimo: 1, cartucho: true }, usuario);
    await r.compras.criar(empresa, { fornecedorId: "fornecedor-1", cotacao: null, operacaoId: "pc-toner", itens: [{ materialId: "material-3", unidadeId: "unidade-unidade", quantidade: 2, precoUnitario: 50 }] }, usuario);
    expect((await r.compras.listar(empresa))[0].itens[0].fator).toBe(1);
  });
  it("pacote/unidade do cadastro existente usa fator explícito na compra", async () => {
    await repos().estoque.movimentar(empresa, { tipo: "entrada", quantidade: 2, materialId: "material-4", unidadeId: "unidade-unidade", unidadeCompra: true, motivo: "Dois pacotes", operacaoId: "pacotes" }, usuario);
    expect((await repos().estoque.listar(empresa)).find((s) => s.materialId === "material-4")?.fisico).toBe(100);
  });
  it("RBAC protege escrita e empresa; operador só consome/perde no próprio Trabalho", async () => {
    const base = repos(); await mover("entrada", 100);
    const op = protegerRepositories(base, "operador", "usuario-operador", empresa);
    const dados = { tipo: "consumo" as const, materialId: "material-1", quantidade: 10, unidadeId: "unidade-folha", trabalhoId: "trabalho-1", motivo: "Produção", operacaoId: "op-consumo" };
    await op.estoque.movimentar(empresa, dados, "autor-forjado");
    expect((await base.estoque.listarMovimentos(empresa)).at(-1)?.usuarioId).toBe("usuario-operador");
    await expect(op.estoque.movimentar(empresa, { ...dados, tipo: "entrada" }, usuario)).rejects.toBeInstanceOf(PermissaoNegadaError);
    await expect(op.compras.listar(empresa)).rejects.toBeInstanceOf(PermissaoNegadaError);
    await expect(op.estoque.listar("outra-empresa")).rejects.toBeInstanceOf(PermissaoNegadaError);
    const outro = protegerRepositories(base, "operador", "outro-operador", empresa);
    await expect(outro.estoque.movimentar(empresa, { ...dados, operacaoId: "outro" }, usuario)).rejects.toBeInstanceOf(PermissaoNegadaError);
    await expect(protegerRepositories(base, "atendente", "usuario-atendente", empresa).estoque.planejar(empresa, { trabalhoId: "trabalho-1", materialId: "material-1", quantidade: 10 }, usuario)).rejects.toBeInstanceOf(PermissaoNegadaError);
  });
  it("valida números e integra eventos à auditoria existente", async () => {
    await expect(mover("entrada", NaN)).rejects.toThrow(/válido/);
    await expect(mover("entrada", -1)).rejects.toThrow(/válido/);
    await mover("entrada", 10);
    expect((await repos().auditoria.listar(empresa, 100)).some((e) => e.acao === "estoque_entrada")).toBe(true);
  });
  it("material usado não pode ser apagado nem ter unidade reinterpretada", async () => {
    await mover("entrada", 100);
    await expect(repos().materiais.remover("material-1")).rejects.toThrow(/Inative/);
    await expect(repos().materiais.atualizar("material-1", { unidadeConsumoId: "unidade-litro" })).rejects.toThrow(/histórico/);
    await expect(repos().materiais.atualizar("material-1", { ativo: false })).resolves.toMatchObject({ ativo: false });
  });

});
