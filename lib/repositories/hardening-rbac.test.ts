import { beforeEach, describe, expect, it } from "vitest";
import { restaurarDadosDemo } from "@/lib/mock/reset";
import { EMPRESA_DEMO_ID } from "@/lib/mock/seed-data";
import { PermissaoNegadaError, protegerRepositories } from "./authorization";
import { criarRepositoriesLocal } from "./local";

describe("Hardening RBAC e isolamento multiempresa", () => {
  beforeEach(() => restaurarDadosDemo());

  it("bloqueia leitura, criação e atualização CRUD fora da empresa ativa", async () => {
    const base = criarRepositoriesLocal(), admin = protegerRepositories(base, "admin", "usuario-admin", EMPRESA_DEMO_ID);
    const externo = await base.clientes.criar({ empresaId: "empresa-externa", tipo: "PJ", nome: "Cliente externo", documento: null, observacoes: null, ativo: true });
    await expect(admin.clientes.obter(externo.id)).rejects.toBeInstanceOf(PermissaoNegadaError);
    await expect(admin.clientes.criar({ empresaId: "empresa-externa", tipo: "PJ", nome: "Invasão", documento: null, observacoes: null, ativo: true })).rejects.toBeInstanceOf(PermissaoNegadaError);
    await expect(admin.clientes.atualizar(externo.id, { nome: "Alterado" })).rejects.toBeInstanceOf(PermissaoNegadaError);
  });

  it("limita empresa, usuários e auditoria à sessão ativa", async () => {
    const base = criarRepositoriesLocal(), admin = protegerRepositories(base, "admin", "usuario-admin", EMPRESA_DEMO_ID);
    await expect(admin.empresas.obter("empresa-externa")).rejects.toBeInstanceOf(PermissaoNegadaError);
    await expect(admin.usuarios.listarPorEmpresa("empresa-externa")).rejects.toBeInstanceOf(PermissaoNegadaError);
    await expect(admin.usuarios.alterarPapel("vinculo-inexistente", "operador")).rejects.toBeInstanceOf(PermissaoNegadaError);
    await admin.auditoria.registrar({ empresaId: EMPRESA_DEMO_ID, usuarioId: "autor-forjado", acao: "teste", entidade: "hardening", entidadeId: null, dadosAntes: null, dadosDepois: null });
    expect((await base.auditoria.listar(EMPRESA_DEMO_ID)).find((e) => e.acao === "teste")?.usuarioId).toBe("usuario-admin");
    await expect(admin.auditoria.registrar({ empresaId: "empresa-externa", usuarioId: "usuario-admin", acao: "teste", entidade: "hardening", entidadeId: null, dadosAntes: null, dadosDepois: null })).rejects.toBeInstanceOf(PermissaoNegadaError);
  });

  it("permite consulta operacional de Entregas sem liberar Pedido ou timeline financeira", async () => {
    const base = criarRepositoriesLocal(), pedido = await base.pedidos.criarAtendimentoBalcao({ empresaId: EMPRESA_DEMO_ID, clienteId: null, itens: [], valorTotal: 0, statusEntrega: "aguardando_producao" });
    await base.entregas.preparar(EMPRESA_DEMO_ID, { pedidoId: pedido.id, modalidade: "retirada", operacaoId: "hardening-entrega" }, "usuario-gerente");
    const operador = protegerRepositories(base, "operador", "usuario-operador", EMPRESA_DEMO_ID);
    await expect(operador.entregas.listarResumos(EMPRESA_DEMO_ID)).resolves.toMatchObject([{ pedidoNumero: pedido.numero }]);
    await expect(operador.pedidos.obter(pedido.id)).rejects.toBeInstanceOf(PermissaoNegadaError);
    await expect(operador.historicoPedido.listar(EMPRESA_DEMO_ID, pedido.id)).rejects.toBeInstanceOf(PermissaoNegadaError);
  });

  it("mantém relatórios e segurança administrativa nos papéis definidos", async () => {
    const base = criarRepositoriesLocal();
    await expect(protegerRepositories(base, "gerente", "usuario-gerente", EMPRESA_DEMO_ID).relatorios.obterDashboard(EMPRESA_DEMO_ID)).resolves.toBeTruthy();
    await expect(protegerRepositories(base, "atendente", "usuario-atendente", EMPRESA_DEMO_ID).relatorios.obterDashboard(EMPRESA_DEMO_ID)).rejects.toBeInstanceOf(PermissaoNegadaError);
    await expect(protegerRepositories(base, "gerente", "usuario-gerente", EMPRESA_DEMO_ID).administracao.obter(EMPRESA_DEMO_ID)).rejects.toBeInstanceOf(PermissaoNegadaError);
  });
});
