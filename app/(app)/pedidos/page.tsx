"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageIntro, StatusPill, SurfaceCard } from "@/components/ui/workspace-primitives";
import { useRepositoriosAutorizados as useRepositories, useSessao } from "@/components/providers/session-provider";
import { papelTemPermissao, PERMISSOES } from "@/lib/rbac";
import type { Cliente, Pedido, Recebimento } from "@/lib/domain/entities";

const ORIGEM_LABEL: Record<Pedido["origem"], string> = { email: "E-mail", balcao: "Balcão" };
const STATUS_ENTREGA_LABEL: Record<Pedido["statusEntrega"], string> = {
  aguardando_producao: "Aguardando produção",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export default function PedidosPage() {
  const repositories = useRepositories();
  const { sessao } = useSessao();
  const empresaId = sessao?.empresaAtiva?.id;
  const papel = sessao?.empresaAtiva?.papel ?? null;
  const podeAcessar = papel ? papelTemPermissao(papel, PERMISSOES.SOLICITACOES_GERENCIAR) : false;

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [recebimentosPorPedido, setRecebimentosPorPedido] = useState<Record<string, Recebimento[]>>({});

  useEffect(() => {
    if (!empresaId || !podeAcessar) return;
    void (async () => {
      const [listaPedidos, listaClientes] = await Promise.all([repositories.pedidos.listar(empresaId), repositories.clientes.listar(empresaId)]);
      const ordenados = [...listaPedidos].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
      setPedidos(ordenados);
      setClientes(listaClientes);
      const entradas = await Promise.all(ordenados.map(async (pedido) => [pedido.id, await repositories.recebimentos.listarPorPedido(pedido.id)] as const));
      setRecebimentosPorPedido(Object.fromEntries(entradas));
    })();
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

  const nomeCliente = (id: string | null) => clientes.find((cliente) => cliente.id === id)?.nome ?? "Consumidor não identificado";

  return (
    <div className="flex flex-col gap-4">
      <PageIntro
        eyebrow="Atendimento"
        title="Pedidos"
        description="Mesmo conceito comercial, venha de e-mail/orçamento aprovado ou de atendimento de balcão. A decomposição em trabalhos e o Kanban chegam na SPEC 05."
      />

      <SurfaceCard className="p-5">
        {pedidos.length === 0 ? (
          <p className="workspace-empty-state">Nenhum pedido ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-(--text-tertiary)">
                  <th className="border-b border-(--border) py-2 pr-4">Numero</th>
                  <th className="border-b border-(--border) py-2 pr-4">Origem</th>
                  <th className="border-b border-(--border) py-2 pr-4">Cliente</th>
                  <th className="border-b border-(--border) py-2 pr-4">Valor / Saldo</th>
                  <th className="border-b border-(--border) py-2 pr-4">Entrega</th>
                  <th className="border-b border-(--border) py-2 pr-4" />
                </tr>
              </thead>
              <tbody>
                {pedidos.map((pedido) => {
                  const recebido = (recebimentosPorPedido[pedido.id] ?? []).reduce((soma, item) => soma + item.valor, 0);
                  const saldo = Math.max(0, pedido.valorTotal - recebido);
                  return (
                    <tr key={pedido.id}>
                      <td className="border-b border-(--border) py-3 pr-4 font-medium text-(--text-primary)">{pedido.numero}</td>
                      <td className="border-b border-(--border) py-3 pr-4 text-(--text-secondary)">{ORIGEM_LABEL[pedido.origem]}</td>
                      <td className="border-b border-(--border) py-3 pr-4 text-(--text-secondary)">{nomeCliente(pedido.clienteId)}</td>
                      <td className="border-b border-(--border) py-3 pr-4 text-(--text-secondary)">
                        R$ {pedido.valorTotal.toFixed(2)}
                        {saldo > 0 ? <span className="ml-1 text-(--warning)">(saldo R$ {saldo.toFixed(2)})</span> : null}
                      </td>
                      <td className="border-b border-(--border) py-3 pr-4">
                        <StatusPill tone={pedido.statusEntrega === "concluido" ? "success" : "warning"}>{STATUS_ENTREGA_LABEL[pedido.statusEntrega]}</StatusPill>
                      </td>
                      <td className="border-b border-(--border) py-3 pr-4 text-right">
                        <Link href={`/pedidos/${pedido.id}`} className="workspace-button-secondary">
                          Abrir
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SurfaceCard>
    </div>
  );
}
