import { describe, expect, it } from "vitest";
import { PERMISSOES, papelTemPermissao } from "./rbac";

describe("papelTemPermissao — Foundation (empresa/usuarios/auditoria)", () => {
  it("admin tem todas as permissoes administrativas", () => {
    expect(papelTemPermissao("admin", PERMISSOES.GERENCIAR_EMPRESA)).toBe(true);
    expect(papelTemPermissao("admin", PERMISSOES.GERENCIAR_USUARIOS)).toBe(true);
    expect(papelTemPermissao("admin", PERMISSOES.GERENCIAR_WHITELABEL)).toBe(true);
    expect(papelTemPermissao("admin", PERMISSOES.GERENCIAR_FEATURE_FLAGS)).toBe(true);
    expect(papelTemPermissao("admin", PERMISSOES.VER_AUDITORIA)).toBe(true);
  });

  it("gerente gerencia usuarios e ve auditoria, mas nao mexe em whitelabel/empresa/flags", () => {
    expect(papelTemPermissao("gerente", PERMISSOES.GERENCIAR_USUARIOS)).toBe(true);
    expect(papelTemPermissao("gerente", PERMISSOES.VER_AUDITORIA)).toBe(true);
    expect(papelTemPermissao("gerente", PERMISSOES.GERENCIAR_EMPRESA)).toBe(false);
    expect(papelTemPermissao("gerente", PERMISSOES.GERENCIAR_WHITELABEL)).toBe(false);
    expect(papelTemPermissao("gerente", PERMISSOES.GERENCIAR_FEATURE_FLAGS)).toBe(false);
  });

  it("atendente e operador nao tem nenhuma permissao administrativa", () => {
    const administrativas = [
      PERMISSOES.GERENCIAR_EMPRESA,
      PERMISSOES.GERENCIAR_USUARIOS,
      PERMISSOES.GERENCIAR_WHITELABEL,
      PERMISSOES.GERENCIAR_FEATURE_FLAGS,
      PERMISSOES.VER_AUDITORIA,
    ];
    for (const permissao of administrativas) {
      expect(papelTemPermissao("atendente", permissao)).toBe(false);
      expect(papelTemPermissao("operador", permissao)).toBe(false);
    }
  });
});

describe("papelTemPermissao — Cadastros (SPEC 02)", () => {
  it("admin e gerente administram clientes e os demais cadastros", () => {
    for (const papel of ["admin", "gerente"] as const) {
      expect(papelTemPermissao(papel, PERMISSOES.CLIENTES_GERENCIAR)).toBe(true);
      expect(papelTemPermissao(papel, PERMISSOES.CADASTROS_GERENCIAR)).toBe(true);
      expect(papelTemPermissao(papel, PERMISSOES.CADASTROS_COMERCIAIS_VISUALIZAR)).toBe(true);
      expect(papelTemPermissao(papel, PERMISSOES.CADASTROS_OPERACIONAIS_VISUALIZAR)).toBe(true);
    }
  });

  it("atendente administra clientes/contatos mas so le os demais cadastros", () => {
    expect(papelTemPermissao("atendente", PERMISSOES.CLIENTES_GERENCIAR)).toBe(true);
    expect(papelTemPermissao("atendente", PERMISSOES.CADASTROS_GERENCIAR)).toBe(false);
    expect(papelTemPermissao("atendente", PERMISSOES.CADASTROS_COMERCIAIS_VISUALIZAR)).toBe(true);
    expect(papelTemPermissao("atendente", PERMISSOES.CADASTROS_OPERACIONAIS_VISUALIZAR)).toBe(true);
  });

  it("operador so le os cadastros operacionais — sem clientes e sem cadastros comerciais", () => {
    expect(papelTemPermissao("operador", PERMISSOES.CLIENTES_GERENCIAR)).toBe(false);
    expect(papelTemPermissao("operador", PERMISSOES.CADASTROS_GERENCIAR)).toBe(false);
    expect(papelTemPermissao("operador", PERMISSOES.CADASTROS_COMERCIAIS_VISUALIZAR)).toBe(false);
    expect(papelTemPermissao("operador", PERMISSOES.CADASTROS_OPERACIONAIS_VISUALIZAR)).toBe(true);
  });
});

describe("papelTemPermissao — Solicitacoes e Orcamentos (SPEC 03)", () => {
  it("admin, gerente e atendente atendem e-mails/solicitacoes/orcamentos", () => {
    for (const papel of ["admin", "gerente", "atendente"] as const) {
      expect(papelTemPermissao(papel, PERMISSOES.SOLICITACOES_GERENCIAR)).toBe(true);
    }
  });

  it("operador nao acessa solicitacoes/orcamentos — nao e atendimento", () => {
    expect(papelTemPermissao("operador", PERMISSOES.SOLICITACOES_GERENCIAR)).toBe(false);
  });
});

describe("papelTemPermissao — Balcao, PDV e Caixa (SPEC 04)", () => {
  it("admin e gerente operam o PDV e o caixa (abrir/fechar/movimentos manuais)", () => {
    for (const papel of ["admin", "gerente"] as const) {
      expect(papelTemPermissao(papel, PERMISSOES.PDV_OPERAR)).toBe(true);
      expect(papelTemPermissao(papel, PERMISSOES.CAIXA_GERENCIAR)).toBe(true);
    }
  });

  it("atendente opera o PDV (clientes, pedidos, recebimentos), mas nao abre/fecha caixa", () => {
    expect(papelTemPermissao("atendente", PERMISSOES.PDV_OPERAR)).toBe(true);
    expect(papelTemPermissao("atendente", PERMISSOES.CAIXA_GERENCIAR)).toBe(false);
  });

  it("operador nao opera caixa nem altera recebimentos", () => {
    expect(papelTemPermissao("operador", PERMISSOES.PDV_OPERAR)).toBe(false);
    expect(papelTemPermissao("operador", PERMISSOES.CAIXA_GERENCIAR)).toBe(false);
  });
});
