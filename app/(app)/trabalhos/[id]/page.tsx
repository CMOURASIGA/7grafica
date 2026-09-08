"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { PageIntro, SectionLabel, StatusPill, SurfaceCard } from "@/components/ui/workspace-primitives";
import { useToast } from "@/components/ui/toast";
import { useRepositoriosAutorizados as useRepositories, useSessao } from "@/components/providers/session-provider";
import { papelTemPermissao, PERMISSOES } from "@/lib/rbac";
import type { AlocacaoEquipamento, AvaliacaoCompatibilidadeEquipamento, Cliente, Equipamento, EventoAuditoria, Pedido, PrioridadeTrabalho, Trabalho } from "@/lib/domain/entities";
import type { VinculoComPerfil } from "@/lib/repositories/types";

const SITUACAO_LABEL: Record<Trabalho["situacao"], string> = {
  aguardando_producao: "Aguardando produção",
  em_producao: "Em produção",
  pausado: "Pausado",
  com_pendencia: "Com pendência",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

const PRIORIDADE_LABEL: Record<PrioridadeTrabalho, string> = { normal: "Normal", alta: "Alta", urgente: "Urgente" };

const SITUACAO_ALOCACAO_LABEL: Record<AlocacaoEquipamento["situacao"], string> = {
  aguardando: "Aguardando",
  preparacao: "Preparação",
  em_execucao: "Em execução",
  pausada: "Pausada",
  concluida: "Concluída",
  cancelada: "Cancelada (realocada)",
};
const SITUACOES_ALOCACAO_ATIVAS: AlocacaoEquipamento["situacao"][] = ["aguardando", "preparacao", "em_execucao", "pausada"];

export default function TrabalhoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const repositories = useRepositories();
  const { sessao } = useSessao();
  const { showToast } = useToast();
  const papel = sessao?.empresaAtiva?.papel ?? null;
  const usuarioId = sessao?.usuario.id ?? null;
  const podeVer = papel ? papelTemPermissao(papel, PERMISSOES.PRODUCAO_CONSULTAR) : false;
  const podeGerenciarTudo = papel ? papelTemPermissao(papel, PERMISSOES.PRODUCAO_GERENCIAR) : false;

  const [trabalho, setTrabalho] = useState<Trabalho | null>(null);
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [eventos, setEventos] = useState<EventoAuditoria[]>([]);
  const [equipe, setEquipe] = useState<VinculoComPerfil[]>([]);
  const [alocacoes, setAlocacoes] = useState<AlocacaoEquipamento[]>([]);
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [compatibilidade, setCompatibilidade] = useState<AvaliacaoCompatibilidadeEquipamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [motivo, setMotivo] = useState("");
  const [equipamentoSelecionadoId, setEquipamentoSelecionadoId] = useState("");
  const [equipamentoRealocacaoId, setEquipamentoRealocacaoId] = useState("");
  const [motivoRealocacao, setMotivoRealocacao] = useState("");
  const [motivoPausaAlocacao, setMotivoPausaAlocacao] = useState("");

  async function recarregar() {
    if (!podeVer) {
      setCarregando(false);
      return;
    }
    const atual = await repositories.trabalhos.obter(id);
    setTrabalho(atual);
    if (atual) {
      // Pedido e Cliente exigem permissoes de outras SPECs (SOLICITACOES_GERENCIAR,
      // CLIENTES_GERENCIAR) que Operador nao tem — sao so contexto informativo
      // aqui, entao uma negacao de permissao nao pode derrubar a pagina do
      // Trabalho (que Operador tem todo o direito de consultar/operar).
      const etapaAtual = atual.workflow.etapas.find((etapa) => etapa.id === atual.etapaAtualId);
      const usaEquipamento = etapaAtual ? etapaAtual.tipo === "automatica" || etapaAtual.tipo === "hibrida" : false;

      const [pedidoAtual, clienteAtual, listaEventos, listaEquipe, listaAlocacoes, listaEquipamentos, avaliacaoCompatibilidade] = await Promise.all([
        repositories.pedidos.obter(atual.pedidoId).catch(() => null),
        atual.clienteId ? repositories.clientes.obter(atual.clienteId).catch(() => null) : Promise.resolve(null),
        repositories.auditoria.listar(atual.empresaId, 300),
        podeGerenciarTudo ? repositories.usuarios.listarPorEmpresa(atual.empresaId) : Promise.resolve([]),
        repositories.alocacoesEquipamento.listarPorTrabalho(atual.id),
        repositories.equipamentos.listar(atual.empresaId),
        usaEquipamento ? repositories.alocacoesEquipamento.avaliarCompatibilidade(atual.id) : Promise.resolve([]),
      ]);
      setPedido(pedidoAtual);
      setCliente(clienteAtual);
      setEventos(listaEventos.filter((evento) => evento.entidade === "trabalho" && evento.entidadeId === atual.id));
      setEquipe(listaEquipe.filter((vinculo) => vinculo.ativo));
      setAlocacoes(listaAlocacoes);
      setEquipamentos(listaEquipamentos);
      setCompatibilidade(avaliacaoCompatibilidade);
    }
    setCarregando(false);
  }

  useEffect(() => {
    void recarregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, podeVer, podeGerenciarTudo]);

  if (carregando) return null;

  if (!podeVer) {
    return (
      <SurfaceCard className="p-5">
        <p className="text-sm text-(--text-secondary)">Seu papel atual não tem acesso à produção.</p>
      </SurfaceCard>
    );
  }

  if (!trabalho) {
    return (
      <SurfaceCard className="p-5">
        <p className="text-sm text-(--text-secondary)">Trabalho não encontrado.</p>
        <Link href="/kanban" className="mt-3 inline-block workspace-button-secondary">
          Voltar para o Kanban
        </Link>
      </SurfaceCard>
    );
  }

  const souResponsavel = trabalho.responsavelUsuarioId === usuarioId;
  const podeExecutarTransicao = podeGerenciarTudo || souResponsavel;
  const naoFinalizado = trabalho.situacao !== "concluido" && trabalho.situacao !== "cancelado";
  const etapas = trabalho.workflow.etapas;
  const indiceAtual = etapas.findIndex((etapa) => etapa.id === trabalho.etapaAtualId);
  const emCurso = trabalho.situacao === "em_producao" || trabalho.situacao === "aguardando_producao";

  async function comEmpurraoDeErro(acao: () => Promise<unknown>, mensagemSucesso: string) {
    try {
      await acao();
      showToast(mensagemSucesso, "success");
      setMotivo("");
      await recarregar();
    } catch (erro) {
      showToast(erro instanceof Error ? erro.message : "Ação não permitida.", "error");
    }
  }

  const etapaAtual = etapas.find((etapa) => etapa.id === trabalho.etapaAtualId) ?? null;
  const etapaUsaEquipamento = etapaAtual ? etapaAtual.tipo === "automatica" || etapaAtual.tipo === "hibrida" : false;
  const alocacaoAtiva = alocacoes.find((alocacao) => alocacao.etapaId === trabalho.etapaAtualId && SITUACOES_ALOCACAO_ATIVAS.includes(alocacao.situacao)) ?? null;
  const historicoAlocacoes = [...alocacoes]
    .filter((alocacao) => alocacao.id !== alocacaoAtiva?.id)
    .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  const nomeEquipamento = (id: string) => equipamentos.find((equip) => equip.id === id)?.nome ?? id;

  async function handleAlocarEquipamento() {
    if (!equipamentoSelecionadoId) return showToast("Selecione um equipamento compatível.", "error");
    try {
      await repositories.alocacoesEquipamento.criar(
        {
          empresaId: trabalho!.empresaId,
          trabalhoId: trabalho!.id,
          etapaId: trabalho!.etapaAtualId,
          equipamentoId: equipamentoSelecionadoId,
          operadorUsuarioId: trabalho!.responsavelUsuarioId,
          inicioPrevisto: null,
        },
        usuarioId!,
      );
      showToast("Equipamento alocado.", "success");
      setEquipamentoSelecionadoId("");
      await recarregar();
    } catch (erro) {
      showToast(erro instanceof Error ? erro.message : "Falha ao alocar equipamento.", "error");
    }
  }

  async function comAlocacao(acao: () => Promise<unknown>, mensagemSucesso: string) {
    try {
      await acao();
      showToast(mensagemSucesso, "success");
      setMotivoPausaAlocacao("");
      await recarregar();
    } catch (erro) {
      showToast(erro instanceof Error ? erro.message : "Ação não permitida.", "error");
    }
  }

  async function handleRealocar() {
    if (!alocacaoAtiva) return;
    if (!equipamentoRealocacaoId) return showToast("Selecione o equipamento de destino.", "error");
    if (!motivoRealocacao.trim()) return showToast("Informe o motivo da realocação.", "error");
    try {
      await repositories.alocacoesEquipamento.realocar(alocacaoAtiva.id, usuarioId!, equipamentoRealocacaoId, motivoRealocacao);
      showToast("Realocado para outro equipamento.", "success");
      setEquipamentoRealocacaoId("");
      setMotivoRealocacao("");
      await recarregar();
    } catch (erro) {
      showToast(erro instanceof Error ? erro.message : "Falha ao realocar.", "error");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PageIntro
        eyebrow={`Trabalho ${trabalho.codigo} — Pedido ${pedido?.numero ?? "?"}`}
        title={trabalho.descricao}
        description={`Cliente: ${cliente?.nome ?? "Consumidor não identificado"} · Workflow: ${trabalho.workflow.nome}`}
        aside={
          <>
            <StatusPill tone={trabalho.situacao === "concluido" ? "success" : trabalho.situacao === "cancelado" ? "neutral" : "accent"}>
              {SITUACAO_LABEL[trabalho.situacao]}
            </StatusPill>
            <StatusPill tone={trabalho.prioridade === "urgente" ? "danger" : trabalho.prioridade === "alta" ? "warning" : "neutral"}>
              Prioridade: {PRIORIDADE_LABEL[trabalho.prioridade]}
            </StatusPill>
          </>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href="/kanban" className="text-xs font-medium text-(--accent-strong) hover:underline">
          ← Voltar para o Kanban
        </Link>
        {pedido ? (
          <Link href={`/pedidos/${pedido.id}`} className="workspace-button-secondary">
            Ver pedido {pedido.numero}
          </Link>
        ) : null}
      </div>

      <SurfaceCard className="p-5">
        <SectionLabel>Etapas do workflow (snapshot)</SectionLabel>
        <p className="mt-1 text-xs text-(--text-tertiary)">
          Este snapshot foi copiado na criação do Trabalho — edições futuras no cadastro do Workflow não alteram este registro.
        </p>
        <ol className="mt-3 flex flex-wrap gap-2">
          {etapas.map((etapa, indice) => {
            const status = indice < indiceAtual ? "concluída" : indice === indiceAtual ? "atual" : "pendente";
            return (
              <li key={etapa.id} className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!podeExecutarTransicao || !emCurso}
                  onClick={() => {
                    if (indice < indiceAtual && !motivo.trim()) {
                      showToast("Retroceder de etapa exige justificativa (preencha o motivo abaixo antes).", "error");
                      return;
                    }
                    void comEmpurraoDeErro(
                      () => repositories.trabalhos.mover(trabalho.id, usuarioId!, etapa.id, indice < indiceAtual ? motivo : undefined),
                      `Trabalho movido para "${etapa.nome}".`,
                    );
                  }}
                  className={[
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    status === "atual" ? "border-(--accent-strong) bg-(--accent-strong) text-white" : "",
                    status === "concluída" ? "border-(--success) text-(--success)" : "",
                    status === "pendente" ? "border-(--border) text-(--text-tertiary)" : "",
                    !podeExecutarTransicao || !emCurso ? "opacity-60" : "hover:bg-(--bg-muted)",
                  ].join(" ")}
                >
                  {etapa.ordem}. {etapa.nome} ({etapa.tipo})
                </button>
                {indice < etapas.length - 1 ? <span className="text-(--text-tertiary)">→</span> : null}
              </li>
            );
          })}
        </ol>

        {podeExecutarTransicao && naoFinalizado ? (
          <div className="mt-4">
            <label htmlFor="trabalho-motivo" className="workspace-label">
              Motivo (obrigatório para retroceder etapa, pausar, registrar pendência ou cancelar)
            </label>
            <input id="trabalho-motivo" type="text" className="workspace-input" value={motivo} onChange={(event) => setMotivo(event.target.value)} />
          </div>
        ) : null}

        {podeExecutarTransicao ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {emCurso && indiceAtual === etapas.length - 1 ? (
              <button
                type="button"
                id="trabalho-btn-concluir"
                className="workspace-button-primary"
                onClick={() => void comEmpurraoDeErro(() => repositories.trabalhos.concluir(trabalho.id, usuarioId!), "Trabalho concluído.")}
              >
                Concluir Trabalho
              </button>
            ) : null}
            {emCurso ? (
              <button
                type="button"
                id="trabalho-btn-pausar"
                className="workspace-button-secondary"
                onClick={() => {
                  if (!motivo.trim()) return showToast("Informe o motivo da pausa.", "error");
                  void comEmpurraoDeErro(() => repositories.trabalhos.pausar(trabalho.id, usuarioId!, motivo), "Trabalho pausado.");
                }}
              >
                Pausar
              </button>
            ) : null}
            {emCurso ? (
              <button
                type="button"
                id="trabalho-btn-pendencia"
                className="workspace-button-secondary"
                onClick={() => {
                  if (!motivo.trim()) return showToast("Informe o motivo da pendência.", "error");
                  void comEmpurraoDeErro(() => repositories.trabalhos.registrarPendencia(trabalho.id, usuarioId!, motivo), "Pendência registrada.");
                }}
              >
                Registrar pendência
              </button>
            ) : null}
            {trabalho.situacao === "pausado" || trabalho.situacao === "com_pendencia" ? (
              <button
                type="button"
                id="trabalho-btn-retomar"
                className="workspace-button-primary"
                onClick={() => void comEmpurraoDeErro(() => repositories.trabalhos.retomar(trabalho.id, usuarioId!), "Trabalho retomado.")}
              >
                Retomar
              </button>
            ) : null}
            {podeGerenciarTudo && naoFinalizado ? (
              <button
                type="button"
                id="trabalho-btn-cancelar"
                className="workspace-button-danger"
                onClick={() => {
                  if (!motivo.trim()) return showToast("Informe o motivo do cancelamento.", "error");
                  void comEmpurraoDeErro(() => repositories.trabalhos.cancelar(trabalho.id, usuarioId!, motivo), "Trabalho cancelado.");
                }}
              >
                Cancelar
              </button>
            ) : null}
          </div>
        ) : (
          <p className="mt-4 text-xs text-(--text-tertiary)">Você pode consultar este Trabalho, mas não pode movimentá-lo.</p>
        )}
      </SurfaceCard>

      {etapaUsaEquipamento ? (
        <SurfaceCard className="p-5">
          <SectionLabel>Execução — Equipamento ({etapaAtual?.tipo === "hibrida" ? "híbrida: equipamento + operador" : "automática"})</SectionLabel>

          {alocacaoAtiva ? (
            <div className="mt-3 flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-(--border) px-4 py-3">
                <div>
                  <p className="font-medium text-(--text-primary)">{nomeEquipamento(alocacaoAtiva.equipamentoId)}</p>
                  <p className="text-xs text-(--text-tertiary)">
                    Operador: {equipe.find((v) => v.usuarioId === alocacaoAtiva.operadorUsuarioId)?.perfil?.nome ?? alocacaoAtiva.operadorUsuarioId ?? "—"}
                  </p>
                </div>
                <StatusPill tone={alocacaoAtiva.situacao === "em_execucao" ? "accent" : alocacaoAtiva.situacao === "pausada" ? "warning" : "neutral"}>
                  {SITUACAO_ALOCACAO_LABEL[alocacaoAtiva.situacao]}
                </StatusPill>
              </div>

              {alocacaoAtiva.precisaDecisaoHumana ? (
                <div className="rounded-xl border border-(--danger) bg-(--bg-muted) p-4">
                  <p className="text-sm font-medium text-(--danger)">
                    Este equipamento ficou indisponível/em manutenção enquanto a alocação estava ativa. Decida: aguarde o equipamento voltar ou
                    realoque para outro compatível.
                  </p>
                </div>
              ) : null}

              {podeExecutarTransicao ? (
                <div className="flex flex-wrap gap-2">
                  {alocacaoAtiva.situacao === "aguardando" ? (
                    <button
                      type="button"
                      id="alocacao-btn-preparar"
                      className="workspace-button-secondary"
                      onClick={() => void comAlocacao(() => repositories.alocacoesEquipamento.iniciarPreparacao(alocacaoAtiva.id, usuarioId!), "Preparação iniciada.")}
                    >
                      Iniciar preparação
                    </button>
                  ) : null}
                  {alocacaoAtiva.situacao === "aguardando" || alocacaoAtiva.situacao === "preparacao" ? (
                    <button
                      type="button"
                      id="alocacao-btn-iniciar"
                      className="workspace-button-primary"
                      onClick={() => void comAlocacao(() => repositories.alocacoesEquipamento.iniciar(alocacaoAtiva.id, usuarioId!), "Execução iniciada.")}
                    >
                      Iniciar execução
                    </button>
                  ) : null}
                  {alocacaoAtiva.situacao === "em_execucao" ? (
                    <>
                      <input
                        id="alocacao-motivo-pausa"
                        type="text"
                        placeholder="Motivo da pausa"
                        className="workspace-input"
                        value={motivoPausaAlocacao}
                        onChange={(event) => setMotivoPausaAlocacao(event.target.value)}
                      />
                      <button
                        type="button"
                        id="alocacao-btn-pausar"
                        className="workspace-button-secondary"
                        onClick={() => {
                          if (!motivoPausaAlocacao.trim()) return showToast("Informe o motivo da pausa.", "error");
                          void comAlocacao(() => repositories.alocacoesEquipamento.pausar(alocacaoAtiva.id, usuarioId!, motivoPausaAlocacao), "Alocação pausada.");
                        }}
                      >
                        Pausar
                      </button>
                      <button
                        type="button"
                        id="alocacao-btn-concluir"
                        className="workspace-button-primary"
                        onClick={() => void comAlocacao(() => repositories.alocacoesEquipamento.concluir(alocacaoAtiva.id, usuarioId!), "Alocação concluída.")}
                      >
                        Concluir
                      </button>
                    </>
                  ) : null}
                  {alocacaoAtiva.situacao === "pausada" ? (
                    <button
                      type="button"
                      id="alocacao-btn-retomar"
                      className="workspace-button-primary"
                      onClick={() => void comAlocacao(() => repositories.alocacoesEquipamento.retomar(alocacaoAtiva.id, usuarioId!), "Alocação retomada.")}
                    >
                      Retomar
                    </button>
                  ) : null}
                </div>
              ) : null}

              {podeGerenciarTudo ? (
                <div className="flex flex-wrap items-end gap-2 rounded-xl border border-(--border) bg-(--bg-muted) p-3">
                  <div>
                    <label htmlFor="trabalho-realocar-equipamento" className="workspace-label">
                      Realocar para
                    </label>
                    <select
                      id="trabalho-realocar-equipamento"
                      className="workspace-select"
                      value={equipamentoRealocacaoId}
                      onChange={(event) => setEquipamentoRealocacaoId(event.target.value)}
                    >
                      <option value="">Selecione...</option>
                      {compatibilidade
                        .filter((avaliacao) => avaliacao.compativel && avaliacao.equipamentoId !== alocacaoAtiva.equipamentoId)
                        .map((avaliacao) => (
                          <option key={avaliacao.equipamentoId} value={avaliacao.equipamentoId}>
                            {nomeEquipamento(avaliacao.equipamentoId)}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="trabalho-realocar-motivo" className="workspace-label">
                      Motivo da realocação
                    </label>
                    <input
                      id="trabalho-realocar-motivo"
                      type="text"
                      className="workspace-input"
                      value={motivoRealocacao}
                      onChange={(event) => setMotivoRealocacao(event.target.value)}
                    />
                  </div>
                  <button type="button" id="trabalho-btn-realocar" className="workspace-button-secondary" onClick={() => void handleRealocar()}>
                    Realocar
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <p className="mt-1 text-xs text-(--text-tertiary)">
                O sistema só lista equipamentos compatíveis — nunca todos os cadastrados — e explica o motivo de cada incompatibilidade.
              </p>
              <ul className="mt-3 flex flex-col gap-2">
                {compatibilidade.map((avaliacao) => (
                  <li
                    key={avaliacao.equipamentoId}
                    className={["flex flex-col gap-1 rounded-xl border px-4 py-3 text-sm", avaliacao.compativel ? "border-(--success)" : "border-(--border)"].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-(--text-primary)">{nomeEquipamento(avaliacao.equipamentoId)}</span>
                      <StatusPill tone={avaliacao.compativel ? "success" : "danger"}>{avaliacao.compativel ? "Compatível" : "Incompatível"}</StatusPill>
                    </div>
                    {avaliacao.motivos.length > 0 ? (
                      <ul className="list-disc pl-5 text-xs text-(--text-tertiary)">
                        {avaliacao.motivos.map((motivoItem, indice) => (
                          <li key={indice}>{motivoItem.mensagem}</li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                ))}
                {compatibilidade.length === 0 ? <p className="workspace-empty-state">Nenhum equipamento cadastrado.</p> : null}
              </ul>

              {podeGerenciarTudo ? (
                <div className="mt-4 flex flex-wrap items-end gap-2">
                  <div>
                    <label htmlFor="trabalho-alocar-equipamento" className="workspace-label">
                      Equipamento
                    </label>
                    <select
                      id="trabalho-alocar-equipamento"
                      className="workspace-select"
                      value={equipamentoSelecionadoId}
                      onChange={(event) => setEquipamentoSelecionadoId(event.target.value)}
                    >
                      <option value="">Selecione...</option>
                      {compatibilidade
                        .filter((avaliacao) => avaliacao.compativel)
                        .map((avaliacao) => (
                          <option key={avaliacao.equipamentoId} value={avaliacao.equipamentoId}>
                            {nomeEquipamento(avaliacao.equipamentoId)}
                          </option>
                        ))}
                    </select>
                  </div>
                  <button type="button" id="trabalho-btn-alocar" className="workspace-button-primary" onClick={() => void handleAlocarEquipamento()}>
                    Alocar equipamento
                  </button>
                </div>
              ) : null}
            </>
          )}

          {historicoAlocacoes.length > 0 ? (
            <div className="mt-4">
              <SectionLabel>Histórico de alocações</SectionLabel>
              <ul className="mt-2 flex flex-col gap-1 text-xs text-(--text-secondary)">
                {historicoAlocacoes.map((alocacao) => (
                  <li key={alocacao.id} className="flex justify-between border-b border-(--border) py-1">
                    <span>
                      {nomeEquipamento(alocacao.equipamentoId)} — {SITUACAO_ALOCACAO_LABEL[alocacao.situacao]}
                      {alocacao.motivoRealocacao ? ` (realocado: ${alocacao.motivoRealocacao})` : ""}
                    </span>
                    <span className="text-(--text-tertiary)">{new Date(alocacao.criadoEm).toLocaleString("pt-BR")}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </SurfaceCard>
      ) : null}

      <SurfaceCard className="p-5">
        <SectionLabel>Dados do Trabalho</SectionLabel>
        <div className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
          <div>
            <p className="workspace-label">Quantidade</p>
            <p className="text-(--text-primary)">{trabalho.quantidade}</p>
          </div>
          <div>
            <p className="workspace-label">Prazo</p>
            <p className="text-(--text-primary)">{trabalho.prazo ? new Date(trabalho.prazo).toLocaleDateString("pt-BR") : "—"}</p>
          </div>
          <div>
            <p className="workspace-label">Origem do Pedido</p>
            <p className="text-(--text-primary)">{trabalho.origem === "email" ? "E-mail / Orçamento" : "Balcão"}</p>
          </div>
          <div>
            <p className="workspace-label">Responsável</p>
            <p className="text-(--text-primary)">
              {equipe.find((vinculo) => vinculo.usuarioId === trabalho.responsavelUsuarioId)?.perfil?.nome ?? (trabalho.responsavelUsuarioId ?? "Não atribuído")}
            </p>
          </div>
          <div>
            <p className="workspace-label">Acabamentos</p>
            <p className="text-(--text-primary)">{trabalho.acabamentos ?? "—"}</p>
          </div>
        </div>

        {podeGerenciarTudo ? (
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="trabalho-responsavel" className="workspace-label">
                Atribuir responsável
              </label>
              <select
                id="trabalho-responsavel"
                className="workspace-select"
                value={trabalho.responsavelUsuarioId ?? ""}
                onChange={(event) =>
                  void comEmpurraoDeErro(
                    () => repositories.trabalhos.atribuirResponsavel(trabalho.id, usuarioId!, event.target.value || null),
                    "Responsável atualizado.",
                  )
                }
              >
                <option value="">Não atribuído</option>
                {equipe.map((vinculo) => (
                  <option key={vinculo.usuarioId} value={vinculo.usuarioId}>
                    {vinculo.perfil?.nome ?? vinculo.usuarioId}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : null}
      </SurfaceCard>

      <SurfaceCard className="p-5">
        <SectionLabel>Timeline</SectionLabel>
        {eventos.length === 0 ? (
          <p className="mt-3 workspace-empty-state">Nenhum evento registrado.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-1 text-sm text-(--text-secondary)">
            {[...eventos]
              .sort((a, b) => a.criadoEm.localeCompare(b.criadoEm))
              .map((evento) => (
                <li key={evento.id} className="flex justify-between border-b border-(--border) py-1">
                  <span>{evento.acao}</span>
                  <span className="text-xs text-(--text-tertiary)">{new Date(evento.criadoEm).toLocaleString("pt-BR")}</span>
                </li>
              ))}
          </ul>
        )}
      </SurfaceCard>
    </div>
  );
}
