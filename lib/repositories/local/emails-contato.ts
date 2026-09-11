import { lerColecao } from "@/lib/storage/local-storage-client";
import type { EmailContato } from "@/lib/domain/entities";
import type { EmailContatoRepository } from "@/lib/repositories/types";
import { criarCrudLocal } from "@/lib/repositories/local/crud-generico";

const CHAVE = "emails_contato";

export function criarEmailContatoRepositoryLocal(): EmailContatoRepository {
  const base = criarCrudLocal<EmailContato, Omit<EmailContato, "id">>(CHAVE, "email");
  return {
    ...base,
    async listarPorContato(contatoId) {
      return lerColecao<EmailContato>(CHAVE).filter((email) => email.contatoId === contatoId);
    },
    async buscarPorEmail(empresaId, email) {
      const alvo = email.trim().toLowerCase();
      return (
        lerColecao<EmailContato>(CHAVE).find(
          (registro) => registro.empresaId === empresaId && registro.email.toLowerCase() === alvo,
        ) ?? null
      );
    },
  };
}
