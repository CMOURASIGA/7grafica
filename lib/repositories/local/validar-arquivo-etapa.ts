import type { Arquivo, EventoAuditoria, Trabalho } from "@/lib/domain/entities";
import { motivoArquivoInvalido } from "@/lib/domain/liberacao-arquivo";
import { gerarId, gravarColecao, lerColecao } from "@/lib/storage/local-storage-client";

export function exigirArquivoDaEtapa(trabalho: Trabalho, etapaId: string, usuarioId: string): void {
  const etapa = trabalho.workflow.etapas.find((item) => item.id === etapaId);
  if (!etapa?.exigeArquivoLiberado) return;
  const arquivo = lerColecao<Arquivo>("arquivos").find((item) => item.id === trabalho.arquivoLiberadoId) ?? null;
  const motivo = motivoArquivoInvalido(trabalho, arquivo);
  if (!motivo) return;
  const eventos = lerColecao<EventoAuditoria>("eventos_auditoria");
  eventos.push({ id: gerarId("evt"), empresaId: trabalho.empresaId, usuarioId,
    entidade: "trabalho", entidadeId: trabalho.id, acao: "trabalho_bloqueado_por_arquivo",
    dadosAntes: null, dadosDepois: { etapaId, motivo, arquivoLiberadoId: trabalho.arquivoLiberadoId }, criadoEm: new Date().toISOString() });
  gravarColecao("eventos_auditoria", eventos);
  throw new Error(`Etapa "${etapa.nome}" bloqueada: ${motivo}`);
}
