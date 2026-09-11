import type { Arquivo, Trabalho } from "./entities";

/** A referência explícita nunca dispensa conferir o estado atual da versão. */
export function motivoArquivoInvalido(trabalho: Trabalho, arquivo: Arquivo | null): string | null {
  if (!arquivo) return "Nenhum arquivo válido foi explicitamente liberado para produção neste Trabalho.";
  if (arquivo.trabalhoId !== trabalho.id || arquivo.empresaId !== trabalho.empresaId) return "Este arquivo não pertence a este Trabalho/empresa.";
  if (["substituido", "cancelado", "rejeitado_cliente", "alteracao_solicitada"].includes(arquivo.situacao)) return "Versão substituída, cancelada ou recusada: libere explicitamente uma nova versão.";
  if (!arquivo.analise || arquivo.analise.status === "bloqueio") return "Arquivo sem análise válida ou com bloqueio no preflight.";
  if (arquivo.statusAprovacaoTecnica !== "aprovado") return "Arquivo exige aprovacao tecnica antes da produção.";
  if ((arquivo.tipo === "arte" || arquivo.exigeAprovacaoCliente || arquivo.tokenAprovacaoPublica) &&
      (arquivo.situacao !== "aprovado_cliente" || !arquivo.aprovacaoCliente?.aprovado)) return "Arquivo exige aprovação do cliente antes da produção.";
  return null;
}
