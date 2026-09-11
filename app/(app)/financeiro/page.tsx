"use client";

import { useEffect, useMemo, useState } from "react";
import { MetricCard, PageIntro, SectionLabel, StatusPill, SurfaceCard } from "@/components/ui/workspace-primitives";
import { useToast } from "@/components/ui/toast";
import { useRepositoriosAutorizados as useRepositories, useSessao } from "@/components/providers/session-provider";
import type { FormaPagamento, Fornecedor, Pedido } from "@/lib/domain/entities";
import type { ContaPagarFinanceira, ContaReceberFinanceira, ResultadoPedido, ResumoFinanceiro } from "@/lib/domain/financeiro";
import { papelTemPermissao, PERMISSOES } from "@/lib/rbac";

const hoje = () => new Date().toISOString().slice(0, 10);
const mesAtual = () => hoje().slice(0, 7);
const moeda = (valor: number) => valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const tom = (situacao: string) => situacao === "pago" ? "success" as const : situacao === "vencido" ? "danger" as const : situacao === "parcial" ? "warning" as const : "neutral" as const;

function intervalo(tipo: "dia" | "semana" | "mes") {
  const fim = new Date(`${hoje()}T12:00:00`), inicio = new Date(fim);
  if (tipo === "semana") inicio.setDate(fim.getDate() - 6);
  if (tipo === "mes") inicio.setDate(1);
  return { inicio: inicio.toISOString().slice(0, 10), fim: fim.toISOString().slice(0, 10) };
}

