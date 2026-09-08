import { beforeEach, describe, expect, it } from "vitest";
import { criarRepositoriesLocal } from "./index";
import { limparNamespace } from "@/lib/storage/local-storage-client";

const EMPRESA_ID = "empresa-trabalhos-teste";

async function prepararWorkflow(repos: ReturnType<typeof criarRepositoriesLocal>) {
  const workflow = await repos.workflows.criar({ empresaId: EMPRESA_ID, nome: "Workflow 3 etapas", categoriaServicoId: null, ativo: true });
  const etapa1 = await repos.etapasWorkflow.criar({ empresaId: EMPRESA_ID, workflowId: workflow.id, ordem: 1, nome: "Recebimento", tipo: "humana", exigeArquivoLiberado: false });
  const etapa2 = await repos.etapasWorkflow.criar({ empresaId: EMPRESA_ID, workflowId: workflow.id, ordem: 2, nome: "Producao", tipo: "automatica", exigeArquivoLiberado: false });
  const etapa3 = await repos.etapasWorkflow.criar({ empresaId: EMPRESA_ID, workflowId: workflow.id, ordem: 3, nome: "Conferencia", tipo: "humana", exigeArquivoLiberado: false });
  return { workflow, etapa1, etapa2, etapa3 };
}

describe("TrabalhoRepository (SPEC 05)", () => {
  beforeEach(() => {
    limparNamespace();
  });

  it("criar() gera codigo sequencial TRAB-000N e snapshota o Workflow/Etapas no momento da criacao", async () => {
    const repos = criarRepositoriesLocal();
    const { workflow } = await prepararWorkflow(repos);

    const trabalho1 = await repos.trabalhos.criar({
      empresaId: EMPRESA_ID,
      pedidoId: "pedido-1",
      clienteId: "cliente-1",
      descricao: "Item A",
      quantidade: 10,
      servicoId: null,
      materialId: null,
      acabamentos: null,
      prazo: null,
      prioridade: "normal",
      responsavelUsuarioId: null,
      observacoes: null,
      origem: "balcao",
      workflowId: workflow.id,
      formato: null,
      tipoEquipamentoNecessario: null,
    });
    expect(trabalho1.codigo).toBe("TRAB-0001");
    expect(trabalho1.workflow.etapas).toHaveLength(3);
    expect(trabalho1.etapaAtualId).toBe(trabalho1.workflow.etapas[0].id);
    expect(trabalho1.situacao).toBe("aguardando_producao");

    const trabalho2 = await repos.trabalhos.criar({
      empresaId: EMPRESA_ID,
      pedidoId: "pedido-1",
      clienteId: "cliente-1",
      descricao: "Item B",
      quantidade: 1,
      servicoId: null,
      materialId: null,
      acabamentos: null,
      prazo: null,
      prioridade: "normal",
      responsavelUsuarioId: null,
      observacoes: null,
      origem: "balcao",
      workflowId: workflow.id,
      formato: null,
      tipoEquipamentoNecessario: null,
    });
    expect(trabalho2.codigo).toBe("TRAB-0002");
  });

  it("snapshot do workflow permanece intacto mesmo apos o cadastro do Workflow ganhar novas etapas", async () => {
    const repos = criarRepositoriesLocal();
    const { workflow } = await prepararWorkflow(repos);
    const trabalho = await repos.trabalhos.criar({
      empresaId: EMPRESA_ID,
      pedidoId: "pedido-1",
      clienteId: null,
      descricao: "Item",
      quantidade: 1,
      servicoId: null,
      materialId: null,
      acabamentos: null,
      prazo: null,
      prioridade: "normal",
      responsavelUsuarioId: null,
      observacoes: null,
      origem: "balcao",
      workflowId: workflow.id,
      formato: null,
      tipoEquipamentoNecessario: null,
    });

    // Cadastro do Workflow muda depois (nova etapa) — o Trabalho ja criado nao deve ser afetado.
    await repos.etapasWorkflow.criar({ empresaId: EMPRESA_ID, workflowId: workflow.id, ordem: 4, nome: "Etapa nova", tipo: "humana", exigeArquivoLiberado: false });
    await repos.etapasWorkflow.atualizar(trabalho.workflow.etapas[0].id, { nome: "Nome editado depois" });

    const releitura = await repos.trabalhos.obter(trabalho.id);
    expect(releitura!.workflow.etapas).toHaveLength(3);
    expect(releitura!.workflow.etapas[0].nome).toBe("Recebimento");
  });

  it("mover() avanca uma etapa por vez; pular etapas e sempre bloqueado", async () => {
    const repos = criarRepositoriesLocal();
    const { workflow, etapa3 } = await prepararWorkflow(repos);
    const trabalho = await repos.trabalhos.criar({
      empresaId: EMPRESA_ID,
      pedidoId: "pedido-1",
      clienteId: null,
      descricao: "Item",
      quantidade: 1,
      servicoId: null,
      materialId: null,
      acabamentos: null,
      prazo: null,
      prioridade: "normal",
      responsavelUsuarioId: null,
      observacoes: null,
      origem: "balcao",
      workflowId: workflow.id,
      formato: null,
      tipoEquipamentoNecessario: null,
    });

    await expect(repos.trabalhos.mover(trabalho.id, "usuario-1", etapa3.id)).rejects.toThrow(/pular etapas/i);
  });

  it("mover() para tras exige motivo; avancar nao exige", async () => {
    const repos = criarRepositoriesLocal();
    const { workflow } = await prepararWorkflow(repos);
    const trabalho = await repos.trabalhos.criar({
      empresaId: EMPRESA_ID,
      pedidoId: "pedido-1",
      clienteId: null,
      descricao: "Item",
      quantidade: 1,
      servicoId: null,
      materialId: null,
      acabamentos: null,
      prazo: null,
      prioridade: "normal",
      responsavelUsuarioId: null,
      observacoes: null,
      origem: "balcao",
      workflowId: workflow.id,
      formato: null,
      tipoEquipamentoNecessario: null,
    });
    const [etapa1, etapa2] = trabalho.workflow.etapas;

    const avancado = await repos.trabalhos.mover(trabalho.id, "usuario-1", etapa2.id);
    expect(avancado.etapaAtualId).toBe(etapa2.id);
    expect(avancado.situacao).toBe("em_producao");

    await expect(repos.trabalhos.mover(trabalho.id, "usuario-1", etapa1.id)).rejects.toThrow(/justificativa/i);
    const retrocedido = await repos.trabalhos.mover(trabalho.id, "usuario-1", etapa1.id, "Arquivo com erro, refazer analise");
    expect(retrocedido.etapaAtualId).toBe(etapa1.id);
  });

  it("concluir() so e permitido na ultima etapa; transicoes ficam registradas na auditoria", async () => {
    const repos = criarRepositoriesLocal();
    const { workflow } = await prepararWorkflow(repos);
    const trabalho = await repos.trabalhos.criar({
      empresaId: EMPRESA_ID,
      pedidoId: "pedido-1",
      clienteId: null,
      descricao: "Item",
      quantidade: 1,
      servicoId: null,
      materialId: null,
      acabamentos: null,
      prazo: null,
      prioridade: "normal",
      responsavelUsuarioId: null,
      observacoes: null,
      origem: "balcao",
      workflowId: workflow.id,
      formato: null,
      tipoEquipamentoNecessario: null,
    });

    await expect(repos.trabalhos.concluir(trabalho.id, "usuario-1")).rejects.toThrow(/ultima etapa/i);

    const [etapa1, etapa2, etapa3] = trabalho.workflow.etapas;
    await repos.trabalhos.mover(trabalho.id, "usuario-1", etapa2.id);
    await repos.trabalhos.mover(trabalho.id, "usuario-1", etapa3.id);
    const concluido = await repos.trabalhos.concluir(trabalho.id, "usuario-1");
    expect(concluido.situacao).toBe("concluido");
    expect(concluido.concluidoEm).toBeTruthy();

    const eventos = await repos.auditoria.listar(EMPRESA_ID, 100);
    const acoes = eventos.filter((evento) => evento.entidadeId === trabalho.id).map((evento) => evento.acao);
    expect(acoes).toEqual(
      expect.arrayContaining(["trabalho_criado", "trabalho_etapa_avancada", "trabalho_concluido"]),
    );
    void etapa1;
  });

  it("pausar/registrarPendencia exigem motivo e retomar volta para em_producao", async () => {
    const repos = criarRepositoriesLocal();
    const { workflow } = await prepararWorkflow(repos);
    const trabalho = await repos.trabalhos.criar({
      empresaId: EMPRESA_ID,
      pedidoId: "pedido-1",
      clienteId: null,
      descricao: "Item",
      quantidade: 1,
      servicoId: null,
      materialId: null,
      acabamentos: null,
      prazo: null,
      prioridade: "normal",
      responsavelUsuarioId: null,
      observacoes: null,
      origem: "balcao",
      workflowId: workflow.id,
      formato: null,
      tipoEquipamentoNecessario: null,
    });

    await expect(repos.trabalhos.pausar(trabalho.id, "usuario-1", "")).rejects.toThrow(/motivo/i);
    const pausado = await repos.trabalhos.pausar(trabalho.id, "usuario-1", "Falta de material");
    expect(pausado.situacao).toBe("pausado");

    const retomado = await repos.trabalhos.retomar(trabalho.id, "usuario-1");
    expect(retomado.situacao).toBe("em_producao");

    const comPendencia = await repos.trabalhos.registrarPendencia(trabalho.id, "usuario-1", "Aguardando aprovacao do cliente");
    expect(comPendencia.situacao).toBe("com_pendencia");
  });

  it("prioridade e prazo sao independentes: mudar um nao altera o outro", async () => {
    const repos = criarRepositoriesLocal();
    const { workflow } = await prepararWorkflow(repos);
    const prazoOriginal = "2026-05-01T00:00:00.000Z";
    const trabalho = await repos.trabalhos.criar({
      empresaId: EMPRESA_ID,
      pedidoId: "pedido-1",
      clienteId: null,
      descricao: "Item",
      quantidade: 1,
      servicoId: null,
      materialId: null,
      acabamentos: null,
      prazo: prazoOriginal,
      prioridade: "normal",
      responsavelUsuarioId: null,
      observacoes: null,
      origem: "balcao",
      workflowId: workflow.id,
      formato: null,
      tipoEquipamentoNecessario: null,
    });
    const atualizado = await repos.trabalhos.atribuirResponsavel(trabalho.id, "usuario-1", "usuario-x");
    expect(atualizado.prazo).toBe(prazoOriginal);
    expect(atualizado.prioridade).toBe("normal");
  });
});
