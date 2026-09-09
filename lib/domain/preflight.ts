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

  for (const [campo, valor] of Object.entries({ paginas: dados.paginas, larguraMm: dados.larguraMm, alturaMm: dados.alturaMm })) {
    if (valor != null && (!Number.isFinite(valor) || valor <= 0 || (campo === "paginas" && !Number.isInteger(valor)))) {
      regras.push({ codigo: "metadado_invalido", mensagem: `Metadado ${campo} deve ser um número positivo válido.`, severidade: "bloqueio" });
    }
  }
  if (dados.extensao.toLowerCase() === "pdf" && dados.mimeType !== "application/pdf") regras.push({ codigo: "mime_divergente", mensagem: "Extensão PDF com MIME incompatível.", severidade: "bloqueio" });
  if (dados.extensao.toLowerCase() === "pdf" && (dados.paginas == null || dados.larguraMm == null || dados.alturaMm == null) && !regras.some((r) => r.codigo.endsWith("desconhecidas") || r.codigo.endsWith("desconhecida"))) regras.push({ codigo: "pdf_incompleto", mensagem: "Metadados do PDF incompletos. Confira o documento antes da aprovação técnica.", severidade: "alerta" });
  if (!Number.isFinite(dados.tamanhoBytes) || dados.tamanhoBytes <= 0) {
    regras.push({ codigo: "arquivo_vazio", mensagem: "Arquivo com tamanho zero.", severidade: "bloqueio" });
  }

  const status: StatusAnalisePreflight = regras.some((regra) => regra.severidade === "bloqueio")
    ? "bloqueio"
    : regras.length > 0
      ? "alerta"
      : "ok";

  return {
    status,
    resumo: status === "ok" ? "Metadados disponíveis atendem às regras verificadas." : "Confira os motivos encontrados na análise.",
    formatoAproximado: formatoAproximado(dados.larguraMm, dados.alturaMm),
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

function formatoAproximado(largura: number | null, altura: number | null): string | null {
  if (!largura || !altura) return null;
  const menor = Math.min(largura, altura), maior = Math.max(largura, altura);
  for (const [nome, l, a] of [["A3", 297, 420], ["A4", 210, 297], ["A5", 148, 210], ["A6", 105, 148]] as const) {
    if (Math.abs(menor - l) <= 2 && Math.abs(maior - a) <= 2) return nome;
  }
  return "Personalizado";
}
