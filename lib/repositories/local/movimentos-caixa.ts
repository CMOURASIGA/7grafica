import { gerarId, gravarColecao, lerColecao } from "@/lib/storage/local-storage-client";
import type { MovimentoCaixaManual } from "@/lib/domain/entities";
import type { MovimentoCaixaManualRepository } from "@/lib/repositories/types";

const CHAVE = "movimentos_caixa";

export function criarMovimentoCaixaRepositoryLocal(): MovimentoCaixaManualRepository {
  return {
    async listarPorCaixa(caixaId) {
      return lerColecao<MovimentoCaixaManual>(CHAVE).filter((item) => item.caixaId === caixaId);
    },
    async criar(dados) {
      const novo: MovimentoCaixaManual = { ...dados, id: gerarId("mov-caixa"), registradoEm: new Date().toISOString() };
      const itens = lerColecao<MovimentoCaixaManual>(CHAVE);
      itens.push(novo);
      gravarColecao(CHAVE, itens);
      return novo;
    },
  };
}
