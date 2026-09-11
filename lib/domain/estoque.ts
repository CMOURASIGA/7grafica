import type { EventoAuditoria } from "./entities";

export type TipoMovimentoEstoque = "entrada" | "saida" | "reserva" | "liberacao" | "consumo" | "perda" | "ajuste" | "troca";
export type MovimentoEstoque = {
  id: string; empresaId: string; materialId: string; trabalhoId: string | null; equipamentoId: string | null;
  compraId: string | null; recebimentoId: string | null; tipo: TipoMovimentoEstoque;
  quantidade: number; unidadeInformadaId: string; fator: number; quantidadeOperacional: number;
  unidadeOperacionalId: string; deltaFisico: number; deltaReservado: number;
  motivo: string; usuarioId: string; criadoEm: string;
};
export type ConfiguracaoEstoque = { materialId: string; minimo: number; unidadeOperacionalId: string; cartucho: boolean };
export type SaldoEstoque = ConfiguracaoEstoque & { fisico: number; reservado: number; disponivel: number; abaixoMinimo: boolean };
export type ConsumoTrabalho = { trabalhoId: string; materialId: string; previsto: number; real: number; perda: number; reservado: number; unidadeOperacionalId: string };
export type ItemCompra = { id: string; materialId: string; nome: string; unidadeId: string; unidadeOperacionalId: string; fator: number; quantidade: number; precoUnitario: number; recebido: number };
export type PedidoCompra = { id: string; empresaId: string; numero: string; fornecedorId: string; fornecedorNome: string; situacao: "aberto" | "parcial" | "recebido" | "cancelado"; itens: ItemCompra[]; cotacao: string | null; criadoEm: string; usuarioId: string };
export type RecebimentoCompra = { id: string; empresaId: string; compraId: string; documento: string; vencimento: string; itens: { itemId: string; quantidade: number }[]; valor: number; usuarioId: string; criadoEm: string };
/** Titulo de origem da compra. Liquidacao/financeiro permanecem na SPEC 09. */
export type ContaPagarCompra = { id: string; empresaId: string; compraId: string; recebimentoId: string; fornecedorId: string; valor: number; vencimento: string; situacao: "aberta" };
export type CustoPaginaEquipamento = { equipamentoId: string; custo: number };
export type EstadoEstoque = {
  movimentos: MovimentoEstoque[]; configuracoes: ConfiguracaoEstoque[]; previsoes: { trabalhoId: string; materialId: string; quantidade: number }[];
  compras: PedidoCompra[]; recebimentos: RecebimentoCompra[]; contasPagar: ContaPagarCompra[];
  custosPagina: CustoPaginaEquipamento[]; eventos: EventoAuditoria[]; operacoes: string[];
};
export function estadoEstoqueVazio(): EstadoEstoque {
  return { movimentos: [], configuracoes: [], previsoes: [], compras: [], recebimentos: [], contasPagar: [], custosPagina: [], eventos: [], operacoes: [] };
}
export function numeroValido(valor: number, zero = false): void {
  if (!Number.isFinite(valor) || (zero ? valor < 0 : valor <= 0)) throw new Error("Informe uma quantidade/valor válido" + (zero ? "." : " maior que zero."));
}
export function arredondarQuantidade(valor: number): number { return Math.round(valor * 1e6) / 1e6; }
