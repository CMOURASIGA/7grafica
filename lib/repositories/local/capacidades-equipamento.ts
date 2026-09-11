import { lerColecao } from "@/lib/storage/local-storage-client";
import type { CapacidadeEquipamento } from "@/lib/domain/entities";
import type { CapacidadeEquipamentoRepository } from "@/lib/repositories/types";
import { criarCrudLocal } from "@/lib/repositories/local/crud-generico";

const CHAVE = "capacidades_equipamento";

export function criarCapacidadeEquipamentoRepositoryLocal(): CapacidadeEquipamentoRepository {
  const base = criarCrudLocal<CapacidadeEquipamento, Omit<CapacidadeEquipamento, "id">>(CHAVE, "cap");
  return {
    ...base,
    async listarPorEquipamento(equipamentoId) {
      return lerColecao<CapacidadeEquipamento>(CHAVE).filter((cap) => cap.equipamentoId === equipamentoId);
    },
  };
}
