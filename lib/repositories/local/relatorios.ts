import type { AlocacaoEquipamento, Arquivo, Cliente, Equipamento, Material, Orcamento, Pedido, Recebimento, Trabalho, UnidadeMedida } from "@/lib/domain/entities";
import type { PeriodoRelatorio, RelatorioGestao, SerieValor } from "@/lib/domain/relatorios";
import type { RelatoriosRepository } from "@/lib/repositories/relatorios-types";
import { lerColecao } from "@/lib/storage/local-storage-client";
import { lerEntregas } from "./entregas";
import { lerEstoque } from "./estoque";
import { criarEstoqueRepositoryLocal } from "./estoque";
import { criarFinanceiroRepositoryLocal } from "./financeiro";

const dentro = (data: string | null, periodo: PeriodoRelatorio) => Boolean(data && data.slice(0, 10) >= periodo.inicio && data.slice(0, 10) <= periodo.fim);
const horas = (inicio: string, fim: string) => Math.max(0, (new Date(fim).getTime() - new Date(inicio).getTime()) / 3_600_000);
const periodoMesAtual = (): PeriodoRelatorio => { const hoje = new Date(), ano = hoje.getFullYear(), mes = String(hoje.getMonth() + 1).padStart(2, "0"), ultimo = new Date(ano, hoje.getMonth() + 1, 0).getDate(); return { inicio: `${ano}-${mes}-01`, fim: `${ano}-${mes}-${ultimo}` }; };

function seriePedidos(pedidos: Pedido[]): SerieValor[] {
  const dias = new Map<string, SerieValor>();
  for (const pedido of pedidos) { const chave = pedido.criadoEm.slice(0, 10), atual = dias.get(chave) ?? { chave, quantidade: 0, valor: 0 }; atual.quantidade += 1; atual.valor += pedido.valorTotal; dias.set(chave, atual); }
  return [...dias.values()].sort((a, b) => a.chave.localeCompare(b.chave));
}

