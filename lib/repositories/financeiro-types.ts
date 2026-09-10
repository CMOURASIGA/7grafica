import type { ContaPagarFinanceira, ContaReceberFinanceira, Despesa, ResultadoPedido, ResumoFinanceiro } from "@/lib/domain/financeiro";

export type FinanceiroRepository = {
  listarDespesas(empresaId: string): Promise<Despesa[]>;
  listarContasPagar(empresaId: string): Promise<ContaPagarFinanceira[]>;
  listarContasReceber(empresaId: string): Promise<ContaReceberFinanceira[]>;
  criarDespesa(empresaId: string, dados: { descricao: string; categoria: string; valor: number; vencimento: string; competencia: string; pedidoId?: string | null; fornecedorId?: string | null; operacaoId: string }, usuarioId: string): Promise<void>;
  pagarDespesa(empresaId: string, dados: { despesaId: string; formaPagamentoId: string; pagoEm: string; operacaoId: string }, usuarioId: string): Promise<void>;
  cancelarDespesa(empresaId: string, dados: { despesaId: string; motivo: string }, usuarioId: string): Promise<void>;
  pagarContaCompra(empresaId: string, dados: { contaPagarCompraId: string; formaPagamentoId: string; pagoEm: string; operacaoId: string }, usuarioId: string): Promise<void>;
  obterResumo(empresaId: string, inicio: string, fim: string): Promise<ResumoFinanceiro>;
  obterResultadoPedido(empresaId: string, pedidoId: string): Promise<ResultadoPedido>;
};
