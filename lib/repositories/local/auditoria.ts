import { lerEstoque } from "./estoque";
import { lerFinanceiro } from "./financeiro";
import { lerPortalCliente } from "./portal-cliente";
import { gerarId, gravarColecao, lerColecao } from "@/lib/storage/local-storage-client";
import type { EventoAuditoria } from "@/lib/domain/entities";
import type { AuditoriaRepository } from "@/lib/repositories/types";

const CHAVE = "eventos_auditoria";

export function criarAuditoriaRepositoryLocal(): AuditoriaRepository {
  return {
    async listar(empresaId, limite = 50) {
      return [...lerColecao<EventoAuditoria>(CHAVE), ...lerEstoque(empresaId).eventos, ...lerFinanceiro(empresaId).eventos, ...lerPortalCliente(empresaId).eventos]
        .filter((evento) => evento.empresaId === empresaId)
        .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
        .slice(0, limite);
    },
    async registrar(evento) {
      const eventos = lerColecao<EventoAuditoria>(CHAVE);
      eventos.push({ ...evento, id: gerarId("evt"), criadoEm: new Date().toISOString() });
      gravarColecao(CHAVE, eventos);
    },
  };
}
