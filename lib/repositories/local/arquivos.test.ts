import { beforeEach, describe, expect, it } from "vitest";
import { criarRepositoriesLocal } from "./index";
import { limparNamespace } from "@/lib/storage/local-storage-client";

const EMPRESA_ID = "empresa-arquivos-teste";

async function prepararTrabalhoComRequisito(repos: ReturnType<typeof criarRepositoriesLocal>, exigeArquivoNaSegundaEtapa: boolean) {
  const servico = await repos.servicos.criar({
    empresaId: EMPRESA_ID,
    categoriaId: null,
    nome: "Cartao de visita",
    descricao: null,
    precoBase: 90,
    ativo: true,
    requisitoArquivo: { formatoEsperado: "pdf", paginasEsperadas: 2, larguraEsperadaMm: 90, alturaEsperadaMm: 50 },
  });
  const workflow = await repos.workflows.criar({ empresaId: EMPRESA_ID, nome: "Workflow arquivos", categoriaServicoId: null, ativo: true });
  const etapa1 = await repos.etapasWorkflow.criar({ empresaId: EMPRESA_ID, workflowId: workflow.id, ordem: 1, nome: "Recebimento", tipo: "humana", exigeArquivoLiberado: false });
  const etapa2 = await repos.etapasWorkflow.criar({
    empresaId: EMPRESA_ID,
    workflowId: workflow.id,
    ordem: 2,
    nome: "Impressao",
    tipo: "automatica",
    exigeArquivoLiberado: exigeArquivoNaSegundaEtapa,
  });
  const trabalho = await repos.trabalhos.criar({
    empresaId: EMPRESA_ID,
    pedidoId: "pedido-1",
    clienteId: null,
    descricao: "Cartao",
    quantidade: 100,
    servicoId: servico.id,
    materialId: null,
    acabamentos: null,
    prazo: null,
    prioridade: "normal",
    responsavelUsuarioId: "usuario-operador",
    observacoes: null,
    origem: "balcao",
    workflowId: workflow.id,
    formato: null,
    tipoEquipamentoNecessario: null,
  });
  return { trabalho, etapa1, etapa2 };
}

const METADADOS_OK = { nome: "cartao_v1.pdf", extensao: "pdf", mimeType: "application/pdf", tamanhoBytes: 500_000, paginas: 2, larguraMm: 90, alturaMm: 50 };
const METADADOS_DIVERGENTE = { nome: "cartao_v1.jpg", extensao: "jpg", mimeType: "image/jpeg", tamanhoBytes: 500_000, paginas: 1, larguraMm: 500, alturaMm: 500 };

