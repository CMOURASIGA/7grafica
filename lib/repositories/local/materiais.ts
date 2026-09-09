import type { Material } from "@/lib/domain/entities";
import { criarCrudLocal } from "./crud-generico";
import { lerEstoque } from "./estoque";

/** Mantém o CRUD consolidado; preserva referências quando já usadas pela SPEC 08. */
export function criarMaterialRepositoryLocal() {
  const base = criarCrudLocal<Material, Omit<Material, "id">>("materiais", "material");
  async function utilizado(id: string) {
    const material = await base.obter(id); if (!material) return false;
    const estado = lerEstoque(material.empresaId);
    return estado.movimentos.some((m) => m.materialId === id) || estado.previsoes.some((p) => p.materialId === id) || estado.compras.some((c) => c.itens.some((i) => i.materialId === id));
  }
  return {
    ...base,
    async remover(id: string) {
      if (await utilizado(id)) throw new Error("Material possui histórico de estoque/compras. Inative o cadastro para preservar os registros.");
      return base.remover(id);
    },
    async atualizar(id: string, dados: Partial<Omit<Material, "id">>) {
      const atual = await base.obter(id);
      if (atual && await utilizado(id) && ((dados.empresaId !== undefined && dados.empresaId !== atual.empresaId) || (dados.unidadeCompraId !== undefined && dados.unidadeCompraId !== atual.unidadeCompraId) || (dados.unidadeConsumoId !== undefined && dados.unidadeConsumoId !== atual.unidadeConsumoId))) throw new Error("Unidades/empresa de material com histórico não podem ser alteradas.");
      return base.atualizar(id, dados);
    },
  };
}
