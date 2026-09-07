"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageIntro, StatusPill, SurfaceCard } from "@/components/ui/workspace-primitives";
import { useRepositoriosAutorizados as useRepositories, useSessao } from "@/components/providers/session-provider";
import { papelTemPermissao, PERMISSOES } from "@/lib/rbac";
import type { Cliente, Pedido } from "@/lib/domain/entities";

export default function PedidosPage() {
  const repositories = useRepositories();
  const { sessao } = useSessao();
  const empresaId = sessao?.empresaAtiva?.id;
  const papel = sessao?.empresaAtiva?.papel ?? null;
  const podeAcessar = papel ? papelTemPermissao(papel, PERMISSOES.SOLICITACOES_GERENCIAR) : false;

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);

  useEffect(() => {
    if (!empresaId || !podeAcessar) return;
    void Promise.all([repositories.pedidos.listar(empresaId), repositories.clientes.listar(empresaId)]).then(
      ([listaPedidos, listaClientes]) => {
        setPedidos([...listaPedidos].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)));
        setClientes(listaClientes);
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId, podeAcessar]);

  if (!empresaId) return null;

  if (!podeAcessar) {
    return (
      <SurfaceCard className="p-5">
        <p className="text-sm text-(--text-secondary)">Seu papel atual nao tem acesso a pedidos.</p>
      </SurfaceCard>
    );
  }

  const nomeCliente = (id: string | null) => clientes.find((cliente) => cliente.id === id)?.nome ?? "Cliente nao identificado";

  return (
    <div className="flex flex-col gap-4">
      <PageIntro
        eyebrow="Atendimento"
        title="Pedidos"
        description="Gerados automaticamente quando um orcamento e aprovado. A decomposicao em trabalhos e o Kanban chegam na SPEC 05."
      />

      <SurfaceCard className="p-5">
        {pedidos.length === 0 ? (
          <p className="workspace-empty-state">Nenhum pedido ainda — aprove um orcamento para gerar o primeiro.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-(--text-tertiary)">
                  <th className="border-b border-(--border) py-2 pr-4">Numero</th>
                  <th className="border-b border-(--border) py-2 pr-4">Cliente</th>
                  <th className="border-b border-(--border) py-2 pr-4">Criado em</th>
                  <th className="border-b border-(--border) py-2 pr-4">Status</th>
                  <th className="border-b border-(--border) py-2 pr-4" />
                </tr>
              </thead>
              <tbody>
                {pedidos.map((pedido) => (
                  <tr key={pedido.id}>
                    <td className="border-b border-(--border) py-3 pr-4 font-medium text-(--text-primary)">{pedido.numero}</td>
                    <td className="border-b border-(--border) py-3 pr-4 text-(--text-secondary)">{nomeCliente(pedido.clienteId)}</td>
                    <td className="border-b border-(--border) py-3 pr-4 text-(--text-secondary)">{new Date(pedido.criadoEm).toLocaleDateString("pt-BR")}</td>
                    <td className="border-b border-(--border) py-3 pr-4">
                      <StatusPill tone="success">Confirmado</StatusPill>
                    </td>
                    <td className="border-b border-(--border) py-3 pr-4 text-right">
                      <Link href={`/orcamentos/${pedido.orcamentoId}`} className="workspace-button-secondary">
                        Ver orcamento
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
