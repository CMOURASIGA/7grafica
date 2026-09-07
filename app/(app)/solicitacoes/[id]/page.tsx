"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageIntro, StatusPill, SurfaceCard } from "@/components/ui/workspace-primitives";
import { useToast } from "@/components/ui/toast";
import { useRepositoriosAutorizados as useRepositories, useSessao } from "@/components/providers/session-provider";
import { papelTemPermissao, PERMISSOES } from "@/lib/rbac";
import { STATUS_ORCAMENTO_LABEL, STATUS_ORCAMENTO_TONE } from "@/lib/orcamentos-ui";
import type { Cliente, Orcamento, Solicitacao } from "@/lib/domain/entities";

export default function SolicitacaoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const repositories = useRepositories();
  const router = useRouter();
  const { sessao } = useSessao();
  const { showToast } = useToast();
  const empresaId = sessao?.empresaAtiva?.id;
  const papel = sessao?.empresaAtiva?.papel ?? null;
  const podeAcessar = papel ? papelTemPermissao(papel, PERMISSOES.SOLICITACOES_GERENCIAR) : false;

  const [solicitacao, setSolicitacao] = useState<Solicitacao | null>(null);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [carregando, setCarregando] = useState(true);

  async function recarregar() {
    if (!podeAcessar) {
      setCarregando(false);
      return;
    }
    const atual = await repositories.solicitacoes.obter(id);
    setSolicitacao(atual);
    if (atual?.clienteId) {
      setCliente(await repositories.clientes.obter(atual.clienteId));
    }
    setOrcamentos(await repositories.orcamentos.listarPorSolicitacao(id));
    setCarregando(false);
  }

  useEffect(() => {
    void recarregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, podeAcessar]);

  if (carregando) return null;

  if (!podeAcessar) {
    return (
      <SurfaceCard className="p-5">
        <p className="text-sm text-(--text-secondary)">Seu papel atual nao tem acesso a solicitacoes.</p>
      </SurfaceCard>
    );
  }

  if (!solicitacao || !empresaId) {
    return (
      <SurfaceCard className="p-5">
        <p className="text-sm text-(--text-secondary)">Solicitacao nao encontrada.</p>
        <Link href="/solicitacoes" className="mt-3 inline-block workspace-button-secondary">
          Voltar
        </Link>
      </SurfaceCard>
    );
  }

  async function handleNovoOrcamento() {
    try {
      const orcamento = await repositories.orcamentos.criar({
        empresaId: empresaId!,
        solicitacaoId: solicitacao!.id,
        clienteId: solicitacao!.clienteId,
        versao: 1,
        itens: [],
        prazoEntregaDias: null,
        validadeAte: null,
        observacoes: null,
        valorTotal: 0,
      });
      if (solicitacao!.status === "nova") {
        await repositories.solicitacoes.atualizar(solicitacao!.id, { status: "orcamento_criado" });
      }
      await repositories.auditoria.registrar({
        empresaId: empresaId!,
        usuarioId: sessao!.usuario.id,
        acao: "orcamento.criar",
        entidade: "orcamentos",
        entidadeId: orcamento.id,
        dadosAntes: null,
        dadosDepois: { solicitacaoId: solicitacao!.id, numero: orcamento.numero },
      });
      router.push(`/orcamentos/${orcamento.id}`);
    } catch (erro) {
      showToast(erro instanceof Error ? erro.message : "Falha ao criar orcamento.", "error");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PageIntro
        eyebrow="Solicitacao"
        title={solicitacao.assunto}
        description={cliente ? `Cliente: ${cliente.nome}` : "Cliente nao identificado"}
        aside={<button type="button" className="workspace-button-primary" onClick={() => void handleNovoOrcamento()}>+ Novo orcamento</button>}
      />
      <Link href="/solicitacoes" className="text-xs font-medium text-(--accent-strong) hover:underline">
        ← Voltar para caixa de entrada
      </Link>

      <SurfaceCard className="p-5">
        <p className="text-sm leading-6 text-(--text-secondary)">{solicitacao.descricao}</p>
      </SurfaceCard>

      <SurfaceCard className="p-5">
        <p className="workspace-section-label">Orcamentos desta solicitacao</p>
        {orcamentos.length === 0 ? (
          <p className="mt-3 workspace-empty-state">Nenhum orcamento criado ainda.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[480px] border-collapse text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-(--text-tertiary)">
                  <th className="border-b border-(--border) py-2 pr-4">Numero</th>
                  <th className="border-b border-(--border) py-2 pr-4">Versao</th>
                  <th className="border-b border-(--border) py-2 pr-4">Valor</th>
                  <th className="border-b border-(--border) py-2 pr-4">Status</th>
                  <th className="border-b border-(--border) py-2 pr-4" />
                </tr>
              </thead>
              <tbody>
                {[...orcamentos].sort((a, b) => a.versao - b.versao).map((orcamento) => (
                  <tr key={orcamento.id}>
                    <td className="border-b border-(--border) py-3 pr-4 font-medium text-(--text-primary)">{orcamento.numero}</td>
                    <td className="border-b border-(--border) py-3 pr-4">V{orcamento.versao}</td>
                    <td className="border-b border-(--border) py-3 pr-4">R$ {orcamento.valorTotal.toFixed(2)}</td>
                    <td className="border-b border-(--border) py-3 pr-4">
                      <StatusPill tone={STATUS_ORCAMENTO_TONE[orcamento.status]}>{STATUS_ORCAMENTO_LABEL[orcamento.status]}</StatusPill>
                    </td>
                    <td className="border-b border-(--border) py-3 pr-4 text-right">
                      <Link href={`/orcamentos/${orcamento.id}`} className="workspace-button-secondary">
                        Abrir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SurfaceCard>
    </div>
  );
}
