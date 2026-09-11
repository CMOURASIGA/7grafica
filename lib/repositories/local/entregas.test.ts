import { beforeEach, describe, expect, it } from "vitest";
import { EMPRESA_DEMO_ID } from "@/lib/mock/seed-data";
import { restaurarDadosDemo } from "@/lib/mock/reset";
import { PermissaoNegadaError, protegerRepositories } from "@/lib/repositories/authorization";
import { criarRepositoriesLocal } from "./index";

const empresa = EMPRESA_DEMO_ID, usuario = "usuario-gerente";
async function pedidoSemProducao() {
  return criarRepositoriesLocal().pedidos.criarAtendimentoBalcao({ empresaId: empresa, clienteId: "cliente-1", itens: [{ id: "i-entrega", descricao: "Impressão pronta", quantidade: 1, servicoId: null, materialId: null, acabamentos: null, precoUnitario: 30 }], valorTotal: 30, statusEntrega: "aguardando_producao" });
}

describe("SPEC 11 entrega e histórico", () => {
  beforeEach(() => restaurarDadosDemo());

  it("retirada percorre pronto, aguardando e entregue com comprovante", async () => {
    const repos = criarRepositoriesLocal(), pedido = await pedidoSemProducao();
    const entrega = await repos.entregas.preparar(empresa, { pedidoId: pedido.id, modalidade: "retirada", previsao: "2026-09-12", operacaoId: "prep-1" }, usuario);
    await expect(repos.entregas.alterarStatus(empresa, { entregaId: entrega.id, status: "entregue", recebedor: "Fernanda", comprovanteReferencia: "DOC-1", operacaoId: "fora-ordem" }, usuario)).rejects.toThrow(/Transição/);
    await repos.entregas.alterarStatus(empresa, { entregaId: entrega.id, status: "aguardando_retirada", operacaoId: "aguarda-1" }, usuario);
    await expect(repos.entregas.alterarStatus(empresa, { entregaId: entrega.id, status: "entregue", recebedor: "", comprovanteReferencia: "", operacaoId: "sem-prova" }, usuario)).rejects.toThrow(/recebedor/);
    const final = await repos.entregas.alterarStatus(empresa, { entregaId: entrega.id, status: "entregue", recebedor: "Fernanda", comprovanteReferencia: "assinatura://DOC-1", operacaoId: "entregue-1" }, usuario);
    expect(final).toMatchObject({ status: "entregue", recebedor: "Fernanda" });
    expect((await repos.pedidos.obter(pedido.id))?.statusEntrega).toBe("concluido");
    expect(final.eventos.map((e) => e.status)).toEqual(["pronto", "aguardando_retirada", "entregue"]);
  });

  it("entrega externa exige endereço e permite falha seguida de nova tentativa", async () => {
    const repos = criarRepositoriesLocal(), pedido = await pedidoSemProducao();
    await expect(repos.entregas.preparar(empresa, { pedidoId: pedido.id, modalidade: "motoboy", operacaoId: "sem-endereco" }, usuario)).rejects.toThrow(/endereço/);
    const entrega = await repos.entregas.preparar(empresa, { pedidoId: pedido.id, modalidade: "motoboy", endereco: "Rua A, 10", operacaoId: "prep-2" }, usuario);
    await repos.entregas.alterarStatus(empresa, { entregaId: entrega.id, status: "saiu_para_entrega", operacaoId: "saiu-1" }, usuario);
    await expect(repos.entregas.alterarStatus(empresa, { entregaId: entrega.id, status: "falha_entrega", observacao: "", operacaoId: "falha-vazia" }, usuario)).rejects.toThrow(/motivo/);
    await repos.entregas.alterarStatus(empresa, { entregaId: entrega.id, status: "falha_entrega", observacao: "Cliente ausente", operacaoId: "falha-1" }, usuario);
    const nova = await repos.entregas.alterarStatus(empresa, { entregaId: entrega.id, status: "saiu_para_entrega", observacao: "Reagendado", operacaoId: "saiu-2" }, usuario);
    expect(nova.status).toBe("saiu_para_entrega");
  });

  it("não marca pronto enquanto existir Trabalho não concluído", async () => {
    const repos = criarRepositoriesLocal();
    await expect(repos.entregas.preparar(empresa, { pedidoId: "pedido-1", modalidade: "retirada", operacaoId: "bloq" }, usuario)).rejects.toThrow(/Trabalhos/);
  });

  it("timeline correlaciona Pedido, Trabalho, pagamento e entrega com isolamento", async () => {
    const repos = criarRepositoriesLocal(), pedido = await pedidoSemProducao();
    await repos.entregas.preparar(empresa, { pedidoId: pedido.id, modalidade: "retirada", operacaoId: "prep-hist" }, usuario);
    const historico = await repos.historicoPedido.listar(empresa, pedido.id);
    expect(historico.map((e) => e.acao)).toContain("pedido_criado");
    expect(historico.map((e) => e.acao)).toContain("pedido_pronto");
    const autorizado = protegerRepositories(repos, "gerente", usuario, empresa);
    await expect(autorizado.historicoPedido.listar("outra", pedido.id)).rejects.toBeInstanceOf(PermissaoNegadaError);
    await expect(protegerRepositories(repos, "operador", "usuario-operador", empresa).entregas.preparar(empresa, { pedidoId: pedido.id, modalidade: "retirada", operacaoId: "negado" }, "forjado")).rejects.toBeInstanceOf(PermissaoNegadaError);
  });
});
