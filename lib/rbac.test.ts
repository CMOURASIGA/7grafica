import { describe, expect, it } from "vitest";
import { PERMISSOES, papelTemPermissao } from "./rbac";

describe("papelTemPermissao", () => {
  it("admin tem todas as permissoes da Foundation", () => {
    for (const permissao of Object.values(PERMISSOES)) {
      expect(papelTemPermissao("admin", permissao)).toBe(true);
    }
  });

  it("gerente gerencia usuarios e ve auditoria, mas nao mexe em whitelabel/empresa/flags", () => {
    expect(papelTemPermissao("gerente", PERMISSOES.GERENCIAR_USUARIOS)).toBe(true);
    expect(papelTemPermissao("gerente", PERMISSOES.VER_AUDITORIA)).toBe(true);
    expect(papelTemPermissao("gerente", PERMISSOES.GERENCIAR_EMPRESA)).toBe(false);
    expect(papelTemPermissao("gerente", PERMISSOES.GERENCIAR_WHITELABEL)).toBe(false);
    expect(papelTemPermissao("gerente", PERMISSOES.GERENCIAR_FEATURE_FLAGS)).toBe(false);
  });

  it("atendente e operador nao tem nenhuma permissao administrativa da Foundation", () => {
    for (const permissao of Object.values(PERMISSOES)) {
      expect(papelTemPermissao("atendente", permissao)).toBe(false);
      expect(papelTemPermissao("operador", permissao)).toBe(false);
    }
  });
});
