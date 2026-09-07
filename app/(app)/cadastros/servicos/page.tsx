"use client";

import { useEffect, useState } from "react";
import { CrudSection } from "@/components/cadastros/crud-section";
import { PageIntro, SurfaceCard } from "@/components/ui/workspace-primitives";
import { useRepositoriosAutorizados as useRepositories, useSessao } from "@/components/providers/session-provider";
import { papelTemPermissao, PERMISSOES } from "@/lib/rbac";
import type { CategoriaServico, Servico } from "@/lib/domain/entities";

export default function ServicosPage() {
  const repositories = useRepositories();
  const { sessao } = useSessao();
  const empresaId = sessao?.empresaAtiva?.id;
  const papel = sessao?.empresaAtiva?.papel ?? null;
  const podeVisualizar = papel ? papelTemPermissao(papel, PERMISSOES.CADASTROS_OPERACIONAIS_VISUALIZAR) : false;
  const podeGerenciar = papel ? papelTemPermissao(papel, PERMISSOES.CADASTROS_GERENCIAR) : false;
  const [categorias, setCategorias] = useState<CategoriaServico[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);

  async function recarregar() {
    if (!empresaId || !podeVisualizar) return;
    const [listaCategorias, listaServicos] = await Promise.all([
      repositories.categoriasServico.listar(empresaId),
      repositories.servicos.listar(empresaId),
    ]);
    setCategorias(listaCategorias);
    setServicos(listaServicos);
  }

  useEffect(() => {
    void recarregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId, podeVisualizar]);

  if (!empresaId) return null;

  if (!podeVisualizar) {
    return (
      <SurfaceCard className="p-5">
        <p className="text-sm text-(--text-secondary)">Seu papel atual nao tem acesso a servicos.</p>
      </SurfaceCard>
    );
  }

  const nomeCategoria = (id: string | null) => categorias.find((categoria) => categoria.id === id)?.nome ?? "—";

  return (
    <div className="flex flex-col gap-4">
      <PageIntro eyebrow="Cadastros" title="Servicos" description="Servicos oferecidos e as categorias que os organizam." />

      <CrudSection<CategoriaServico>
        titulo="Categorias de servico"
        nomeEntidade="Categoria"
        somenteLeitura={!podeGerenciar}
        campos={[{ name: "nome", label: "Nome", tipo: "texto", obrigatorio: true }]}
        itens={categorias}
        colunas={[{ chave: "nome", titulo: "Nome", render: (item) => item.nome }]}
        valoresParaEdicao={(item) => ({ nome: item.nome })}
        aoCriar={async (dados) => {
          await repositories.categoriasServico.criar({ empresaId, nome: String(dados.nome) });
          await recarregar();
        }}
        aoAtualizar={async (id, dados) => {
          await repositories.categoriasServico.atualizar(id, { nome: String(dados.nome) });
          await recarregar();
        }}
        aoRemover={async (id) => {
          await repositories.categoriasServico.remover(id);
          await recarregar();
        }}
      />

      <CrudSection<Servico>
        titulo="Servicos"
        nomeEntidade="Servico"
        somenteLeitura={!podeGerenciar}
        campos={[
          { name: "nome", label: "Nome", tipo: "texto", obrigatorio: true },
          {
            name: "categoriaId",
            label: "Categoria",
            tipo: "select",
            opcoes: categorias.map((categoria) => ({ value: categoria.id, label: categoria.nome })),
          },
          { name: "precoBase", label: "Preco base (R$)", tipo: "numero", obrigatorio: true },
          { name: "descricao", label: "Descricao", tipo: "textarea" },
          { name: "ativo", label: "Status", tipo: "checkbox", placeholder: "Ativo" },
        ]}
        itens={servicos}
        colunas={[
          { chave: "nome", titulo: "Nome", render: (item) => item.nome },
          { chave: "categoria", titulo: "Categoria", render: (item) => nomeCategoria(item.categoriaId) },
          { chave: "preco", titulo: "Preco base", render: (item) => `R$ ${item.precoBase.toFixed(2)}` },
          { chave: "status", titulo: "Status", render: (item) => (item.ativo ? "Ativo" : "Inativo") },
        ]}
        valoresParaEdicao={(item) => ({
          nome: item.nome,
          categoriaId: item.categoriaId ?? "",
          precoBase: String(item.precoBase),
          descricao: item.descricao ?? "",
          ativo: item.ativo,
        })}
        aoCriar={async (dados) => {
          await repositories.servicos.criar({
            empresaId,
            nome: String(dados.nome),
            categoriaId: String(dados.categoriaId) || null,
            precoBase: Number(dados.precoBase) || 0,
            descricao: String(dados.descricao) || null,
            ativo: Boolean(dados.ativo),
          });
          await recarregar();
        }}
        aoAtualizar={async (id, dados) => {
          await repositories.servicos.atualizar(id, {
            nome: String(dados.nome),
            categoriaId: String(dados.categoriaId) || null,
            precoBase: Number(dados.precoBase) || 0,
            descricao: String(dados.descricao) || null,
            ativo: Boolean(dados.ativo),
          });
          await recarregar();
        }}
        aoRemover={async (id) => {
          await repositories.servicos.remover(id);
          await recarregar();
        }}
      />
    </div>
  );
}
