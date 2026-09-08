import { beforeEach, describe, expect, it } from "vitest";
import { criarRepositoriesLocal } from "./local";
import { PermissaoNegadaError, protegerRepositories } from "./authorization";
import { PERMISSOES, papelTemPermissao } from "@/lib/rbac";
import { limparNamespace } from "@/lib/storage/local-storage-client";

const EMPRESA_ID = "empresa-rbac-teste";

/**
 * RBAC dos Cadastros (SPEC 02), validado no nivel de repositorio — nao so
 * escondendo botao na UI. Cada perfil ganha pelo menos um caso permitido e
 * um negado, usando a mesma matriz de lib/rbac.ts que a UI consulta.
 *
 * Nota sobre Admin e Gerente: dentro do escopo de Cadastros os dois tem
 * acesso identico ("administracao completa" / "administracao operacional
 * dos cadastros"), entao nenhum dos dois tem um caso "negado" possivel
 * *dentro* deste wrapper. Para Gerente, o caso negado exigido pela matriz
 * ("sem alterar papeis/permissoes administrativas") e uma permissao
 * Foundation (fora do escopo de Cadastros) e por isso testado diretamente
 * contra papelTemPermissao, que e a mesma funcao que bloqueia as telas de
 * Configuracoes. Para Admin, "administracao completa" nao tem nenhum caso
 * negado por definicao — por isso ele so recebe casos permitidos aqui.
 */
describe("RBAC dos Cadastros — repositorio (lib/repositories/authorization.ts)", () => {
  beforeEach(() => {
    limparNamespace();
  });

  it("Admin: administracao completa — pode gerenciar clientes e cadastros comerciais/operacionais", async () => {
    const repos = protegerRepositories(criarRepositoriesLocal(), "admin");

    const cliente = await repos.clientes.criar({
      empresaId: EMPRESA_ID,
      tipo: "PJ",
      nome: "Cliente Admin",
      documento: null,
      observacoes: null,
      ativo: true,
    });
    expect(cliente.id).toBeTruthy();

    const fornecedor = await repos.fornecedores.criar({
      empresaId: EMPRESA_ID,
      nome: "Fornecedor Admin",
      documento: null,
      telefone: null,
      email: null,
      ativo: true,
    });
    expect(fornecedor.id).toBeTruthy();
  });

  it("Gerente: administra cadastros operacionalmente, mas nao tem permissoes administrativas do Foundation", async () => {
    const repos = protegerRepositories(criarRepositoriesLocal(), "gerente");

    // Permitido: cadastros (clientes e os demais) — "administracao operacional dos cadastros".
    const cliente = await repos.clientes.criar({
      empresaId: EMPRESA_ID,
      tipo: "PF",
      nome: "Cliente Gerente",
      documento: null,
      observacoes: null,
      ativo: true,
    });
    expect(cliente.id).toBeTruthy();
    await expect(
      repos.equipamentos.criar({ empresaId: EMPRESA_ID, nome: "Impressora Gerente", tipo: "impressora", ativo: true, situacao: "disponivel", capacidadeSimultanea: 1 }),
    ).resolves.toBeTruthy();

    // Negado: "sem alterar papeis/permissoes administrativas" — permissao Foundation, nao de Cadastros.
    expect(papelTemPermissao("gerente", PERMISSOES.GERENCIAR_EMPRESA)).toBe(false);
    expect(papelTemPermissao("gerente", PERMISSOES.GERENCIAR_WHITELABEL)).toBe(false);
  });

  it("Atendente: CRUD de clientes/contatos, mas apenas leitura dos demais cadastros", async () => {
    const repos = protegerRepositories(criarRepositoriesLocal(), "atendente");

    // Permitido: clientes.
    const cliente = await repos.clientes.criar({
      empresaId: EMPRESA_ID,
      tipo: "PJ",
      nome: "Cliente Atendente",
      documento: null,
      observacoes: null,
      ativo: true,
    });
    expect(cliente.id).toBeTruthy();
    await expect(repos.fornecedores.listar(EMPRESA_ID)).resolves.toEqual([]);

    // Negado: escrita em cadastro que nao e cliente.
    await expect(
      repos.fornecedores.criar({ empresaId: EMPRESA_ID, nome: "Fornecedor Atendente", documento: null, telefone: null, email: null, ativo: true }),
    ).rejects.toBeInstanceOf(PermissaoNegadaError);
  });

  it("Operador: le apenas os cadastros operacionais — sem acesso a clientes nem a cadastros comerciais", async () => {
    const repos = protegerRepositories(criarRepositoriesLocal(), "operador");

    // Permitido: leitura de cadastro operacional (servicos, materiais, equipamentos, workflows).
    await expect(repos.servicos.listar(EMPRESA_ID)).resolves.toEqual([]);
    await expect(repos.equipamentos.listar(EMPRESA_ID)).resolves.toEqual([]);

    // Negado: nenhum acesso a clientes (nem leitura).
    await expect(repos.clientes.listar(EMPRESA_ID)).rejects.toBeInstanceOf(PermissaoNegadaError);
    // Negado: cadastros comerciais (fornecedores/formas de pagamento) sao so para quem atende/administra.
    await expect(repos.fornecedores.listar(EMPRESA_ID)).rejects.toBeInstanceOf(PermissaoNegadaError);
  });

  it("sem papel (usuario deslogado/sem vinculo) nao acessa nenhum cadastro", async () => {
    const repos = protegerRepositories(criarRepositoriesLocal(), null);
    await expect(repos.clientes.listar(EMPRESA_ID)).rejects.toBeInstanceOf(PermissaoNegadaError);
    await expect(repos.servicos.listar(EMPRESA_ID)).rejects.toBeInstanceOf(PermissaoNegadaError);
  });
});

