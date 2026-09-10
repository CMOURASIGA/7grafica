import { beforeEach, describe, expect, it } from "vitest";
import { restaurarDadosDemo } from "@/lib/mock/reset";
import { EMPRESA_DEMO_ID } from "@/lib/mock/seed-data";
import { PermissaoNegadaError, protegerRepositories } from "@/lib/repositories/authorization";
import { criarRepositoriesLocal } from "./index";

const periodo = { inicio: "2026-01-01", fim: "2026-12-31" };

describe("SPEC 12 relatórios e administração", () => {
  beforeEach(() => restaurarDadosDemo());

  it("agrega vendas, conversão, produção e clientes dos domínios existentes", async () => {
    const relatorio = await criarRepositoriesLocal().relatorios.gerar(EMPRESA_DEMO_ID, periodo);
    expect(relatorio.vendas).toMatchObject({ pedidos: 1, valor: 180, ticketMedio: 180 });
    expect(relatorio.orcamentos).toMatchObject({ enviados: 1, aprovados: 1, taxaConversao: 100 });
    expect(relatorio.producao).toMatchObject({ criados: 1, emAndamento: 1 });
    expect(relatorio.clientes[0]).toMatchObject({ clienteId: "cliente-1", pedidos: 1, valor: 180 });
  });

  it("não duplica versões de orçamento na taxa de conversão", async () => {
    const repos = criarRepositoriesLocal(), anterior = (await repos.orcamentos.listar(EMPRESA_DEMO_ID))[0];
    await repos.orcamentos.criarNovaVersao(anterior.id);
    const relatorio = await repos.relatorios.gerar(EMPRESA_DEMO_ID, periodo);
    expect(relatorio.orcamentos.enviados).toBe(1);
  });

  it("valida período, RBAC e isolamento por empresa", async () => {
    const base = criarRepositoriesLocal();
    await expect(base.relatorios.gerar(EMPRESA_DEMO_ID, { inicio: "2026-12-31", fim: "2026-01-01" })).rejects.toThrow("período");
    await expect(protegerRepositories(base, "operador", "usuario-operador", EMPRESA_DEMO_ID).relatorios.gerar(EMPRESA_DEMO_ID, periodo)).rejects.toBeInstanceOf(PermissaoNegadaError);
    await expect(protegerRepositories(base, "gerente", "usuario-gerente", EMPRESA_DEMO_ID).relatorios.gerar("outra-empresa", periodo)).rejects.toBeInstanceOf(PermissaoNegadaError);
  });

  it("registra política de 2FA e restringe sua gestão ao Admin", async () => {
    const base = criarRepositoriesLocal(), admin = protegerRepositories(base, "admin", "usuario-admin", EMPRESA_DEMO_ID);
    const config = await admin.administracao.definirPolitica2FA(EMPRESA_DEMO_ID, { papel: "gerente", exigencia: "obrigatorio" }, "autor-falso");
    expect(config.politicas2FA.find((p) => p.papel === "gerente")?.exigencia).toBe("obrigatorio");
    const evento = (await base.auditoria.listar(EMPRESA_DEMO_ID)).find((e) => e.acao === "administracao.politica_2fa");
    expect(evento?.usuarioId).toBe("usuario-admin");
    await expect(protegerRepositories(base, "gerente", "usuario-gerente", EMPRESA_DEMO_ID).administracao.obter(EMPRESA_DEMO_ID)).rejects.toBeInstanceOf(PermissaoNegadaError);
    await expect(protegerRepositories(base, "gerente", "usuario-gerente", EMPRESA_DEMO_ID).featureFlags.listar(EMPRESA_DEMO_ID)).rejects.toBeInstanceOf(PermissaoNegadaError);
  });
});
