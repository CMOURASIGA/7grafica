import { gravarColecao, lerColecao } from "@/lib/storage/local-storage-client";
import type { Orcamento, Pedido } from "@/lib/domain/entities";
import type { PedidoRepository } from "@/lib/repositories/types";

const CHAVE = "pedidos";
const CHAVE_ORCAMENTOS = "orcamentos";

function gerarToken(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}-${Math.random().toString(36).slice(2, 12)}`;
}

function proximoNumero(empresaId: string): string {
  const existentes = lerColecao<Pedido>(CHAVE).filter((pedido) => pedido.empresaId === empresaId);
  const maiorSequencia = existentes.reduce((maior, pedido) => {
    const match = /PED-(\d+)/.exec(pedido.numero);
    return Math.max(maior, match ? Number(match[1]) : 0);
  }, 0);
  return `PED-${String(maiorSequencia + 1).padStart(4, "0")}`;
}

export function criarPedidoRepositoryLocal(): PedidoRepository {
  return {
    async listar(empresaId) {
      return lerColecao<Pedido>(CHAVE).filter((pedido) => pedido.empresaId === empresaId);
    },
    async obter(id) {
      return lerColecao<Pedido>(CHAVE).find((pedido) => pedido.id === id) ?? null;
    },
    async buscarPorToken(token) {
      return lerColecao<Pedido>(CHAVE).find((pedido) => pedido.tokenAcompanhamento === token) ?? null;
    },
    async criarAPartirDeOrcamentoAprovado(orcamentoId) {
      const orcamento = lerColecao<Orcamento>(CHAVE_ORCAMENTOS).find((item) => item.id === orcamentoId);
      if (!orcamento) throw new Error(`Orcamento ${orcamentoId} nao encontrado.`);
      if (orcamento.status !== "aprovado") {
        throw new Error("So e possivel gerar pedido a partir de um orcamento aprovado.");
      }

      const existente = lerColecao<Pedido>(CHAVE).find((pedido) => pedido.orcamentoId === orcamentoId);
      if (existente) return existente;

      const novo: Pedido = {
        id: `ped-${Math.random().toString(36).slice(2, 10)}`,
        empresaId: orcamento.empresaId,
        clienteId: orcamento.clienteId,
        origem: "email",
        orcamentoId: orcamento.id,
        numero: proximoNumero(orcamento.empresaId),
        itens: orcamento.itens.map((item) => ({ ...item })),
        valorTotal: orcamento.valorTotal,
        statusEntrega: "aguardando_producao",
        tokenAcompanhamento: gerarToken(),
        criadoEm: new Date().toISOString(),
        concluidoEm: null,
      };
      const pedidos = lerColecao<Pedido>(CHAVE);
      pedidos.push(novo);
      gravarColecao(CHAVE, pedidos);
      return novo;
    },
    async criarAtendimentoBalcao(dados) {
      const novo: Pedido = {
        id: `ped-${Math.random().toString(36).slice(2, 10)}`,
        empresaId: dados.empresaId,
        clienteId: dados.clienteId,
        origem: "balcao",
        orcamentoId: null,
        numero: proximoNumero(dados.empresaId),
        itens: dados.itens,
        valorTotal: dados.valorTotal,
        statusEntrega: dados.statusEntrega,
        tokenAcompanhamento: gerarToken(),
        criadoEm: new Date().toISOString(),
        concluidoEm: dados.statusEntrega === "concluido" ? new Date().toISOString() : null,
      };
      const pedidos = lerColecao<Pedido>(CHAVE);
      pedidos.push(novo);
      gravarColecao(CHAVE, pedidos);
      return novo;
    },
    async marcarConcluido(pedidoId) {
      const pedidos = lerColecao<Pedido>(CHAVE);
      const indice = pedidos.findIndex((pedido) => pedido.id === pedidoId);
      if (indice === -1) throw new Error(`Pedido ${pedidoId} nao encontrado.`);
      const atualizado: Pedido = { ...pedidos[indice], statusEntrega: "concluido", concluidoEm: new Date().toISOString() };
      pedidos[indice] = atualizado;
      gravarColecao(CHAVE, pedidos);
      return atualizado;
    },
  };
}