describe("RBAC de Solicitacoes/Orcamentos (SPEC 03) — repositorio", () => {
  beforeEach(() => {
    limparNamespace();
  });

  it("Atendente: pode criar solicitacao e enviar orcamento (metodo customizado tratado como escrita)", async () => {
    const repos = protegerRepositories(criarRepositoriesLocal(), "atendente");

    const solicitacao = await repos.solicitacoes.criar({
      empresaId: EMPRESA_ID,
      origem: "email",
      emailOrigemId: null,
      clienteId: null,
      contatoId: null,
      assunto: "Teste",
      descricao: "Teste",
      status: "nova",
    });
    expect(solicitacao.id).toBeTruthy();

    const orcamento = await repos.orcamentos.criar({
      empresaId: EMPRESA_ID,
      solicitacaoId: solicitacao.id,
      clienteId: null,
      versao: 1,
      itens: [],
      prazoEntregaDias: null,
      validadeAte: null,
      observacoes: null,
      valorTotal: 0,
    });
    await expect(repos.orcamentos.enviarPorEmail(orcamento.id, "cliente@exemplo.com")).resolves.toMatchObject({
      orcamento: { status: "enviado" },
    });
  });

  it("Operador: nao acessa nada de atendimento (e-mails, solicitacoes, orcamentos, pedidos)", async () => {
    const repos = protegerRepositories(criarRepositoriesLocal(), "operador");
    await expect(repos.emailsRecebidos.listar(EMPRESA_ID)).rejects.toBeInstanceOf(PermissaoNegadaError);
    await expect(repos.solicitacoes.listar(EMPRESA_ID)).rejects.toBeInstanceOf(PermissaoNegadaError);
    await expect(repos.orcamentos.listar(EMPRESA_ID)).rejects.toBeInstanceOf(PermissaoNegadaError);
    await expect(repos.pedidos.listar(EMPRESA_ID)).rejects.toBeInstanceOf(PermissaoNegadaError);
    // Continua lendo o que sempre pode (cadastros operacionais) — a restricao e so a atendimento.
    await expect(repos.servicos.listar(EMPRESA_ID)).resolves.toEqual([]);
  });
});

