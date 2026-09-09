"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRepositoriosAutorizados, useSessao } from "./providers/session-provider";
import { SurfaceCard, SectionLabel } from "./ui/workspace-primitives";
import { useToast } from "./ui/toast";
import { lerMetadadosArquivo } from "@/lib/domain/ler-metadados-arquivo";
import type { Arquivo, Trabalho } from "@/lib/domain/entities";

export function ArquivosComerciais({ empresaId, pedidoId = null, solicitacaoId = null }: { empresaId: string; pedidoId?: string | null; solicitacaoId?: string | null }) {
  const repos = useRepositoriosAutorizados();
  const { sessao } = useSessao();
  const { showToast } = useToast();
  const [arquivos, setArquivos] = useState<Arquivo[]>([]);
  const [trabalhos, setTrabalhos] = useState<Trabalho[]>([]);
  const [ocupado, setOcupado] = useState(false);
  async function carregar() {
    const [lista, operacionais] = await Promise.all([
      pedidoId ? repos.arquivos.listarPorPedido(pedidoId) : repos.arquivos.listarPorSolicitacao(solicitacaoId!),
      pedidoId ? repos.trabalhos.listarPorPedido(pedidoId) : Promise.resolve([]),
    ]);
    setArquivos(lista); setTrabalhos(operacionais);
  }
  useEffect(() => { void carregar().catch((erro) => showToast(erro.message, "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedidoId, solicitacaoId]);
  async function receber(file?: File) {
    if (!file || !sessao) return;
    setOcupado(true);
    try {
      const dados = await lerMetadadosArquivo(file);
      await repos.arquivos.receber({ ...dados, empresaId, pedidoId, solicitacaoId, trabalhoId: null, tipo: "cliente", origem: "upload_interno", enviadoPorUsuarioId: sessao.usuario.id }, sessao.usuario.id);
      await carregar(); showToast("Arquivo registrado. Conteúdo mantido externamente.", "success");
    } catch (erro) { showToast(erro instanceof Error ? erro.message : "Falha ao receber arquivo.", "error"); }
    finally { setOcupado(false); }
  }
  return <SurfaceCard className="min-w-0 p-5">
    <SectionLabel>Arquivos recebidos</SectionLabel>
    <p className="mt-2 text-xs">Selecione um arquivo para registrar seus metadados. Guarde o conteúdo externamente.</p>
    <label className="workspace-label mt-3" htmlFor="arquivo-comercial">Receber arquivo</label>
    <input id="arquivo-comercial" type="file" className="w-full min-w-0 text-sm" disabled={ocupado} onChange={(e) => { void receber(e.target.files?.[0]); e.target.value = ""; }} />
    <ul className="mt-3 space-y-3">{arquivos.map((arquivo) => <li key={arquivo.id} className="break-words rounded-lg border border-(--border) p-3 text-sm">
      <p>{arquivo.nome} · V{arquivo.versao} · Preflight: {arquivo.analise?.status}</p>
      {arquivo.trabalhoId ? <Link className="text-(--accent-strong)" href={`/trabalhos/${arquivo.trabalhoId}`}>Ver versões e aprovações no Trabalho</Link> : trabalhos.length ? <>
        <label htmlFor={`vinculo-${arquivo.id}`} className="workspace-label mt-2">Vincular ao Trabalho</label>
        <select id={`vinculo-${arquivo.id}`} className="workspace-select" value="" onChange={async (e) => {
          if (!e.target.value || !sessao) return;
          try { await repos.arquivos.vincularTrabalho(arquivo.id, e.target.value, sessao.usuario.id); await carregar(); }
          catch (erro) { showToast(erro instanceof Error ? erro.message : "Falha no vínculo.", "error"); }
        }}><option value="">Selecione...</option>{trabalhos.map((trabalho) => <option key={trabalho.id} value={trabalho.id}>{trabalho.codigo} · {trabalho.descricao}</option>)}</select>
      </> : <p className="text-xs">Aguardando vinculação operacional.</p>}
    </li>)}</ul>
  </SurfaceCard>;
}
