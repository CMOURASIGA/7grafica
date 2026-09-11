import type { EmailRecebido } from "@/lib/domain/entities";
import type { EmailRecebidoRepository } from "@/lib/repositories/types";
import { criarCrudLocal } from "@/lib/repositories/local/crud-generico";

const CHAVE = "emails_recebidos";

export function criarEmailRecebidoRepositoryLocal(): EmailRecebidoRepository {
  return criarCrudLocal<EmailRecebido, Omit<EmailRecebido, "id">>(CHAVE, "email-in");
}
