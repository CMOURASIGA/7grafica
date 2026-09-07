import { lerColecao } from "@/lib/storage/local-storage-client";
import type { Cliente, Contato, EmailContato } from "@/lib/domain/entities";
import type { ClienteRepository } from "@/lib/repositories/types";
import { criarCrudLocal } from "@/lib/repositories/local/crud-generico";

const CHAVE = "clientes";
const CHAVE_CONTATOS = "contatos";
const CHAVE_EMAILS = "emails_contato";

export function criarClienteRepositoryLocal(): ClienteRepository {
  const base = criarCrudLocal<Cliente, Omit<Cliente, "id" | "criadoEm">>(CHAVE, "cliente", () => ({
    criadoEm: new Date().toISOString(),
  }));

  return {
    ...base,
    async buscarPorEmail(empresaId, email) {
      const alvo = email.trim().toLowerCase();
      const contatoIdsComEmail = new Set(
        lerColecao<EmailContato>(CHAVE_EMAILS)
          .filter((registro) => registro.empresaId === empresaId && registro.email.toLowerCase() === alvo)
          .map((registro) => registro.contatoId),
      );
      if (contatoIdsComEmail.size === 0) return null;

      const clienteId = lerColecao<Contato>(CHAVE_CONTATOS).find(
        (contato) => contatoIdsComEmail.has(contato.id) && contato.empresaId === empresaId,
      )?.clienteId;
      if (!clienteId) return null;

      return lerColecao<Cliente>(CHAVE).find((cliente) => cliente.id === clienteId) ?? null;
    },
    async buscarPorDocumento(empresaId, documento) {
      const alvo = documento.replace(/\D/g, "");
      return (
        lerColecao<Cliente>(CHAVE).find(
          (cliente) => cliente.empresaId === empresaId && (cliente.documento ?? "").replace(/\D/g, "") === alvo,
        ) ?? null
      );
    },
  };
}
