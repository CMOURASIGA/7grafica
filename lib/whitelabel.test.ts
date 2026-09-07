import { describe, expect, it } from "vitest";
import { CONSULT_LOGO_URL } from "./brand";
import { resolverIdentidadeCanto } from "./whitelabel";
import type { Empresa } from "./supabase/types";

function empresaBase(overrides: Partial<Empresa> = {}): Empresa {
  return {
    id: "empresa-1",
    nome: "Grafica Exemplo",
    slug: "grafica-exemplo",
    logo_url: null,
    cor_primaria: null,
    cor_destaque: null,
    ativo: true,
    criado_em: new Date().toISOString(),
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
      empresaBase({ logo_url: "https://cliente.example/logo.png", nome: "Grafica do Cliente" }),
    );
    expect(identidade.whitelabel).toBe(true);
    expect(identidade.logoUrl).toBe("https://cliente.example/logo.png");
    expect(identidade.nomeCliente).toBe("Grafica do Cliente");
  });
});
