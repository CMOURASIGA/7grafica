import { lerColecao } from "@/lib/storage/local-storage-client";
import type { ConversaoUnidade } from "@/lib/domain/entities";
import type { ConversaoUnidadeRepository } from "@/lib/repositories/types";
import { criarCrudLocal } from "@/lib/repositories/local/crud-generico";

const CHAVE = "conversoes_unidade";

export function criarConversaoUnidadeRepositoryLocal(): ConversaoUnidadeRepository {
  const base = criarCrudLocal<ConversaoUnidade, Omit<ConversaoUnidade, "id">>(CHAVE, "conv");
  return {
    ...base,
    async listarPorMaterial(materialId) {
      return lerColecao<ConversaoUnidade>(CHAVE).filter((conversao) => conversao.materialId === materialId);
    },
  };
}
