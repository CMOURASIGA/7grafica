import { beforeEach, describe, expect, it, vi } from "vitest";
import { EMPRESA_DEMO_ID } from "@/lib/mock/seed-data";
import { restaurarDadosDemo } from "@/lib/mock/reset";
import { PermissaoNegadaError, protegerRepositories } from "@/lib/repositories/authorization";
import { criarRepositoriesLocal } from "./index";

const empresa = EMPRESA_DEMO_ID, usuario = "usuario-gerente";

describe("SPEC 10 portal do cliente", () => {
  beforeEach(() => { vi.useRealTimers(); restaurarDadosDemo(); });

  it("ativa conta somente por convite e mostra apenas dados do cliente vinculado", async () => {
    const repos = criarRepositoriesLocal();
    const convite = await repos.portalClienteGestao.convidar(empresa, { clienteId: "cliente-1", email: "fernanda@saborcia.com.br", validadeDias: 7, operacaoId: "conv-1" }, usuario);
    await expect(repos.portalCliente.ativarConta(convite.token, "curta")).rejects.toThrow(/8 caracteres/);
    await repos.portalCliente.ativarConta(convite.token, "senha-segura");
    const painel = await repos.portalCliente.obterPainel();
    expect(painel?.clienteId).toBe("cliente-1");
    expect([...painel!.pedidosAtivos, ...painel!.historico].every((p) => p.pedido.clienteId === "cliente-1")).toBe(true);
    expect(painel!.pedidosAtivos.flatMap((p) => p.arquivosLiberados).every((a) => painel!.pedidosAtivos.some((p) => p.pedido.id === a.pedidoId))).toBe(true);
    await repos.portalCliente.sair();
    await repos.portalCliente.entrar("fernanda@saborcia.com.br", "senha-segura");
    expect((await repos.portalCliente.obterSessao())?.clienteId).toBe("cliente-1");
  });

  it("recusa e-mail que pertence a outro cliente", async () => {
    await expect(criarRepositoriesLocal().portalClienteGestao.convidar(empresa, { clienteId: "cliente-1", email: "marcos@corpoativo.com", validadeDias: 7, operacaoId: "conv-errado" }, usuario)).rejects.toThrow(/deste cliente/);
  });

  it("token aleatório limita a um Pedido, expira e pode ser revogado", async () => {
    const repos = criarRepositoriesLocal(), pedido = (await repos.pedidos.listar(empresa)).find((p) => p.clienteId === "cliente-1")!;
    const acesso = await repos.portalClienteGestao.emitirTokenPedido(empresa, { pedidoId: pedido.id, validadeDias: 1, operacaoId: "link-1" }, usuario);
    expect(acesso.token).toHaveLength(48);
    expect((await repos.portalCliente.buscarPedidoPorToken(acesso.token))?.pedido.id).toBe(pedido.id);
    await repos.portalClienteGestao.revogarTokenPedido(empresa, acesso.id, usuario);
    expect(await repos.portalCliente.buscarPedidoPorToken(acesso.token)).toBeNull();
    const outro = await repos.portalClienteGestao.emitirTokenPedido(empresa, { pedidoId: pedido.id, validadeDias: 1, operacaoId: "link-2" }, usuario);
    vi.useFakeTimers(); vi.setSystemTime(new Date(Date.now() + 2 * 86400000));
    expect(await repos.portalCliente.buscarPedidoPorToken(outro.token)).toBeNull();
  });

  it("protege gestão com RBAC e empresa ativa", async () => {
    const base = criarRepositoriesLocal();
    await expect(protegerRepositories(base, "operador", "usuario-operador", empresa).portalClienteGestao.listarConvites(empresa)).rejects.toBeInstanceOf(PermissaoNegadaError);
    await expect(protegerRepositories(base, "gerente", usuario, empresa).portalClienteGestao.listarConvites("outra")).rejects.toBeInstanceOf(PermissaoNegadaError);
  });
});
