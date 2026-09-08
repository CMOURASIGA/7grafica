import type { AnalisePreflight, RegraPreflight, RequisitoArquivoServico, StatusAnalisePreflight } from "@/lib/domain/entities";
import type { DadosMetadadosArquivo } from "@/lib/repositories/types";

/**
 * Preflight basico do MVP (SPEC 07): extrai/normaliza os metadados
 * simulados do arquivo e compara, de forma 100% determinística (nunca IA),
 * contra o RequisitoArquivoServico do Trabalho, quando houver. So aponta
 * divergencias — nunca corrige nada automaticamente (sem RGB->CMYK,
 * PDF/X-1a, TAC ou flatten, que ficam para evolucao futura do preflight).
 */
export function rodarPreflight(dados: DadosMetadadosArquivo, requisito: RequisitoArquivoServico | null): AnalisePreflight {
  const regras: RegraPreflight[] = [];
  const orientacao: AnalisePreflight["orientacao"] =
    dados.larguraMm != null && dados.alturaMm != null ? (dados.larguraMm >= dados.alturaMm ? "paisagem" : "retrato") : null;

  if (requisito?.formatoEsperado) {
    const extensaoNormalizada = dados.extensao.trim().toLowerCase().replace(/^\./, "");
    const formatoEsperadoNormalizado = requisito.formatoEsperado.trim().toLowerCase();
    if (extensaoNormalizada !== formatoEsperadoNormalizado) {
      regras.push({
        codigo: "formato_divergente",
        mensagem: `Formato do arquivo (${dados.extensao.toUpperCase()}) diverge do esperado pelo serviço (${requisito.formatoEsperado.toUpperCase()}).`,
        severidade: "bloqueio",
      });
    }
  }

  if (requisito?.paginasEsperadas != null) {
    if (dados.paginas == null) {
      regras.push({ codigo: "paginas_desconhecidas", mensagem: "Não foi possível identificar o número de páginas do arquivo.", severidade: "alerta" });
    } else if (dados.paginas !== requisito.paginasEsperadas) {
      regras.push({
        codigo: "paginas_divergentes",
        mensagem: `Arquivo tem ${dados.paginas} página(s); o serviço espera ${requisito.paginasEsperadas}.`,
        severidade: "bloqueio",
      });
    }
  }

  if (requisito?.larguraEsperadaMm != null && requisito?.alturaEsperadaMm != null) {
    if (dados.larguraMm == null || dados.alturaMm == null) {
      regras.push({ codigo: "dimensao_desconhecida", mensagem: "Não foi possível identificar as dimensões do arquivo.", severidade: "alerta" });
    } else {
      const TOLERANCIA_MM = 2; // pequena folga de corte/sangria — nunca decide arte, so evita falso-positivo por arredondamento
      const larguraOk = Math.abs(dados.larguraMm - requisito.larguraEsperadaMm) <= TOLERANCIA_MM;
      const alturaOk = Math.abs(dados.alturaMm - requisito.alturaEsperadaMm) <= TOLERANCIA_MM;
      if (!larguraOk || !alturaOk) {
        regras.push({
          codigo: "dimensao_divergente",
          mensagem: `Dimensão do arquivo (${dados.larguraMm} x ${dados.alturaMm} mm) diverge da esperada pelo serviço (${requisito.larguraEsperadaMm} x ${requisito.alturaEsperadaMm} mm).`,
          severidade: "bloqueio",
        });
      }
    }
  }

  if (dados.tamanhoBytes <= 0) {
    regras.push({ codigo: "arquivo_vazio", mensagem: "Arquivo com tamanho zero.", severidade: "bloqueio" });
  }

  const status: StatusAnalisePreflight = regras.some((regra) => regra.severidade === "bloqueio")
    ? "bloqueio"
    : regras.length > 0
      ? "alerta"
      : "ok";

  return {
    status,
    paginas: dados.paginas,
    larguraMm: dados.larguraMm,
    alturaMm: dados.alturaMm,
    orientacao,
    tamanhoBytes: dados.tamanhoBytes,
    mimeType: dados.mimeType,
    regras,
    analisadoEm: new Date().toISOString(),
  };
}
