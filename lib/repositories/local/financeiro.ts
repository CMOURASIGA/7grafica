import type { FormaPagamento, Fornecedor, MovimentoCaixaManual, Pedido, Recebimento } from "@/lib/domain/entities";
import { estadoFinanceiroVazio, type ContaPagarFinanceira, type ContaReceberFinanceira, type EstadoFinanceiro } from "@/lib/domain/financeiro";
import type { FinanceiroRepository } from "@/lib/repositories/financeiro-types";
import { lerEstoque } from "@/lib/repositories/local/estoque";
import { gerarId, gravarValorConfirmado, lerColecao, lerValor } from "@/lib/storage/local-storage-client";

const chave = (empresaId: string) => `financeiro_v1:${empresaId}`;
export const lerFinanceiro = (empresaId: string): EstadoFinanceiro => {
  const atual = lerValor<EstadoFinanceiro>(chave(empresaId));
  return atual ? { ...atual, eventos: atual.eventos ?? [] } : estadoFinanceiroVazio();
};
const salvar = (empresaId: string, estado: EstadoFinanceiro) => gravarValorConfirmado(chave(empresaId), estado);
const moeda = (valor: number) => Math.round(valor * 100) / 100;
const dataValida = (data: string) => /^\d{4}-\d{2}-\d{2}$/.test(data) && !Number.isNaN(Date.parse(`${data}T12:00:00`));
const noPeriodo = (iso: string, inicio: string, fim: string) => iso.slice(0, 10) >= inicio && iso.slice(0, 10) <= fim;

function validarOperacao(estado: EstadoFinanceiro, operacaoId: string) {
  if (!operacaoId?.trim()) throw new Error("Identificador da operação obrigatório.");
  return estado.operacoes.includes(operacaoId);
}
function auditar(estado: EstadoFinanceiro, empresaId: string, usuarioId: string, acao: string, entidadeId: string, dadosDepois: object) {
  estado.eventos.push({ id: gerarId("evt"), empresaId, usuarioId, acao, entidade: "financeiro", entidadeId, dadosAntes: null, dadosDepois: { ...dadosDepois }, criadoEm: new Date().toISOString() });
}
function pedidosEmpresa(empresaId: string) { return lerColecao<Pedido>("pedidos").filter((p) => p.empresaId === empresaId); }
function recebimentosEmpresa(empresaId: string) { return lerColecao<Recebimento>("recebimentos").filter((r) => r.empresaId === empresaId); }
function contasReceber(empresaId: string): ContaReceberFinanceira[] {
  const recebimentos = recebimentosEmpresa(empresaId);
  return pedidosEmpresa(empresaId).map((pedido) => {
    const recebido = moeda(recebimentos.filter((r) => r.pedidoId === pedido.id).reduce((s, r) => s + r.valor, 0));
    const saldoCalculado = moeda(Math.max(0, pedido.valorTotal - recebido));
    const saldo = pedido.statusEntrega === "cancelado" ? 0 : saldoCalculado;
    const situacao = pedido.statusEntrega === "cancelado" ? "cancelado" as const : saldo === 0 ? "pago" as const : recebido > 0 ? "parcial" as const : "pendente" as const;
    return { pedidoId: pedido.id, numero: pedido.numero, clienteId: pedido.clienteId, valorTotal: pedido.valorTotal, recebido, saldo, situacao, criadoEm: pedido.criadoEm };
  });
}
function contasPagar(empresaId: string, estado: EstadoFinanceiro): ContaPagarFinanceira[] {
  const hoje = new Date().toISOString().slice(0, 10);
  const compras = lerEstoque(empresaId).contasPagar.map((conta) => {
    const pago = moeda(estado.pagamentosCompra.filter((p) => p.contaPagarCompraId === conta.id).reduce((s, p) => s + p.valor, 0));
    const saldo = moeda(Math.max(0, conta.valor - pago));
    return { id: conta.id, origem: "compra" as const, descricao: `Compra ${conta.compraId}`, fornecedorId: conta.fornecedorId, pedidoId: null, valor: conta.valor, pago, saldo, vencimento: conta.vencimento, situacao: saldo === 0 ? "pago" as const : conta.vencimento < hoje ? "vencido" as const : pago > 0 ? "parcial" as const : "pendente" as const };
  });
  const despesas = estado.despesas.map((d) => ({ id: d.id, origem: "despesa" as const, descricao: d.descricao, fornecedorId: d.fornecedorId, pedidoId: d.pedidoId, valor: d.valor, pago: d.situacao === "paga" ? d.valor : 0, saldo: d.situacao === "aberta" ? d.valor : 0, vencimento: d.vencimento, situacao: d.situacao === "cancelada" ? "cancelado" as const : d.situacao === "paga" ? "pago" as const : d.vencimento < hoje ? "vencido" as const : "pendente" as const }));
  return [...compras, ...despesas].sort((a, b) => a.vencimento.localeCompare(b.vencimento));
}