export function criarRelatoriosRepositoryLocal(): RelatoriosRepository {
  const estoqueRepo = criarEstoqueRepositoryLocal(), financeiroRepo = criarFinanceiroRepositoryLocal();
  return {
    async obterDashboard(empresaId, periodo = periodoMesAtual()) {
      const pedidos = lerColecao<Pedido>("pedidos").filter((p) => p.empresaId === empresaId), trabalhos = lerColecao<Trabalho>("trabalhos").filter((t) => t.empresaId === empresaId), recebimentos = lerColecao<Recebimento>("recebimentos").filter((r) => r.empresaId === empresaId && dentro(r.registradoEm, periodo)), entregas = lerEntregas(empresaId).entregas, saldos = await estoqueRepo.listar(empresaId), hoje = new Date().toISOString().slice(0, 10);
      const novos = pedidos.filter((p) => dentro(p.criadoEm, periodo) && p.statusEntrega !== "cancelado");
      return { periodo, pedidosNovos: novos.length, emProducao: trabalhos.filter((t) => ["aguardando_producao", "em_producao", "pausado", "com_pendencia"].includes(t.situacao)).length, atrasados: trabalhos.filter((t) => Boolean(t.prazo && t.prazo < hoje && !["concluido", "cancelado"].includes(t.situacao))).length, prontos: entregas.filter((e) => ["pronto", "aguardando_retirada"].includes(e.status)).length, faturamentoPedidos: novos.reduce((s, p) => s + p.valorTotal, 0), recebimentos: recebimentos.reduce((s, r) => s + r.valor, 0), estoqueCritico: saldos.filter((s) => s.abaixoMinimo).length };
    },
    async gerar(empresaId, periodo) {
      if (!periodo.inicio || !periodo.fim || periodo.inicio > periodo.fim) throw new Error("Informe um período válido.");
      const pedidosTodos = lerColecao<Pedido>("pedidos").filter((p) => p.empresaId === empresaId), pedidos = pedidosTodos.filter((p) => dentro(p.criadoEm, periodo) && p.statusEntrega !== "cancelado"), recebimentos = lerColecao<Recebimento>("recebimentos").filter((r) => r.empresaId === empresaId && dentro(r.registradoEm, periodo)), orcamentos = lerColecao<Orcamento>("orcamentos").filter((o) => o.empresaId === empresaId && dentro(o.criadoEm, periodo)), trabalhosTodos = lerColecao<Trabalho>("trabalhos").filter((t) => t.empresaId === empresaId), trabalhos = trabalhosTodos.filter((t) => dentro(t.criadoEm, periodo)), arquivos = lerColecao<Arquivo>("arquivos").filter((a) => a.empresaId === empresaId && dentro(a.criadoEm, periodo)), clientes = lerColecao<Cliente>("clientes").filter((c) => c.empresaId === empresaId), equipamentos = lerColecao<Equipamento>("equipamentos").filter((e) => e.empresaId === empresaId), alocacoes = lerColecao<AlocacaoEquipamento>("alocacoes_equipamento").filter((a) => a.empresaId === empresaId && dentro(a.criadoEm, periodo)), materiais = lerColecao<Material>("materiais").filter((m) => m.empresaId === empresaId), unidades = lerColecao<UnidadeMedida>("unidades_medida").filter((u) => u.empresaId === empresaId), estadoEstoque = lerEstoque(empresaId), movimentos = estadoEstoque.movimentos.filter((m) => dentro(m.criadoEm, periodo)), compras = estadoEstoque.compras.filter((c) => dentro(c.criadoEm, periodo)), recebimentosCompra = estadoEstoque.recebimentos.filter((r) => dentro(r.criadoEm, periodo));
      const resumoFinanceiro = await financeiroRepo.obterResumo(empresaId, periodo.inicio, periodo.fim), saldos = await estoqueRepo.listar(empresaId);
      const versoesFinais = new Map<string, Orcamento>(); for (const o of orcamentos) { if (o.status === "rascunho") continue; const atual = versoesFinais.get(o.orcamentoOrigemId); if (!atual || o.versao > atual.versao) versoesFinais.set(o.orcamentoOrigemId, o); } const propostas = [...versoesFinais.values()];
      const motivos = new Map<string, number>(); for (const o of propostas) if (o.status === "rejeitado" && o.motivoRejeicao) motivos.set(o.motivoRejeicao, (motivos.get(o.motivoRejeicao) ?? 0) + 1);
      const recebidosPedido = new Map<string, number>(); for (const r of recebimentos) recebidosPedido.set(r.pedidoId, (recebidosPedido.get(r.pedidoId) ?? 0) + r.valor);
      const clientesRelatorio = new Map<string, { clienteId: string | null; nome: string; pedidos: number; valor: number; recebido: number }>(); for (const p of pedidos) { const chave = p.clienteId ?? "nao-identificado", cliente = clientes.find((c) => c.id === p.clienteId), atual = clientesRelatorio.get(chave) ?? { clienteId: p.clienteId, nome: cliente?.nome ?? "Consumidor não identificado", pedidos: 0, valor: 0, recebido: 0 }; atual.pedidos++; atual.valor += p.valorTotal; atual.recebido += recebidosPedido.get(p.id) ?? 0; clientesRelatorio.set(chave, atual); }
      const equipamentosRelatorio = equipamentos.map((e) => { const itens = alocacoes.filter((a) => a.equipamentoId === e.id), concluidas = itens.filter((a) => a.situacao === "concluida"); return { equipamentoId: e.id, nome: e.nome, alocacoes: itens.length, concluidas: concluidas.length, horasExecutadas: concluidas.reduce((s, a) => s + (a.inicioReal && a.terminoReal ? horas(a.inicioReal, a.terminoReal) : 0), 0), situacao: e.situacao }; }).filter((e) => e.alocacoes > 0 || e.situacao !== "disponivel");
      const consumo = movimentos.filter((m) => m.tipo === "consumo").reduce((s, m) => s + m.quantidadeOperacional, 0), perdas = movimentos.filter((m) => m.tipo === "perda").reduce((s, m) => s + m.quantidadeOperacional, 0), concluidos = trabalhos.filter((t) => t.situacao === "concluido" && t.concluidoEm), tempos = concluidos.map((t) => horas(t.criadoEm, t.concluidoEm!));
      return {
        periodo,
        vendas: { pedidos: pedidos.length, valor: pedidos.reduce((s, p) => s + p.valorTotal, 0), ticketMedio: pedidos.length ? pedidos.reduce((s, p) => s + p.valorTotal, 0) / pedidos.length : 0, porDia: seriePedidos(pedidos) },
        orcamentos: { enviados: propostas.length, aprovados: propostas.filter((o) => o.status === "aprovado").length, rejeitados: propostas.filter((o) => o.status === "rejeitado").length, taxaConversao: propostas.length ? propostas.filter((o) => o.status === "aprovado").length / propostas.length * 100 : 0, motivosRejeicao: [...motivos].map(([motivo, quantidade]) => ({ motivo: motivo as RelatorioGestao["orcamentos"]["motivosRejeicao"][number]["motivo"], quantidade })).sort((a, b) => b.quantidade - a.quantidade) },
        producao: { criados: trabalhos.length, concluidos: concluidos.length, emAndamento: trabalhos.filter((t) => !["concluido", "cancelado"].includes(t.situacao)).length, atrasados: trabalhos.filter((t) => Boolean(t.prazo && t.prazo < periodo.fim && !["concluido", "cancelado"].includes(t.situacao))).length, tempoMedioHoras: tempos.length ? tempos.reduce((s, n) => s + n, 0) / tempos.length : 0, retrabalhosProxy: arquivos.filter((a) => a.versao > 1).length },
        estoque: { consumo, perdas, itensCriticos: saldos.filter((s) => s.abaixoMinimo).length, itens: saldos.map((s) => ({ materialId: s.materialId, nome: materiais.find((m) => m.id === s.materialId)?.nome ?? s.materialId, fisico: s.fisico, reservado: s.reservado, disponivel: s.disponivel, minimo: s.minimo, unidade: unidades.find((u) => u.id === s.unidadeOperacionalId)?.sigla ?? s.unidadeOperacionalId, abaixoMinimo: s.abaixoMinimo })) },
        compras: { pedidos: compras.length, valorSolicitado: compras.reduce((s, c) => s + c.itens.reduce((t, i) => t + i.quantidade * i.precoUnitario, 0), 0), valorRecebido: recebimentosCompra.reduce((s, r) => s + r.valor, 0), pendentes: compras.filter((c) => ["aberto", "parcial"].includes(c.situacao)).length },
        financeiro: { recebido: resumoFinanceiro.totalRecebido, despesasPagas: resumoFinanceiro.despesasPagas, resultadoCaixa: resumoFinanceiro.resultado, contasReceber: resumoFinanceiro.contasReceber, contasPagar: resumoFinanceiro.contasPagar },
        clientes: [...clientesRelatorio.values()].sort((a, b) => b.valor - a.valor),
        equipamentos: equipamentosRelatorio.sort((a, b) => b.horasExecutadas - a.horasExecutadas),
        observacoes: ["Faturamento representa o valor dos Pedidos criados no período, não emissão fiscal.", "Resultado financeiro é resultado gerencial de caixa, não DRE ou margem contábil.", "Retrabalho é um proxy baseado em novas versões de Arquivo, pois apontamento industrial de retrabalho ainda não existe."],
      };
    },
  };
}
