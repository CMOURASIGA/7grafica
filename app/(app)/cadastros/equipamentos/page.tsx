"use client";

import { useEffect, useState } from "react";
import { CrudSection } from "@/components/cadastros/crud-section";
import { PageIntro, SectionLabel, StatusPill, SurfaceCard } from "@/components/ui/workspace-primitives";
import { useToast } from "@/components/ui/toast";
import { useRepositoriosAutorizados as useRepositories, useSessao } from "@/components/providers/session-provider";
import { papelTemPermissao, PERMISSOES } from "@/lib/rbac";
import type { CapacidadeEquipamento, Equipamento, Material, SituacaoEquipamento, TipoEquipamento } from "@/lib/domain/entities";

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

const SITUACOES: { value: SituacaoEquipamento; label: string }[] = [
  { value: "disponivel", label: "Disponível" },
  { value: "em_uso", label: "Em uso" },
  { value: "indisponivel", label: "Indisponível" },
  { value: "manutencao", label: "Manutenção" },
];

export default function EquipamentosPage() {
  const repositories = useRepositories();
  const { sessao } = useSessao();
  const { showToast } = useToast();
  const empresaId = sessao?.empresaAtiva?.id;
  const usuarioId = sessao?.usuario.id;
  const papel = sessao?.empresaAtiva?.papel ?? null;
  const podeVisualizar = papel ? papelTemPermissao(papel, PERMISSOES.CADASTROS_OPERACIONAIS_VISUALIZAR) : false;
  const podeGerenciar = papel ? papelTemPermissao(papel, PERMISSOES.CADASTROS_GERENCIAR) : false;
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [capacidades, setCapacidades] = useState<CapacidadeEquipamento[]>([]);
  const [materiais, setMateriais] = useState<Material[]>([]);

  async function recarregar() {
    if (!empresaId || !podeVisualizar) return;
    const [listaEquipamentos, listaCapacidades, listaMateriais] = await Promise.all([
      repositories.equipamentos.listar(empresaId),
      repositories.capacidadesEquipamento.listar(empresaId),
      repositories.materiais.listar(empresaId),
    ]);
    setEquipamentos(listaEquipamentos);
    setCapacidades(listaCapacidades);
    setMateriais(listaMateriais);
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
  const nomesMateriais = (ids: string[]) =>
    ids.length === 0 ? "Sem restrição" : ids.map((id) => materiais.find((material) => material.id === id)?.nome ?? id).join(", ");

  async function handleMudarSituacao(equipamentoId: string, novaSituacao: SituacaoEquipamento) {
    try {
      await repositories.equipamentos.atualizarSituacao(equipamentoId, usuarioId!, novaSituacao);
      showToast("Situação do equipamento atualizada.", "success");
      await recarregar();
    } catch (erro) {
      showToast(erro instanceof Error ? erro.message : "Falha ao atualizar situação.", "error");
    }
  }

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
          { name: "capacidadeSimultanea", label: "Capacidade simultânea (trabalhos ao mesmo tempo)", tipo: "numero", obrigatorio: true },
          { name: "ativo", label: "Status", tipo: "checkbox", placeholder: "Ativo" },
        ]}
        itens={equipamentos}
        colunas={[
          { chave: "nome", titulo: "Nome", render: (item) => item.nome },
          { chave: "tipo", titulo: "Tipo", render: (item) => TIPOS.find((tipo) => tipo.value === item.tipo)?.label ?? item.tipo },
          { chave: "capacidadeSimultanea", titulo: "Cap. simultânea", render: (item) => String(item.capacidadeSimultanea) },
          { chave: "status", titulo: "Status", render: (item) => (item.ativo ? "Ativo" : "Inativo") },
        ]}
        valoresParaEdicao={(item) => ({ nome: item.nome, tipo: item.tipo, capacidadeSimultanea: String(item.capacidadeSimultanea), ativo: item.ativo })}
        aoCriar={async (dados) => {
          await repositories.equipamentos.criar({
            empresaId,
            nome: String(dados.nome),
            tipo: dados.tipo as TipoEquipamento,
            ativo: Boolean(dados.ativo),
            situacao: "disponivel",
            capacidadeSimultanea: Math.max(1, Number(dados.capacidadeSimultanea) || 1),
          });
          await recarregar();
        }}
        aoAtualizar={async (id, dados) => {
          const atual = equipamentos.find((equip) => equip.id === id);
          await repositories.equipamentos.atualizar(id, {
            nome: String(dados.nome),
            tipo: dados.tipo as TipoEquipamento,
            ativo: Boolean(dados.ativo),
            situacao: atual?.situacao ?? "disponivel",
            capacidadeSimultanea: Math.max(1, Number(dados.capacidadeSimultanea) || 1),
          });
          await recarregar();
        }}
        aoRemover={async (id) => {
          await repositories.equipamentos.remover(id);
          await recarregar();
        }}
      />

      <SurfaceCard className="p-5">
        <SectionLabel>Situação operacional</SectionLabel>
        <p className="mt-1 text-xs text-(--text-tertiary)">
          Um equipamento em manutenção ou indisponível não pode receber nova alocação de produção.
        </p>
        <ul className="mt-3 flex flex-col gap-2">
          {equipamentos.map((equip) => (
            <li key={equip.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-(--border) px-4 py-3 text-sm">
              <span className="font-medium text-(--text-primary)">{equip.nome}</span>
              <div className="flex items-center gap-2">
                <StatusPill tone={equip.situacao === "disponivel" ? "success" : equip.situacao === "em_uso" ? "accent" : "danger"}>
                  {SITUACOES.find((situacao) => situacao.value === equip.situacao)?.label ?? equip.situacao}
                </StatusPill>
                {podeGerenciar ? (
                  <select
                    className="workspace-select"
                    value={equip.situacao}
                    onChange={(event) => void handleMudarSituacao(equip.id, event.target.value as SituacaoEquipamento)}
                  >
                    {SITUACOES.map((situacao) => (
                      <option key={situacao.value} value={situacao.value}>
                        {situacao.label}
                      </option>
                    ))}
                  </select>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </SurfaceCard>

      <CrudSection<CapacidadeEquipamento>
        titulo="Capacidades tecnicas"
        descricao="Formatos, cor/P&B, duplex e materiais compatíveis com cada equipamento — base da checagem de compatibilidade na produção."
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
          {
            name: "materiaisCompativeis",
            label: "Materiais compatíveis (nomes separados por vírgula — vazio = sem restrição)",
            tipo: "texto",
            placeholder: "Ex.: Papel Couche 300g, Lona 440g",
          },
          { name: "observacoes", label: "Observacoes", tipo: "textarea" },
        ]}
        itens={capacidades}
        colunas={[
          { chave: "equipamento", titulo: "Equipamento", render: (item) => nomeEquipamento(item.equipamentoId) },
          { chave: "formatos", titulo: "Formatos", render: (item) => item.formatos },
          { chave: "corPB", titulo: "Cor/P&B", render: (item) => CORPB.find((c) => c.value === item.corPB)?.label ?? item.corPB },
          { chave: "duplex", titulo: "Duplex", render: (item) => (item.duplex ? "Sim" : "Nao") },
          { chave: "materiais", titulo: "Materiais compatíveis", render: (item) => nomesMateriais(item.materiaisCompativeisIds) },
        ]}
        valoresParaEdicao={(item) => ({
          equipamentoId: item.equipamentoId,
          formatos: item.formatos,
          corPB: item.corPB,
          duplex: item.duplex,
          materiaisCompativeis: nomesMateriais(item.materiaisCompativeisIds) === "Sem restrição" ? "" : nomesMateriais(item.materiaisCompativeisIds),
          observacoes: item.observacoes ?? "",
        })}
        aoCriar={async (dados) => {
          await repositories.capacidadesEquipamento.criar({
            empresaId,
            equipamentoId: String(dados.equipamentoId),
            formatos: String(dados.formatos),
            corPB: dados.corPB as CapacidadeEquipamento["corPB"],
            duplex: Boolean(dados.duplex),
            materiaisCompativeisIds: resolverIdsMateriais(String(dados.materiaisCompativeis ?? ""), materiais),
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
            materiaisCompativeisIds: resolverIdsMateriais(String(dados.materiaisCompativeis ?? ""), materiais),
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

/** "Nome A, Nome B" -> ids correspondentes. Nomes nao encontrados sao ignorados silenciosamente. */
function resolverIdsMateriais(csv: string, materiais: Material[]): string[] {
  const nomes = csv
    .split(",")
    .map((nome) => nome.trim().toLowerCase())
    .filter(Boolean);
  if (nomes.length === 0) return [];
  return materiais.filter((material) => nomes.includes(material.nome.trim().toLowerCase())).map((material) => material.id);
}
