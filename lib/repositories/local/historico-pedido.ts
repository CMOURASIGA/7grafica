import type { Arquivo, EventoAuditoria, Pedido, Recebimento, Trabalho } from "@/lib/domain/entities";
import type { HistoricoPedidoRepository } from "@/lib/repositories/entrega-types";
import { lerEstoque } from "./estoque";
import { lerFinanceiro } from "./financeiro";
import { lerPortalCliente } from "./portal-cliente";
import { lerEntregas } from "./entregas";
import { lerColecao } from "@/lib/storage/local-storage-client";

export function criarHistoricoPedidoRepositoryLocal(): HistoricoPedidoRepository {
  return { async listar(empresaId, pedidoId) {
    const pedido = lerColecao<Pedido>("pedidos").find((p) => p.id === pedidoId && p.empresaId === empresaId); if (!pedido) return [];
    const trabalhos = lerColecao<Trabalho>("trabalhos").filter((t) => t.pedidoId === pedido.id), trabalhoIds = new Set(trabalhos.map((t) => t.id));
    const arquivos = lerColecao<Arquivo>("arquivos").filter((a) => a.pedidoId === pedido.id || Boolean(a.trabalhoId && trabalhoIds.has(a.trabalhoId))), arquivoIds = new Set(arquivos.map((a) => a.id));
    const eventos = [...lerColecao<EventoAuditoria>("eventos_auditoria"), ...lerEstoque(pedido.empresaId).eventos, ...lerFinanceiro(pedido.empresaId).eventos, ...lerPortalCliente(pedido.empresaId).eventos, ...lerEntregas(pedido.empresaId).eventos];
    const relacionados = eventos.filter((e) => e.empresaId === pedido.empresaId && (e.entidadeId === pedido.id || Boolean(e.entidadeId && trabalhoIds.has(e.entidadeId)) || Boolean(e.entidadeId && arquivoIds.has(e.entidadeId)) || e.dadosDepois?.pedidoId === pedido.id));
    const recebimentos = lerColecao<Recebimento>("recebimentos").filter((r) => r.pedidoId === pedido.id).map((r): EventoAuditoria => ({ id: `hist-${r.id}`, empresaId: r.empresaId, usuarioId: r.registradoPorUsuarioId, acao: "pagamento_registrado", entidade: "pedidos", entidadeId: pedido.id, dadosAntes: null, dadosDepois: { recebimentoId: r.id, valor: r.valor, formaPagamentoId: r.formaPagamentoId }, criadoEm: r.registradoEm }));
    const criado: EventoAuditoria = { id: `hist-${pedido.id}`, empresaId: pedido.empresaId, usuarioId: "sistema", acao: "pedido_criado", entidade: "pedidos", entidadeId: pedido.id, dadosAntes: null, dadosDepois: { origem: pedido.origem }, criadoEm: pedido.criadoEm };
    return [criado, ...relacionados, ...recebimentos].filter((e, i, todos) => todos.findIndex((x) => x.id === e.id) === i).sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  } };
}
