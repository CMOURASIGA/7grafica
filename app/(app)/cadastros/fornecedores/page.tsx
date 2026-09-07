"use client";

import { useEffect, useState } from "react";
import { CrudSection } from "@/components/cadastros/crud-section";
import { PageIntro, SurfaceCard } from "@/components/ui/workspace-primitives";
import { useRepositoriosAutorizados as useRepositories, useSessao } from "@/components/providers/session-provider";
import { papelTemPermissao, PERMISSOES } from "@/lib/rbac";
import type { Fornecedor } from "@/lib/domain/entities";

const CAMPOS = [
  { name: "nome", label: "Nome", tipo: "texto" as const, obrigatorio: true },
  { name: "documento", label: "CNPJ/CPF", tipo: "texto" as const },
  { name: "telefone", label: "Telefone", tipo: "texto" as const },
  { name: "email", label: "E-mail", tipo: "texto" as const },
  { name: "ativo", label: "Status", tipo: "checkbox" as const, placeholder: "Ativo" },
];

export default function FornecedoresPage() {
  const repositories = useRepositories();
  const { sessao } = useSessao();
  const empresaId = sessao?.empresaAtiva?.id;
  const papel = sessao?.empresaAtiva?.papel ?? null;
  const podeVisualizar = papel ? papelTemPermissao(papel, PERMISSOES.CADASTROS_COMERCIAIS_VISUALIZAR) : false;
  const podeGerenciar = papel ? papelTemPermissao(papel, PERMISSOES.CADASTROS_GERENCIAR) : false;
  const [itens, setItens] = useState<Fornecedor[]>([]);

  async function recarregar() {
    if (!empresaId || !podeVisualizar) return;
    setItens(await repositories.fornecedores.listar(empresaId));
  }

  useEffect(() => {
    void recarregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId, podeVisualizar]);

  if (!empresaId) return null;

  if (!podeVisualizar) {
    return (
      <SurfaceCard className="p-5">
        <p className="text-sm text-(--text-secondary)">Seu papel atual nao tem acesso a fornecedores.</p>
      </SurfaceCard>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <PageIntro eyebrow="Cadastros" title="Fornecedores" description="Fornecedores de materiais e insumos da grafica." />
      <CrudSection<Fornecedor>
        titulo="Fornecedores cadastrados"
        nomeEntidade="Fornecedor"
        somenteLeitura={!podeGerenciar}
        campos={CAMPOS}
        itens={itens}
        colunas={[
          { chave: "nome", titulo: "Nome", render: (item) => item.nome },
          { chave: "documento", titulo: "Documento", render: (item) => item.documento ?? "—" },
          { chave: "telefone", titulo: "Telefone", render: (item) => item.telefone ?? "—" },
          { chave: "status", titulo: "Status", render: (item) => (item.ativo ? "Ativo" : "Inativo") },
        ]}
        valoresParaEdicao={(item) => ({
          nome: item.nome,
          documento: item.documento ?? "",
          telefone: item.telefone ?? "",
          email: item.email ?? "",
          ativo: item.ativo,
        })}
        aoCriar={async (dados) => {
          await repositories.fornecedores.criar({
            empresaId,
            nome: String(dados.nome),
            documento: String(dados.documento) || null,
            telefone: String(dados.telefone) || null,
            email: String(dados.email) || null,
            ativo: Boolean(dados.ativo),
          });
          await recarregar();
        }}
        aoAtualizar={async (id, dados) => {
          await repositories.fornecedores.atualizar(id, {
            nome: String(dados.nome),
            documento: String(dados.documento) || null,
            telefone: String(dados.telefone) || null,
            email: String(dados.email) || null,
            ativo: Boolean(dados.ativo),
          });
          await recarregar();
        }}
        aoRemover={async (id) => {
          await repositories.fornecedores.remover(id);
          await recarregar();
        }}
      />
    </div>
  );
}