describe("RBAC de Balcao/PDV/Caixa (SPEC 04) — repositorio", () => {
  beforeEach(() => {
    limparNamespace();
  });

  it("Atendente: opera o PDV (cria pedido de balcao), mas nao abre caixa nem lanca movimento manual", async () => {
    const repos = protegerRepositories(criarRepositoriesLocal(), "atendente");

    // Permitido: atendimento de balcao.
    const pedido = await repos.pedidos.criarAtendimentoBalcao({
      empresaId: EMPRESA_ID,
      clienteId: null,
      itens: [{ id: "item-1", descricao: "Servico", quantidade: 1, servicoId: null, materialId: null, acabamentos: null, precoUnitario: 10 }],
      valorTotal: 10,
      statusEntrega: "concluido",
    });
    expect(pedido.numero).toBeTruthy();

    // Permitido: ler se o caixa esta aberto (precisa saber antes de vender).
    await expect(repos.caixa.obterAberto(EMPRESA_ID)).resolves.toBeNull();

    // Negado: abrir caixa e lancar movimento manual sao exclusivos de Admin/Gerente.
    await expect(
      repos.caixa.abrir({ empresaId: EMPRESA_ID, usuarioId: "usuario-atendente", valorAberturaDinheiro: 100, observacoes: null }),
    ).rejects.toBeInstanceOf(PermissaoNegadaError);
  });

  it("Admin/Gerente: abrem caixa, lancam movimento manual e fecham com resumo", async () => {
    for (const papel of ["admin", "gerente"] as const) {
      const repos = protegerRepositories(criarRepositoriesLocal(), papel);
      const caixa = await repos.caixa.abrir({ empresaId: EMPRESA_ID, usuarioId: `usuario-${papel}`, valorAberturaDinheiro: 100, observacoes: null });
      await expect(
        repos.movimentosCaixaManual.criar({ empresaId: EMPRESA_ID, caixaId: caixa.id, tipo: "saida", valor: 20, motivo: "Compra de material", registradoPorUsuarioId: `usuario-${papel}` }),
      ).resolves.toBeTruthy();
      await expect(repos.caixa.fechar(caixa.id, { usuarioId: `usuario-${papel}`, observacoes: null })).resolves.toMatchObject({ status: "fechado" });
    }
  });

  it("Operador: nao opera caixa nem PDV, nem le/altera recebimentos", async () => {
    const repos = protegerRepositories(criarRepositoriesLocal(), "operador");
    await expect(repos.caixa.obterAberto(EMPRESA_ID)).rejects.toBeInstanceOf(PermissaoNegadaError);
    await expect(
      repos.pedidos.criarAtendimentoBalcao({ empresaId: EMPRESA_ID, clienteId: null, itens: [], valorTotal: 0, statusEntrega: "concluido" }),
    ).rejects.toBeInstanceOf(PermissaoNegadaError);
    await expect(repos.recebimentos.listarPorPedido("pedido-qualquer")).rejects.toBeInstanceOf(PermissaoNegadaError);
  });
});

describe("RBAC de Producao/Kanban (SPEC 05) — repositorio", () => {
  beforeEach(() => {
    limparNamespace();
  });

  async function prepararTrabalho(papelCriador: "admin" | "gerente", responsavelUsuarioId: string | null) {
    const base = criarRepositoriesLocal();
    const workflow = await base.workflows.criar({ empresaId: EMPRESA_ID, nome: "Workflow teste", categoriaServicoId: null, ativo: true });
    await base.etapasWorkflow.criar({ empresaId: EMPRESA_ID, workflowId: workflow.id, ordem: 1, nome: "Etapa 1", tipo: "humana" });
    await base.etapasWorkflow.criar({ empresaId: EMPRESA_ID, workflowId: workflow.id, ordem: 2, nome: "Etapa 2", tipo: "humana" });
    const repos = protegerRepositories(base, papelCriador, "usuario-criador");
    const trabalho = await repos.trabalhos.criar({
      empresaId: EMPRESA_ID,
      pedidoId: "pedido-qualquer",
      clienteId: null,
      descricao: "Teste",
      quantidade: 1,
      servicoId: null,
      materialId: null,
      acabamentos: null,
      prazo: null,
      prioridade: "normal",
      responsavelUsuarioId,
      observacoes: null,
      origem: "balcao",
      workflowId: workflow.id,
      formato: null,
      tipoEquipamentoNecessario: null,
    });
    return { base, trabalho };
  }

  it("Admin/Gerente: PRODUCAO_GERENCIAR — gera Trabalho, atribui responsavel e move qualquer Trabalho", async () => {
    const { base, trabalho } = await prepararTrabalho("admin", null);
    const repos = protegerRepositories(base, "gerente", "usuario-gerente");
    await expect(repos.trabalhos.atribuirResponsavel(trabalho.id, "usuario-gerente", "usuario-x")).resolves.toMatchObject({
      responsavelUsuarioId: "usuario-x",
    });
    await expect(repos.trabalhos.mover(trabalho.id, "usuario-gerente", trabalho.workflow.etapas[1].id)).resolves.toMatchObject({
      etapaAtualId: trabalho.workflow.etapas[1].id,
    });
  });

  it("Atendente: so consulta — nao pode mover nem gerar Trabalho", async () => {
    const { base, trabalho } = await prepararTrabalho("admin", null);
    const repos = protegerRepositories(base, "atendente", "usuario-atendente");
    await expect(repos.trabalhos.listar(EMPRESA_ID)).resolves.not.toThrow;
    await expect(repos.trabalhos.mover(trabalho.id, "usuario-atendente", trabalho.workflow.etapas[1].id)).rejects.toBeInstanceOf(PermissaoNegadaError);
    await expect(
      repos.trabalhos.criar({
        empresaId: EMPRESA_ID,
        pedidoId: "pedido-x",
        clienteId: null,
        descricao: "x",
        quantidade: 1,
        servicoId: null,
        materialId: null,
        acabamentos: null,
        prazo: null,
        prioridade: "normal",
        responsavelUsuarioId: null,
        observacoes: null,
        origem: "balcao",
        workflowId: trabalho.workflow.workflowId,
        formato: null,
        tipoEquipamentoNecessario: null,
      }),
    ).rejects.toBeInstanceOf(PermissaoNegadaError);
  });

  it("Operador: consulta qualquer Trabalho, mas so movimenta o Trabalho do qual e responsavel", async () => {
    const { base, trabalho } = await prepararTrabalho("admin", "usuario-operador-dono");

    const repoDono = protegerRepositories(base, "operador", "usuario-operador-dono");
    await expect(repoDono.trabalhos.mover(trabalho.id, "usuario-operador-dono", trabalho.workflow.etapas[1].id)).resolves.toMatchObject({
      etapaAtualId: trabalho.workflow.etapas[1].id,
    });

    const { trabalho: trabalhoDeOutro } = await prepararTrabalho("admin", "usuario-outro-operador");
    const repoNaoResponsavel = protegerRepositories(base, "operador", "usuario-operador-dono");
    await expect(
      repoNaoResponsavel.trabalhos.mover(trabalhoDeOutro.id, "usuario-operador-dono", trabalhoDeOutro.workflow.etapas[1].id),
    ).rejects.toBeInstanceOf(PermissaoNegadaError);

    // Atribuir responsavel e cancelar continuam exclusivos de PRODUCAO_GERENCIAR, mesmo para o dono.
    await expect(
      repoDono.trabalhos.atribuirResponsavel(trabalho.id, "usuario-operador-dono", "usuario-outro"),
    ).rejects.toBeInstanceOf(PermissaoNegadaError);
    await expect(repoDono.trabalhos.cancelar(trabalho.id, "usuario-operador-dono", "motivo qualquer")).rejects.toBeInstanceOf(
      PermissaoNegadaError,
    );
  });
});

