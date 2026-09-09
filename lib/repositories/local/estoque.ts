import { gerarId, gravarValorConfirmado, lerColecao, lerValor } from "@/lib/storage/local-storage-client";
import type { ConversaoUnidade, Equipamento, Fornecedor, Material, Trabalho } from "@/lib/domain/entities";
import { arredondarQuantidade as arred, estadoEstoqueVazio, numeroValido, type ConfiguracaoEstoque, type ConsumoTrabalho, type EstadoEstoque, type MovimentoEstoque, type SaldoEstoque } from "@/lib/domain/estoque";
import type { ComprasRepository, EstoqueRepository } from "@/lib/repositories/estoque-types";

export const chaveEstoque = (empresaId: string) => `estoque_v1:${empresaId}`;
export const lerEstoque = (empresaId: string): EstadoEstoque => lerValor<EstadoEstoque>(chaveEstoque(empresaId)) ?? estadoEstoqueVazio();
function materialDaEmpresa(empresaId: string, id: string): Material {
  const material = lerColecao<Material>("materiais").find((m) => m.id === id && m.empresaId === empresaId);
  if (!material) throw new Error("Material não encontrado nesta empresa.");
  return material;
}
function trabalhoDaEmpresa(empresaId: string, id: string, permitirFinalizado = false): Trabalho {
  const trabalho = lerColecao<Trabalho>("trabalhos").find((t) => t.id === id && t.empresaId === empresaId);
  if (!trabalho) throw new Error("Trabalho não encontrado nesta empresa.");
  if (!permitirFinalizado && ["concluido", "cancelado"].includes(trabalho.situacao)) throw new Error("Trabalho finalizado não aceita novos consumos ou reservas.");
  return trabalho;
}
function equipamentoDaEmpresa(empresaId: string, id: string): Equipamento {
  const equipamento = lerColecao<Equipamento>("equipamentos").find((e) => e.id === id && e.empresaId === empresaId && e.ativo);
  if (!equipamento) throw new Error("Equipamento ativo não encontrado nesta empresa.");
  return equipamento;
}
function configuracao(estado: EstadoEstoque, material: Material): ConfiguracaoEstoque {
  const existente = estado.configuracoes.find((c) => c.materialId === material.id);
  if (existente) return existente;
  const nova = { materialId: material.id, minimo: 0, cartucho: false, unidadeOperacionalId: material.unidadeConsumoId };
  estado.configuracoes.push(nova); return nova;
}
function saldo(estado: EstadoEstoque, material: Material): SaldoEstoque {
  const config = configuracao(estado, material);
  const movimentos = estado.movimentos.filter((m) => m.materialId === material.id);
  const fisico = arred(movimentos.reduce((s, m) => s + m.deltaFisico, 0));
  const reservado = arred(movimentos.reduce((s, m) => s + m.deltaReservado, 0));
  const disponivel = arred(fisico - reservado);
  return { ...config, fisico, reservado, disponivel, abaixoMinimo: disponivel < config.minimo };
}
function fatorConversao(estado: EstadoEstoque, material: Material, unidadeId: string, compra = false): number {
  const config = configuracao(estado, material);
  if (config.cartucho) {
    if (unidadeId !== config.unidadeOperacionalId) throw new Error("Cartucho deve ser movimentado por item, sem conversão em litros.");
    return 1;
  }
  // Conversao explicita tem prioridade, inclusive pacote/unidade com IDs iguais no cadastro existente.
  if (unidadeId === material.unidadeCompraId && (unidadeId !== config.unidadeOperacionalId || compra)) {
    const conversoes = lerColecao<ConversaoUnidade>("conversoes_unidade").filter((c) => c.materialId === material.id && c.empresaId === material.empresaId);
    if (!conversoes.length && material.unidadeCompraId === config.unidadeOperacionalId) return 1;
    if (conversoes.length !== 1) throw new Error("Cadastre uma única conversão válida para este material.");
    numeroValido(conversoes[0].fator); return conversoes[0].fator;
  }
  if (unidadeId === config.unidadeOperacionalId) return 1;
  throw new Error("Unidade incompatível com o material.");
}
function validarOperacao(id: string) { if (!id?.trim()) throw new Error("Identificador da operação obrigatório."); }
function auditar(estado: EstadoEstoque, empresaId: string, usuarioId: string, acao: string, entidadeId: string, dados: object) {
  if (!usuarioId) throw new Error("Responsável obrigatório.");
  estado.eventos.push({ id: gerarId("evt"), empresaId, usuarioId, acao, entidade: "estoque", entidadeId, dadosAntes: null, dadosDepois: { ...dados }, criadoEm: new Date().toISOString() });
}
function salvar(empresaId: string, estado: EstadoEstoque) { gravarValorConfirmado(chaveEstoque(empresaId), estado); }
function movimentoBase(empresaId: string, material: Material, usuarioId: string): MovimentoEstoque {
  return { id: gerarId("mov-est"), empresaId, materialId: material.id, usuarioId, criadoEm: new Date().toISOString(), tipo: "entrada", trabalhoId: null, equipamentoId: null, compraId: null, recebimentoId: null, quantidade: 0, unidadeInformadaId: material.unidadeConsumoId, fator: 1, unidadeOperacionalId: material.unidadeConsumoId, quantidadeOperacional: 0, deltaFisico: 0, deltaReservado: 0, motivo: "" };
}