describe("ArquivoRepository (SPEC 07)", () => {
  beforeEach(() => {
    limparNamespace();
  });

  it("cenario A: recebe arquivo correto, roda preflight OK, aprova tecnicamente e libera para producao (arquivo tipo cliente)", async () => {
    const repos = criarRepositoriesLocal();
    const { trabalho } = await prepararTrabalhoComRequisito(repos, true);

    const arquivo = await repos.arquivos.receber(
      { empresaId: EMPRESA_ID, solicitacaoId: null, pedidoId: "pedido-1", trabalhoId: trabalho.id, tipo: "cliente", origem: "email", enviadoPorUsuarioId: null, ...METADADOS_OK },
      null,
    );
    expect(arquivo.analise?.status).toBe("ok");
    expect(arquivo.versao).toBe(1);
    expect(arquivo.statusAprovacaoTecnica).toBe("pendente");

    const aprovado = await repos.arquivos.aprovarTecnicamente(arquivo.id, "usuario-gerente", "Tudo certo");
    expect(aprovado.statusAprovacaoTecnica).toBe("aprovado");

    const trabalhoLiberado = await repos.trabalhos.liberarArquivoParaProducao(trabalho.id, arquivo.id, "usuario-gerente");
    expect(trabalhoLiberado.arquivoLiberadoId).toBe(arquivo.id);

    // Trabalho pode continuar: avancar para a etapa que exige arquivo liberado.
    const avancado = await repos.trabalhos.mover(trabalho.id, "usuario-gerente", trabalho.workflow.etapas[1].id);
    expect(avancado.etapaAtualId).toBe(trabalho.workflow.etapas[1].id);
  });

  it("cenario B: arquivo incompativel bloqueia producao; nova versao preserva a anterior no historico", async () => {
    const repos = criarRepositoriesLocal();
    const { trabalho } = await prepararTrabalhoComRequisito(repos, true);

    const v1 = await repos.arquivos.receber(
      { empresaId: EMPRESA_ID, solicitacaoId: null, pedidoId: "pedido-1", trabalhoId: trabalho.id, tipo: "cliente", origem: "email", enviadoPorUsuarioId: null, ...METADADOS_DIVERGENTE },
      null,
    );
    expect(v1.analise?.status).toBe("bloqueio");
    await expect(repos.arquivos.aprovarTecnicamente(v1.id, "usuario-gerente", null)).rejects.toThrow(/bloqueio/i);

    // Producao dependente bloqueada: nao ha arquivo liberado.
    await expect(repos.trabalhos.mover(trabalho.id, "usuario-gerente", trabalho.workflow.etapas[1].id)).rejects.toThrow(/liberado/i);

    const v2 = await repos.arquivos.criarNovaVersao(v1.grupoArquivoId, METADADOS_OK, "usuario-atendente");
    expect(v2.versao).toBe(2);
    expect(v2.versaoAnteriorId).toBe(v1.id);
    expect(v2.analise?.status).toBe("ok");

    const versoes = await repos.arquivos.listarVersoes(v1.grupoArquivoId);
    expect(versoes).toHaveLength(2);
    expect(versoes[0].situacao).toBe("substituido"); // v1 preservada, nunca apagada
    expect(versoes[1].id).toBe(v2.id);

    await repos.arquivos.aprovarTecnicamente(v2.id, "usuario-gerente", null);
    await repos.trabalhos.liberarArquivoParaProducao(trabalho.id, v2.id, "usuario-gerente");
    await expect(repos.trabalhos.mover(trabalho.id, "usuario-gerente", trabalho.workflow.etapas[1].id)).resolves.toMatchObject({
      etapaAtualId: trabalho.workflow.etapas[1].id,
    });
  });

  it("cenario C: fluxo de criacao de arte — V1 em criacao, envia p/ aprovacao, alteracao solicitada, V2 aprovada, aprovacao tecnica, liberada", async () => {
    const repos = criarRepositoriesLocal();
    const { trabalho } = await prepararTrabalhoComRequisito(repos, false);

    const v1 = await repos.arquivos.receber(
      { empresaId: EMPRESA_ID, solicitacaoId: null, pedidoId: "pedido-1", trabalhoId: trabalho.id, tipo: "arte", origem: "upload_interno", enviadoPorUsuarioId: "usuario-atendente", ...METADADOS_OK },
      "usuario-atendente",
    );
    expect(v1.situacao).toBe("em_criacao");

    const enviado = await repos.arquivos.enviarParaAprovacaoCliente(v1.id, "usuario-atendente");
    expect(enviado.situacao).toBe("aguardando_aprovacao_cliente");
    expect(enviado.tokenAprovacaoPublica).toBeTruthy();

    const alteracaoSolicitada = await repos.arquivos.registrarDecisaoPublicaCliente(enviado.tokenAprovacaoPublica!, "alteracao_solicitada", "Trocar a cor de fundo");
    expect(alteracaoSolicitada.situacao).toBe("alteracao_solicitada");

    const v2 = await repos.arquivos.criarNovaVersao(v1.grupoArquivoId, METADADOS_OK, "usuario-atendente");
    const v2Enviada = await repos.arquivos.enviarParaAprovacaoCliente(v2.id, "usuario-atendente");
    const v2Aprovada = await repos.arquivos.registrarDecisaoPublicaCliente(v2Enviada.tokenAprovacaoPublica!, "aprovado", "Ficou ótimo");
    expect(v2Aprovada.situacao).toBe("aprovado_cliente");
    expect(v2Aprovada.aprovacaoCliente?.aprovado).toBe(true);

    // Aprovacao tecnica e aprovacao do cliente sao decisoes DIFERENTES — a
    // liberacao de um arquivo tipo "arte" exige as duas.
    await expect(repos.trabalhos.liberarArquivoParaProducao(trabalho.id, v2.id, "usuario-gerente")).rejects.toThrow(/aprovacao tecnica/i);
    await repos.arquivos.aprovarTecnicamente(v2.id, "usuario-gerente", null);
    const liberado = await repos.trabalhos.liberarArquivoParaProducao(trabalho.id, v2.id, "usuario-gerente");
    expect(liberado.arquivoLiberadoId).toBe(v2.id);
  });

  it("cenario D: versao antiga nunca e selecionada implicitamente apos V2 ser liberada", async () => {
    const repos = criarRepositoriesLocal();
    const { trabalho } = await prepararTrabalhoComRequisito(repos, false);

    const v1 = await repos.arquivos.receber(
      { empresaId: EMPRESA_ID, solicitacaoId: null, pedidoId: "pedido-1", trabalhoId: trabalho.id, tipo: "cliente", origem: "email", enviadoPorUsuarioId: null, ...METADADOS_OK },
      null,
    );
    await repos.arquivos.aprovarTecnicamente(v1.id, "usuario-gerente", null);
    await repos.trabalhos.liberarArquivoParaProducao(trabalho.id, v1.id, "usuario-gerente");

    const v2 = await repos.arquivos.criarNovaVersao(v1.grupoArquivoId, METADADOS_OK, "usuario-atendente");
    await repos.arquivos.aprovarTecnicamente(v2.id, "usuario-gerente", null);
    const comV2 = await repos.trabalhos.liberarArquivoParaProducao(trabalho.id, v2.id, "usuario-gerente");
    expect(comV2.arquivoLiberadoId).toBe(v2.id);
    expect(comV2.arquivoLiberadoId).not.toBe(v1.id);

    // Nao existe metodo algum que resolva "o ultimo arquivo enviado"
    // implicitamente — so a referencia explicita arquivoLiberadoId.
    const trabalhoAtual = await repos.trabalhos.obter(trabalho.id);
    expect(trabalhoAtual?.arquivoLiberadoId).toBe(v2.id);
  });

  it("cenario E: etapa que exige arquivo liberado bloqueia avanco com motivo, mesmo com arquivo aprovado mas nao liberado", async () => {
    const repos = criarRepositoriesLocal();
    const { trabalho } = await prepararTrabalhoComRequisito(repos, true);

    const arquivo = await repos.arquivos.receber(
      { empresaId: EMPRESA_ID, solicitacaoId: null, pedidoId: "pedido-1", trabalhoId: trabalho.id, tipo: "cliente", origem: "email", enviadoPorUsuarioId: null, ...METADADOS_OK },
      null,
    );
    await repos.arquivos.aprovarTecnicamente(arquivo.id, "usuario-gerente", null);
    // Aprovado tecnicamente, mas AINDA NAO liberado — a etapa deve continuar bloqueada.
    await expect(repos.trabalhos.mover(trabalho.id, "usuario-gerente", trabalho.workflow.etapas[1].id)).rejects.toThrow(/liberado/i);
  });
});
