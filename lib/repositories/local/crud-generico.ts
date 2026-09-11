import { gerarId, gravarColecao, lerColecao } from "@/lib/storage/local-storage-client";
import type { CrudRepository } from "@/lib/repositories/types";

type ComId = { id: string };
type ComEmpresa = { empresaId: string | null };

/**
 * Fabrica de repositorio CRUD generico sobre uma colecao no LocalStorage.
 * Cobre os cadastros mestres "simples" (fornecedores, servicos, materiais,
 * unidades, equipamentos, formas de pagamento etc.) sem repetir a mesma
 * leitura/gravacao de array em cada um. Entidades com regras extras (ex.:
 * Cliente com busca por e-mail) compoem esta fabrica e adicionam metodos.
 */
export function criarCrudLocal<T extends ComId & Partial<ComEmpresa>, TCriar extends Partial<ComEmpresa>>(
  chave: string,
  prefixoId: string,
  /** Campos extras calculados na criacao (ex.: criadoEm), fora do que a UI preenche. */
  valoresPadrao?: () => Partial<T>,
): CrudRepository<T, TCriar> {
  function listarTudo(): T[] {
    return lerColecao<T>(chave);
  }

  function salvarTudo(itens: T[]): void {
    gravarColecao(chave, itens);
  }

  return {
    async listar(empresaId: string): Promise<T[]> {
      return listarTudo().filter((item) => item.empresaId === empresaId);
    },
    async obter(id: string): Promise<T | null> {
      return listarTudo().find((item) => item.id === id) ?? null;
    },
    async criar(dados: TCriar): Promise<T> {
      const novo = { ...dados, ...valoresPadrao?.(), id: gerarId(prefixoId) } as unknown as T;
      const itens = listarTudo();
      itens.push(novo);
      salvarTudo(itens);
      return novo;
    },
    async atualizar(id: string, dados: Partial<TCriar>): Promise<T> {
      const itens = listarTudo();
      const indice = itens.findIndex((item) => item.id === id);
      if (indice === -1) throw new Error(`Registro ${id} nao encontrado em ${chave}.`);
      const atualizado = { ...itens[indice], ...dados } as T;
      itens[indice] = atualizado;
      salvarTudo(itens);
      return atualizado;
    },
    async remover(id: string): Promise<void> {
      salvarTudo(listarTudo().filter((item) => item.id !== id));
    },
  };
}