export function criarFinanceiroRepositoryLocal(): FinanceiroRepository {
  return {
    async listarDespesas(empresaId) { return lerFinanceiro(empresaId).despesas; },
    async listarContasPagar(empresaId) { const estado = lerFinanceiro(empresaId); return contasPagar(empresaId, estado); },
    async listarContasReceber(empresaId) { return contasReceber(empresaId); },
    async criarDespesa(empresaId, dados, usuarioId) {
      const estado = lerFinanceiro(empresaId); if (validarOperacao(estado, dados.operacaoId)) return;
      if (!dados.descricao.trim() || !dados.categoria.trim()) throw new Error("Informe descrição e categoria.");
      if (!Number.isFinite(dados.valor) || dados.valor <= 0) throw new Error("Valor da despesa inválido.");
      if (!dataValida(dados.vencimento) || !/^\d{4}-\d{2}$/.test(dados.competencia)) throw new Error("Vencimento ou competência inválidos.");
      if (dados.pedidoId && !pedidosEmpresa(empresaId).some((p) => p.id === dados.pedidoId)) throw new Error("Pedido não pertence à empresa.");
      if (dados.fornecedorId && !lerColecao<Fornecedor>("fornecedores").some((f) => f.id === dados.fornecedorId && f.empresaId === empresaId)) throw new Error("Fornecedor não pertence à empresa.");
      const despesa = { id: gerarId("desp"), empresaId, descricao: dados.descricao.trim(), categoria: dados.categoria.trim(), valor: moeda(dados.valor), vencimento: dados.vencimento, competencia: dados.competencia, pedidoId: dados.pedidoId ?? null, fornecedorId: dados.fornecedorId ?? null, situacao: "aberta" as const, pagoEm: null, formaPagamentoId: null, usuarioId, criadoEm: new Date().toISOString() };
      estado.despesas.push(despesa); auditar(estado, empresaId, usuarioId, "despesa_criada", despesa.id, despesa);
      estado.operacoes.push(dados.operacaoId); salvar(empresaId, estado);
    },
    async pagarDespesa(empresaId, dados, usuarioId) {
      const estado = lerFinanceiro(empresaId); if (validarOperacao(estado, dados.operacaoId)) return;
      const despesa = estado.despesas.find((d) => d.id === dados.despesaId && d.empresaId === empresaId);
      if (!despesa || despesa.situacao !== "aberta") throw new Error("Despesa não está aberta.");
      if (!dataValida(dados.pagoEm)) throw new Error("Data de pagamento inválida.");
      if (!lerColecao<FormaPagamento>("formas_pagamento").some((f) => f.id === dados.formaPagamentoId && f.empresaId === empresaId && f.ativo)) throw new Error("Forma de pagamento inválida.");
      Object.assign(despesa, { situacao: "paga", pagoEm: dados.pagoEm, formaPagamentoId: dados.formaPagamentoId, usuarioId }); estado.operacoes.push(dados.operacaoId); auditar(estado, empresaId, usuarioId, "despesa_paga", despesa.id, dados); salvar(empresaId, estado);
    },
    async cancelarDespesa(empresaId, dados, usuarioId) {
      const estado = lerFinanceiro(empresaId), despesa = estado.despesas.find((d) => d.id === dados.despesaId && d.empresaId === empresaId);
      if (!despesa || despesa.situacao !== "aberta") throw new Error("Despesa não está aberta.");
      if (!dados.motivo.trim()) throw new Error("Informe o motivo do cancelamento.");
      despesa.situacao = "cancelada"; despesa.usuarioId = usuarioId; auditar(estado, empresaId, usuarioId, "despesa_cancelada", despesa.id, dados); salvar(empresaId, estado);
    },
    async pagarContaCompra(empresaId, dados, usuarioId) {
      const estado = lerFinanceiro(empresaId); if (validarOperacao(estado, dados.operacaoId)) return;
      const conta = lerEstoque(empresaId).contasPagar.find((c) => c.id === dados.contaPagarCompraId && c.empresaId === empresaId);
      if (!conta) throw new Error("Conta de compra não encontrada.");
      if (estado.pagamentosCompra.some((p) => p.contaPagarCompraId === conta.id)) throw new Error("Conta de compra já paga.");
      if (!dataValida(dados.pagoEm)) throw new Error("Data de pagamento inválida.");
      if (!lerColecao<FormaPagamento>("formas_pagamento").some((f) => f.id === dados.formaPagamentoId && f.empresaId === empresaId && f.ativo)) throw new Error("Forma de pagamento inválida.");
      const pagamento = { id: gerarId("pag-compra"), empresaId, contaPagarCompraId: conta.id, valor: conta.valor, pagoEm: dados.pagoEm, formaPagamentoId: dados.formaPagamentoId, usuarioId, operacaoId: dados.operacaoId };
      estado.pagamentosCompra.push(pagamento); estado.operacoes.push(dados.operacaoId); auditar(estado, empresaId, usuarioId, "conta_compra_paga", conta.id, pagamento); salvar(empresaId, estado);
    },
    async obterResumo(empresaId, inicio, fim) {
      if (!dataValida(inicio) || !dataValida(fim) || inicio > fim) throw new Error("Período inválido.");
      const estado = lerFinanceiro(empresaId), recebimentos = recebimentosEmpresa(empresaId).filter((r) => noPeriodo(r.registradoEm, inicio, fim));
      const saidasCaixa = lerColecao<MovimentoCaixaManual>("movimentos_caixa").filter((m) => m.empresaId === empresaId && m.tipo === "saida" && noPeriodo(m.registradoEm, inicio, fim)).reduce((s, m) => s + m.valor, 0);
      const despesasPagas = moeda(estado.despesas.filter((d) => d.situacao === "paga" && d.pagoEm && noPeriodo(d.pagoEm, inicio, fim)).reduce((s, d) => s + d.valor, 0) + estado.pagamentosCompra.filter((p) => noPeriodo(p.pagoEm, inicio, fim)).reduce((s, p) => s + p.valor, 0) + saidasCaixa);
      const totalRecebido = moeda(recebimentos.reduce((s, r) => s + r.valor, 0));
      const formas = lerColecao<FormaPagamento>("formas_pagamento"), porForma = new Map<string, number>();
      recebimentos.forEach((r) => porForma.set(r.formaPagamentoId, moeda((porForma.get(r.formaPagamentoId) ?? 0) + r.valor)));
      const contas = contasReceber(empresaId), pagar = contasPagar(empresaId, estado);
      return { inicio, fim, totalRecebido, despesasPagas, resultado: moeda(totalRecebido - despesasPagas), ticketMedio: recebimentos.length ? moeda(totalRecebido / new Set(recebimentos.map((r) => r.pedidoId)).size) : 0, recebimentosPorForma: [...porForma].map(([formaPagamentoId, total]) => ({ formaPagamentoId, nome: formas.find((f) => f.id === formaPagamentoId)?.nome ?? "Forma removida", total })), pedidosPagos: contas.filter((c) => c.situacao === "pago").length, pedidosPendentes: contas.filter((c) => c.situacao === "pendente" || c.situacao === "parcial").length, contasReceber: moeda(contas.reduce((s, c) => s + c.saldo, 0)), contasPagar: moeda(pagar.reduce((s, c) => s + c.saldo, 0)) };
    },
    async obterResultadoPedido(empresaId, pedidoId) {
      const pedido = pedidosEmpresa(empresaId).find((p) => p.id === pedidoId); if (!pedido) throw new Error("Pedido não encontrado.");
      const recebimentos = moeda(recebimentosEmpresa(empresaId).filter((r) => r.pedidoId === pedido.id).reduce((s, r) => s + r.valor, 0));
      const despesas = moeda(lerFinanceiro(empresaId).despesas.filter((d) => d.pedidoId === pedido.id && d.situacao !== "cancelada").reduce((s, d) => s + d.valor, 0));
      return { pedidoId, numero: pedido.numero, valorPedido: pedido.valorTotal, recebido: recebimentos, saldoReceber: moeda(Math.max(0, pedido.valorTotal - recebimentos)), despesasDiretas: despesas, resultadoCaixa: moeda(recebimentos - despesas) };
    },
  };
}
