import { beforeEach, describe, expect, it } from "vitest";
import { criarRepositoriesLocal } from "./index";
import { limparNamespace } from "@/lib/storage/local-storage-client";

const EMPRESA_ID = "empresa-caixa-teste";

describe("CaixaRepository + RecebimentoRepository (fluxo da SPEC 04)", () => {
  beforeEach(() => {
    limparNamespace();
  });

  it("nao permite dois caixas abertos ao mesmo tempo", async () => {
    const repos = criarRepositoriesLocal();
    await repos.caixa.abrir({ empresaId: EMPRESA_ID, usuarioId: "user-1", valorAberturaDinheiro: 100, observacoes: null });
    await expect(repos.caixa.abrir({ empresaId: EMPRESA_ID, usuarioId: "user-1", valorAberturaDinheiro: 50, observacoes: null })).rejects.toThrow();
  });

  it("recebimento em dinheiro calcula troco; outras formas nao calculam", async () => {
    const repos = criarRepositoriesLocal();
    const dinheiro = await repos.formasPagamento.criar({ empresaId: EMPRESA_ID, nome: "Dinheiro", ativo: true });
    const pix = await repos.formasPagamento.criar({ empresaId: EMPRESA_ID, nome: "Pix", ativo: true });
    const caixa = await repos.caixa.abrir({ empresaId: EMPRESA_ID, usuarioId: "user-1", valorAberturaDinheiro: 0, observacoes: null });
    const pedido = await repos.pedidos.criarAtendimentoBalcao({
      empresaId: EMPRESA_ID,
      clienteId: null,
      itens: [{ id: "item-1", descricao: "Servico simples", quantidade: 1, servicoId: null, materialId: null, acabamentos: null, precoUnitario: 50 }],
      valorTotal: 50,
      statusEntrega: "concluido",
    });

    const recebimentoDinheiro = await repos.recebimentos.criar({
      empresaId: EMPRESA_ID,
      pedidoId: pedido.id,
      caixaId: caixa.id,
      formaPagamentoId: dinheiro.id,
      valor: 50,
      valorEntregueDinheiro: 100,
      registradoPorUsuarioId: "user-1",
    });
    expect(recebimentoDinheiro.troco).toBe(50);

    const recebimentoPix = await repos.recebimentos.criar({
      empresaId: EMPRESA_ID,
      pedidoId: pedido.id,
      caixaId: caixa.id,
      formaPagamentoId: pix.id,
      valor: 30,
      valorEntregueDinheiro: null,
      registradoPorUsuarioId: "user-1",
    });
    expect(recebimentoPix.troco).toBeNull();
  });

  it("resumo do caixa soma por forma de pagamento e calcula saldo em dinheiro (nao mistura cartao)", async () => {
    const repos = criarRepositoriesLocal();
    const dinheiro = await repos.formasPagamento.criar({ empresaId: EMPRESA_ID, nome: "Dinheiro", ativo: true });
    const credito = await repos.formasPagamento.criar({ empresaId: EMPRESA_ID, nome: "Cartao de credito", ativo: true });
    const caixa = await repos.caixa.abrir({ empresaId: EMPRESA_ID, usuarioId: "user-1", valorAberturaDinheiro: 100, observacoes: null });

    const pedidoA = await repos.pedidos.criarAtendimentoBalcao({
      empresaId: EMPRESA_ID,
      clienteId: null,
      itens: [{ id: "item-1", descricao: "A", quantidade: 1, servicoId: null, materialId: null, acabamentos: null, precoUnitario: 40 }],
      valorTotal: 40,
      statusEntrega: "concluido",
    });
    const pedidoB = await repos.pedidos.criarAtendimentoBalcao({
      empresaId: EMPRESA_ID,
      clienteId: null,
      itens: [{ id: "item-1", descricao: "B", quantidade: 1, servicoId: null, materialId: null, acabamentos: null, precoUnitario: 60 }],
      valorTotal: 60,
      statusEntrega: "concluido",
    });

    await repos.recebimentos.criar({ empresaId: EMPRESA_ID, pedidoId: pedidoA.id, caixaId: caixa.id, formaPagamentoId: dinheiro.id, valor: 40, valorEntregueDinheiro: 40, registradoPorUsuarioId: "user-1" });
    await repos.recebimentos.criar({ empresaId: EMPRESA_ID, pedidoId: pedidoB.id, caixaId: caixa.id, formaPagamentoId: credito.id, valor: 60, valorEntregueDinheiro: null, registradoPorUsuarioId: "user-1" });
    await repos.movimentosCaixaManual.criar({ empresaId: EMPRESA_ID, caixaId: caixa.id, tipo: "saida", valor: 15, motivo: "Compra urgente", registradoPorUsuarioId: "user-1" });

    const resumo = await repos.caixa.obterResumo(caixa.id);
    expect(resumo.totalRecebido).toBe(100);
    expect(resumo.quantidadePedidosAtendidos).toBe(2);
    expect(resumo.ticketMedio).toBe(50);
    // Saldo em dinheiro: abertura (100) + recebido em dinheiro (40) - saida manual (15) = 125. O credito NAO entra.
    expect(resumo.saldoDinheiroEsperado).toBe(125);
    expect(resumo.totalPorFormaPagamento).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ nomeFormaPagamento: "Dinheiro", total: 40 }),
        expect.objectContaining({ nomeFormaPagamento: "Cartao de credito", total: 60 }),
      ]),
    );

    const fechado = await repos.caixa.fechar(caixa.id, { usuarioId: "user-1", observacoes: "Tudo confere" });
    expect(fechado.status).toBe("fechado");
    await expect(repos.caixa.obterAberto(EMPRESA_ID)).resolves.toBeNull();
  });

  it("Pedido de balcao permite pagamento parcial (sinal + saldo depois) sem campo booleano de pago", async () => {
    const repos = criarRepositoriesLocal();
    const pix = await repos.formasPagamento.criar({ empresaId: EMPRESA_ID, nome: "Pix", ativo: true });
    const credito = await repos.formasPagamento.criar({ empresaId: EMPRESA_ID, nome: "Cartao de credito", ativo: true });
    const caixa = await repos.caixa.abrir({ empresaId: EMPRESA_ID, usuarioId: "user-1", valorAberturaDinheiro: 0, observacoes: null });

    const pedido = await repos.pedidos.criarAtendimentoBalcao({
      empresaId: EMPRESA_ID,
      clienteId: null,
      itens: [{ id: "item-1", descricao: "Banner grande", quantidade: 1, servicoId: null, materialId: null, acabamentos: null, precoUnitario: 500 }],
      valorTotal: 500,
      statusEntrega: "aguardando_producao",
    });

    await repos.recebimentos.criar({ empresaId: EMPRESA_ID, pedidoId: pedido.id, caixaId: caixa.id, formaPagamentoId: pix.id, valor: 200, valorEntregueDinheiro: null, registradoPorUsuarioId: "user-1" });
    let recebimentos = await repos.recebimentos.listarPorPedido(pedido.id);
    expect(recebimentos.reduce((soma, item) => soma + item.valor, 0)).toBe(200);

    // Dias depois, o saldo e pago com outra forma — mesmo Pedido, 1:N Recebimentos.
    await repos.recebimentos.criar({ empresaId: EMPRESA_ID, pedidoId: pedido.id, caixaId: caixa.id, formaPagamentoId: credito.id, valor: 300, valorEntregueDinheiro: null, registradoPorUsuarioId: "user-1" });
    recebimentos = await repos.recebimentos.listarPorPedido(pedido.id);
    expect(recebimentos).toHaveLength(2);
    expect(recebimentos.reduce((soma, item) => soma + item.valor, 0)).toBe(500);
  });
});
