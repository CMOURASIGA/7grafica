import type { EventoAuditoria } from "./entities";

export type SituacaoFinanceira = "pendente" | "parcial" | "pago" | "vencido" | "cancelado";

export type Despesa = {
  id: string;
  empresaId: string;
  descricao: string;
  categoria: string;
  valor: number;
  vencimento: string;
  competencia: string;
  pedidoId: string | null;
  fornecedorId: string | null;
  situacao: "aberta" | "paga" | "cancelada";
  pagoEm: string | null;
  formaPagamentoId: string | null;
  usuarioId: string;
  criadoEm: string;
};

export type PagamentoContaCompra = {
  id: string;
  empresaId: string;
  contaPagarCompraId: string;
  valor: number;
  pagoEm: string;
  formaPagamentoId: string;
  usuarioId: string;
  operacaoId: string;
};

export type ContaReceberFinanceira = {
  pedidoId: string;
  numero: string;
  clienteId: string | null;
  valorTotal: number;
  recebido: number;
  saldo: number;
  situacao: Exclude<SituacaoFinanceira, "vencido" | "cancelado"> | "cancelado";
  criadoEm: string;
};

export type ContaPagarFinanceira = {
  id: string;
  origem: "compra" | "despesa";
  descricao: string;
  fornecedorId: string | null;
  pedidoId: string | null;
  valor: number;
  pago: number;
  saldo: number;
  vencimento: string;
  situacao: SituacaoFinanceira;
};

export type ResultadoPedido = {
  pedidoId: string;
  numero: string;
  valorPedido: number;
  recebido: number;
  saldoReceber: number;
  despesasDiretas: number;
  resultadoCaixa: number;
};

export type ResumoFinanceiro = {
  inicio: string;
  fim: string;
  totalRecebido: number;
  despesasPagas: number;
  resultado: number;
  ticketMedio: number;
  recebimentosPorForma: { formaPagamentoId: string; nome: string; total: number }[];
  pedidosPagos: number;
  pedidosPendentes: number;
  contasReceber: number;
  contasPagar: number;
};

export type EstadoFinanceiro = { despesas: Despesa[]; pagamentosCompra: PagamentoContaCompra[]; operacoes: string[]; eventos: EventoAuditoria[] };
export const estadoFinanceiroVazio = (): EstadoFinanceiro => ({ despesas: [], pagamentosCompra: [], operacoes: [], eventos: [] });
