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
    async buscarRapido(empresaId, texto) {
      const alvo = texto.trim().toLowerCase();
      const alvoSoDigitos = alvo.replace(/\D/g, "");
      if (!alvo) return [];

      const clientes = lerColecao<Cliente>(CHAVE).filter((cliente) => cliente.empresaId === empresaId);
      const contatos = lerColecao<Contato>(CHAVE_CONTATOS).filter((contato) => contato.empresaId === empresaId);
      const emails = lerColecao<EmailContato>(CHAVE_EMAILS).filter((email) => email.empresaId === empresaId);

      const clienteIdsPorContato = new Set(
        contatos
          .filter(
            (contato) =>
              contato.nome.toLowerCase().includes(alvo) ||
              (alvoSoDigitos && contato.telefone && contato.telefone.replace(/\D/g, "").includes(alvoSoDigitos)),
          )
          .map((contato) => contato.clienteId),
      );
      const clienteIdsPorEmail = new Set(
        emails
          .filter((email) => email.email.toLowerCase().includes(alvo))
          .map((email) => contatos.find((contato) => contato.id === email.contatoId)?.clienteId)
          .filter((id): id is string => Boolean(id)),
      );

      return clientes.filter(
        (cliente) =>
          cliente.nome.toLowerCase().includes(alvo) ||
          (alvoSoDigitos && (cliente.documento ?? "").replace(/\D/g, "").includes(alvoSoDigitos)) ||
          clienteIdsPorContato.has(cliente.id) ||
          clienteIdsPorEmail.has(cliente.id),
      );
    },
  };
}
