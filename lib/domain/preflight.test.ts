import { describe, expect, it } from "vitest";
import { rodarPreflight } from "./preflight";
import type { DadosMetadadosArquivo } from "@/lib/repositories/types";
import type { RequisitoArquivoServico } from "@/lib/domain/entities";

function dados(overrides: Partial<DadosMetadadosArquivo> = {}): DadosMetadadosArquivo {
  return {
    nome: "arte.pdf",
    extensao: "pdf",
    mimeType: "application/pdf",
    tamanhoBytes: 500_000,
    paginas: 2,
    larguraMm: 90,
    alturaMm: 50,
    ...overrides,
  };
}

const requisitoCartao: RequisitoArquivoServico = { formatoEsperado: "pdf", paginasEsperadas: 2, larguraEsperadaMm: 90, alturaEsperadaMm: 50 };

describe("rodarPreflight (SPEC 07)", () => {
  it("status OK quando o arquivo bate com o requisito do servico", () => {
    const analise = rodarPreflight(dados(), requisitoCartao);
    expect(analise.status).toBe("ok");
    expect(analise.regras).toEqual([]);
  });

  it("BLOQUEIO quando o formato diverge do esperado", () => {
    const analise = rodarPreflight(dados({ extensao: "jpg" }), requisitoCartao);
    expect(analise.status).toBe("bloqueio");
    expect(analise.regras.map((r) => r.codigo)).toContain("formato_divergente");
  });

  it("BLOQUEIO quando o numero de paginas diverge", () => {
    const analise = rodarPreflight(dados({ paginas: 1 }), requisitoCartao);
    expect(analise.status).toBe("bloqueio");
    expect(analise.regras.map((r) => r.codigo)).toContain("paginas_divergentes");
  });

  it("BLOQUEIO quando a dimensao diverge alem da tolerancia", () => {
    const analise = rodarPreflight(dados({ larguraMm: 100, alturaMm: 60 }), requisitoCartao);
    expect(analise.status).toBe("bloqueio");
    expect(analise.regras.map((r) => r.codigo)).toContain("dimensao_divergente");
  });

  it("tolera pequena diferenca de dimensao (arredondamento/corte)", () => {
    const analise = rodarPreflight(dados({ larguraMm: 91, alturaMm: 49 }), requisitoCartao);
    expect(analise.status).toBe("ok");
  });

  it("ALERTA quando paginas/dimensao nao puderam ser identificadas", () => {
    const analise = rodarPreflight(dados({ paginas: null, larguraMm: null, alturaMm: null }), requisitoCartao);
    expect(analise.status).toBe("alerta");
    expect(analise.regras.map((r) => r.codigo)).toEqual(expect.arrayContaining(["paginas_desconhecidas", "dimensao_desconhecida"]));
  });

  it("sem requisito cadastrado, so relata metadados — nunca gera divergencia", () => {
    const analise = rodarPreflight(dados({ extensao: "jpg", paginas: 1, larguraMm: 500, alturaMm: 500 }), null);
    expect(analise.status).toBe("ok");
    expect(analise.regras).toEqual([]);
  });

  it("BLOQUEIO para arquivo de tamanho zero, independente de requisito", () => {
    const analise = rodarPreflight(dados({ tamanhoBytes: 0 }), null);
    expect(analise.status).toBe("bloqueio");
    expect(analise.regras.map((r) => r.codigo)).toContain("arquivo_vazio");
  });

  it("orientacao derivada de largura/altura", () => {
    expect(rodarPreflight(dados({ larguraMm: 200, alturaMm: 100 }), null).orientacao).toBe("paisagem");
    expect(rodarPreflight(dados({ larguraMm: 100, alturaMm: 200 }), null).orientacao).toBe("retrato");
  });
});
