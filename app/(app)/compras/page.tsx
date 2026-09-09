"use client";
import { useEffect, useState } from "react";
import { useRepositoriosAutorizados, useSessao } from "@/components/providers/session-provider";
import { PageIntro, SurfaceCard, SectionLabel, StatusPill } from "@/components/ui/workspace-primitives";
import { useToast } from "@/components/ui/toast";
import type { Fornecedor, Material, UnidadeMedida } from "@/lib/domain/entities";
import type { PedidoCompra, ContaPagarCompra, RecebimentoCompra } from "@/lib/domain/estoque";

export default function ComprasPage() {
  const repos = useRepositoriosAutorizados(), { sessao } = useSessao(), { showToast } = useToast();
  const empresaId = sessao?.empresaAtiva?.id, usuarioId = sessao?.usuario.id, papel = sessao?.empresaAtiva?.papel;
  const permitido = papel === "admin" || papel === "gerente";
  const [materiais, setMateriais] = useState<Material[]>([]), [fornecedores, setFornecedores] = useState<Fornecedor[]>([]), [unidades, setUnidades] = useState<UnidadeMedida[]>([]);
  const [compras, setCompras] = useState<PedidoCompra[]>([]), [titulos, setTitulos] = useState<ContaPagarCompra[]>([]), [recebimentos, setRecebimentos] = useState<RecebimentoCompra[]>([]);
  const [fornecedorId, setFornecedorId] = useState(""), [materialId, setMaterialId] = useState(""), [quantidade, setQuantidade] = useState(""), [preco, setPreco] = useState(""), [cotacao, setCotacao] = useState("");
  const [itens, setItens] = useState<{ materialId: string; unidadeId: string; quantidade: number; precoUnitario: number }[]>([]);
  const [compraId, setCompraId] = useState(""), [quantidades, setQuantidades] = useState<Record<string, string>>({}), [documento, setDocumento] = useState(""), [vencimento, setVencimento] = useState(""), [motivo, setMotivo] = useState("");
  const [ocupado, setOcupado] = useState(false);
  async function carregar() {
    if (!empresaId || !permitido) return;
    const [m, f, u, c, t, r] = await Promise.all([repos.materiais.listar(empresaId), repos.fornecedores.listar(empresaId), repos.unidadesMedida.listar(empresaId), repos.compras.listar(empresaId), repos.compras.listarContasPagar(empresaId), repos.compras.listarRecebimentos(empresaId)]);
    setMateriais(m); setFornecedores(f); setUnidades(u); setCompras(c); setTitulos(t); setRecebimentos(r);
  }
  useEffect(() => { void carregar().catch((e) => showToast(e.message, "error")); setMaterialId(new URLSearchParams(window.location.search).get("material") ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId, permitido, repos]);
  async function acao(fn: () => Promise<void>, sucesso: string) {
    if (ocupado) return; setOcupado(true);
    try { await fn(); await carregar(); showToast(sucesso, "success"); }
    catch (e) { showToast(e instanceof Error ? e.message : "Falha na compra.", "error"); }
    finally { setOcupado(false); }
  }
  if (!empresaId || !usuarioId) return null;
  if (!permitido) return <SurfaceCard className="p-5">Seu papel não permite gerenciar compras.</SurfaceCard>;
  const nomeMaterial = (id: string) => materiais.find((m) => m.id === id)?.nome ?? id;
  const sigla = (id: string) => unidades.find((u) => u.id === id)?.sigla ?? id;
  const moeda = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const selecionada = compras.find((c) => c.id === compraId);
  return <div className="flex flex-col gap-4">
    <PageIntro eyebrow="Suprimentos" title="Compras" description="Reposição de materiais, recebimentos parciais e títulos de origem." />
    <SurfaceCard className="p-5"><SectionLabel>Novo pedido de compra</SectionLabel>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div><label htmlFor="compra-fornecedor" className="workspace-label">Fornecedor</label><select id="compra-fornecedor" className="workspace-select" value={fornecedorId} onChange={(e) => setFornecedorId(e.target.value)}><option value="">Selecione...</option>{fornecedores.filter((f) => f.ativo).map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}</select></div>
        <div><label htmlFor="compra-cotacao" className="workspace-label">Referência da cotação (opcional)</label><input id="compra-cotacao" className="workspace-input" value={cotacao} onChange={(e) => setCotacao(e.target.value)} /></div>
        <div><label htmlFor="compra-material" className="workspace-label">Material da compra</label><select id="compra-material" className="workspace-select" value={materialId} onChange={(e) => setMaterialId(e.target.value)}><option value="">Selecione...</option>{materiais.filter((m) => m.ativo).map((m) => <option key={m.id} value={m.id}>{m.nome} ({sigla(m.unidadeCompraId)})</option>)}</select></div>
        <div><label htmlFor="compra-quantidade" className="workspace-label">Quantidade na unidade de compra</label><input id="compra-quantidade" type="number" min="0" step="any" className="workspace-input" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} /></div>
        <div><label htmlFor="compra-preco" className="workspace-label">Preço por unidade de compra (R$)</label><input id="compra-preco" type="number" min="0" step="0.01" className="workspace-input" value={preco} onChange={(e) => setPreco(e.target.value)} /></div>
        <button className="workspace-button-secondary" onClick={() => { const m = materiais.find((m) => m.id === materialId); if (!m || !quantidade || !preco || Number(quantidade) <= 0 || Number(preco) < 0) return showToast("Informe material, quantidade e preço válidos.", "error"); setItens((antes) => [...antes, { materialId, unidadeId: m.unidadeCompraId, quantidade: Number(quantidade), precoUnitario: Number(preco) }]); }}>Adicionar item</button>
      </div>
      <ul className="mt-3 space-y-2">{itens.map((i, index) => <li key={index} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-(--border) p-3 text-sm"><span>{nomeMaterial(i.materialId)} · {i.quantidade} {sigla(i.unidadeId)} · {moeda(i.quantidade * i.precoUnitario)}</span><button className="workspace-button-secondary" onClick={() => setItens((itens) => itens.filter((_, idx) => idx !== index))}>Remover item {index + 1}</button></li>)}</ul>
      <p className="my-3 font-semibold">Total: {moeda(itens.reduce((s, i) => s + i.quantidade * i.precoUnitario, 0))}</p>
      <button disabled={ocupado || !itens.length} className="workspace-button-primary" onClick={() => void acao(async () => { await repos.compras.criar(empresaId, { fornecedorId, cotacao, itens, operacaoId: crypto.randomUUID() }, usuarioId); setItens([]); }, "Pedido de compra criado.")}>Criar pedido de compra</button>
    </SurfaceCard>
    <SurfaceCard className="p-5"><SectionLabel>Pedidos de compra</SectionLabel><ul className="mt-3 grid gap-3 sm:grid-cols-2">{compras.map((c) => <li key={c.id} className="rounded-xl border border-(--border) p-4 min-w-0"><div className="flex flex-wrap justify-between gap-2"><h2 className="font-semibold">{c.numero}</h2><StatusPill tone={c.situacao === "recebido" ? "success" : "neutral"}>{c.situacao}</StatusPill></div><p className="text-sm">{c.fornecedorNome}</p>{c.cotacao ? <p className="text-xs break-words">Cotação: {c.cotacao}</p> : null}<ul className="my-3 text-sm">{c.itens.map((i) => <li key={i.id}>{i.nome}: {i.recebido}/{i.quantidade} {sigla(i.unidadeId)} · fator {i.fator}</li>)}</ul>{["aberto", "parcial"].includes(c.situacao) ? <button className="workspace-button-secondary" onClick={() => { setCompraId(c.id); setQuantidades({}); setDocumento(""); setMotivo(""); }}>Receber ou cancelar {c.numero}</button> : null}</li>)}</ul></SurfaceCard>
    {selecionada && ["aberto", "parcial"].includes(selecionada.situacao) ? <SurfaceCard className="p-5"><SectionLabel>Recebimento {selecionada.numero}</SectionLabel><p className="mt-2 text-xs">Informe somente o que chegou. Saldo pendente permanece aberto.</p><div className="mt-3 grid gap-3 sm:grid-cols-2">{selecionada.itens.filter((i) => i.recebido < i.quantidade).map((i) => <div key={i.id}><label htmlFor={`receber-${i.id}`} className="workspace-label">Receber {i.nome} ({sigla(i.unidadeId)}, saldo {i.quantidade - i.recebido})</label><input id={`receber-${i.id}`} className="workspace-input" type="number" min="0" step="any" value={quantidades[i.id] ?? ""} onChange={(e) => setQuantidades((antes) => ({ ...antes, [i.id]: e.target.value }))} /></div>)}<div><label htmlFor="compra-documento" className="workspace-label">Documento do recebimento</label><input id="compra-documento" className="workspace-input" value={documento} onChange={(e) => setDocumento(e.target.value)} /></div><div><label htmlFor="compra-vencimento" className="workspace-label">Vencimento da conta a pagar</label><input id="compra-vencimento" type="date" className="workspace-input" value={vencimento} onChange={(e) => setVencimento(e.target.value)} /></div></div>
      <button disabled={ocupado} className="workspace-button-primary mt-3" onClick={() => void acao(async () => { await repos.compras.receber(empresaId, { compraId, documento, vencimento, operacaoId: crypto.randomUUID(), itens: Object.entries(quantidades).filter(([, q]) => q !== "" && Number(q) !== 0).map(([itemId, q]) => ({ itemId, quantidade: Number(q) })) }, usuarioId); setQuantidades({}); setDocumento(""); }, "Recebimento registrado: estoque e conta a pagar atualizados.")}>Confirmar recebimento</button>
      <div className="mt-4"><label htmlFor="compra-cancelamento" className="workspace-label">Motivo para cancelar o saldo não recebido</label><input id="compra-cancelamento" className="workspace-input" value={motivo} onChange={(e) => setMotivo(e.target.value)} /><button disabled={ocupado} className="workspace-button-secondary mt-2" onClick={() => void acao(() => repos.compras.cancelar(empresaId, { compraId, motivo }, usuarioId), "Saldo de compra cancelado. Recebimentos preservados.")}>Cancelar saldo pendente</button></div>
    </SurfaceCard> : null}
    <SurfaceCard className="p-5"><SectionLabel>Recebimentos e contas a pagar de origem</SectionLabel><p className="mt-2 text-xs">Títulos gerados pelos recebimentos. Pagamento e conciliação fazem parte da próxima etapa financeira.</p><ul className="mt-3 space-y-2">{titulos.map((t) => <li key={t.id} className="rounded-lg border border-(--border) p-3 text-sm"><p>{compras.find((c) => c.id === t.compraId)?.numero} · Documento {recebimentos.find((r) => r.id === t.recebimentoId)?.documento}</p><p>{moeda(t.valor)} · Vencimento {t.vencimento.split("-").reverse().join("/")} · {t.situacao}</p></li>)}</ul></SurfaceCard>
  </div>;
}
