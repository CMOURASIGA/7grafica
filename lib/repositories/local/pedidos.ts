import { gravarColecao, lerColecao } from "@/lib/storage/local-storage-client";
import type { Orcamento, Pedido } from "@/lib/domain/entities";
import type { PedidoRepository } from "@/lib/repositories/types";

const CHAVE = "pedidos";
const CHAVE_ORCAMENTOS = "orcamentos";

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
        orcamentoId: orcamento.id,
        numero: proximoNumero(orcamento.empresaId),
        status: "confirmado",
        criadoEm: new Date().toISOString(),
      };
      const pedidos = lerColecao<Pedido>(CHAVE);
      pedidos.push(novo);
      gravarColecao(CHAVE, pedidos);
      return novo;
    },
  };
}
