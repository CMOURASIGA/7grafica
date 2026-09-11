"use client";

import { useEffect, useState } from "react";
import { CrudSection } from "@/components/cadastros/crud-section";
import { PageIntro, SurfaceCard } from "@/components/ui/workspace-primitives";
import { useRepositoriosAutorizados as useRepositories, useSessao } from "@/components/providers/session-provider";
import { papelTemPermissao, PERMISSOES } from "@/lib/rbac";
import type { FormaPagamento } from "@/lib/domain/entities";

const CAMPOS = [
  { name: "nome", label: "Nome", tipo: "texto" as const, obrigatorio: true, placeholder: "Ex.: Pix" },
  { name: "ativo", label: "Status", tipo: "checkbox" as const, placeholder: "Ativo" },
];

export default function FormasPagamentoPage() {
  const repositories = useRepositories();
  const { sessao } = useSessao();
  const empresaId = sessao?.empresaAtiva?.id;
  const papel = sessao?.empresaAtiva?.papel ?? null;
  const podeVisualizar = papel ? papelTemPermissao(papel, PERMISSOES.CADASTROS_COMERCIAIS_VISUALIZAR) : false;
  const podeGerenciar = papel ? papelTemPermissao(papel, PERMISSOES.CADASTROS_GERENCIAR) : false;
  const [itens, setItens] = useState<FormaPagamento[]>([]);

  async function recarregar() {
    if (!empresaId || !podeVisualizar) return;
    setItens(await repositories.formasPagamento.listar(empresaId));
  }

  useEffect(() => {
    void recarregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId, podeVisualizar]);

  if (!empresaId) return null;

  if (!podeVisualizar) {
    return (
      <SurfaceCard className="p-5">
        <p className="text-sm text-(--text-secondary)">Seu papel atual nao tem acesso a formas de pagamento.</p>
      </SurfaceCard>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <PageIntro eyebrow="Cadastros" title="Formas de pagamento" description="Usadas no balcao/PDV e no portal do cliente (specs futuras)." />
      <CrudSection<FormaPagamento>
        titulo="Formas de pagamento cadastradas"
        nomeEntidade="Forma de pagamento"
        somenteLeitura={!podeGerenciar}
        campos={CAMPOS}
        itens={itens}
        colunas={[
          { chave: "nome", titulo: "Nome", render: (item) => item.nome },
          { chave: "status", titulo: "Status", render: (item) => (item.ativo ? "Ativa" : "Inativa") },
        ]}
        valoresParaEdicao={(item) => ({ nome: item.nome, ativo: item.ativo })}
        aoCriar={async (dados) => {
          await repositories.formasPagamento.criar({ empresaId, nome: String(dados.nome), ativo: Boolean(dados.ativo) });
          await recarregar();
        }}
        aoAtualizar={async (id, dados) => {
          await repositories.formasPagamento.atualizar(id, { nome: String(dados.nome), ativo: Boolean(dados.ativo) });
          await recarregar();
        }}
        aoRemover={async (id) => {
          await repositories.formasPagamento.remover(id);
          await recarregar();
        }}
      />
    </div>
  );
}