export function criarEstoqueRepositoryLocal(): EstoqueRepository {
  return {
    async listar(empresaId) { const estado = lerEstoque(empresaId); return lerColecao<Material>("materiais").filter((m) => m.empresaId === empresaId).map((m) => saldo(estado, m)); },
    async listarMovimentos(empresaId) { return lerEstoque(empresaId).movimentos; },
    async listarCustosPagina(empresaId) { return lerEstoque(empresaId).custosPagina; },
    async listarPorTrabalho(empresaId, trabalhoId) {
      trabalhoDaEmpresa(empresaId, trabalhoId, true);
      const estado = lerEstoque(empresaId);
      const movimentos = estado.movimentos.filter((m) => m.trabalhoId === trabalhoId);
      const previsoes = estado.previsoes.filter((p) => p.trabalhoId === trabalhoId);
      const ids = [...new Set([...previsoes.map((p) => p.materialId), ...movimentos.map((m) => m.materialId)])];
      return ids.map((materialId): ConsumoTrabalho => {
        const relacionados = movimentos.filter((m) => m.materialId === materialId);
        const material = materialDaEmpresa(empresaId, materialId);
        return { materialId, trabalhoId, unidadeOperacionalId: configuracao(estado, material).unidadeOperacionalId,
          previsto: previsoes.find((p) => p.materialId === materialId)?.quantidade ?? 0,
          real: arred(relacionados.filter((m) => m.tipo === "consumo").reduce((s, m) => s + m.quantidadeOperacional, 0)),
          perda: arred(relacionados.filter((m) => m.tipo === "perda").reduce((s, m) => s + m.quantidadeOperacional, 0)),
          reservado: arred(relacionados.reduce((s, m) => s + m.deltaReservado, 0)) };
      });
    },
    async configurar(empresaId, dados, usuarioId) {
      numeroValido(dados.minimo, true);
      const material = materialDaEmpresa(empresaId, dados.materialId), estado = lerEstoque(empresaId);
      const anterior = configuracao(estado, material);
      const unidadeOperacionalId = dados.cartucho ? material.unidadeCompraId : material.unidadeConsumoId;
      if ((anterior.cartucho !== dados.cartucho || anterior.unidadeOperacionalId !== unidadeOperacionalId) && (estado.movimentos.some((m) => m.materialId === material.id) || estado.previsoes.some((p) => p.materialId === material.id) || estado.compras.some((c) => c.itens.some((i) => i.materialId === material.id)))) throw new Error("Unidade operacional já utilizada. Não é permitido reinterpretar o histórico.");
      if (dados.cartucho && !Number.isInteger(dados.minimo)) throw new Error("Mínimo de cartuchos deve ser inteiro.");
      estado.configuracoes = estado.configuracoes.filter((c) => c.materialId !== material.id);
      estado.configuracoes.push({ materialId: material.id, minimo: dados.minimo, cartucho: dados.cartucho, unidadeOperacionalId });
      auditar(estado, empresaId, usuarioId, "estoque_configurado", material.id, dados); salvar(empresaId, estado);
    },
    async planejar(empresaId, dados, usuarioId) {
      trabalhoDaEmpresa(empresaId, dados.trabalhoId); numeroValido(dados.quantidade, true);
      const material = materialDaEmpresa(empresaId, dados.materialId), estado = lerEstoque(empresaId);
      if (configuracao(estado, material).cartucho && !Number.isInteger(dados.quantidade)) throw new Error("Cartuchos exigem quantidade inteira.");
      const anterior = estado.previsoes.find((p) => p.trabalhoId === dados.trabalhoId && p.materialId === dados.materialId)?.quantidade ?? 0;
      estado.previsoes = estado.previsoes.filter((p) => p.trabalhoId !== dados.trabalhoId || p.materialId !== dados.materialId);
      estado.previsoes.push(dados); auditar(estado, empresaId, usuarioId, "consumo_planejado", dados.trabalhoId, { ...dados, anterior }); salvar(empresaId, estado);
    },
    async movimentar(empresaId, dados, usuarioId) {
      validarOperacao(dados.operacaoId); const estado = lerEstoque(empresaId);
      if (estado.operacoes.includes(dados.operacaoId)) return;
      const material = materialDaEmpresa(empresaId, dados.materialId);
      if (!dados.motivo.trim()) throw new Error("Informe o motivo da movimentação.");
      if (!["entrada", "saida", "reserva", "liberacao", "consumo", "perda", "ajuste"].includes(dados.tipo)) throw new Error("Tipo inválido.");
      numeroValido(dados.tipo === "ajuste" ? Math.abs(dados.quantidade) : dados.quantidade);
      if (["reserva", "liberacao", "consumo"].includes(dados.tipo) && !dados.trabalhoId) throw new Error("Esta movimentação exige um Trabalho.");
      if (dados.trabalhoId) trabalhoDaEmpresa(empresaId, dados.trabalhoId, dados.tipo === "liberacao");
      const atual = saldo(estado, material), fator = fatorConversao(estado, material, dados.unidadeId, dados.unidadeCompra), qtd = arred(dados.quantidade * fator);
      if (!Number.isFinite(qtd) || qtd === 0) throw new Error("Quantidade convertida inválida.");
      if (atual.cartucho && !Number.isInteger(qtd)) throw new Error("Cartuchos exigem quantidade inteira.");
      const proprio = dados.trabalhoId ? arred(estado.movimentos.filter((m) => m.trabalhoId === dados.trabalhoId && m.materialId === material.id).reduce((s, m) => s + m.deltaReservado, 0)) : 0;
      let deltaFisico = 0, deltaReservado = 0;
      if (dados.tipo === "entrada" || dados.tipo === "ajuste") deltaFisico = qtd;
      if (dados.tipo === "reserva") deltaReservado = qtd;
      if (dados.tipo === "liberacao") { if (qtd > proprio) throw new Error("Liberação excede a reserva deste Trabalho."); deltaReservado = -qtd; }
      if (["saida", "consumo", "perda"].includes(dados.tipo)) {
        deltaFisico = -qtd;
        if (dados.tipo !== "saida") deltaReservado = -Math.min(proprio, qtd);
      }
      if (arred(atual.fisico + deltaFisico) < 0 || arred(atual.disponivel + deltaFisico - deltaReservado) < 0) throw new Error("Estoque disponível insuficiente. As reservas de outros Trabalhos são preservadas.");
      const movimento: MovimentoEstoque = { ...movimentoBase(empresaId, material, usuarioId), tipo: dados.tipo, quantidade: dados.quantidade, unidadeInformadaId: dados.unidadeId, fator, quantidadeOperacional: qtd, unidadeOperacionalId: atual.unidadeOperacionalId, deltaFisico, deltaReservado, trabalhoId: dados.trabalhoId ?? null, motivo: dados.motivo.trim() };
      estado.movimentos.push(movimento); estado.operacoes.push(dados.operacaoId);
      auditar(estado, empresaId, usuarioId, `estoque_${dados.tipo}`, movimento.id, movimento); salvar(empresaId, estado);
    },
    async registrarTroca(empresaId, dados, usuarioId) {
      validarOperacao(dados.operacaoId); const estado = lerEstoque(empresaId);
      if (estado.operacoes.includes(dados.operacaoId)) return;
      const material = materialDaEmpresa(empresaId, dados.materialId); equipamentoDaEmpresa(empresaId, dados.equipamentoId);
      const atual = saldo(estado, material); numeroValido(dados.quantidade);
      if (!atual.cartucho || !Number.isInteger(dados.quantidade)) throw new Error("Configure este material como cartucho/item e informe quantidade inteira.");
      if (!dados.motivo.trim()) throw new Error("Informe o motivo da troca.");
      if (dados.quantidade > atual.disponivel) throw new Error("Estoque insuficiente para a troca.");
      const mov = { ...movimentoBase(empresaId, material, usuarioId), tipo: "troca" as const, equipamentoId: dados.equipamentoId, quantidade: dados.quantidade, quantidadeOperacional: dados.quantidade, unidadeInformadaId: atual.unidadeOperacionalId, unidadeOperacionalId: atual.unidadeOperacionalId, deltaFisico: -dados.quantidade, motivo: dados.motivo };
      estado.movimentos.push(mov); estado.operacoes.push(dados.operacaoId); auditar(estado, empresaId, usuarioId, "cartucho_trocado", mov.id, mov); salvar(empresaId, estado);
    },
    async configurarCustoPagina(empresaId, dados, usuarioId) {
      equipamentoDaEmpresa(empresaId, dados.equipamentoId); numeroValido(dados.custo, true); const estado = lerEstoque(empresaId);
      estado.custosPagina = estado.custosPagina.filter((c) => c.equipamentoId !== dados.equipamentoId); estado.custosPagina.push(dados);
      auditar(estado, empresaId, usuarioId, "custo_pagina_estimado", dados.equipamentoId, dados); salvar(empresaId, estado);
    },
  };
}

