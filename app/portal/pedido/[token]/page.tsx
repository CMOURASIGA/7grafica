"use client";

import { use, useEffect, useState } from "react";
import { useRepositories } from "@/lib/repositories";
import { resolverIdentidadeCanto } from "@/lib/whitelabel";
import { StatusPill } from "@/components/ui/workspace-primitives";
import { QrCode } from "@/components/comprovante/qr-code";
import type { Cliente, Empresa, FormaPagamento, Pedido, Recebimento } from "@/lib/domain/entities";

const STATUS_ENTREGA_LABEL: Record<Pedido["statusEntrega"], string> = {
  aguardando_producao: "Aguardando produção",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

/**
 * Comprovante de Pedido — pagina publica, sem autenticacao (o "codigo
 * seguro"/QR Code que acompanha o pedido). Nunca chamar de "cupom fiscal":
 * este documento nao tem funcao fiscal. Mesma limitacao de MVP em
 * LocalStorage do link de orcamento — ver docs/MVP-LOCALSTORAGE.md.
 */
export default function ComprovantePedidoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const repositories = useRepositories();

  const [pedido, setPedido] = useState<Pedido | null | undefined>(undefined);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [recebimentos, setRecebimentos] = useState<Recebimento[]>([]);
  const [formasPagamento, setFormasPagamento] = useState<FormaPagamento[]>([]);
  const [origemUrl, setOrigemUrl] = useState("");

  useEffect(() => {
    setOrigemUrl(window.location.href);
  }, []);

  useEffect(() => {
    void (async () => {
      const acessoSeguro = await repositories.portalCliente.buscarPedidoPorToken(token);
      // Compatibilidade com comprovantes emitidos nas SPECs 03/04. Novos
      // links do Portal usam TokenPedidoPortal com expiracao e revogacao.
      const atual = acessoSeguro?.pedido ?? await repositories.pedidos.buscarPorToken(token);
      setPedido(atual);
      if (atual) {
        const [empresaAtual, clienteAtual, listaRecebimentos, listaFormas] = await Promise.all([
          repositories.empresas.obter(atual.empresaId),
          atual.clienteId ? repositories.clientes.obter(atual.clienteId) : Promise.resolve(null),
          acessoSeguro ? Promise.resolve(acessoSeguro.recebimentos) : repositories.recebimentos.listarPorPedido(atual.id),
          repositories.formasPagamento.listar(atual.empresaId),
        ]);
        setEmpresa(empresaAtual);
        setCliente(clienteAtual);
        setRecebimentos(listaRecebimentos);
        setFormasPagamento(listaFormas);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const identidade = resolverIdentidadeCanto(empresa);

  if (pedido === undefined) return null;

  if (pedido === null) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-4 py-10 text-center">
        <p className="text-sm text-(--text-secondary)">Link invalido ou expirado.</p>
      </div>
    );
  }

  const valorRecebido = recebimentos.reduce((soma, item) => soma + item.valor, 0);
  const saldo = Math.max(0, pedido.valorTotal - valorRecebido);
  const nomeForma = (id: string) => formasPagamento.find((forma) => forma.id === id)?.nome ?? "—";

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-4 px-4 py-10">
      <div className="flex items-center gap-3">
        <img src={identidade.logoUrl} alt={identidade.nomeCliente ?? "Consult Services Tecnologia"} className="h-12 w-12 rounded-lg object-contain" />
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-(--accent)">Comprovante de Pedido</p>
          <p className="text-sm text-(--text-secondary)">{pedido.numero}</p>
        </div>
      </div>

      <section className="rounded-[1.8rem] border border-(--border) bg-(--bg-surface) p-6 shadow-[var(--shadow-card)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-(--text-primary)">{cliente?.nome ?? "Consumidor não identificado"}</h1>
            <p className="text-xs text-(--text-tertiary)">{new Date(pedido.criadoEm).toLocaleString("pt-BR")}</p>
          </div>
          <StatusPill tone={pedido.statusEntrega === "concluido" ? "success" : "warning"}>{STATUS_ENTREGA_LABEL[pedido.statusEntrega]}</StatusPill>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-(--text-tertiary)">
                <th className="border-b border-(--border) py-2 pr-4">Item</th>
                <th className="border-b border-(--border) py-2 pr-4">Qtd.</th>
                <th className="border-b border-(--border) py-2 pr-4">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {pedido.itens.map((item) => (
                <tr key={item.id}>
                  <td className="border-b border-(--border) py-3 pr-4 text-(--text-primary)">
                    {item.descricao}
                    {item.acabamentos ? <span className="block text-xs text-(--text-tertiary)">{item.acabamentos}</span> : null}
                  </td>
                  <td className="border-b border-(--border) py-3 pr-4 text-(--text-secondary)">{item.quantidade}</td>
                  <td className="border-b border-(--border) py-3 pr-4 text-(--text-secondary)">R$ {(item.quantidade * item.precoUnitario).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-(--bg-muted) p-3">
            <p className="text-xs text-(--text-tertiary)">Total</p>
            <p className="text-lg font-semibold text-(--text-primary)">R$ {pedido.valorTotal.toFixed(2)}</p>
          </div>
          <div className="rounded-xl bg-(--bg-muted) p-3">
            <p className="text-xs text-(--text-tertiary)">Recebido</p>
            <p className="text-lg font-semibold text-(--text-primary)">R$ {valorRecebido.toFixed(2)}</p>
          </div>
          <div className="rounded-xl bg-(--bg-muted) p-3">
            <p className="text-xs text-(--text-tertiary)">Saldo</p>
            <p className="text-lg font-semibold text-(--text-primary)">R$ {saldo.toFixed(2)}</p>
          </div>
        </div>

        {recebimentos.length > 0 ? (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-(--text-tertiary)">Pagamentos</p>
            <ul className="mt-2 flex flex-col gap-1 text-sm text-(--text-secondary)">
              {recebimentos.map((recebimento) => (
                <li key={recebimento.id} className="flex justify-between">
                  <span>
                    {new Date(recebimento.registradoEm).toLocaleDateString("pt-BR")} — {nomeForma(recebimento.formaPagamentoId)}
                  </span>
                  <span className="font-medium text-(--text-primary)">R$ {recebimento.valor.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-6 flex flex-col items-center gap-2 border-t border-(--border) pt-5">
          <p className="text-xs text-(--text-tertiary)">Código de acompanhamento</p>
          {origemUrl ? <QrCode valor={origemUrl} tamanho={140} /> : null}
          <p className="mt-1 break-all text-center text-[11px] text-(--text-tertiary)">{token}</p>
        </div>

        <p className="mt-4 text-center text-[11px] text-(--text-tertiary)">
          Este comprovante não possui função fiscal.
        </p>
      </section>
    </div>
  );
}
