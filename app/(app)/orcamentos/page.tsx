"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageIntro, StatusPill, SurfaceCard } from "@/components/ui/workspace-primitives";
import { useRepositoriosAutorizados as useRepositories, useSessao } from "@/components/providers/session-provider";
import { papelTemPermissao, PERMISSOES } from "@/lib/rbac";
import { STATUS_ORCAMENTO_LABEL, STATUS_ORCAMENTO_TONE } from "@/lib/orcamentos-ui";
import type { Cliente, Orcamento } from "@/lib/domain/entities";

export default function OrcamentosPage() {
  const repositories = useRepositories();
  const { sessao } = useSessao();
  const empresaId = sessao?.empresaAtiva?.id;
  const papel = sessao?.empresaAtiva?.papel ?? null;
  const podeAcessar = papel ? papelTemPermissao(papel, PERMISSOES.SOLICITACOES_GERENCIAR) : false;

  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);

  useEffect(() => {
    if (!empresaId || !podeAcessar) return;
    void Promise.all([repositories.orcamentos.listar(empresaId), repositories.clientes.listar(empresaId)]).then(
      ([listaOrcamentos, listaClientes]) => {
        setOrcamentos([...listaOrcamentos].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)));
        setClientes(listaClientes);
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId, podeAcessar]);

  if (!empresaId) return null;

  if (!podeAcessar) {
    return (
      <SurfaceCard className="p-5">
        <p className="text-sm text-(--text-secondary)">Seu papel atual nao tem acesso a orcamentos.</p>
      </SurfaceCard>
    );
  }

  const nomeCliente = (id: string | null) => clientes.find((cliente) => cliente.id === id)?.nome ?? "Cliente nao identificado";

  return (
    <div className="flex flex-col gap-4">
      <PageIntro
        eyebrow="Atendimento"
        title="Orcamentos"
        description="Orcamentos criados a partir de solicitacoes. Numero unico por orcamento; versoes (V1, V2...) sao criadas quando o cliente pede alteracao."
      />

      <SurfaceCard className="p-5">
        {orcamentos.length === 0 ? (
          <p className="workspace-empty-state">Nenhum orcamento criado ainda. Comece pela Caixa de entrada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] border-collapse text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-(--text-tertiary)">
                  <th className="border-b border-(--border) py-2 pr-4">Numero</th>
                  <th className="border-b border-(--border) py-2 pr-4">Cliente</th>
                  <th className="border-b border-(--border) py-2 pr-4">Valor</th>
                  <th className="border-b border-(--border) py-2 pr-4">Status</th>
                  <th className="border-b border-(--border) py-2 pr-4" />
                </tr>
              </thead>
              <tbody>
                {orcamentos.map((orcamento) => (
                  <tr key={orcamento.id}>
                    <td className="border-b border-(--border) py-3 pr-4 font-medium text-(--text-primary)">
                      {orcamento.numero} <span className="text-(--text-tertiary)">V{orcamento.versao}</span>
                    </td>
                    <td className="border-b border-(--border) py-3 pr-4 text-(--text-secondary)">{nomeCliente(orcamento.clienteId)}</td>
                    <td className="border-b border-(--border) py-3 pr-4 text-(--text-secondary)">R$ {orcamento.valorTotal.toFixed(2)}</td>
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
