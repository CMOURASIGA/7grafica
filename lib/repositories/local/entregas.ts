import type { Pedido, Trabalho } from "@/lib/domain/entities";
import { estadoEntregasVazio, type EntregaPedido, type EstadoEntregas, type StatusEntrega } from "@/lib/domain/entrega";
import type { EntregaRepository } from "@/lib/repositories/entrega-types";
import { gerarId, gravarValorConfirmado, lerColecao, lerValor } from "@/lib/storage/local-storage-client";

const chave = (empresaId: string) => `entregas_v1:${empresaId}`;
export const lerEntregas = (empresaId: string): EstadoEntregas => { const atual = lerValor<EstadoEntregas>(chave(empresaId)); return atual ? { ...atual, eventos: atual.eventos ?? [], operacoes: atual.operacoes ?? [] } : estadoEntregasVazio(); };
const salvar = (empresaId: string, estado: EstadoEntregas) => gravarValorConfirmado(chave(empresaId), estado);
const agora = () => new Date().toISOString();
function pedidoDaEmpresa(empresaId: string, pedidoId: string) { const pedido = lerColecao<Pedido>("pedidos").find((p) => p.id === pedidoId && p.empresaId === empresaId); if (!pedido) throw new Error("Pedido não encontrado nesta empresa."); return pedido; }
function auditar(estado: EstadoEntregas, empresaId: string, usuarioId: string, acao: string, entrega: EntregaPedido, dadosDepois: Record<string, unknown>) { estado.eventos.push({ id: gerarId("evt"), empresaId, usuarioId, acao, entidade: "entregas", entidadeId: entrega.id, dadosAntes: null, dadosDepois: { pedidoId: entrega.pedidoId, ...dadosDepois }, criadoEm: agora() }); }
function idempotente(estado: EstadoEntregas, id: string) { if (!id.trim()) throw new Error("Identificador da operação obrigatório."); return estado.operacoes.includes(id); }
const TRANSICOES: Record<StatusEntrega, StatusEntrega[]> = { pronto: ["aguardando_retirada", "saiu_para_entrega"], aguardando_retirada: ["entregue"], saiu_para_entrega: ["entregue", "falha_entrega"], entregue: [], falha_entrega: ["saiu_para_entrega"] };

export function criarEntregaRepositoryLocal(): EntregaRepository {
  return {
    async listar(empresaId) { return lerEntregas(empresaId).entregas; },
    async listarResumos(empresaId) { const pedidos = lerColecao<Pedido>("pedidos"); return lerEntregas(empresaId).entregas.map((entrega) => ({ entrega, pedidoNumero: pedidos.find((p) => p.id === entrega.pedidoId && p.empresaId === empresaId)?.numero ?? "Pedido indisponível" })); },
    async obterPorPedido(empresaId, pedidoId) { return lerEntregas(empresaId).entregas.find((e) => e.pedidoId === pedidoId) ?? null; },
    async preparar(empresaId, dados, usuarioId) {
      const estado = lerEntregas(empresaId); if (idempotente(estado, dados.operacaoId)) return estado.entregas.find((e) => e.pedidoId === dados.pedidoId)!;
      const pedido = pedidoDaEmpresa(empresaId, dados.pedidoId); if (pedido.statusEntrega === "cancelado") throw new Error("Pedido cancelado não pode ser preparado para entrega.");
      if (estado.entregas.some((e) => e.pedidoId === pedido.id)) throw new Error("Pedido já possui entrega preparada.");
      const trabalhos = lerColecao<Trabalho>("trabalhos").filter((t) => t.pedidoId === pedido.id && t.empresaId === empresaId);
      if (trabalhos.length && trabalhos.some((t) => t.situacao !== "concluido")) throw new Error("Todos os Trabalhos devem estar concluídos antes de marcar o Pedido como pronto.");
      if (dados.modalidade !== "retirada" && !dados.endereco?.trim()) throw new Error("Informe o endereço da entrega.");
      if (dados.modalidade === "transportadora" && !dados.transportadora?.trim()) throw new Error("Informe a transportadora.");
      const criadoEm = agora(), entrega: EntregaPedido = { id: gerarId("entrega"), empresaId, pedidoId: pedido.id, modalidade: dados.modalidade, status: "pronto", endereco: dados.endereco?.trim() || null, responsavelEntrega: dados.responsavelEntrega?.trim() || null, transportadora: dados.transportadora?.trim() || null, codigoRastreio: dados.codigoRastreio?.trim() || null, recebedor: null, comprovanteReferencia: null, falhaMotivo: null, previsao: dados.previsao || null, criadoEm, atualizadoEm: criadoEm, eventos: [{ id: gerarId("evt-entrega"), status: "pronto", observacao: "Pedido pronto para entrega", usuarioId, criadoEm }] };
      estado.entregas.push(entrega); estado.operacoes.push(dados.operacaoId); auditar(estado, empresaId, usuarioId, "pedido_pronto", entrega, { modalidade: entrega.modalidade }); salvar(empresaId, estado); return entrega;
    },
    async alterarStatus(empresaId, dados, usuarioId) {
      const estado = lerEntregas(empresaId); if (idempotente(estado, dados.operacaoId)) return estado.entregas.find((e) => e.id === dados.entregaId)!;
      const entrega = estado.entregas.find((e) => e.id === dados.entregaId && e.empresaId === empresaId); if (!entrega) throw new Error("Entrega não encontrada.");
      if (!TRANSICOES[entrega.status].includes(dados.status)) throw new Error(`Transição de ${entrega.status} para ${dados.status} não permitida.`);
      if (entrega.modalidade === "retirada" && dados.status === "saiu_para_entrega") throw new Error("Retirada não utiliza saída para entrega.");
      if (entrega.modalidade !== "retirada" && dados.status === "aguardando_retirada") throw new Error("Somente retirada utiliza este status.");
      if (dados.status === "falha_entrega" && !dados.observacao?.trim()) throw new Error("Informe o motivo da falha.");
      if (dados.status === "entregue" && (!dados.recebedor?.trim() || !dados.comprovanteReferencia?.trim())) throw new Error("Informe recebedor e referência do comprovante.");
      entrega.status = dados.status; entrega.atualizadoEm = agora(); entrega.falhaMotivo = dados.status === "falha_entrega" ? dados.observacao!.trim() : null;
      if (dados.status === "entregue") { entrega.recebedor = dados.recebedor!.trim(); entrega.comprovanteReferencia = dados.comprovanteReferencia!.trim(); const pedidos = lerColecao<Pedido>("pedidos"), indice = pedidos.findIndex((p) => p.id === entrega.pedidoId && p.empresaId === empresaId); pedidos[indice] = { ...pedidos[indice], statusEntrega: "concluido", concluidoEm: agora() }; gravarValorConfirmado("pedidos", pedidos); }
      entrega.eventos.push({ id: gerarId("evt-entrega"), status: dados.status, observacao: dados.observacao?.trim() || null, usuarioId, criadoEm: entrega.atualizadoEm }); estado.operacoes.push(dados.operacaoId); auditar(estado, empresaId, usuarioId, `entrega_${dados.status}`, entrega, { status: dados.status, recebedor: entrega.recebedor, comprovanteReferencia: entrega.comprovanteReferencia, observacao: dados.observacao ?? null }); salvar(empresaId, estado); return entrega;
    },
  };
}
