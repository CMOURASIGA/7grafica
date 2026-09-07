import { beforeEach, describe, expect, it } from "vitest";
import { criarRepositoriesLocal } from "./index";
import { limparNamespace } from "@/lib/storage/local-storage-client";

const EMPRESA_ID = "empresa-orc-teste";

describe("OrcamentoRepository + PedidoRepository (fluxo da SPEC 03)", () => {
  beforeEach(() => {
    limparNamespace();
  });

  it("numero e unico e sequencial por empresa (ORC-0001, ORC-0002...)", async () => {
    const repos = criarRepositoriesLocal();
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

    const criarBase = () =>
      repos.orcamentos.criar({
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

    const orc1 = await criarBase();
    const orc2 = await criarBase();
    expect(orc1.numero).toBe("ORC-0001");
    expect(orc2.numero).toBe("ORC-0002");
    expect(orc1.tokenAcompanhamento).not.toBe(orc2.tokenAcompanhamento);
  });

  it("enviar -> aprovar via token gera Pedido; nova versao reaproveita o numero e reinicia o token", async () => {
    const repos = criarRepositoriesLocal();
    const solicitacao = await repos.solicitacoes.criar({
      empresaId: EMPRESA_ID,
      origem: "email",
      emailOrigemId: null,
      clienteId: "cliente-x",
      contatoId: null,
      assunto: "Teste",
      descricao: "Teste",
      status: "nova",
    });
    const orcamento = await repos.orcamentos.criar({
      empresaId: EMPRESA_ID,
      solicitacaoId: solicitacao.id,
      clienteId: "cliente-x",
      versao: 1,
      itens: [{ id: "item-1", descricao: "Servico", quantidade: 2, servicoId: null, materialId: null, acabamentos: null, precoUnitario: 50 }],
      prazoEntregaDias: 5,
      validadeAte: null,
      observacoes: null,
      valorTotal: 100,
    });

    const { orcamento: enviado, link } = await repos.orcamentos.enviarPorEmail(orcamento.id, "cliente@exemplo.com");
    expect(enviado.status).toBe("enviado");
    expect(link).toContain(enviado.tokenAcompanhamento);

    const encontradoPorToken = await repos.orcamentos.buscarPorToken(enviado.tokenAcompanhamento);
    expect(encontradoPorToken?.id).toBe(orcamento.id);

    const aprovado = await repos.orcamentos.registrarDecisaoPublica(enviado.tokenAcompanhamento, "aprovado");
    expect(aprovado.status).toBe("aprovado");
    expect(aprovado.decididoEm).toBeTruthy();

    const pedido = await repos.pedidos.criarAPartirDeOrcamentoAprovado(aprovado.id);
    expect(pedido.numero).toBe("PED-0001");
    expect(pedido.clienteId).toBe("cliente-x");

    // Chamar de novo nao duplica o pedido (idempotente).
    const pedidoDeNovo = await repos.pedidos.criarAPartirDeOrcamentoAprovado(aprovado.id);
    expect(pedidoDeNovo.id).toBe(pedido.id);
  });

  it("recusa exige que o orcamento esteja enviado; rejeitado registra motivo estruturado e permite nova versao", async () => {
    const repos = criarRepositoriesLocal();
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

    // Ainda em rascunho: decisao publica deve falhar.
    await expect(repos.orcamentos.registrarDecisaoPublica(orcamento.tokenAcompanhamento, "aprovado")).rejects.toThrow();

    const { orcamento: enviado } = await repos.orcamentos.enviarPorEmail(orcamento.id, "cliente@exemplo.com");
    const rejeitado = await repos.orcamentos.registrarDecisaoPublica(enviado.tokenAcompanhamento, "rejeitado", {
      motivo: "preco_alto",
      justificativa: "Muito caro",
    });
    expect(rejeitado.status).toBe("rejeitado");
    expect(rejeitado.motivoRejeicao).toBe("preco_alto");
    expect(rejeitado.justificativaCliente).toBe("Muito caro");

    const v2 = await repos.orcamentos.criarNovaVersao(rejeitado.id);
    expect(v2.versao).toBe(2);
    expect(v2.numero).toBe(rejeitado.numero);
    expect(v2.status).toBe("rascunho");
    expect(v2.tokenAcompanhamento).not.toBe(rejeitado.tokenAcompanhamento);
  });
});
