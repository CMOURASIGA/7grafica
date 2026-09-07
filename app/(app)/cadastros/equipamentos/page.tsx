"use client";

import { useEffect, useState } from "react";
import { CrudSection } from "@/components/cadastros/crud-section";
import { PageIntro, SurfaceCard } from "@/components/ui/workspace-primitives";
import { useRepositoriosAutorizados as useRepositories, useSessao } from "@/components/providers/session-provider";
import { papelTemPermissao, PERMISSOES } from "@/lib/rbac";
import type { CapacidadeEquipamento, Equipamento, TipoEquipamento } from "@/lib/domain/entities";

const TIPOS: { value: TipoEquipamento; label: string }[] = [
  { value: "impressora", label: "Impressora" },
  { value: "guilhotina", label: "Guilhotina" },
  { value: "encadernadora", label: "Encadernadora" },
  { value: "laminadora", label: "Laminadora" },
  { value: "outro", label: "Outro" },
];

const CORPB: { value: CapacidadeEquipamento["corPB"]; label: string }[] = [
  { value: "cor", label: "Cor" },
  { value: "pb", label: "Preto e branco" },
  { value: "ambos", label: "Cor e P&B" },
];

export default function EquipamentosPage() {
  const repositories = useRepositories();
  const { sessao } = useSessao();
  const empresaId = sessao?.empresaAtiva?.id;
  const papel = sessao?.empresaAtiva?.papel ?? null;
  const podeVisualizar = papel ? papelTemPermissao(papel, PERMISSOES.CADASTROS_OPERACIONAIS_VISUALIZAR) : false;
  const podeGerenciar = papel ? papelTemPermissao(papel, PERMISSOES.CADASTROS_GERENCIAR) : false;
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [capacidades, setCapacidades] = useState<CapacidadeEquipamento[]>([]);

  async function recarregar() {
    if (!empresaId || !podeVisualizar) return;
    const [listaEquipamentos, listaCapacidades] = await Promise.all([
      repositories.equipamentos.listar(empresaId),
      repositories.capacidadesEquipamento.listar(empresaId),
    ]);
    setEquipamentos(listaEquipamentos);
    setCapacidades(listaCapacidades);
  }

  useEffect(() => {
    void recarregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId, podeVisualizar]);

  if (!empresaId) return null;

  if (!podeVisualizar) {
    return (
      <SurfaceCard className="p-5">
        <p className="text-sm text-(--text-secondary)">Seu papel atual nao tem acesso a equipamentos.</p>
      </SurfaceCard>
    );
  }

  const nomeEquipamento = (id: string) => equipamentos.find((equip) => equip.id === id)?.nome ?? "—";

  return (
    <div className="flex flex-col gap-4">
      <PageIntro eyebrow="Cadastros" title="Equipamentos" description="Impressoras, guilhotinas, encadernadoras e suas capacidades tecnicas." />

      <CrudSection<Equipamento>
        titulo="Equipamentos"
        nomeEntidade="Equipamento"
        somenteLeitura={!podeGerenciar}
        campos={[
          { name: "nome", label: "Nome", tipo: "texto", obrigatorio: true },
          { name: "tipo", label: "Tipo", tipo: "select", obrigatorio: true, opcoes: TIPOS },
          { name: "ativo", label: "Status", tipo: "checkbox", placeholder: "Ativo" },
        ]}
        itens={equipamentos}
        colunas={[
          { chave: "nome", titulo: "Nome", render: (item) => item.nome },
          { chave: "tipo", titulo: "Tipo", render: (item) => TIPOS.find((tipo) => tipo.value === item.tipo)?.label ?? item.tipo },
          { chave: "status", titulo: "Status", render: (item) => (item.ativo ? "Ativo" : "Inativo") },
        ]}
        valoresParaEdicao={(item) => ({ nome: item.nome, tipo: item.tipo, ativo: item.ativo })}
        aoCriar={async (dados) => {
          await repositories.equipamentos.criar({
            empresaId,
            nome: String(dados.nome),
            tipo: dados.tipo as TipoEquipamento,
            ativo: Boolean(dados.ativo),
          });
          await recarregar();
        }}
        aoAtualizar={async (id, dados) => {
          await repositories.equipamentos.atualizar(id, {
            nome: String(dados.nome),
            tipo: dados.tipo as TipoEquipamento,
            ativo: Boolean(dados.ativo),
          });
          await recarregar();
        }}
        aoRemover={async (id) => {
          await repositories.equipamentos.remover(id);
          await recarregar();
        }}
      />

      <CrudSection<CapacidadeEquipamento>
        titulo="Capacidades tecnicas"
        descricao="Formatos, cor/P&B e duplex suportados por cada equipamento."
        nomeEntidade="Capacidade"
        somenteLeitura={!podeGerenciar}
        campos={[
          {
            name: "equipamentoId",
            label: "Equipamento",
            tipo: "select",
            obrigatorio: true,
            opcoes: equipamentos.map((equip) => ({ value: equip.id, label: equip.nome })),
          },
          { name: "formatos", label: "Formatos suportados", tipo: "texto", obrigatorio: true, placeholder: "Ex.: A4, A3" },
          { name: "corPB", label: "Cor/P&B", tipo: "select", obrigatorio: true, opcoes: CORPB },
          { name: "duplex", label: "Duplex", tipo: "checkbox", placeholder: "Suporta frente e verso" },
          { name: "observacoes", label: "Observacoes", tipo: "textarea" },
        ]}
        itens={capacidades}
        colunas={[
          { chave: "equipamento", titulo: "Equipamento", render: (item) => nomeEquipamento(item.equipamentoId) },
          { chave: "formatos", titulo: "Formatos", render: (item) => item.formatos },
          { chave: "corPB", titulo: "Cor/P&B", render: (item) => CORPB.find((c) => c.value === item.corPB)?.label ?? item.corPB },
          { chave: "duplex", titulo: "Duplex", render: (item) => (item.duplex ? "Sim" : "Nao") },
        ]}
        valoresParaEdicao={(item) => ({
          equipamentoId: item.equipamentoId,
          formatos: item.formatos,
          corPB: item.corPB,
          duplex: item.duplex,
          observacoes: item.observacoes ?? "",
        })}
        aoCriar={async (dados) => {
          await repositories.capacidadesEquipamento.criar({
            empresaId,
            equipamentoId: String(dados.equipamentoId),
            formatos: String(dados.formatos),
            corPB: dados.corPB as CapacidadeEquipamento["corPB"],
            duplex: Boolean(dados.duplex),
            observacoes: String(dados.observacoes) || null,
          });
          await recarregar();
        }}
        aoAtualizar={async (id, dados) => {
          await repositories.capacidadesEquipamento.atualizar(id, {
            equipamentoId: String(dados.equipamentoId),
            formatos: String(dados.formatos),
            corPB: dados.corPB as CapacidadeEquipamento["corPB"],
            duplex: Boolean(dados.duplex),
            observacoes: String(dados.observacoes) || null,
          });
          await recarregar();
        }}
        aoRemover={async (id) => {
          await repositories.capacidadesEquipamento.remover(id);
          await recarregar();
        }}
      />
    </div>
  );
}
