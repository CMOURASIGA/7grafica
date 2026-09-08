import { beforeEach, describe, expect, it } from "vitest";
import { criarRepositoriesLocal } from "./index";
import { limparNamespace } from "@/lib/storage/local-storage-client";

const EMPRESA_ID = "empresa-alocacoes-teste";

async function prepararCenario(repos: ReturnType<typeof criarRepositoriesLocal>) {
  const material = await repos.materiais.criar({ empresaId: EMPRESA_ID, nome: "Papel Couche 300g", unidadeCompraId: "un-1", unidadeConsumoId: "un-2", ativo: true });
  const equipamentoCompativel = await repos.equipamentos.criar({
    empresaId: EMPRESA_ID,
    nome: "Impressora A",
    tipo: "impressora",
    ativo: true,
    situacao: "disponivel",
    capacidadeSimultanea: 1,
  });
  await repos.capacidadesEquipamento.criar({
    empresaId: EMPRESA_ID,
    equipamentoId: equipamentoCompativel.id,
    formatos: "A4, A3",
    corPB: "ambos",
    duplex: true,
    materiaisCompativeisIds: [material.id],
    observacoes: null,
  });

  const equipamentoFormatoIncompativel = await repos.equipamentos.criar({
    empresaId: EMPRESA_ID,
    nome: "Plotter B",
    tipo: "impressora",
    ativo: true,
    situacao: "disponivel",
    capacidadeSimultanea: 1,
  });
  await repos.capacidadesEquipamento.criar({
    empresaId: EMPRESA_ID,
    equipamentoId: equipamentoFormatoIncompativel.id,
    formatos: "Ate 3.2m de largura",
    corPB: "cor",
    duplex: false,
    materiaisCompativeisIds: [],
    observacoes: null,
  });

  const equipamentoMaterialIncompativel = await repos.equipamentos.criar({
    empresaId: EMPRESA_ID,
    nome: "Impressora C",
    tipo: "impressora",
    ativo: true,
    situacao: "disponivel",
    capacidadeSimultanea: 1,
  });
  await repos.capacidadesEquipamento.criar({
    empresaId: EMPRESA_ID,
    equipamentoId: equipamentoMaterialIncompativel.id,
    formatos: "A3, A2",
    corPB: "ambos",
    duplex: false,
    materiaisCompativeisIds: ["material-que-nao-existe"],
    observacoes: null,
  });

  const workflow = await repos.workflows.criar({ empresaId: EMPRESA_ID, nome: "Workflow impressao", categoriaServicoId: null, ativo: true });
  const etapaHumana = await repos.etapasWorkflow.criar({ empresaId: EMPRESA_ID, workflowId: workflow.id, ordem: 1, nome: "Recebimento", tipo: "humana", exigeArquivoLiberado: false });
  const etapaEquipamento = await repos.etapasWorkflow.criar({ empresaId: EMPRESA_ID, workflowId: workflow.id, ordem: 2, nome: "Impressao", tipo: "automatica", exigeArquivoLiberado: false });
  void etapaHumana;

  const trabalho = await repos.trabalhos.criar({
    empresaId: EMPRESA_ID,
    pedidoId: "pedido-1",
    clienteId: null,
    descricao: "Cartao de visita",
    quantidade: 100,
    servicoId: null,
    materialId: material.id,
    acabamentos: null,
    prazo: null,
    prioridade: "normal",
    responsavelUsuarioId: "usuario-operador",
    observacoes: null,
    origem: "balcao",
    workflowId: workflow.id,
    formato: "A3",
    tipoEquipamentoNecessario: "impressora",
  });

  return { trabalho, etapaEquipamento, equipamentoCompativel, equipamentoFormatoIncompativel, equipamentoMaterialIncompativel, material };
}

