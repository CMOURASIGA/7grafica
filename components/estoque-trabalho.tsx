"use client";
import { useEffect, useState } from "react";
import { useRepositoriosAutorizados, useSessao } from "./providers/session-provider";
import { SurfaceCard, SectionLabel } from "./ui/workspace-primitives";
import { useToast } from "./ui/toast";
import type { Material, Trabalho, UnidadeMedida } from "@/lib/domain/entities";
import type { ConsumoTrabalho, SaldoEstoque } from "@/lib/domain/estoque";

export function EstoqueTrabalho({ trabalho }: { trabalho: Trabalho }) {
  const repos = useRepositoriosAutorizados(), { sessao } = useSessao(), { showToast } = useToast();
  const [materiais, setMateriais] = useState<Material[]>([]), [unidades, setUnidades] = useState<UnidadeMedida[]>([]);
  const [consumos, setConsumos] = useState<ConsumoTrabalho[]>([]), [saldos, setSaldos] = useState<SaldoEstoque[]>([]);
  const [materialId, setMaterialId] = useState(trabalho.materialId ?? ""), [quantidade, setQuantidade] = useState(""), [motivo, setMotivo] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const papel = sessao?.empresaAtiva?.papel, gerente = papel === "admin" || papel === "gerente";
  const executa = gerente || (papel === "operador" && trabalho.responsavelUsuarioId === sessao?.usuario.id);
  const finalizado = ["concluido", "cancelado"].includes(trabalho.situacao);
  async function carregar() {
    const [m, u, c, s] = await Promise.all([repos.materiais.listar(trabalho.empresaId), repos.unidadesMedida.listar(trabalho.empresaId), repos.estoque.listarPorTrabalho(trabalho.empresaId, trabalho.id), repos.estoque.listar(trabalho.empresaId)]);
    setMateriais(m); setUnidades(u); setConsumos(c); setSaldos(s);
  }
  useEffect(() => { void carregar().catch((e) => showToast(e.message, "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trabalho.id, repos]);
  const unidade = (id: string) => unidades.find((u) => u.id === id)?.sigla ?? id;
  async function executar(tipo: "planejar" | "reserva" | "liberacao" | "consumo" | "perda") {
    if (!sessao || ocupado) return;
    setOcupado(true);
    try {
      const saldo = saldos.find((s) => s.materialId === materialId); if (!saldo) throw new Error("Selecione o material.");
      if (tipo === "planejar") await repos.estoque.planejar(trabalho.empresaId, { trabalhoId: trabalho.id, materialId, quantidade: Number(quantidade) }, sessao.usuario.id);
      else await repos.estoque.movimentar(trabalho.empresaId, { trabalhoId: trabalho.id, materialId, tipo, quantidade: Number(quantidade), unidadeId: saldo.unidadeOperacionalId, motivo, operacaoId: crypto.randomUUID() }, sessao.usuario.id);
      await carregar(); showToast("Estoque do Trabalho atualizado.", "success");
    } catch (e) { showToast(e instanceof Error ? e.message : "Falha na operação.", "error"); }
    finally { setOcupado(false); }
  }
  return <SurfaceCard className="p-5 min-w-0">
    <SectionLabel>Materiais do Trabalho</SectionLabel>
    <p className="mt-2 text-xs">Previsto, consumo real e perdas na unidade operacional. Reservar não reduz o saldo físico.</p>
    <div className="mt-3 grid gap-3 sm:grid-cols-2">{consumos.map((c) => <article key={c.materialId} className="rounded-xl border border-(--border) p-3 text-sm">
      <p className="font-semibold">{materiais.find((m) => m.id === c.materialId)?.nome}</p>
      <p>Previsto: {c.previsto} · Real: {c.real} · Perda: {c.perda} {unidade(c.unidadeOperacionalId)}</p>
      <p>Reservado: {c.reservado} · Desvio (real + perda − previsto): {(c.real + c.perda - c.previsto).toFixed(2)}</p>
    </article>)}</div>
    {!consumos.length ? <p className="mt-3 text-sm">Nenhum consumo planejado ou registrado.</p> : null}
    {executa ? <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <div><label htmlFor="consumo-material" className="workspace-label">Material do consumo</label><select id="consumo-material" className="workspace-select" value={materialId} onChange={(e) => setMaterialId(e.target.value)}><option value="">Selecione...</option>{materiais.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}</select></div>
      <div><label htmlFor="consumo-quantidade" className="workspace-label">Quantidade operacional ({unidade(saldos.find((s) => s.materialId === materialId)?.unidadeOperacionalId ?? "")})</label><input id="consumo-quantidade" className="workspace-input" type="number" min="0" step="any" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} /></div>
      <div className="sm:col-span-2"><label htmlFor="consumo-motivo" className="workspace-label">Motivo do movimento</label><input id="consumo-motivo" className="workspace-input" value={motivo} onChange={(e) => setMotivo(e.target.value)} /></div>
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        {gerente && !finalizado ? <><button disabled={ocupado} className="workspace-button-secondary" onClick={() => void executar("planejar")}>Salvar previsão</button><button disabled={ocupado} className="workspace-button-secondary" onClick={() => void executar("reserva")}>Reservar material</button></> : null}
        {gerente ? <button disabled={ocupado} className="workspace-button-secondary" onClick={() => void executar("liberacao")}>Liberar reserva</button> : null}
        {!finalizado ? <><button disabled={ocupado} className="workspace-button-primary" onClick={() => void executar("consumo")}>Registrar consumo</button><button disabled={ocupado} className="workspace-button-secondary" onClick={() => void executar("perda")}>Registrar perda</button></> : null}
      </div>
    </div> : null}
  </SurfaceCard>;
}
