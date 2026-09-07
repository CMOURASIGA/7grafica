"use client";

import { useEffect, useState } from "react";
import { CrudSection } from "@/components/cadastros/crud-section";
import { PageIntro } from "@/components/ui/workspace-primitives";
import { useSessao } from "@/components/providers/session-provider";
import { useRepositories } from "@/lib/repositories";
import type { CategoriaServico, EtapaWorkflow, TipoEtapa, Workflow } from "@/lib/domain/entities";

const TIPOS_ETAPA: { value: TipoEtapa; label: string }[] = [
  { value: "humana", label: "Humana" },
  { value: "automatica", label: "Automatica" },
  { value: "hibrida", label: "Hibrida" },
];

export default function WorkflowsPage() {
  const repositories = useRepositories();
  const { sessao } = useSessao();
  const empresaId = sessao?.empresaAtiva?.id;
  const [categorias, setCategorias] = useState<CategoriaServico[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [etapas, setEtapas] = useState<EtapaWorkflow[]>([]);

  async function recarregar() {
    if (!empresaId) return;
    const [listaCategorias, listaWorkflows, listaEtapas] = await Promise.all([
      repositories.categoriasServico.listar(empresaId),
      repositories.workflows.listar(empresaId),
      repositories.etapasWorkflow.listar(empresaId),
    ]);
    setCategorias(listaCategorias);
    setWorkflows(listaWorkflows);
    setEtapas(listaEtapas);
  }

  useEffect(() => {
    void recarregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId]);

  if (!empresaId) return null;

  const nomeWorkflow = (id: string) => workflows.find((workflow) => workflow.id === id)?.nome ?? "—";

  return (
    <div className="flex flex-col gap-4">
      <PageIntro
        eyebrow="Cadastros"
        title="Workflows"
        description="Fluxo de producao por categoria de servico e suas etapas humanas, automaticas ou hibridas."
      />

      <CrudSection<Workflow>
        titulo="Workflows"
        nomeEntidade="Workflow"
        campos={[
          { name: "nome", label: "Nome", tipo: "texto", obrigatorio: true },
          {
            name: "categoriaServicoId",
            label: "Categoria de servico",
            tipo: "select",
            opcoes: categorias.map((categoria) => ({ value: categoria.id, label: categoria.nome })),
          },
          { name: "ativo", label: "Status", tipo: "checkbox", placeholder: "Ativo" },
        ]}
        itens={workflows}
        colunas={[
          { chave: "nome", titulo: "Nome", render: (item) => item.nome },
          {
            chave: "categoria",
            titulo: "Categoria",
            render: (item) => categorias.find((categoria) => categoria.id === item.categoriaServicoId)?.nome ?? "—",
          },
          { chave: "status", titulo: "Status", render: (item) => (item.ativo ? "Ativo" : "Inativo") },
        ]}
        valoresParaEdicao={(item) => ({ nome: item.nome, categoriaServicoId: item.categoriaServicoId ?? "", ativo: item.ativo })}
        aoCriar={async (dados) => {
          await repositories.workflows.criar({
            empresaId,
            nome: String(dados.nome),
            categoriaServicoId: String(dados.categoriaServicoId) || null,
            ativo: Boolean(dados.ativo),
          });
          await recarregar();
        }}
        aoAtualizar={async (id, dados) => {
          await repositories.workflows.atualizar(id, {
            nome: String(dados.nome),
            categoriaServicoId: String(dados.categoriaServicoId) || null,
            ativo: Boolean(dados.ativo),
          });
          await recarregar();
        }}
        aoRemover={async (id) => {
          await repositories.workflows.remover(id);
          await recarregar();
        }}
      />

      <CrudSection<EtapaWorkflow>
        titulo="Etapas"
        descricao="Ordem de execucao de cada workflow."
        nomeEntidade="Etapa"
        campos={[
          {
            name: "workflowId",
            label: "Workflow",
            tipo: "select",
            obrigatorio: true,
            opcoes: workflows.map((workflow) => ({ value: workflow.id, label: workflow.nome })),
          },
          { name: "ordem", label: "Ordem", tipo: "numero", obrigatorio: true },
          { name: "nome", label: "Nome da etapa", tipo: "texto", obrigatorio: true },
          { name: "tipo", label: "Tipo", tipo: "select", obrigatorio: true, opcoes: TIPOS_ETAPA },
        ]}
        itens={[...etapas].sort((a, b) => nomeWorkflow(a.workflowId).localeCompare(nomeWorkflow(b.workflowId)) || a.ordem - b.ordem)}
        colunas={[
          { chave: "workflow", titulo: "Workflow", render: (item) => nomeWorkflow(item.workflowId) },
          { chave: "ordem", titulo: "Ordem", render: (item) => String(item.ordem) },
          { chave: "nome", titulo: "Etapa", render: (item) => item.nome },
          { chave: "tipo", titulo: "Tipo", render: (item) => TIPOS_ETAPA.find((tipo) => tipo.value === item.tipo)?.label ?? item.tipo },
        ]}
        valoresParaEdicao={(item) => ({
          workflowId: item.workflowId,
          ordem: String(item.ordem),
          nome: item.nome,
          tipo: item.tipo,
        })}
        aoCriar={async (dados) => {
          await repositories.etapasWorkflow.criar({
            empresaId,
            workflowId: String(dados.workflowId),
            ordem: Number(dados.ordem) || 0,
            nome: String(dados.nome),
            tipo: dados.tipo as TipoEtapa,
          });
          await recarregar();
        }}
        aoAtualizar={async (id, dados) => {
          await repositories.etapasWorkflow.atualizar(id, {
            workflowId: String(dados.workflowId),
            ordem: Number(dados.ordem) || 0,
            nome: String(dados.nome),
            tipo: dados.tipo as TipoEtapa,
          });
          await recarregar();
        }}
        aoRemover={async (id) => {
          await repositories.etapasWorkflow.remover(id);
          await recarregar();
        }}
      />
    </div>
  );
}
