import { lerColecao } from "@/lib/storage/local-storage-client";
import type { EtapaWorkflow } from "@/lib/domain/entities";
import type { EtapaWorkflowRepository } from "@/lib/repositories/types";
import { criarCrudLocal } from "@/lib/repositories/local/crud-generico";

const CHAVE = "etapas_workflow";

export function criarEtapaWorkflowRepositoryLocal(): EtapaWorkflowRepository {
  const base = criarCrudLocal<EtapaWorkflow, Omit<EtapaWorkflow, "id">>(CHAVE, "etapa");
  return {
    ...base,
    async listarPorWorkflow(workflowId) {
      return lerColecao<EtapaWorkflow>(CHAVE)
        .filter((etapa) => etapa.workflowId === workflowId)
        .sort((a, b) => a.ordem - b.ordem);
    },
  };
}
