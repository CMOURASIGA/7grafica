"use client";

import { use, useEffect, useState } from "react";
import { useRepositories } from "@/lib/repositories";
import { resolverIdentidadeCanto } from "@/lib/whitelabel";
import { MOTIVOS_REJEICAO, MOTIVO_REJEICAO_LABEL, STATUS_ORCAMENTO_LABEL, STATUS_ORCAMENTO_TONE } from "@/lib/orcamentos-ui";
import { StatusPill } from "@/components/ui/workspace-primitives";
import type { Empresa, MotivoRejeicaoOrcamento, Orcamento } from "@/lib/domain/entities";

/**
 * Pagina publica (sem autenticacao): o "link seguro" que o cliente recebe
 * por e-mail. A seguranca aqui e a posse do token nao sequencial, nao um
 * papel/permissao — por isso usa o repositorio "cru" (useRepositories), sem
 * passar por lib/repositories/authorization.ts, exatamente como uma
 * policy publica por token faria no Supabase.
 */
export default function PortalOrcamentoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const repositories = useRepositories();

  const [orcamento, setOrcamento] = useState<Orcamento | null | undefined>(undefined);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [justificativa, setJustificativa] = useState("");
  const [motivo, setMotivo] = useState<MotivoRejeicaoOrcamento>("preco_alto");
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  async function carregar() {
    const atual = await repositories.orcamentos.buscarPorToken(token);
    setOrcamento(atual);
    if (atual) {
      setEmpresa(await repositories.empresas.obter(atual.empresaId));
    }
  }

  useEffect(() => {
    void carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function decidir(decisao: "aprovado" | "alteracao_solicitada" | "rejeitado") {
    setEnviando(true);
    setMensagem(null);
    try {
      const atualizado = await repositories.orcamentos.registrarDecisaoPublica(token, decisao, {
        justificativa: justificativa.trim() || undefined,
        motivo: decisao === "rejeitado" ? motivo : undefined,
      });
      if (decisao === "aprovado") {
        await repositories.pedidos.criarAPartirDeOrcamentoAprovado(atualizado.id);
      }
      setOrcamento(atualizado);
      setMensagem(
        decisao === "aprovado"
          ? "Orcamento aprovado! Em breve entraremos em contato para os proximos passos."
          : decisao === "rejeitado"
            ? "Recebemos sua recusa. Obrigado pelo retorno."
            : "Recebemos seu pedido de alteracao. Vamos revisar o orcamento.",
      );
    } catch (erro) {
      setMensagem(erro instanceof Error ? erro.message : "Nao foi possivel registrar sua decisao.");
    } finally {
      setEnviando(false);
    }
  }

  const identidade = resolverIdentidadeCanto(empresa);

  if (orcamento === undefined) return null;

  if (orcamento === null) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-4 py-10 text-center">
        <p className="text-sm text-(--text-secondary)">Link invalido ou expirado.</p>
      </div>
    );
  }

  const aguardandoDecisao = orcamento.status === "enviado";

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-4 px-4 py-10">
      <div className="flex items-center gap-3">
        <img src={identidade.logoUrl} alt={identidade.nomeCliente ?? "Consult Services Tecnologia"} className="h-12 w-12 rounded-lg object-contain" />
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-(--accent)">Orcamento {orcamento.numero}</p>
          <p className="text-sm text-(--text-secondary)">Versao V{orcamento.versao}</p>
        </div>
      </div>

      <section className="rounded-[1.8rem] border border-(--border) bg-(--bg-surface) p-6 shadow-[var(--shadow-card)]">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-xl font-semibold text-(--text-primary)">Proposta comercial</h1>
          <StatusPill tone={STATUS_ORCAMENTO_TONE[orcamento.status]}>{STATUS_ORCAMENTO_LABEL[orcamento.status]}</StatusPill>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-(--text-tertiary)">
                <th className="border-b border-(--border) py-2 pr-4">Item</th>
                <th className="border-b border-(--border) py-2 pr-4">Qtd.</th>
                <th className="border-b border-(--border) py-2 pr-4">Unit.</th>
                <th className="border-b border-(--border) py-2 pr-4">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {orcamento.itens.map((item) => (
                <tr key={item.id}>
                  <td className="border-b border-(--border) py-3 pr-4 text-(--text-primary)">
                    {item.descricao}
                    {item.acabamentos ? <span className="block text-xs text-(--text-tertiary)">{item.acabamentos}</span> : null}
                  </td>
                  <td className="border-b border-(--border) py-3 pr-4 text-(--text-secondary)">{item.quantidade}</td>
                  <td className="border-b border-(--border) py-3 pr-4 text-(--text-secondary)">R$ {item.precoUnitario.toFixed(2)}</td>
                  <td className="border-b border-(--border) py-3 pr-4 text-(--text-secondary)">R$ {(item.quantidade * item.precoUnitario).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-xl bg-(--bg-muted) px-4 py-3">
          <span className="text-sm font-semibold text-(--text-secondary)">Valor total</span>
          <span className="text-xl font-semibold text-(--text-primary)">R$ {orcamento.valorTotal.toFixed(2)}</span>
        </div>

        <div className="mt-3 flex flex-wrap gap-4 text-xs text-(--text-tertiary)">
          {orcamento.prazoEntregaDias ? <span>Prazo: {orcamento.prazoEntregaDias} dias</span> : null}
          {orcamento.validadeAte ? <span>Valido ate {new Date(orcamento.validadeAte).toLocaleDateString("pt-BR")}</span> : null}
        </div>
        {orcamento.observacoes ? <p className="mt-3 text-sm text-(--text-secondary)">{orcamento.observacoes}</p> : null}

        {aguardandoDecisao ? (
          <div className="mt-6 border-t border-(--border) pt-5">
            <p className="text-sm font-semibold text-(--text-primary)">O que voce decide sobre esta proposta?</p>
            <div className="mt-3 grid grid-cols-1 gap-3">
              <div>
                <label className="workspace-label">Motivo (caso recuse)</label>
                <select className="workspace-select" value={motivo} onChange={(event) => setMotivo(event.target.value as MotivoRejeicaoOrcamento)}>
                  {MOTIVOS_REJEICAO.map((item) => (
                    <option key={item} value={item}>
                      {MOTIVO_REJEICAO_LABEL[item]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="workspace-label">Comentario (opcional para alteracao/recusa)</label>
                <textarea className="workspace-textarea" value={justificativa} onChange={(event) => setJustificativa(event.target.value)} />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" disabled={enviando} className="workspace-button-primary" onClick={() => void decidir("aprovado")}>
                Aprovar orcamento
              </button>
              <button type="button" disabled={enviando} className="workspace-button-secondary" onClick={() => void decidir("alteracao_solicitada")}>
                Solicitar alteracao
              </button>
              <button type="button" disabled={enviando} className="workspace-button-danger" onClick={() => void decidir("rejeitado")}>
                Recusar
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-6 border-t border-(--border) pt-5 text-sm text-(--text-secondary)">
            {orcamento.status === "rascunho"
              ? "Este orcamento ainda nao foi enviado."
              : `Este orcamento ja foi respondido (${STATUS_ORCAMENTO_LABEL[orcamento.status]}).`}
          </p>
        )}

        {mensagem ? <p className="mt-4 text-sm font-medium text-(--accent-strong)">{mensagem}</p> : null}
      </section>
    </div>
  );
}
