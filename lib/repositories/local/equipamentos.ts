import { gerarId, gravarColecao, lerColecao } from "@/lib/storage/local-storage-client";
import type { AlocacaoEquipamento, EventoAuditoria, Equipamento } from "@/lib/domain/entities";
import type { EquipamentoRepository } from "@/lib/repositories/types";
import { criarCrudLocal } from "@/lib/repositories/local/crud-generico";

const CHAVE = "equipamentos";
const CHAVE_ALOCACOES = "alocacoes_equipamento";
const CHAVE_AUDITORIA = "eventos_auditoria";

const SITUACOES_ATIVAS: AlocacaoEquipamento["situacao"][] = ["aguardando", "preparacao", "em_execucao", "pausada"];

export function criarEquipamentoRepositoryLocal(): EquipamentoRepository {
  const base = criarCrudLocal<Equipamento, Omit<Equipamento, "id">>(CHAVE, "equip");
  return {
    ...base,
    async atualizarSituacao(equipamentoId, usuarioId, novaSituacao) {
      const equipamentos = lerColecao<Equipamento>(CHAVE);
      const indice = equipamentos.findIndex((item) => item.id === equipamentoId);
      if (indice === -1) throw new Error(`Equipamento ${equipamentoId} nao encontrado.`);
      const anterior = equipamentos[indice];
      const atualizado: Equipamento = { ...anterior, situacao: novaSituacao };
      equipamentos[indice] = atualizado;
      gravarColecao(CHAVE, equipamentos);

      // Equipamento ficando indisponivel/manutencao com alocacao ativa: nunca
      // mover ou apagar silenciosamente — sinaliza para decisao humana.
      if (novaSituacao === "indisponivel" || novaSituacao === "manutencao") {
        const alocacoes = lerColecao<AlocacaoEquipamento>(CHAVE_ALOCACOES);
        let alterou = false;
        alocacoes.forEach((alocacao, i) => {
          if (alocacao.equipamentoId === equipamentoId && SITUACOES_ATIVAS.includes(alocacao.situacao) && !alocacao.precisaDecisaoHumana) {
            alocacoes[i] = { ...alocacao, precisaDecisaoHumana: true, atualizadoEm: new Date().toISOString() };
            alterou = true;
          }
        });
        if (alterou) gravarColecao(CHAVE_ALOCACOES, alocacoes);
      }

      const eventos = lerColecao<EventoAuditoria>(CHAVE_AUDITORIA);
      eventos.push({
        id: gerarId("evt"),
        empresaId: atualizado.empresaId,
        usuarioId,
        acao: "equipamento_situacao_alterada",
        entidade: "equipamento",
        entidadeId: equipamentoId,
        dadosAntes: { situacao: anterior.situacao },
        dadosDepois: { situacao: novaSituacao },
        criadoEm: new Date().toISOString(),
      });
      gravarColecao(CHAVE_AUDITORIA, eventos);

      return atualizado;
    },
  };
}
