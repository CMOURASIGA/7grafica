import type { Arquivo, EventoAuditoria, Orcamento, Pedido, Recebimento, Trabalho } from "./entities";
import type { EntregaPedido } from "./entrega";

export type ContaPortalCliente = { id: string; empresaId: string; clienteId: string; email: string; senhaHash: string; ativo: boolean; criadoEm: string; ultimoAcessoEm: string | null };
export type ConvitePortalCliente = { id: string; empresaId: string; clienteId: string; email: string; token: string; expiraEm: string; usadoEm: string | null; revogadoEm: string | null; criadoPorUsuarioId: string; criadoEm: string; operacaoId: string };
export type TokenPedidoPortal = { id: string; empresaId: string; pedidoId: string; token: string; expiraEm: string; revogadoEm: string | null; criadoPorUsuarioId: string; criadoEm: string; ultimoAcessoEm: string | null; operacaoId: string };
export type SessaoPortalCliente = { id: string; contaId: string; empresaId: string; clienteId: string; expiraEm: string; criadoEm: string };
export type PedidoPortal = { pedido: Pedido; recebimentos: Recebimento[]; trabalhos: Trabalho[]; arquivosLiberados: Arquivo[]; orcamento: Orcamento | null; entrega: EntregaPedido | null; recebido: number; saldo: number };
export type PainelPortalCliente = { empresaId: string; clienteId: string; email: string; pedidosAtivos: PedidoPortal[]; historico: PedidoPortal[]; orcamentos: Orcamento[] };
export type EstadoPortalCliente = { contas: ContaPortalCliente[]; convites: ConvitePortalCliente[]; tokensPedido: TokenPedidoPortal[]; sessoes: SessaoPortalCliente[]; operacoes: string[]; eventos: EventoAuditoria[] };
export const estadoPortalVazio = (): EstadoPortalCliente => ({ contas: [], convites: [], tokensPedido: [], sessoes: [], operacoes: [], eventos: [] });
