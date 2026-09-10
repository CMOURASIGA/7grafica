import type { EntregaPedido, ModalidadeEntrega, StatusEntrega } from "@/lib/domain/entrega";
import type { EventoAuditoria } from "@/lib/domain/entities";

export type EntregaRepository = {
  listar(empresaId: string): Promise<EntregaPedido[]>;
  obterPorPedido(empresaId: string, pedidoId: string): Promise<EntregaPedido | null>;
  preparar(empresaId: string, dados: { pedidoId: string; modalidade: ModalidadeEntrega; endereco?: string | null; responsavelEntrega?: string | null; transportadora?: string | null; codigoRastreio?: string | null; previsao?: string | null; operacaoId: string }, usuarioId: string): Promise<EntregaPedido>;
  alterarStatus(empresaId: string, dados: { entregaId: string; status: StatusEntrega; observacao?: string | null; recebedor?: string | null; comprovanteReferencia?: string | null; operacaoId: string }, usuarioId: string): Promise<EntregaPedido>;
};
export type HistoricoPedidoRepository = { listar(empresaId: string, pedidoId: string): Promise<EventoAuditoria[]> };
