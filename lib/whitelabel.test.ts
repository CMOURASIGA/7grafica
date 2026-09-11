import { describe, expect, it } from "vitest";
import { CONSULT_LOGO_URL } from "./brand";
import { aplicarIdentidadeVisual, corHexValida, resolverIdentidadeCanto } from "./whitelabel";
import type { Empresa } from "./domain/entities";

function empresaBase(overrides: Partial<Empresa> = {}): Empresa {
  return {
    id: "empresa-1",
    nome: "Grafica Exemplo",
    slug: "grafica-exemplo",
    logoUrl: null,
    corPrimaria: null,
    corDestaque: null,
    ativo: true,
    criadoEm: new Date().toISOString(),
    ...overrides,
  };
}

describe("resolverIdentidadeCanto", () => {
  it("usa a identidade Consult Services quando a empresa nao tem logo (sem whitelabel)", () => {
    const identidade = resolverIdentidadeCanto(empresaBase());
    expect(identidade.whitelabel).toBe(false);
    expect(identidade.logoUrl).toBe(CONSULT_LOGO_URL);
    expect(identidade.nomeCliente).toBeNull();
  });

  it("usa a identidade Consult Services quando nao ha empresa vinculada", () => {
    const identidade = resolverIdentidadeCanto(null);
    expect(identidade.whitelabel).toBe(false);
    expect(identidade.logoUrl).toBe(CONSULT_LOGO_URL);
  });

  it("prioriza o logo do cliente quando ha whitelabel configurado", () => {
    const identidade = resolverIdentidadeCanto(
      empresaBase({ logoUrl: "https://cliente.example/logo.png", nome: "Grafica do Cliente" }),
    );
    expect(identidade.whitelabel).toBe(true);
    expect(identidade.logoUrl).toBe("https://cliente.example/logo.png");
    expect(identidade.nomeCliente).toBe("Grafica do Cliente");
  });

  it("valida cores hexadecimais completas", () => {
    expect(corHexValida(" #7A1F2B ")).toBe("#7a1f2b");
    expect(corHexValida("#fff")).toBeNull();
    expect(corHexValida("vermelho")).toBeNull();
  });

  it("aplica a paleta da empresa nas variaveis do shell", () => {
    aplicarIdentidadeVisual(resolverIdentidadeCanto(empresaBase({ corPrimaria: "#7a1f2b", corDestaque: "#f4d35e" })));
    expect(document.documentElement.style.getPropertyValue("--sidebar")).toBe("#7a1f2b");
    expect(document.documentElement.style.getPropertyValue("--brand-highlight")).toBe("#f4d35e");
  });
});
