import { gerarId, gravarColecao, lerColecao } from "@/lib/storage/local-storage-client";
import type { EmailEnviado } from "@/lib/domain/entities";
import type { EmailEnviadoRepository } from "@/lib/repositories/types";

const CHAVE = "emails_enviados";

export function criarEmailEnviadoRepositoryLocal(): EmailEnviadoRepository {
  return {
    async listarPorOrcamento(orcamentoId) {
      return lerColecao<EmailEnviado>(CHAVE).filter((email) => email.orcamentoId === orcamentoId);
    },
  };
}

/**
 * Uso interno do OrcamentoRepository (enviarPorEmail) — nao faz parte da
 * interface publica de EmailEnviadoRepository porque o envio e sempre
 * consequencia de "enviar orcamento", nunca um CRUD solto.
 */
export function registrarEmailEnviado(entrada: Omit<EmailEnviado, "id">): EmailEnviado {
  const emails = lerColecao<EmailEnviado>(CHAVE);
  const novo: EmailEnviado = { ...entrada, id: gerarId("email-out") };
  emails.push(novo);
  gravarColecao(CHAVE, emails);
  return novo;
}