describe("AlocacaoEquipamentoRepository (SPEC 06)", () => {
  beforeEach(() => {
    limparNamespace();
  });

  it("avaliarCompatibilidade explica motivo de formato e de material para equipamentos incompativeis", async () => {
    const repos = criarRepositoriesLocal();
    const { trabalho, equipamentoCompativel, equipamentoFormatoIncompativel, equipamentoMaterialIncompativel } = await prepararCenario(repos);

    const avaliacoes = await repos.alocacoesEquipamento.avaliarCompatibilidade(trabalho.id);
    const porId = Object.fromEntries(avaliacoes.map((a) => [a.equipamentoId, a]));

    expect(porId[equipamentoCompativel.id].compativel).toBe(true);
    expect(porId[equipamentoFormatoIncompativel.id].compativel).toBe(false);
    expect(porId[equipamentoFormatoIncompativel.id].motivos.map((m) => m.tipo)).toContain("formato");
    expect(porId[equipamentoMaterialIncompativel.id].compativel).toBe(false);
    expect(porId[equipamentoMaterialIncompativel.id].motivos.map((m) => m.tipo)).toContain("material");
  });

  it("cenario A: aloca equipamento compativel, inicia e conclui", async () => {
    const repos = criarRepositoriesLocal();
    const { trabalho, etapaEquipamento, equipamentoCompativel } = await prepararCenario(repos);

    const alocacao = await repos.alocacoesEquipamento.criar(
      { empresaId: EMPRESA_ID, trabalhoId: trabalho.id, etapaId: etapaEquipamento.id, equipamentoId: equipamentoCompativel.id, operadorUsuarioId: "usuario-operador", inicioPrevisto: null },
      "usuario-gerente",
    );
    expect(alocacao.situacao).toBe("aguardando");

    await repos.alocacoesEquipamento.iniciarPreparacao(alocacao.id, "usuario-operador");
    const iniciada = await repos.alocacoesEquipamento.iniciar(alocacao.id, "usuario-operador");
    expect(iniciada.situacao).toBe("em_execucao");
    expect(iniciada.inicioReal).toBeTruthy();

    const equipamentoEmUso = await repos.equipamentos.obter(equipamentoCompativel.id);
    expect(equipamentoEmUso?.situacao).toBe("em_uso");

    const concluida = await repos.alocacoesEquipamento.concluir(alocacao.id, "usuario-operador");
    expect(concluida.situacao).toBe("concluida");
    expect(concluida.terminoReal).toBeTruthy();

    const equipamentoLiberado = await repos.equipamentos.obter(equipamentoCompativel.id);
    expect(equipamentoLiberado?.situacao).toBe("disponivel");
  });

  it("cenario B: bloqueia alocacao em equipamento incompativel por formato ou material, explicando o motivo", async () => {
    const repos = criarRepositoriesLocal();
    const { trabalho, etapaEquipamento, equipamentoFormatoIncompativel, equipamentoMaterialIncompativel } = await prepararCenario(repos);

    await expect(
      repos.alocacoesEquipamento.criar(
        { empresaId: EMPRESA_ID, trabalhoId: trabalho.id, etapaId: etapaEquipamento.id, equipamentoId: equipamentoFormatoIncompativel.id, operadorUsuarioId: null, inicioPrevisto: null },
        "usuario-gerente",
      ),
    ).rejects.toThrow(/incompatível/i);

    await expect(
      repos.alocacoesEquipamento.criar(
        { empresaId: EMPRESA_ID, trabalhoId: trabalho.id, etapaId: etapaEquipamento.id, equipamentoId: equipamentoMaterialIncompativel.id, operadorUsuarioId: null, inicioPrevisto: null },
        "usuario-gerente",
      ),
    ).rejects.toThrow(/incompatível/i);
  });

  it("cenario C: equipamento indisponivel/manutencao bloqueia nova alocacao", async () => {
    const repos = criarRepositoriesLocal();
    const { trabalho, etapaEquipamento, equipamentoCompativel } = await prepararCenario(repos);
    await repos.equipamentos.atualizarSituacao(equipamentoCompativel.id, "usuario-admin", "manutencao");

    await expect(
      repos.alocacoesEquipamento.criar(
        { empresaId: EMPRESA_ID, trabalhoId: trabalho.id, etapaId: etapaEquipamento.id, equipamentoId: equipamentoCompativel.id, operadorUsuarioId: null, inicioPrevisto: null },
        "usuario-gerente",
      ),
    ).rejects.toThrow(/manutencao|indisponível/i);
  });

  it("cenario D: equipamento fica indisponivel com alocacao ativa — sinaliza para decisao humana, depois realoca preservando historico", async () => {
    const repos = criarRepositoriesLocal();
    const { trabalho, etapaEquipamento, equipamentoCompativel, material } = await prepararCenario(repos);

    const equipamentoDestino = await repos.equipamentos.criar({
      empresaId: EMPRESA_ID,
      nome: "Impressora D (backup)",
      tipo: "impressora",
      ativo: true,
      situacao: "disponivel",
      capacidadeSimultanea: 1,
    });
    await repos.capacidadesEquipamento.criar({
      empresaId: EMPRESA_ID,
      equipamentoId: equipamentoDestino.id,
      formatos: "A3, A4",
      corPB: "ambos",
      duplex: false,
      materiaisCompativeisIds: [material.id],
      observacoes: null,
    });

    const alocacao = await repos.alocacoesEquipamento.criar(
      { empresaId: EMPRESA_ID, trabalhoId: trabalho.id, etapaId: etapaEquipamento.id, equipamentoId: equipamentoCompativel.id, operadorUsuarioId: null, inicioPrevisto: null },
      "usuario-gerente",
    );
    await repos.alocacoesEquipamento.iniciar(alocacao.id, "usuario-gerente");

    // Equipamento quebra em plena producao.
    await repos.equipamentos.atualizarSituacao(equipamentoCompativel.id, "usuario-admin", "manutencao");
    const alocacaoSinalizada = await repos.alocacoesEquipamento.obter(alocacao.id);
    expect(alocacaoSinalizada?.precisaDecisaoHumana).toBe(true);
    // Nunca apagada nem movida silenciosamente: continua rastreavel, mesma situacao.
    expect(alocacaoSinalizada?.situacao).toBe("em_execucao");
    expect(alocacaoSinalizada?.equipamentoId).toBe(equipamentoCompativel.id);

    const realocada = await repos.alocacoesEquipamento.realocar(alocacao.id, "usuario-gerente", equipamentoDestino.id, "Equipamento quebrou em producao");
    expect(realocada.equipamentoId).toBe(equipamentoDestino.id);
    expect(realocada.alocacaoAnteriorId).toBe(alocacao.id);
    expect(realocada.situacao).toBe("aguardando");

    const anteriorEncerrada = await repos.alocacoesEquipamento.obter(alocacao.id);
    expect(anteriorEncerrada?.situacao).toBe("cancelada");
    expect(anteriorEncerrada?.motivoRealocacao).toBe("Equipamento quebrou em producao");
  });

  it("cenario E: capacidade simultanea = 1 bloqueia segunda alocacao ativa no mesmo equipamento", async () => {
    const repos = criarRepositoriesLocal();
    const { trabalho, etapaEquipamento, equipamentoCompativel } = await prepararCenario(repos);

    const trabalho2 = await repos.trabalhos.criar({
      empresaId: EMPRESA_ID,
      pedidoId: "pedido-2",
      clienteId: null,
      descricao: "Segundo trabalho",
      quantidade: 10,
      servicoId: null,
      materialId: null,
      acabamentos: null,
      prazo: null,
      prioridade: "normal",
      responsavelUsuarioId: null,
      observacoes: null,
      origem: "balcao",
      workflowId: trabalho.workflow.workflowId,
      formato: "A3",
      tipoEquipamentoNecessario: "impressora",
    });

    await repos.alocacoesEquipamento.criar(
      { empresaId: EMPRESA_ID, trabalhoId: trabalho.id, etapaId: etapaEquipamento.id, equipamentoId: equipamentoCompativel.id, operadorUsuarioId: null, inicioPrevisto: null },
      "usuario-gerente",
    );

    await expect(
      repos.alocacoesEquipamento.criar(
        { empresaId: EMPRESA_ID, trabalhoId: trabalho2.id, etapaId: etapaEquipamento.id, equipamentoId: equipamentoCompativel.id, operadorUsuarioId: null, inicioPrevisto: null },
        "usuario-gerente",
      ),
    ).rejects.toThrow(/capacidade simultânea/i);
  });

  it("HYBRID: preserva equipamento e operador na alocacao", async () => {
    const repos = criarRepositoriesLocal();
    const { trabalho, etapaEquipamento, equipamentoCompativel } = await prepararCenario(repos);

    const alocacao = await repos.alocacoesEquipamento.criar(
      { empresaId: EMPRESA_ID, trabalhoId: trabalho.id, etapaId: etapaEquipamento.id, equipamentoId: equipamentoCompativel.id, operadorUsuarioId: "usuario-operador", inicioPrevisto: null },
      "usuario-gerente",
    );
    expect(alocacao.equipamentoId).toBe(equipamentoCompativel.id);
    expect(alocacao.operadorUsuarioId).toBe("usuario-operador");
  });

  it("pausar exige motivo e registra; retomar volta a em_execucao", async () => {
    const repos = criarRepositoriesLocal();
    const { trabalho, etapaEquipamento, equipamentoCompativel } = await prepararCenario(repos);
    const alocacao = await repos.alocacoesEquipamento.criar(
      { empresaId: EMPRESA_ID, trabalhoId: trabalho.id, etapaId: etapaEquipamento.id, equipamentoId: equipamentoCompativel.id, operadorUsuarioId: null, inicioPrevisto: null },
      "usuario-gerente",
    );
    await repos.alocacoesEquipamento.iniciar(alocacao.id, "usuario-gerente");

    await expect(repos.alocacoesEquipamento.pausar(alocacao.id, "usuario-gerente", "")).rejects.toThrow(/motivo/i);
    const pausada = await repos.alocacoesEquipamento.pausar(alocacao.id, "usuario-gerente", "Falta de insumo");
    expect(pausada.situacao).toBe("pausada");
    expect(pausada.motivoPausa).toBe("Falta de insumo");

    const retomada = await repos.alocacoesEquipamento.retomar(alocacao.id, "usuario-gerente");
    expect(retomada.situacao).toBe("em_execucao");
  });
});
