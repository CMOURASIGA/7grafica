import type { DashboardGestao, PeriodoRelatorio, RelatorioGestao } from "@/lib/domain/relatorios";

export type RelatoriosRepository = {
  obterDashboard(empresaId: string, periodo?: PeriodoRelatorio): Promise<DashboardGestao>;
  gerar(empresaId: string, periodo: PeriodoRelatorio): Promise<RelatorioGestao>;
};