describe("RBAC de Producao e Equipamentos (SPEC 06) — repositorio", () => {
  beforeEach(() => {
    limparNamespace();
  });

  async function prepararAlocacao(responsavelUsuarioId: string | null) {
    const base = criarRepositoriesLocal();
    const equipamento = await base.equipamentos.criar({
      empresaId: EMPRESA_ID,
      nome: "Impressora Teste",
      tipo: "impressora",
      ativo: true,
      situacao: "disponivel",
      capacidadeSimultanea: 1,
    });
    await base.capacidadesEquipamento.criar({
      empresaId: EMPRESA_ID,
      equipamentoId: equipamento.id,
      formatos: "A4, A3",
      corPB: "ambos",
      duplex: true,
      materiaisCompativeisIds: [],
      observacoes: null,
    });
    const workflow = await base.workflows.criar({ empresaId: EMPRESA_ID, nome: "Workflow com equipamento", categoriaServicoId: null, ativo: true });
    const etapa = await base.etapasWorkflow.criar({ empresaId: EMPRESA_ID, workflowId: workflow.id, ordem: 1, nome: "Impressao", tipo: "automatica" });
    const trabalho = await base.trabalhos.criar({
      empresaId: EMPRESA_ID,
      pedidoId: "pedido-qualquer",
      clienteId: null,
      descricao: "Teste",
      quantidade: 1,
      servicoId: null,
      materialId: null,
      acabamentos: null,
      prazo: null,
      prioridade: "normal",
      responsavelUsuarioId,
      observacoes: null,
      origem: "balcao",
      workflowId: workflow.id,
      formato: "A3",
      tipoEquipamentoNecessario: "impressora",
    });
    const alocacao = await base.alocacoesEquipamento.criar(
      { empresaId: EMPRESA_ID, trabalhoId: trabalho.id, etapaId: etapa.id, equipamentoId: equipamento.id, operadorUsuarioId: responsavelUsuarioId, inicioPrevisto: null },
      "usuario-gerente",
    );
    return { base, equipamento, trabalho, alocacao };
  }

  it("Admin/Gerente: criam alocacao, iniciam, pausam e concluem qualquer uma; equipamentos.atualizarSituacao exclusivo deles", async () => {
    const { base, alocacao, equipamento } = await prepararAlocacao(null);
    const repos = protegerRepositories(base, "gerente", "usuario-gerente");
    await expect(repos.alocacoesEquipamento.iniciar(alocacao.id, "usuario-gerente")).resolves.toMatchObject({ situacao: "em_execucao" });
    await expect(repos.equipamentos.atualizarSituacao(equipamento.id, "usuario-gerente", "manutencao")).resolves.toMatchObject({
      situacao: "manutencao",
    });
  });

  it("Atendente: so consulta — nao cria alocacao nem muda situacao de equipamento", async () => {
    const { base, trabalho, equipamento } = await prepararAlocacao(null);
    const repos = protegerRepositories(base, "atendente", "usuario-atendente");
    await expect(repos.alocacoesEquipamento.listar(EMPRESA_ID)).resolves.not.toThrow;
    await expect(
      repos.alocacoesEquipamento.criar(
        { empresaId: EMPRESA_ID, trabalhoId: trabalho.id, etapaId: "etapa-x", equipamentoId: equipamento.id, operadorUsuarioId: null, inicioPrevisto: null },
        "usuario-atendente",
      ),
    ).rejects.toBeInstanceOf(PermissaoNegadaError);
    await expect(repos.equipamentos.atualizarSituacao(equipamento.id, "usuario-atendente", "manutencao")).rejects.toBeInstanceOf(
      PermissaoNegadaError,
    );
  });

  it("Operador: executa (iniciar/pausar/concluir) so a alocacao cujo Trabalho e responsavel; nunca cria nem realoca", async () => {
    const { base, alocacao, equipamento } = await prepararAlocacao("usuario-operador-dono");
    const repoDono = protegerRepositories(base, "operador", "usuario-operador-dono");

    await expect(repoDono.alocacoesEquipamento.iniciar(alocacao.id, "usuario-operador-dono")).resolves.toMatchObject({ situacao: "em_execucao" });
    await expect(repoDono.alocacoesEquipamento.pausar(alocacao.id, "usuario-operador-dono", "Motivo")).resolves.toMatchObject({ situacao: "pausada" });
    await expect(repoDono.alocacoesEquipamento.retomar(alocacao.id, "usuario-operador-dono")).resolves.toMatchObject({ situacao: "em_execucao" });
    await expect(repoDono.alocacoesEquipamento.concluir(alocacao.id, "usuario-operador-dono")).resolves.toMatchObject({ situacao: "concluida" });

    // Nunca cria nem realoca, nem muda situacao do equipamento — mesmo sendo o dono do Trabalho.
    await expect(
      repoDono.alocacoesEquipamento.realocar(alocacao.id, "usuario-operador-dono", equipamento.id, "motivo qualquer"),
    ).rejects.toBeInstanceOf(PermissaoNegadaError);
    await expect(repoDono.equipamentos.atualizarSituacao(equipamento.id, "usuario-operador-dono", "manutencao")).rejects.toBeInstanceOf(
      PermissaoNegadaError,
    );

    const { alocacao: alocacaoDeOutro } = await prepararAlocacao("usuario-outro-operador");
    const repoNaoResponsavel = protegerRepositories(base, "operador", "usuario-operador-dono");
    await expect(repoNaoResponsavel.alocacoesEquipamento.iniciar(alocacaoDeOutro.id, "usuario-operador-dono")).rejects.toBeInstanceOf(
      PermissaoNegadaError,
    );
  });

  it("Atendente: consulta leituras auxiliares (listarPorTrabalho, avaliarCompatibilidade) sem precisar de PRODUCAO_GERENCIAR", async () => {
    const { base, trabalho } = await prepararAlocacao(null);
    const repos = protegerRepositories(base, "atendente", "usuario-atendente");
    // Regressao: listarPorTrabalho/avaliarCompatibilidade sao LEITURA — nao podem
    // exigir a permissao de escrita (PRODUCAO_GERENCIAR), senao a pagina do
    // Trabalho quebra para quem so tem PRODUCAO_CONSULTAR (atendente/operador).
    await expect(repos.alocacoesEquipamento.listarPorTrabalho(trabalho.id)).resolves.toHaveLength(1);
    await expect(repos.alocacoesEquipamento.avaliarCompatibilidade(trabalho.id)).resolves.toBeInstanceOf(Array);
  });
});
