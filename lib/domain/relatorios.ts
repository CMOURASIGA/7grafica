import type { MotivoRejeicaoOrcamento } from "./entities";

export type PeriodoRelatorio = { inicio: string; fim: string };
export type SerieValor = { chave: string; quantidade: number; valor: number };

export type DashboardGestao = {
  periodo: PeriodoRelatorio;
  pedidosNovos: number;
  emProducao: number;
  atrasados: number;
  prontos: number;
  faturamentoPedidos: number;
  recebimentos: number;
  estoqueCritico: number;
};

export type RelatorioGestao = {
  periodo: PeriodoRelatorio;
  vendas: { pedidos: number; valor: number; ticketMedio: number; porDia: SerieValor[] };
  orcamentos: {
    enviados: number;
    aprovados: number;
    rejeitados: number;
    taxaConversao: number;
    motivosRejeicao: { motivo: MotivoRejeicaoOrcamento; quantidade: number }[];
  };
  producao: {
    criados: number;
    concluidos: number;
    emAndamento: number;
    atrasados: number;
    tempoMedioHoras: number;
    retrabalhosProxy: number;
  };
  estoque: {
    consumo: number;
    perdas: number;
    itensCriticos: number;
    itens: { materialId: string; nome: string; fisico: number; reservado: number; disponivel: number; minimo: number; unidade: string; abaixoMinimo: boolean }[];
  };
  compras: { pedidos: number; valorSolicitado: number; valorRecebido: number; pendentes: number };
  financeiro: { recebido: number; despesasPagas: number; resultadoCaixa: number; contasReceber: number; contasPagar: number };
  clientes: { clienteId: string | null; nome: string; pedidos: number; valor: number; recebido: number }[];
  equipamentos: { equipamentoId: string; nome: string; alocacoes: number; concluidas: number; horasExecutadas: number; situacao: string }[];
  observacoes: string[];
};
