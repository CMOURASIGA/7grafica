import { gerarId, gravarColecao, lerColecao } from "@/lib/storage/local-storage-client";
import type { Recebimento } from "@/lib/domain/entities";
import type { RecebimentoRepository } from "@/lib/repositories/types";

const CHAVE = "recebimentos";

export function criarRecebimentoRepositoryLocal(): RecebimentoRepository {
  return {
    async listarPorPedido(pedidoId) {
      return lerColecao<Recebimento>(CHAVE).filter((item) => item.pedidoId === pedidoId);
    },
    async criar(dados) {
      const troco =
        dados.valorEntregueDinheiro !== null && dados.valorEntregueDinheiro > dados.valor
          ? Number((dados.valorEntregueDinheiro - dados.valor).toFixed(2))
          : null;
      const novo: Recebimento = { ...dados, troco, id: gerarId("receb"), registradoEm: new Date().toISOString() };
      const itens = lerColecao<Recebimento>(CHAVE);
      itens.push(novo);
      gravarColecao(CHAVE, itens);
      return novo;
    },
  };
}
