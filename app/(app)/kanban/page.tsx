"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MetricCard, PageIntro, SectionLabel, StatusPill, SurfaceCard } from "@/components/ui/workspace-primitives";
import { useToast } from "@/components/ui/toast";
import { useRepositoriosAutorizados as useRepositories, useSessao } from "@/components/providers/session-provider";
import { papelTemPermissao, PERMISSOES } from "@/lib/rbac";
import type { Cliente, Pedido, PrioridadeTrabalho, Trabalho } from "@/lib/domain/entities";
import type { VinculoComPerfil } from "@/lib/repositories/types";

const PRIORIDADE_LABEL: Record<PrioridadeTrabalho, string> = { normal: "Normal", alta: "Alta", urgente: "Urgente" };

/** Cor do indicador de prazo — nunca decide bloqueio, so sinaliza visualmente. */
function tonalidadePrazo(prazo: string | null): "neutral" | "warning" | "danger" {
  if (!prazo) return "neutral";
  const dias = (new Date(prazo).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (dias < 0) return "danger";
  if (dias <= 2) return "warning";
  return "neutral";
}

export default function KanbanPage() {
  const repositories = useRepositories();
  const { sessao } = useSessao();
  const { showToast } = useToast();
  const papel = sessao?.empresaAtiva?.papel ?? null;
  const usuarioId = sessao?.usuario.id ?? null;
  const empresaId = sessao?.empresaAtiva?.id ?? null;
  const podeVer = papel ? papelTemPermissao(papel, PERMISSOES.PRODUCAO_CONSULTAR) : false;
  const podeGerenciarTudo = papel ? papelTemPermissao(papel, PERMISSOES.PRODUCAO_GERENCIAR) : false;

  const [trabalhos, setTrabalhos] = useState<Trabalho[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [equipe, setEquipe] = useState<VinculoComPerfil[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [workflowId, setWorkflowId] = useState("");
  const [filtroResponsavel, setFiltroResponsavel] = useState("");
  const [filtroPrioridade, setFiltroPrioridade] = useState("");
  const [filtroClienteId, setFiltroClienteId] = useState("");
  const [busca, setBusca] = useState("");
  const [arrastando, setArrastando] = useState<string | null>(null);

  async function recarregar() {
    if (!podeVer || !empresaId) {
      setCarregando(false);
      return;
    }
    // Pedidos e Clientes exigem permissoes de outras SPECs que Operador nao
    // tem — sao so contexto informativo no card (numero do pedido, nome do
    // cliente); uma negacao de permissao ai nao pode derrubar o Kanban, que
    // Operador tem todo o direito de consultar/operar (PRODUCAO_CONSULTAR).
    const [listaTrabalhos, listaPedidos, listaClientes, listaEquipe] = await Promise.all([
      repositories.trabalhos.listar(empresaId),
      repositories.pedidos.listar(empresaId).catch(() => []),
      repositories.clientes.listar(empresaId).catch(() => []),
      repositories.usuarios.listarPorEmpresa(empresaId),
    ]);
    setTrabalhos(listaTrabalhos);
    setPedidos(listaPedidos);
    setClientes(listaClientes);
    setEquipe(listaEquipe.filter((vinculo) => vinculo.ativo));
    setCarregando(false);
  }

  useEffect(() => {
    void recarregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId, podeVer]);

  const workflowsDisponiveis = useMemo(() => {
    const mapa = new Map<string, string>();
    trabalhos.forEach((trabalho) => mapa.set(trabalho.workflow.workflowId, trabalho.workflow.nome));
    return Array.from(mapa.entries()).map(([id, nome]) => ({ id, nome }));
  }, [trabalhos]);

  useEffect(() => {
    if (!workflowId && workflowsDisponiveis.length > 0) setWorkflowId(workflowsDisponiveis[0].id);
  }, [workflowId, workflowsDisponiveis]);

  const trabalhosDoWorkflow = useMemo(() => trabalhos.filter((trabalho) => trabalho.workflow.workflowId === workflowId), [trabalhos, workflowId]);

  const colunas = useMemo(() => {
    const referencia = trabalhosDoWorkflow[0];
    return referencia ? [...referencia.workflow.etapas].sort((a, b) => a.ordem - b.ordem) : [];
  }, [trabalhosDoWorkflow]);

  const trabalhosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return trabalhosDoWorkflow.filter((trabalho) => {
      if (trabalho.situacao === "cancelado") return false;
      if (filtroResponsavel && trabalho.responsavelUsuarioId !== filtroResponsavel) return false;
      if (filtroPrioridade && trabalho.prioridade !== filtroPrioridade) return false;
      if (filtroClienteId && trabalho.clienteId !== filtroClienteId) return false;
      if (termo) {
        const pedido = pedidos.find((item) => item.id === trabalho.pedidoId);
        const cliente = clientes.find((item) => item.id === trabalho.clienteId);
        const alvo = `${trabalho.codigo} ${trabalho.descricao} ${pedido?.numero ?? ""} ${cliente?.nome ?? ""}`.toLowerCase();
        if (!alvo.includes(termo)) return false;
      }
      return true;
    });
  }, [trabalhosDoWorkflow, filtroResponsavel, filtroPrioridade, filtroClienteId, busca, pedidos, clientes]);

  const concluidos = trabalhosFiltrados.filter((trabalho) => trabalho.situacao === "concluido");
  const emAndamento = trabalhosFiltrados.filter((trabalho) => trabalho.situacao !== "concluido");

  const contagens = useMemo(
    () => ({
      aguardando: trabalhos.filter((t) => t.situacao === "aguardando_producao").length,
      emProducao: trabalhos.filter((t) => t.situacao === "em_producao").length,
      pendencia: trabalhos.filter((t) => t.situacao === "com_pendencia" || t.situacao === "pausado").length,
      atrasados: trabalhos.filter((t) => t.prazo && new Date(t.prazo).getTime() < Date.now() && t.situacao !== "concluido" && t.situacao !== "cancelado").length,
      concluidos: trabalhos.filter((t) => t.situacao === "concluido").length,
    }),
    [trabalhos],
  );

  if (carregando) return null;

  if (!podeVer) {
    return (
      <SurfaceCard className="p-5">
        <p className="text-sm text-(--text-secondary)">Seu papel atual não tem acesso à produção.</p>
      </SurfaceCard>
    );
  }

  async function moverPara(trabalho: Trabalho, etapaDestinoId: string) {
    const etapas = trabalho.workflow.etapas;
    const indiceAtual = etapas.findIndex((etapa) => etapa.id === trabalho.etapaAtualId);
    const indiceDestino = etapas.findIndex((etapa) => etapa.id === etapaDestinoId);
    if (indiceDestino === indiceAtual) return;

    const podeExecutar = podeGerenciarTudo || trabalho.responsavelUsuarioId === usuarioId;
    if (!podeExecutar) {
      showToast("Você só pode movimentar Trabalhos dos quais é responsável.", "error");
      return;
    }

    let motivo: string | undefined;
    if (indiceDestino < indiceAtual) {
      motivo = window.prompt("Retroceder de etapa exige justificativa. Descreva o motivo:") ?? undefined;
      if (!motivo || !motivo.trim()) {
        showToast("Retrocesso cancelado: motivo obrigatório.", "error");
        return;
      }
    }

    try {
      await repositories.trabalhos.mover(trabalho.id, usuarioId!, etapaDestinoId, motivo);
      showToast(`${trabalho.codigo} movido.`, "success");
      await recarregar();
    } catch (erro) {
      showToast(erro instanceof Error ? erro.message : "Movimentação bloqueada.", "error");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PageIntro
        eyebrow="Produção"
        title="Kanban de Trabalhos"
        description="Cada card é um Trabalho — um Pedido com vários Trabalhos aparece em posições diferentes do quadro, simultaneamente."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <MetricCard label="Aguardando" value={contagens.aguardando} />
        <MetricCard label="Em produção" value={contagens.emProducao} />
        <MetricCard label="Pausado/pendência" value={contagens.pendencia} />
        <MetricCard label="Atrasados" value={contagens.atrasados} />
        <MetricCard label="Concluídos" value={contagens.concluidos} />
      </div>

      <SurfaceCard className="p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="workspace-label">Workflow</label>
            <select className="workspace-select" value={workflowId} onChange={(event) => setWorkflowId(event.target.value)}>
              {workflowsDisponiveis.map((workflow) => (
                <option key={workflow.id} value={workflow.id}>
                  {workflow.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="workspace-label">Responsável</label>
            <select className="workspace-select" value={filtroResponsavel} onChange={(event) => setFiltroResponsavel(event.target.value)}>
              <option value="">Todos</option>
              {equipe.map((vinculo) => (
                <option key={vinculo.usuarioId} value={vinculo.usuarioId}>
                  {vinculo.perfil?.nome ?? vinculo.usuarioId}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="workspace-label">Prioridade</label>
            <select className="workspace-select" value={filtroPrioridade} onChange={(event) => setFiltroPrioridade(event.target.value)}>
              <option value="">Todas</option>
              <option value="normal">Normal</option>
              <option value="alta">Alta</option>
              <option value="urgente">Urgente</option>
            </select>
          </div>
          <div>
            <label className="workspace-label">Cliente</label>
            <select className="workspace-select" value={filtroClienteId} onChange={(event) => setFiltroClienteId(event.target.value)}>
              <option value="">Todos</option>
              {clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="workspace-label">Buscar</label>
            <input type="text" className="workspace-input" placeholder="Código, pedido, cliente..." value={busca} onChange={(event) => setBusca(event.target.value)} />
          </div>
        </div>
      </SurfaceCard>

      {workflowsDisponiveis.length === 0 ? (
        <SurfaceCard className="p-5">
          <p className="workspace-empty-state">Nenhum Trabalho gerado ainda — gere um a partir de um Pedido.</p>
        </SurfaceCard>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {colunas.map((etapa) => {
            const cardsDaColuna = emAndamento.filter((trabalho) => trabalho.etapaAtualId === etapa.id);
            return (
              <div
                key={etapa.id}
                className="flex min-w-[280px] flex-1 flex-col gap-2 rounded-xl border border-(--border) bg-(--bg-muted) p-3"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const trabalhoId = event.dataTransfer.getData("text/trabalho-id") || arrastando;
                  const trabalho = trabalhosFiltrados.find((item) => item.id === trabalhoId);
                  if (trabalho) void moverPara(trabalho, etapa.id);
                  setArrastando(null);
                }}
              >
                <div className="flex items-center justify-between">
                  <SectionLabel>
                    {etapa.nome} ({etapa.tipo})
                  </SectionLabel>
                  <span className="text-xs text-(--text-tertiary)">{cardsDaColuna.length}</span>
                </div>
                {cardsDaColuna.length === 0 ? <p className="workspace-empty-state text-xs">Vazio</p> : null}
                {cardsDaColuna.map((trabalho) => (
                  <CardTrabalho
                    key={trabalho.id}
                    trabalho={trabalho}
                    pedido={pedidos.find((item) => item.id === trabalho.pedidoId) ?? null}
                    cliente={clientes.find((item) => item.id === trabalho.clienteId) ?? null}
                    responsavelNome={equipe.find((v) => v.usuarioId === trabalho.responsavelUsuarioId)?.perfil?.nome ?? null}
                    onDragStart={(event) => {
                      event.dataTransfer.setData("text/trabalho-id", trabalho.id);
                      setArrastando(trabalho.id);
                    }}
                  />
                ))}
              </div>
            );
          })}

          <div className="flex min-w-[280px] flex-1 flex-col gap-2 rounded-xl border border-(--border) bg-(--bg-muted) p-3">
            <div className="flex items-center justify-between">
              <SectionLabel>Concluído</SectionLabel>
              <span className="text-xs text-(--text-tertiary)">{concluidos.length}</span>
            </div>
            {concluidos.length === 0 ? <p className="workspace-empty-state text-xs">Vazio</p> : null}
            {concluidos.map((trabalho) => (
              <CardTrabalho
                key={trabalho.id}
                trabalho={trabalho}
                pedido={pedidos.find((item) => item.id === trabalho.pedidoId) ?? null}
                cliente={clientes.find((item) => item.id === trabalho.clienteId) ?? null}
                responsavelNome={equipe.find((v) => v.usuarioId === trabalho.responsavelUsuarioId)?.perfil?.nome ?? null}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CardTrabalho({
  trabalho,
  pedido,
  cliente,
  responsavelNome,
  onDragStart,
}: {
  trabalho: Trabalho;
  pedido: Pedido | null;
  cliente: Cliente | null;
  responsavelNome: string | null;
  onDragStart?: (event: React.DragEvent<HTMLAnchorElement>) => void;
}) {
  const tonalidade = tonalidadePrazo(trabalho.prazo);
  const temPendencia = trabalho.situacao === "com_pendencia" || trabalho.situacao === "pausado";
  return (
    <Link
      href={`/trabalhos/${trabalho.id}`}
      draggable={Boolean(onDragStart)}
      onDragStart={onDragStart}
      className="workspace-card block cursor-grab p-3 text-sm hover:shadow-md"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-(--text-primary)">{trabalho.codigo}</span>
        <StatusPill tone={trabalho.prioridade === "urgente" ? "danger" : trabalho.prioridade === "alta" ? "warning" : "neutral"}>
          {PRIORIDADE_LABEL[trabalho.prioridade]}
        </StatusPill>
      </div>
      <p className="mt-1 text-(--text-secondary)">{trabalho.descricao}</p>
      <p className="mt-1 text-xs text-(--text-tertiary)">
        Pedido {pedido?.numero ?? "?"} · {cliente?.nome ?? "Consumidor não identificado"} · Qtd. {trabalho.quantidade}
      </p>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-(--text-tertiary)">{responsavelNome ?? "Sem responsável"}</span>
        <span className={tonalidade === "danger" ? "font-medium text-(--danger)" : tonalidade === "warning" ? "font-medium text-(--warning)" : "text-(--text-tertiary)"}>
          {trabalho.prazo ? new Date(trabalho.prazo).toLocaleDateString("pt-BR") : "Sem prazo"}
        </span>
      </div>
      {temPendencia ? <StatusPill tone="warning">{trabalho.situacao === "pausado" ? "Pausado" : "Com pendência"}</StatusPill> : null}
    </Link>
  );
}
