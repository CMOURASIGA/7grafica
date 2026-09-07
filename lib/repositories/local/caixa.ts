import { gravarColecao, lerColecao } from "@/lib/storage/local-storage-client";
import type { Caixa, FormaPagamento, MovimentoCaixaManual, Recebimento } from "@/lib/domain/entities";
import type { CaixaRepository, ResumoCaixa } from "@/lib/repositories/types";

const CHAVE = "caixas";
const CHAVE_MOVIMENTOS = "movimentos_caixa";
const CHAVE_RECEBIMENTOS = "recebimentos";
const CHAVE_FORMAS_PAGAMENTO = "formas_pagamento";

export function criarCaixaRepositoryLocal(): CaixaRepository {
  return {
    async obterAberto(empresaId) {
      return lerColecao<Caixa>(CHAVE).find((caixa) => caixa.empresaId === empresaId && caixa.status === "aberto") ?? null;
    },
    async listar(empresaId) {
      return lerColecao<Caixa>(CHAVE)
        .filter((caixa) => caixa.empresaId === empresaId)
        .sort((a, b) => b.abertoEm.localeCompare(a.abertoEm));
    },
    async obter(id) {
      return lerColecao<Caixa>(CHAVE).find((caixa) => caixa.id === id) ?? null;
    },
    async abrir(dados) {
      const jaAberto = lerColecao<Caixa>(CHAVE).find((caixa) => caixa.empresaId === dados.empresaId && caixa.status === "aberto");
      if (jaAberto) throw new Error("Ja existe um caixa aberto para esta empresa.");

      const novo: Caixa = {
        id: `caixa-${Math.random().toString(36).slice(2, 10)}`,
        empresaId: dados.empresaId,
        status: "aberto",
        abertoPorUsuarioId: dados.usuarioId,
        abertoEm: new Date().toISOString(),
        valorAberturaDinheiro: dados.valorAberturaDinheiro,
        observacoesAbertura: dados.observacoes,
        fechadoPorUsuarioId: null,
        fechadoEm: null,
        observacoesFechamento: null,
      };
      const caixas = lerColecao<Caixa>(CHAVE);
      caixas.push(novo);
      gravarColecao(CHAVE, caixas);
      return novo;
    },
    async fechar(caixaId, dados) {
      const caixas = lerColecao<Caixa>(CHAVE);
      const indice = caixas.findIndex((caixa) => caixa.id === caixaId);
      if (indice === -1) throw new Error(`Caixa ${caixaId} nao encontrado.`);
      if (caixas[indice].status === "fechado") throw new Error("Este caixa ja esta fechado.");

      const atualizado: Caixa = {
        ...caixas[indice],
        status: "fechado",
        fechadoPorUsuarioId: dados.usuarioId,
        fechadoEm: new Date().toISOString(),
        observacoesFechamento: dados.observacoes,
      };
      caixas[indice] = atualizado;
      gravarColecao(CHAVE, caixas);
      return atualizado;
    },
    async obterResumo(caixaId) {
      const caixa = lerColecao<Caixa>(CHAVE).find((item) => item.id === caixaId);
      if (!caixa) throw new Error(`Caixa ${caixaId} nao encontrado.`);

      const recebimentos = lerColecao<Recebimento>(CHAVE_RECEBIMENTOS).filter((item) => item.caixaId === caixaId);
      const movimentos = lerColecao<MovimentoCaixaManual>(CHAVE_MOVIMENTOS).filter((item) => item.caixaId === caixaId);
      const formasPagamento = lerColecao<FormaPagamento>(CHAVE_FORMAS_PAGAMENTO);

      const totalPorFormaMap = new Map<string, number>();
      let totalRecebido = 0;
      let totalRecebidoDinheiro = 0;
      const pedidosAtendidos = new Set<string>();

      for (const recebimento of recebimentos) {
        totalPorFormaMap.set(recebimento.formaPagamentoId, (totalPorFormaMap.get(recebimento.formaPagamentoId) ?? 0) + recebimento.valor);
        totalRecebido += recebimento.valor;
        pedidosAtendidos.add(recebimento.pedidoId);
        const forma = formasPagamento.find((item) => item.id === recebimento.formaPagamentoId);
        if (forma?.nome.toLowerCase() === "dinheiro") {
          totalRecebidoDinheiro += recebimento.valor;
        }
      }

      const totalEntradasManuais = movimentos.filter((item) => item.tipo === "entrada").reduce((soma, item) => soma + item.valor, 0);
      const totalSaidasManuais = movimentos.filter((item) => item.tipo === "saida").reduce((soma, item) => soma + item.valor, 0);

      const resumo: ResumoCaixa = {
        caixa,
        totalPorFormaPagamento: Array.from(totalPorFormaMap.entries()).map(([formaPagamentoId, total]) => ({
          formaPagamentoId,
          nomeFormaPagamento: formasPagamento.find((item) => item.id === formaPagamentoId)?.nome ?? "—",
          total,
        })),
        totalRecebido,
        totalEntradasManuais,
        totalSaidasManuais,
        saldoDinheiroEsperado: caixa.valorAberturaDinheiro + totalRecebidoDinheiro + totalEntradasManuais - totalSaidasManuais,
        quantidadePedidosAtendidos: pedidosAtendidos.size,
        ticketMedio: pedidosAtendidos.size > 0 ? totalRecebido / pedidosAtendidos.size : 0,
      };
      return resumo;
    },
  };
}
