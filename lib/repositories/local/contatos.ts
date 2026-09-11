import { lerColecao } from "@/lib/storage/local-storage-client";
import type { Contato } from "@/lib/domain/entities";
import type { ContatoRepository } from "@/lib/repositories/types";
import { criarCrudLocal } from "@/lib/repositories/local/crud-generico";

const CHAVE = "contatos";

export function criarContatoRepositoryLocal(): ContatoRepository {
  const base = criarCrudLocal<Contato, Omit<Contato, "id">>(CHAVE, "contato");
  return {
    ...base,
    async listarPorCliente(clienteId) {
      return lerColecao<Contato>(CHAVE).filter((contato) => contato.clienteId === clienteId);
    },
  };
}
