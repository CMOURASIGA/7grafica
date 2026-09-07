import { gravarColecao, lerColecao } from "@/lib/storage/local-storage-client";
import type { Empresa } from "@/lib/domain/entities";
import type { EmpresaRepository } from "@/lib/repositories/types";

const CHAVE = "empresas";

export function criarEmpresaRepositoryLocal(): EmpresaRepository {
  return {
    async obter(id) {
      return lerColecao<Empresa>(CHAVE).find((empresa) => empresa.id === id) ?? null;
    },
    async atualizar(id, dados) {
      const empresas = lerColecao<Empresa>(CHAVE);
      const indice = empresas.findIndex((empresa) => empresa.id === id);
      if (indice === -1) throw new Error(`Empresa ${id} nao encontrada.`);
      const atualizada = { ...empresas[indice], ...dados };
      empresas[indice] = atualizada;
      gravarColecao(CHAVE, empresas);
      return atualizada;
    },
  };
}