export function criarComprasRepositoryLocal(): ComprasRepository {
  return {
    async listar(empresaId) { return lerEstoque(empresaId).compras; },
    async listarRecebimentos(empresaId) { return lerEstoque(empresaId).recebimentos; },
    async listarContasPagar(empresaId) { return lerEstoque(empresaId).contasPagar; },
    async criar(empresaId, dados, usuarioId) {
      validarOperacao(dados.operacaoId); const estado = lerEstoque(empresaId); if (estado.operacoes.includes(dados.operacaoId)) return;
      const fornecedor = lerColecao<Fornecedor>("fornecedores").find((f) => f.id === dados.fornecedorId && f.empresaId === empresaId && f.ativo);
      if (!fornecedor) throw new Error("Fornecedor ativo não encontrado nesta empresa.");
      if (!dados.itens.length) throw new Error("Inclua ao menos um item.");
      const itens = dados.itens.map((item) => {
        numeroValido(item.quantidade); numeroValido(item.precoUnitario, true);
        const material = materialDaEmpresa(empresaId, item.materialId);
        if (!material.ativo) throw new Error("Material inativo não pode ser comprado.");
        const config = configuracao(estado, material), fator = fatorConversao(estado, material, item.unidadeId, true);
        if (config.cartucho && !Number.isInteger(item.quantidade)) throw new Error("Cartuchos exigem quantidade inteira.");
        return { ...item, id: gerarId("item-compra"), nome: material.nome, unidadeOperacionalId: config.unidadeOperacionalId, fator, recebido: 0 };
      });
      const compra = { id: gerarId("compra"), empresaId, numero: `PC-${String(estado.compras.length + 1).padStart(4, "0")}`, fornecedorId: fornecedor.id, fornecedorNome: fornecedor.nome, situacao: "aberto" as const, itens, cotacao: dados.cotacao?.trim() || null, criadoEm: new Date().toISOString(), usuarioId };
      estado.compras.push(compra); estado.operacoes.push(dados.operacaoId); auditar(estado, empresaId, usuarioId, "compra_criada", compra.id, compra); salvar(empresaId, estado);
    },
    async receber(empresaId, dados, usuarioId) {
      validarOperacao(dados.operacaoId); const estado = lerEstoque(empresaId); if (estado.operacoes.includes(dados.operacaoId)) return;
      const compra = estado.compras.find((c) => c.id === dados.compraId);
      if (!compra || !["aberto", "parcial"].includes(compra.situacao)) throw new Error("Compra não está aberta para recebimento.");
      if (!dados.documento.trim()) throw new Error("Informe o documento do recebimento.");
      if (estado.recebimentos.some((r) => r.compraId === compra.id && r.documento === dados.documento.trim())) throw new Error("Documento já recebido nesta compra.");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dados.vencimento) || !Number.isFinite(Date.parse(dados.vencimento)) || new Date(dados.vencimento).toISOString().slice(0, 10) !== dados.vencimento) throw new Error("Vencimento inválido.");
      if (!dados.itens.length || new Set(dados.itens.map((i) => i.itemId)).size !== dados.itens.length) throw new Error("Itens vazios ou duplicados.");
      const recebimentoId = gerarId("rec-compra"); let valor = 0;
      for (const recebido of dados.itens) {
        numeroValido(recebido.quantidade); const item = compra.itens.find((i) => i.id === recebido.itemId);
        if (!item || arred(item.recebido + recebido.quantidade) > item.quantidade) throw new Error("Quantidade recebida excede o saldo do pedido.");
        const material = materialDaEmpresa(empresaId, item.materialId), config = configuracao(estado, material);
        if (config.cartucho && !Number.isInteger(recebido.quantidade)) throw new Error("Cartuchos exigem quantidade inteira.");
        const qtd = arred(recebido.quantidade * item.fator); numeroValido(qtd);
        // Fator/unidade/preco sao os contratados, nao os valores atuais do cadastro.
        estado.movimentos.push({ ...movimentoBase(empresaId, material, usuarioId), quantidade: recebido.quantidade, unidadeInformadaId: item.unidadeId, fator: item.fator, quantidadeOperacional: qtd, unidadeOperacionalId: item.unidadeOperacionalId, deltaFisico: qtd, compraId: compra.id, recebimentoId, motivo: `Recebimento ${compra.numero}: ${dados.documento.trim()}` });
        item.recebido = arred(item.recebido + recebido.quantidade); valor += recebido.quantidade * item.precoUnitario;
      }
      valor = Math.round(valor * 100) / 100; numeroValido(valor, true);
      const recebimento = { id: recebimentoId, empresaId, compraId: compra.id, documento: dados.documento.trim(), vencimento: dados.vencimento, itens: dados.itens, valor, usuarioId, criadoEm: new Date().toISOString() };
      estado.recebimentos.push(recebimento);
      estado.contasPagar.push({ id: gerarId("cp-compra"), empresaId, compraId: compra.id, recebimentoId, fornecedorId: compra.fornecedorId, valor, vencimento: dados.vencimento, situacao: "aberta" });
      compra.situacao = compra.itens.every((i) => i.recebido === i.quantidade) ? "recebido" : "parcial";
      estado.operacoes.push(dados.operacaoId); auditar(estado, empresaId, usuarioId, "compra_recebida", compra.id, recebimento); salvar(empresaId, estado);
    },
    async cancelar(empresaId, dados, usuarioId) {
      const estado = lerEstoque(empresaId), compra = estado.compras.find((c) => c.id === dados.compraId);
      if (!compra || !["aberto", "parcial"].includes(compra.situacao)) throw new Error("Compra não pode ser cancelada.");
      if (!dados.motivo.trim()) throw new Error("Informe o motivo do cancelamento.");
      compra.situacao = "cancelado"; auditar(estado, empresaId, usuarioId, "compra_saldo_cancelado", compra.id, dados); salvar(empresaId, estado);
    },
  };
}
