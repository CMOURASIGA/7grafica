import type { ContaPagarCompra, ConsumoTrabalho, CustoPaginaEquipamento, MovimentoEstoque, PedidoCompra, RecebimentoCompra, SaldoEstoque, TipoMovimentoEstoque } from "@/lib/domain/estoque";

export type DadosMovimentoEstoque = {
  materialId: string; tipo: Exclude<TipoMovimentoEstoque, "troca">; quantidade: number; unidadeId: string;
  trabalhoId?: string | null; unidadeCompra?: boolean; motivo: string; operacaoId: string;
};
export type EstoqueRepository = {
  listar(empresaId: string): Promise<SaldoEstoque[]>;
  listarMovimentos(empresaId: string): Promise<MovimentoEstoque[]>;
  listarPorTrabalho(empresaId: string, trabalhoId: string): Promise<ConsumoTrabalho[]>;
  configurar(empresaId: string, dados: { materialId: string; minimo: number; cartucho: boolean }, usuarioId: string): Promise<void>;
  movimentar(empresaId: string, dados: DadosMovimentoEstoque, usuarioId: string): Promise<void>;
  planejar(empresaId: string, dados: { trabalhoId: string; materialId: string; quantidade: number }, usuarioId: string): Promise<void>;
  registrarTroca(empresaId: string, dados: { materialId: string; equipamentoId: string; quantidade: number; motivo: string; operacaoId: string }, usuarioId: string): Promise<void>;
  configurarCustoPagina(empresaId: string, dados: { equipamentoId: string; custo: number }, usuarioId: string): Promise<void>;
  listarCustosPagina(empresaId: string): Promise<CustoPaginaEquipamento[]>;
};
export type ComprasRepository = {
  listar(empresaId: string): Promise<PedidoCompra[]>;
  listarRecebimentos(empresaId: string): Promise<RecebimentoCompra[]>;
  listarContasPagar(empresaId: string): Promise<ContaPagarCompra[]>;
  criar(empresaId: string, dados: { fornecedorId: string; cotacao: string | null; operacaoId: string; itens: { materialId: string; unidadeId: string; quantidade: number; precoUnitario: number }[] }, usuarioId: string): Promise<void>;
  receber(empresaId: string, dados: { compraId: string; documento: string; vencimento: string; operacaoId: string; itens: { itemId: string; quantidade: number }[] }, usuarioId: string): Promise<void>;
  cancelar(empresaId: string, dados: { compraId: string; motivo: string }, usuarioId: string): Promise<void>;
};
