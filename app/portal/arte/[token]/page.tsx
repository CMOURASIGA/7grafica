"use client";

import { use, useEffect, useState } from "react";
import { useRepositories } from "@/lib/repositories";
import { resolverIdentidadeCanto } from "@/lib/whitelabel";
import { StatusPill } from "@/components/ui/workspace-primitives";
import type { Arquivo, Empresa } from "@/lib/domain/entities";

const SITUACAO_LABEL: Record<Arquivo["situacao"], string> = {
  recebido: "Recebido",
  em_criacao: "Em criação",
  aguardando_aprovacao_cliente: "Aguardando sua aprovação",
  alteracao_solicitada: "Alteração solicitada",
  aprovado_cliente: "Aprovada",
  rejeitado_cliente: "Rejeitada",
  substituido: "Substituído por uma nova versão",
  cancelado: "Cancelado",
};

/**
 * Pagina publica (sem autenticacao) de aprovacao de arte (SPEC 07) — mesmo
 * principio dos tokens ja usados em orcamento/pedido: a seguranca e a posse
 * do token nao sequencial, nao um papel/permissao, por isso usa o
 * repositorio "cru" (useRepositories), sem passar por
 * lib/repositories/authorization.ts. Mesma limitacao de MVP documentada em
 * docs/MVP-LOCALSTORAGE.md: o link so funciona no navegador que possui os
 * dados (LocalStorage nao e compartilhado entre dispositivos).
 */
export default function PortalArtePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const repositories = useRepositories();

  const [arquivo, setArquivo] = useState<Arquivo | null | undefined>(undefined);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  async function carregar() {
    const atual = await repositories.arquivos.buscarPorTokenAprovacaoPublica(token);
    setArquivo(atual);
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
      const atualizado = await repositories.arquivos.registrarDecisaoPublicaCliente(token, decisao, comentario.trim() || null);
      setArquivo(atualizado);
      setMensagem(
        decisao === "aprovado"
          ? "Aprovação registrada. A equipe ainda precisa conferir a aprovação técnica e liberar esta versão."
          : decisao === "rejeitado"
            ? "Recebemos sua recusa. Vamos entrar em contato."
            : "Recebemos seu pedido de alteração. Uma nova versão será enviada em breve.",
      );
    } catch (erro) {
      setMensagem(erro instanceof Error ? erro.message : "Não foi possível registrar sua decisão.");
    } finally {
      setEnviando(false);
    }
  }

  const identidade = resolverIdentidadeCanto(empresa);

  if (arquivo === undefined) return null;

  if (arquivo === null) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-4 py-10 text-center">
        <p className="text-sm text-(--text-secondary)">Link inválido ou expirado.</p>
      </div>
    );
  }

  const aguardandoDecisao = arquivo.situacao === "aguardando_aprovacao_cliente";

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-4 px-4 py-10">
      <div className="flex items-center gap-3">
        <img src={identidade.logoUrl} alt={identidade.nomeCliente ?? "Consult Services Tecnologia"} className="h-12 w-12 rounded-lg object-contain" />
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-(--accent)">Aprovação de arte</p>
          <p className="break-all text-sm text-(--text-secondary)">
            {arquivo.nome} — versão {arquivo.versao}
          </p>
        </div>
      </div>

      <section className="rounded-[1.8rem] border border-(--border) bg-(--bg-surface) p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-xl font-semibold text-(--text-primary)">Confira a arte produzida</h1>
          <StatusPill tone={arquivo.situacao === "aprovado_cliente" ? "success" : arquivo.situacao === "rejeitado_cliente" ? "danger" : "accent"}>
            {SITUACAO_LABEL[arquivo.situacao]}
          </StatusPill>
        </div>

        <p className="mt-4 text-sm text-(--text-secondary)">
          O conteúdo do arquivo não está disponível nesta tela. Confira externamente a versão {arquivo.versao} de &quot;{arquivo.nome}&quot; antes de registrar sua decisão.

        </p>

        {aguardandoDecisao ? (
          <div className="mt-6 border-t border-(--border) pt-5">
            <p className="text-sm font-semibold text-(--text-primary)">O que você decide sobre esta arte?</p>
            <div className="mt-3">
              <label htmlFor="comentario-cliente" className="workspace-label">Comentário (opcional)</label>
              <textarea id="comentario-cliente" className="workspace-textarea" value={comentario} onChange={(event) => setComentario(event.target.value)} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" disabled={enviando} className="workspace-button-primary" onClick={() => void decidir("aprovado")}>
                Aprovar arte
              </button>
              <button type="button" disabled={enviando} className="workspace-button-secondary" onClick={() => void decidir("alteracao_solicitada")}>
                Solicitar alteração
              </button>
              <button type="button" disabled={enviando} className="workspace-button-danger" onClick={() => void decidir("rejeitado")}>
                Rejeitar
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-6 border-t border-(--border) pt-5 text-sm text-(--text-secondary)">
            Esta arte já foi respondida ({SITUACAO_LABEL[arquivo.situacao]}).
          </p>
        )}

        {mensagem ? <p className="mt-4 text-sm font-medium text-(--accent-strong)">{mensagem}</p> : null}
      </section>
    </div>
  );
}
