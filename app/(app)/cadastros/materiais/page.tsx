"use client";

import { useEffect, useState } from "react";
import { CrudSection } from "@/components/cadastros/crud-section";
import { PageIntro, SurfaceCard } from "@/components/ui/workspace-primitives";
import { useRepositoriosAutorizados as useRepositories, useSessao } from "@/components/providers/session-provider";
import { papelTemPermissao, PERMISSOES } from "@/lib/rbac";
import type { ConversaoUnidade, Material, UnidadeMedida } from "@/lib/domain/entities";

export default function MateriaisPage() {
  const repositories = useRepositories();
  const { sessao } = useSessao();
  const empresaId = sessao?.empresaAtiva?.id;
  const papel = sessao?.empresaAtiva?.papel ?? null;
  const podeVisualizar = papel ? papelTemPermissao(papel, PERMISSOES.CADASTROS_OPERACIONAIS_VISUALIZAR) : false;
  const podeGerenciar = papel ? papelTemPermissao(papel, PERMISSOES.CADASTROS_GERENCIAR) : false;
  const [unidades, setUnidades] = useState<UnidadeMedida[]>([]);
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [conversoes, setConversoes] = useState<ConversaoUnidade[]>([]);

  async function recarregar() {
    if (!empresaId || !podeVisualizar) return;
    const [listaUnidades, listaMateriais, listaConversoes] = await Promise.all([
      repositories.unidadesMedida.listar(empresaId),
      repositories.materiais.listar(empresaId),
      repositories.conversoesUnidade.listar(empresaId),
    ]);
    setUnidades(listaUnidades);
    setMateriais(listaMateriais);
    setConversoes(listaConversoes);
  }

  useEffect(() => {
    void recarregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId, podeVisualizar]);

  if (!empresaId) return null;

  if (!podeVisualizar) {
    return (
      <SurfaceCard className="p-5">
        <p className="text-sm text-(--text-secondary)">Seu papel atual nao tem acesso a materiais.</p>
      </SurfaceCard>
    );
  }

  const nomeUnidade = (id: string) => unidades.find((unidade) => unidade.id === id)?.sigla ?? "—";
  const opcoesUnidade = unidades.map((unidade) => ({ value: unidade.id, label: `${unidade.nome} (${unidade.sigla})` }));

  return (
    <div className="flex flex-col gap-4">
      <PageIntro
        eyebrow="Cadastros"
        title="Materiais"
        description="Materiais de producao, suas unidades de compra/consumo e a conversao entre elas (ex.: 1 resma = 500 folhas)."
      />

      <CrudSection<UnidadeMedida>
        titulo="Unidades de medida"
        nomeEntidade="Unidade"
        somenteLeitura={!podeGerenciar}
        campos={[
          { name: "nome", label: "Nome", tipo: "texto", obrigatorio: true, placeholder: "Ex.: Resma" },
          { name: "sigla", label: "Sigla", tipo: "texto", obrigatorio: true, placeholder: "Ex.: rm" },
        ]}
        itens={unidades}
        colunas={[
          { chave: "nome", titulo: "Nome", render: (item) => item.nome },
          { chave: "sigla", titulo: "Sigla", render: (item) => item.sigla },
        ]}
        valoresParaEdicao={(item) => ({ nome: item.nome, sigla: item.sigla })}
        aoCriar={async (dados) => {
          await repositories.unidadesMedida.criar({ empresaId, nome: String(dados.nome), sigla: String(dados.sigla) });
          await recarregar();
        }}
        aoAtualizar={async (id, dados) => {
          await repositories.unidadesMedida.atualizar(id, { nome: String(dados.nome), sigla: String(dados.sigla) });
          await recarregar();
        }}
        aoRemover={async (id) => {
          await repositories.unidadesMedida.remover(id);
          await recarregar();
        }}
      />

      <CrudSection<Material>
        titulo="Materiais"
        nomeEntidade="Material"
        somenteLeitura={!podeGerenciar}
        campos={[
          { name: "nome", label: "Nome", tipo: "texto", obrigatorio: true },
          { name: "unidadeCompraId", label: "Unidade de compra", tipo: "select", obrigatorio: true, opcoes: opcoesUnidade },
          { name: "unidadeConsumoId", label: "Unidade de consumo", tipo: "select", obrigatorio: true, opcoes: opcoesUnidade },
          { name: "ativo", label: "Status", tipo: "checkbox", placeholder: "Ativo" },
        ]}
        itens={materiais}
        colunas={[
          { chave: "nome", titulo: "Nome", render: (item) => item.nome },
          { chave: "compra", titulo: "Compra", render: (item) => nomeUnidade(item.unidadeCompraId) },
          { chave: "consumo", titulo: "Consumo", render: (item) => nomeUnidade(item.unidadeConsumoId) },
          { chave: "status", titulo: "Status", render: (item) => (item.ativo ? "Ativo" : "Inativo") },
        ]}
        valoresParaEdicao={(item) => ({
          nome: item.nome,
          unidadeCompraId: item.unidadeCompraId,
          unidadeConsumoId: item.unidadeConsumoId,
          ativo: item.ativo,
        })}
        aoCriar={async (dados) => {
          await repositories.materiais.criar({
            empresaId,
            nome: String(dados.nome),
            unidadeCompraId: String(dados.unidadeCompraId),
            unidadeConsumoId: String(dados.unidadeConsumoId),
            ativo: Boolean(dados.ativo),
          });
          await recarregar();
        }}
        aoAtualizar={async (id, dados) => {
          await repositories.materiais.atualizar(id, {
            nome: String(dados.nome),
            unidadeCompraId: String(dados.unidadeCompraId),
            unidadeConsumoId: String(dados.unidadeConsumoId),
            ativo: Boolean(dados.ativo),
          });
          await recarregar();
        }}
        aoRemover={async (id) => {
          await repositories.materiais.remover(id);
          await recarregar();
        }}
      />

      <CrudSection<ConversaoUnidade>
        titulo="Conversoes de unidade"
        descricao="Quantas unidades de consumo equivalem a 1 unidade de compra de cada material."
        nomeEntidade="Conversao"
        somenteLeitura={!podeGerenciar}
        campos={[
          {
            name: "materialId",
            label: "Material",
            tipo: "select",
            obrigatorio: true,
            opcoes: materiais.map((material) => ({ value: material.id, label: material.nome })),
          },
          { name: "fator", label: "Fator (unid. consumo por unid. compra)", tipo: "numero", obrigatorio: true },
        ]}
        itens={conversoes}
        colunas={[
          {
            chave: "material",
            titulo: "Material",
            render: (item) => materiais.find((material) => material.id === item.materialId)?.nome ?? "—",
          },
          {
            chave: "fator",
            titulo: "1 unidade de compra =",
            render: (item) => {
              const material = materiais.find((m) => m.id === item.materialId);
              return `${item.fator} ${material ? nomeUnidade(material.unidadeConsumoId) : ""}`;
            },
          },
        ]}
        valoresParaEdicao={(item) => ({ materialId: item.materialId, fator: String(item.fator) })}
        aoCriar={async (dados) => {
          await repositories.conversoesUnidade.criar({
            empresaId,
            materialId: String(dados.materialId),
            fator: Number(dados.fator) || 0,
          });
          await recarregar();
        }}
        aoAtualizar={async (id, dados) => {
          await repositories.conversoesUnidade.atualizar(id, {
            materialId: String(dados.materialId),
            fator: Number(dados.fator) || 0,
          });
          await recarregar();
        }}
        aoRemover={async (id) => {
          await repositories.conversoesUnidade.remover(id);
          await recarregar();
        }}
      />
    </div>
  );
}
