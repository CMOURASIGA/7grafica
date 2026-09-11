import { politicas2FAPadrao, type ConfiguracaoAdministrativa } from "@/lib/domain/administracao";
import type { EventoAuditoria } from "@/lib/domain/entities";
import type { AdministracaoRepository } from "@/lib/repositories/administracao-types";
import { gerarId, gravarColecao, gravarValorConfirmado, lerColecao, lerValor } from "@/lib/storage/local-storage-client";

const chave = (empresaId: string) => `administracao_v1:${empresaId}`;
const ler = (empresaId: string): ConfiguracaoAdministrativa => lerValor<ConfiguracaoAdministrativa>(chave(empresaId)) ?? { empresaId, politicas2FA: politicas2FAPadrao() };

export function criarAdministracaoRepositoryLocal(): AdministracaoRepository {
  return {
    async obter(empresaId) { return ler(empresaId); },
    async definirPolitica2FA(empresaId, dados, usuarioId) {
      const { papel, exigencia } = dados;
      const configuracao = ler(empresaId), anterior = configuracao.politicas2FA.find((p) => p.papel === papel)?.exigencia ?? "opcional", agora = new Date().toISOString();
      configuracao.politicas2FA = configuracao.politicas2FA.map((p) => p.papel === papel ? { ...p, exigencia, atualizadoEm: agora, atualizadoPorUsuarioId: usuarioId } : p);
      gravarValorConfirmado(chave(empresaId), configuracao);
      const eventos = lerColecao<EventoAuditoria>("eventos_auditoria"); eventos.push({ id: gerarId("evt"), empresaId, usuarioId, acao: "administracao.politica_2fa", entidade: "politica_2fa", entidadeId: papel, dadosAntes: { exigencia: anterior }, dadosDepois: { exigencia }, criadoEm: agora }); gravarColecao("eventos_auditoria", eventos);
      return configuracao;
    },
  };
}
