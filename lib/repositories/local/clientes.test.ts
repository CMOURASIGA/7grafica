import { beforeEach, describe, expect, it } from "vitest";
import { criarRepositoriesLocal } from "./index";
import { limparNamespace } from "@/lib/storage/local-storage-client";

const EMPRESA_ID = "empresa-teste";

describe("ClienteRepository (LocalStorage)", () => {
  beforeEach(() => {
    limparNamespace();
  });

  it("cria, lista e atualiza um cliente", async () => {
    const repositories = criarRepositoriesLocal();

    const cliente = await repositories.clientes.criar({
      empresaId: EMPRESA_ID,
      tipo: "PJ",
      nome: "Grafica Teste LTDA",
      documento: "00.000.000/0001-00",
      observacoes: null,
      ativo: true,
    });

    expect(cliente.id).toBeTruthy();
    expect(await repositories.clientes.listar(EMPRESA_ID)).toHaveLength(1);

    const atualizado = await repositories.clientes.atualizar(cliente.id, { nome: "Grafica Teste Renomeada" });
    expect(atualizado.nome).toBe("Grafica Teste Renomeada");

    await repositories.clientes.remover(cliente.id);
    expect(await repositories.clientes.listar(EMPRESA_ID)).toHaveLength(0);
  });

  it("encontra um cliente pelo e-mail de um dos seus contatos (indexacao para identificacao rapida)", async () => {
    const repositories = criarRepositoriesLocal();

    const cliente = await repositories.clientes.criar({
      empresaId: EMPRESA_ID,
      tipo: "PF",
      nome: "Maria Cliente",
      documento: "111.111.111-11",
      observacoes: null,
      ativo: true,
    });
    const contato = await repositories.contatos.criar({
      empresaId: EMPRESA_ID,
      clienteId: cliente.id,
      nome: "Maria Cliente",
      cargo: null,
      telefone: null,
      principal: true,
      ativo: true,
    });
    await repositories.emailsContato.criar({
      empresaId: EMPRESA_ID,
      contatoId: contato.id,
      email: "Maria@Exemplo.com",
      principal: true,
    });

    const encontrado = await repositories.clientes.buscarPorEmail(EMPRESA_ID, "maria@exemplo.com");
    expect(encontrado?.id).toBe(cliente.id);

    expect(await repositories.clientes.buscarPorEmail(EMPRESA_ID, "nao-existe@exemplo.com")).toBeNull();
  });

  it("encontra um cliente pelo documento, ignorando mascara", async () => {
    const repositories = criarRepositoriesLocal();
    const cliente = await repositories.clientes.criar({
      empresaId: EMPRESA_ID,
      tipo: "PJ",
      nome: "Documento Teste",
      documento: "12.345.678/0001-90",
      observacoes: null,
      ativo: true,
    });

    const encontrado = await repositories.clientes.buscarPorDocumento(EMPRESA_ID, "12345678000190");
    expect(encontrado?.id).toBe(cliente.id);
  });
});
