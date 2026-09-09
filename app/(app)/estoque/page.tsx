"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRepositoriosAutorizados, useSessao } from "@/components/providers/session-provider";
import { PageIntro, SurfaceCard, StatusPill, SectionLabel } from "@/components/ui/workspace-primitives";
import { useToast } from "@/components/ui/toast";
import type { Equipamento, Material, UnidadeMedida } from "@/lib/domain/entities";
import type { MovimentoEstoque, SaldoEstoque, CustoPaginaEquipamento } from "@/lib/domain/estoque";

export default function EstoquePage() {
  const repos = useRepositoriosAutorizados(), { sessao } = useSessao(), { showToast } = useToast();
  const empresaId = sessao?.empresaAtiva?.id, usuarioId = sessao?.usuario.id, papel = sessao?.empresaAtiva?.papel;
  const gerencia = papel === "admin" || papel === "gerente";
  const [materiais, setMateriais] = useState<Material[]>([]), [unidades, setUnidades] = useState<UnidadeMedida[]>([]), [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [saldos, setSaldos] = useState<SaldoEstoque[]>([]), [movimentos, setMovimentos] = useState<MovimentoEstoque[]>([]), [custos, setCustos] = useState<CustoPaginaEquipamento[]>([]);
  const [materialId, setMaterialId] = useState(""), [tipo, setTipo] = useState<"entrada" | "saida" | "ajuste">("entrada"), [quantidade, setQuantidade] = useState(""), [compra, setCompra] = useState(false), [motivo, setMotivo] = useState("");
  const [minimo, setMinimo] = useState("0"), [cartucho, setCartucho] = useState(false), [equipamentoId, setEquipamentoId] = useState(""), [custo, setCusto] = useState(""), [ocupado, setOcupado] = useState(false);
  async function carregar() {
    if (!empresaId) return;
    const [m, u, e, s, h, c] = await Promise.all([repos.materiais.listar(empresaId), repos.unidadesMedida.listar(empresaId), repos.equipamentos.listar(empresaId), repos.estoque.listar(empresaId), repos.estoque.listarMovimentos(empresaId), repos.estoque.listarCustosPagina(empresaId)]);
    setMateriais(m); setUnidades(u); setEquipamentos(e); setSaldos(s); setMovimentos(h); setCustos(c);
  }
  useEffect(() => { void carregar().catch((e) => showToast(e.message, "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId, repos]);
  async function acao(fn: () => Promise<void>) {
    if (ocupado) return; setOcupado(true);
    try { await fn(); await carregar(); showToast("Operação registrada.", "success"); }
    catch (e) { showToast(e instanceof Error ? e.message : "Falha na operação.", "error"); }
    finally { setOcupado(false); }
  }
  if (!empresaId || !usuarioId) return null;
  const unidade = (id: string) => unidades.find((u) => u.id === id)?.sigla ?? id;
  const material = materiais.find((m) => m.id === materialId), saldoAtual = saldos.find((s) => s.materialId === materialId);
  return <div className="flex flex-col gap-4">
    <PageIntro eyebrow="Produção" title="Estoque" description="Saldo físico, reservas e disponibilidade dos materiais." />
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{saldos.map((s) => <SurfaceCard key={s.materialId} className="p-4 min-w-0">
      <h2 className="font-semibold">{materiais.find((m) => m.id === s.materialId)?.nome}</h2>
      <p className="mt-2 text-sm">Físico: {s.fisico} · Reservado: {s.reservado}</p><p className="text-lg font-semibold">Disponível: {s.disponivel} {unidade(s.unidadeOperacionalId)}</p>
      <p className="text-xs">Mínimo: {s.minimo} {s.cartucho ? "· Controle por cartucho/item" : ""}</p>
      {s.abaixoMinimo ? <div className="mt-2 flex flex-wrap gap-2"><StatusPill tone="warning">Abaixo do mínimo</StatusPill>{gerencia ? <Link className="text-sm text-(--accent-strong)" href={`/compras?material=${s.materialId}`}>Providenciar compra</Link> : null}</div> : null}
    </SurfaceCard>)}</div>
    {gerencia ? <SurfaceCard className="p-5">
      <SectionLabel>Movimentação e parâmetros</SectionLabel>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div><label className="workspace-label" htmlFor="estoque-material">Material</label><select id="estoque-material" className="workspace-select" value={materialId} onChange={(e) => { setMaterialId(e.target.value); const s = saldos.find((s) => s.materialId === e.target.value); setMinimo(String(s?.minimo ?? 0)); setCartucho(s?.cartucho ?? false); setCompra(false); }}><option value="">Selecione...</option>{materiais.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}</select></div>
        <div><label className="workspace-label" htmlFor="estoque-minimo">Estoque mínimo operacional</label><input id="estoque-minimo" type="number" min="0" step="any" className="workspace-input" value={minimo} onChange={(e) => setMinimo(e.target.value)} /></div>
        <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={cartucho} onChange={(e) => setCartucho(e.target.checked)} />Controlar toner/tinta por cartucho ou item</label>
        <button disabled={ocupado || !materialId} className="workspace-button-secondary" onClick={() => void acao(() => repos.estoque.configurar(empresaId, { materialId, minimo: Number(minimo), cartucho }, usuarioId))}>Salvar parâmetros</button>
        <div><label htmlFor="estoque-tipo" className="workspace-label">Movimento</label><select id="estoque-tipo" className="workspace-select" value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)}><option value="entrada">Entrada</option><option value="saida">Saída</option><option value="ajuste">Ajuste com quantidade positiva ou negativa</option></select></div>
        <div><label htmlFor="estoque-quantidade" className="workspace-label">Quantidade</label><input id="estoque-quantidade" className="workspace-input" type="number" step="any" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} /></div>
        <div><label htmlFor="estoque-unidade" className="workspace-label">Unidade informada</label><select id="estoque-unidade" className="workspace-select" value={compra ? "compra" : "consumo"} onChange={(e) => setCompra(e.target.value === "compra")}><option value="consumo">Operacional: {unidade(saldoAtual?.unidadeOperacionalId ?? "")}</option>{!saldoAtual?.cartucho ? <option value="compra">Compra: {unidade(material?.unidadeCompraId ?? "")}</option> : null}</select></div>
        <div><label htmlFor="estoque-motivo" className="workspace-label">Motivo</label><input id="estoque-motivo" className="workspace-input" value={motivo} onChange={(e) => setMotivo(e.target.value)} /></div>
        <button disabled={ocupado || !material || !saldoAtual} className="workspace-button-primary" onClick={() => void acao(() => repos.estoque.movimentar(empresaId, { materialId, tipo, quantidade: Number(quantidade), unidadeId: compra ? material!.unidadeCompraId : saldoAtual!.unidadeOperacionalId, unidadeCompra: compra, motivo, operacaoId: crypto.randomUUID() }, usuarioId))}>Registrar movimento</button>
      </div>
      <p className="mt-3 text-xs">Reservas, consumo real e perdas são registrados no detalhe do Trabalho. Alterações de unidade são bloqueadas após o primeiro uso.</p>
    </SurfaceCard> : null}
    {gerencia ? <SurfaceCard className="p-5">
      <SectionLabel>Troca de cartucho e custo por página</SectionLabel>
      <p className="mt-2 text-xs">A troca utiliza o material, a quantidade e o motivo informados acima. Configure o material como cartucho antes da primeira movimentação.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2"><div><label htmlFor="estoque-equipamento" className="workspace-label">Equipamento</label><select id="estoque-equipamento" className="workspace-select" value={equipamentoId} onChange={(e) => { setEquipamentoId(e.target.value); setCusto(String(custos.find((c) => c.equipamentoId === e.target.value)?.custo ?? 0)); }}><option value="">Selecione...</option>{equipamentos.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}</select></div>
        <button disabled={ocupado || !equipamentoId || !materialId} className="workspace-button-secondary" onClick={() => void acao(() => repos.estoque.registrarTroca(empresaId, { materialId, equipamentoId, quantidade: Number(quantidade), motivo, operacaoId: crypto.randomUUID() }, usuarioId))}>Registrar troca</button>
        <div><label htmlFor="estoque-custo" className="workspace-label">Custo estimado por página (R$)</label><input id="estoque-custo" type="number" min="0" step="0.0001" className="workspace-input" value={custo} onChange={(e) => setCusto(e.target.value)} /></div>
        <button disabled={ocupado || !equipamentoId} className="workspace-button-secondary" onClick={() => void acao(() => repos.estoque.configurarCustoPagina(empresaId, { equipamentoId, custo: Number(custo) }, usuarioId))}>Salvar custo estimado</button>
      </div>
    </SurfaceCard> : null}
    <SurfaceCard className="p-5"><SectionLabel>Histórico de movimentações</SectionLabel><ul className="mt-3 space-y-2">{[...movimentos].reverse().map((m) => <li key={m.id} className="rounded-lg border border-(--border) p-3 text-sm break-words">
      <p className="font-medium">{m.tipo} · {materiais.find((item) => item.id === m.materialId)?.nome} · {m.quantidadeOperacional} {unidade(m.unidadeOperacionalId)}</p><p>{m.motivo}</p><p className="text-xs">{new Date(m.criadoEm).toLocaleString("pt-BR")} · {m.quantidade} × fator {m.fator}</p>
      {m.trabalhoId ? <Link href={`/trabalhos/${m.trabalhoId}`} className="text-(--accent-strong)">Ver Trabalho</Link> : null}
    </li>)}</ul>{!movimentos.length ? <p className="mt-3 text-sm">Nenhuma movimentação registrada.</p> : null}</SurfaceCard>
  </div>;
}
