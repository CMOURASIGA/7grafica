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
      repos.equipamentos.criar({ empresaId: EMPRESA_ID, nome: "Impressora Gerente", tipo: "impressora", ativo: true }),
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
