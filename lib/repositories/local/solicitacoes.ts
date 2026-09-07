import type { Solicitacao } from "@/lib/domain/entities";
import type { SolicitacaoRepository } from "@/lib/repositories/types";
import { criarCrudLocal } from "@/lib/repositories/local/crud-generico";

const CHAVE = "solicitacoes";

export function criarSolicitacaoRepositoryLocal(): SolicitacaoRepository {
  return criarCrudLocal<Solicitacao, Omit<Solicitacao, "id" | "criadaEm">>(CHAVE, "solic", () => ({
    criadaEm: new Date().toISOString(),
  }));
}
