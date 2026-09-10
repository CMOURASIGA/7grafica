import type { EventoAuditoria } from "./entities";

export type ModalidadeEntrega = "retirada" | "entrega_propria" | "motoboy" | "transportadora" | "outro";
export type StatusEntrega = "pronto" | "aguardando_retirada" | "saiu_para_entrega" | "entregue" | "falha_entrega";
export type EventoEntrega = { id: string; status: StatusEntrega; observacao: string | null; usuarioId: string; criadoEm: string };
export type EntregaPedido = {
  id: string; empresaId: string; pedidoId: string; modalidade: ModalidadeEntrega; status: StatusEntrega;
  endereco: string | null; responsavelEntrega: string | null; transportadora: string | null; codigoRastreio: string | null;
  recebedor: string | null; comprovanteReferencia: string | null; falhaMotivo: string | null;
  previsao: string | null; criadoEm: string; atualizadoEm: string; eventos: EventoEntrega[];
};
export type EstadoEntregas = { entregas: EntregaPedido[]; eventos: EventoAuditoria[]; operacoes: string[] };
export const estadoEntregasVazio = (): EstadoEntregas => ({ entregas: [], eventos: [], operacoes: [] });