export default function FinanceiroPage() {
  const repos = useRepositories(), { sessao } = useSessao(), { showToast } = useToast();
  const empresaId = sessao?.empresaAtiva?.id, usuarioId = sessao?.usuario.id;
  const podeAcessar = sessao?.empresaAtiva ? papelTemPermissao(sessao.empresaAtiva.papel, PERMISSOES.FINANCEIRO_CONSULTAR) : false;
  const [inicio, setInicio] = useState(intervalo("mes").inicio), [fim, setFim] = useState(hoje());
  const [resumo, setResumo] = useState<ResumoFinanceiro | null>(null), [contasReceber, setContasReceber] = useState<ContaReceberFinanceira[]>([]), [contasPagar, setContasPagar] = useState<ContaPagarFinanceira[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]), [fornecedores, setFornecedores] = useState<Fornecedor[]>([]), [formas, setFormas] = useState<FormaPagamento[]>([]), [resultados, setResultados] = useState<ResultadoPedido[]>([]);
  const [descricao, setDescricao] = useState(""), [categoria, setCategoria] = useState(""), [valor, setValor] = useState(""), [vencimento, setVencimento] = useState(hoje()), [competencia, setCompetencia] = useState(mesAtual()), [pedidoId, setPedidoId] = useState(""), [fornecedorId, setFornecedorId] = useState(""), [formaId, setFormaId] = useState(""), [ocupado, setOcupado] = useState(false);

  async function carregar() {
    if (!empresaId || !podeAcessar) return;
    const [r, cr, cp, ps, fs, fps] = await Promise.all([repos.financeiro.obterResumo(empresaId, inicio, fim), repos.financeiro.listarContasReceber(empresaId), repos.financeiro.listarContasPagar(empresaId), repos.pedidos.listar(empresaId), repos.fornecedores.listar(empresaId), repos.formasPagamento.listar(empresaId)]);
    setResumo(r); setContasReceber(cr); setContasPagar(cp); setPedidos(ps); setFornecedores(fs); setFormas(fps.filter((f) => f.ativo));
    setResultados(await Promise.all(ps.map((p) => repos.financeiro.obterResultadoPedido(empresaId, p.id))));
    if (!formaId && fps[0]) setFormaId(fps[0].id);
  }
  useEffect(() => { void carregar(); }, [empresaId, inicio, fim, podeAcessar]); // eslint-disable-line react-hooks/exhaustive-deps

  async function executar(acao: () => Promise<void>, sucesso: string) {
    setOcupado(true);
    try { await acao(); showToast(sucesso, "success"); await carregar(); }
    catch (erro) { showToast(erro instanceof Error ? erro.message : "Não foi possível concluir.", "error"); }
    finally { setOcupado(false); }
  }
  function usarIntervalo(tipo: "dia" | "semana" | "mes") { const periodo = intervalo(tipo); setInicio(periodo.inicio); setFim(periodo.fim); }
  const abertas = useMemo(() => contasPagar.filter((c) => c.saldo > 0 && c.situacao !== "cancelado"), [contasPagar]);

  if (!empresaId || !usuarioId) return null;
  if (!podeAcessar) return <SurfaceCard className="p-5"><p className="text-sm text-(--text-secondary)">Seu papel atual não tem acesso ao financeiro.</p></SurfaceCard>;
  return <div className="flex flex-col gap-4">
    <PageIntro eyebrow="Gestão financeira" title="Financeiro operacional" description="Recebimentos, contas, despesas e resultado de caixa. Sem integração bancária, fiscal ou conciliação automática." aside={<StatusPill tone={resumo && resumo.resultado >= 0 ? "success" : "danger"}>{resumo ? moeda(resumo.resultado) : "Carregando"}</StatusPill>} />

    <SurfaceCard className="p-5"><div className="flex flex-wrap items-end gap-2"><div><SectionLabel>Período</SectionLabel><div className="mt-2 flex gap-2"><button className="workspace-button-secondary" onClick={() => usarIntervalo("dia")}>Dia</button><button className="workspace-button-secondary" onClick={() => usarIntervalo("semana")}>7 dias</button><button className="workspace-button-secondary" onClick={() => usarIntervalo("mes")}>Mês</button></div></div><div><label className="workspace-label" htmlFor="fin-inicio">Início</label><input id="fin-inicio" type="date" className="workspace-input" value={inicio} onChange={(e) => setInicio(e.target.value)} /></div><div><label className="workspace-label" htmlFor="fin-fim">Fim</label><input id="fin-fim" type="date" className="workspace-input" value={fim} onChange={(e) => setFim(e.target.value)} /></div></div></SurfaceCard>

    {resumo ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Total recebido" value={moeda(resumo.totalRecebido)} helper={`Ticket médio ${moeda(resumo.ticketMedio)}`} /><MetricCard label="Despesas pagas" value={moeda(resumo.despesasPagas)} helper="Despesas e compras liquidadas" /><MetricCard label="Resultado" value={moeda(resumo.resultado)} helper="Recebido menos pagamentos" /><MetricCard label="Em aberto" value={moeda(resumo.contasReceber - resumo.contasPagar)} helper={`A receber ${moeda(resumo.contasReceber)} · A pagar ${moeda(resumo.contasPagar)}`} /></div> : null}

    <div className="grid gap-4 xl:grid-cols-2">
      <SurfaceCard className="p-5"><SectionLabel>Nova despesa</SectionLabel><div className="mt-3 grid gap-3 sm:grid-cols-2"><div><label className="workspace-label" htmlFor="desp-desc">Descrição</label><input id="desp-desc" className="workspace-input" value={descricao} onChange={(e) => setDescricao(e.target.value)} /></div><div><label className="workspace-label" htmlFor="desp-cat">Categoria</label><input id="desp-cat" className="workspace-input" value={categoria} onChange={(e) => setCategoria(e.target.value)} /></div><div><label className="workspace-label" htmlFor="desp-valor">Valor</label><input id="desp-valor" type="number" min="0" step="0.01" className="workspace-input" value={valor} onChange={(e) => setValor(e.target.value)} /></div><div><label className="workspace-label" htmlFor="desp-venc">Vencimento</label><input id="desp-venc" type="date" className="workspace-input" value={vencimento} onChange={(e) => setVencimento(e.target.value)} /></div><div><label className="workspace-label" htmlFor="desp-comp">Competência</label><input id="desp-comp" type="month" className="workspace-input" value={competencia} onChange={(e) => setCompetencia(e.target.value)} /></div><div><label className="workspace-label" htmlFor="desp-pedido">Pedido relacionado, opcional</label><select id="desp-pedido" className="workspace-input" value={pedidoId} onChange={(e) => setPedidoId(e.target.value)}><option value="">Sem pedido</option>{pedidos.map((p) => <option key={p.id} value={p.id}>{p.numero}</option>)}</select></div><div className="sm:col-span-2"><label className="workspace-label" htmlFor="desp-forn">Fornecedor, opcional</label><select id="desp-forn" className="workspace-input" value={fornecedorId} onChange={(e) => setFornecedorId(e.target.value)}><option value="">Sem fornecedor</option>{fornecedores.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}</select></div></div><button disabled={ocupado} className="workspace-button-primary mt-3" onClick={() => void executar(async () => { await repos.financeiro.criarDespesa(empresaId, { descricao, categoria, valor: Number(valor), vencimento, competencia, pedidoId: pedidoId || null, fornecedorId: fornecedorId || null, operacaoId: crypto.randomUUID() }, usuarioId); setDescricao(""); setCategoria(""); setValor(""); }, "Despesa registrada.")}>Registrar despesa</button></SurfaceCard>

      <SurfaceCard className="p-5"><SectionLabel>Recebimentos por forma</SectionLabel><ul className="mt-3 space-y-2">{resumo?.recebimentosPorForma.map((item) => <li key={item.formaPagamentoId} className="flex justify-between rounded-lg border border-(--border) p-3 text-sm"><span>{item.nome}</span><strong>{moeda(item.total)}</strong></li>)}</ul><div className="mt-4 grid grid-cols-2 gap-3"><MetricCard label="Pedidos pagos" value={resumo?.pedidosPagos ?? 0} /><MetricCard label="Pendentes/parciais" value={resumo?.pedidosPendentes ?? 0} /></div></SurfaceCard>
    </div>

    <SurfaceCard className="p-5"><div className="flex flex-wrap items-end gap-3"><div className="min-w-56"><label className="workspace-label" htmlFor="forma-baixa">Forma para baixa</label><select id="forma-baixa" className="workspace-input" value={formaId} onChange={(e) => setFormaId(e.target.value)}>{formas.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}</select></div><p className="text-xs text-(--text-secondary)">A baixa é interna. Não existe consulta bancária no MVP.</p></div><SectionLabel>Contas a pagar</SectionLabel><div className="mt-3 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr className="border-b border-(--border)"><th className="p-2">Origem</th><th className="p-2">Descrição</th><th className="p-2">Vencimento</th><th className="p-2">Saldo</th><th className="p-2">Situação</th><th className="p-2">Ação</th></tr></thead><tbody>{contasPagar.map((c) => <tr key={`${c.origem}-${c.id}`} className="border-b border-(--border)"><td className="p-2">{c.origem}</td><td className="p-2">{c.descricao}</td><td className="p-2">{c.vencimento.split("-").reverse().join("/")}</td><td className="p-2">{moeda(c.saldo)}</td><td className="p-2"><StatusPill tone={tom(c.situacao)}>{c.situacao}</StatusPill></td><td className="p-2">{c.saldo > 0 && c.situacao !== "cancelado" ? <button disabled={ocupado || !formaId} className="workspace-button-secondary" onClick={() => void executar(() => c.origem === "compra" ? repos.financeiro.pagarContaCompra(empresaId, { contaPagarCompraId: c.id, formaPagamentoId: formaId, pagoEm: hoje(), operacaoId: crypto.randomUUID() }, usuarioId) : repos.financeiro.pagarDespesa(empresaId, { despesaId: c.id, formaPagamentoId: formaId, pagoEm: hoje(), operacaoId: crypto.randomUUID() }, usuarioId), "Conta baixada.")}>Baixar hoje</button> : null}</td></tr>)}</tbody></table>{!abertas.length ? <p className="workspace-empty-state mt-3">Nenhuma conta aberta.</p> : null}</div></SurfaceCard>

    <div className="grid gap-4 xl:grid-cols-2"><SurfaceCard className="p-5"><SectionLabel>Contas a receber</SectionLabel><ul className="mt-3 space-y-2">{contasReceber.map((c) => <li key={c.pedidoId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-(--border) p-3 text-sm"><span><strong>{c.numero}</strong> · {moeda(c.recebido)} de {moeda(c.valorTotal)}</span><StatusPill tone={tom(c.situacao)}>{c.situacao} · saldo {moeda(c.saldo)}</StatusPill></li>)}</ul></SurfaceCard><SurfaceCard className="p-5"><SectionLabel>Resultado por pedido</SectionLabel><p className="mt-2 text-xs text-(--text-secondary)">Resultado de caixa: recebimentos menos despesas diretamente vinculadas. Não representa margem contábil.</p><ul className="mt-3 space-y-2">{resultados.map((r) => <li key={r.pedidoId} className="rounded-lg border border-(--border) p-3 text-sm"><div className="flex justify-between"><strong>{r.numero}</strong><strong className={r.resultadoCaixa < 0 ? "text-red-700" : "text-emerald-700"}>{moeda(r.resultadoCaixa)}</strong></div><p className="mt-1 text-xs text-(--text-secondary)">Recebido {moeda(r.recebido)} · despesas {moeda(r.despesasDiretas)} · saldo a receber {moeda(r.saldoReceber)}</p></li>)}</ul></SurfaceCard></div>
  </div>;
}
