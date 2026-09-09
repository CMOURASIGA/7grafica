"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArquivosComerciais } from "@/components/arquivos-comerciais";
import { PageIntro, SectionLabel, StatusPill, SurfaceCard } from "@/components/ui/workspace-primitives";
import { useToast } from "@/components/ui/toast";
import { useRepositoriosAutorizados as useRepositories, useSessao } from "@/components/providers/session-provider";
import { papelTemPermissao, PERMISSOES } from "@/lib/rbac";
import type { Cliente, EventoAuditoria, FormaPagamento, Material, Pedido, PrioridadeTrabalho, Recebimento, Servico, Trabalho, TipoEquipamento, Workflow } from "@/lib/domain/entities";

const TIPOS_EQUIPAMENTO: { value: TipoEquipamento; label: string }[] = [
  { value: "impressora", label: "Impressora" },
  { value: "guilhotina", label: "Guilhotina" },
  { value: "encadernadora", label: "Encadernadora" },
  { value: "laminadora", label: "Laminadora" },
  { value: "outro", label: "Outro" },
];

const ORIGEM_LABEL: Record<Pedido["origem"], string> = { email: "E-mail / Orçamento", balcao: "Balcão" };
const STATUS_ENTREGA_LABEL: Record<Pedido["statusEntrega"], string> = {
  aguardando_producao: "Aguardando produção",
  concluido: "Concluído",
  cancelado: "Cancelado",
};
const SITUACAO_TRABALHO_LABEL: Record<Trabalho["situacao"], string> = {
  aguardando_producao: "Aguardando produção",
  em_producao: "Em produção",
  pausado: "Pausado",
  com_pendencia: "Com pendência",
  concluido: "Concluído",
  cancelado: "Cancelado",
};
const SITUACOES_FINALIZADAS: Trabalho["situacao"][] = ["concluido", "cancelado"];

export default function PedidoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const repositories = useRepositories();
  const { sessao } = useSessao();
  const { showToast } = useToast();
  const papel = sessao?.empresaAtiva?.papel ?? null;
  const podeAcessar = papel ? papelTemPermissao(papel, PERMISSOES.SOLICITACOES_GERENCIAR) : false;
  const podeOperarCaixa = papel ? papelTemPermissao(papel, PERMISSOES.PDV_OPERAR) : false;
  const podeGerarTrabalho = papel ? papelTemPermissao(papel, PERMISSOES.PRODUCAO_GERENCIAR) : false;
  const podeVerProducao = papel ? papelTemPermissao(papel, PERMISSOES.PRODUCAO_CONSULTAR) : false;

  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [recebimentos, setRecebimentos] = useState<Recebimento[]>([]);
  const [formasPagamento, setFormasPagamento] = useState<FormaPagamento[]>([]);
  const [eventos, setEventos] = useState<EventoAuditoria[]>([]);
  const [caixaAbertoId, setCaixaAbertoId] = useState<string | null>(null);
  const [trabalhos, setTrabalhos] = useState<Trabalho[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [formaPagamentoId, setFormaPagamentoId] = useState("");
  const [valorPagamento, setValorPagamento] = useState("");
  const [valorEntregueDinheiro, setValorEntregueDinheiro] = useState("");

  const [novoTrabalhoDescricao, setNovoTrabalhoDescricao] = useState("");
  const [novoTrabalhoQuantidade, setNovoTrabalhoQuantidade] = useState("1");
  const [novoTrabalhoWorkflowId, setNovoTrabalhoWorkflowId] = useState("");
  const [novoTrabalhoPrazo, setNovoTrabalhoPrazo] = useState("");
  const [novoTrabalhoPrioridade, setNovoTrabalhoPrioridade] = useState<PrioridadeTrabalho>("normal");
  const [novoTrabalhoMaterialId, setNovoTrabalhoMaterialId] = useState("");
  const [novoTrabalhoServicoId, setNovoTrabalhoServicoId] = useState("");
  const [novoTrabalhoFormato, setNovoTrabalhoFormato] = useState("");
  const [novoTrabalhoTipoEquipamento, setNovoTrabalhoTipoEquipamento] = useState("");

  async function recarregar() {
    if (!podeAcessar) {
      setCarregando(false);
      return;
    }
    const atual = await repositories.pedidos.obter(id);
    setPedido(atual);
    if (atual) {
      const [clienteAtual, listaRecebimentos, listaFormas, listaEventos, caixaAberto, listaTrabalhos, listaWorkflows, listaMateriais, listaServicos] = await Promise.all([
        atual.clienteId ? repositories.clientes.obter(atual.clienteId) : Promise.resolve(null),
        repositories.recebimentos.listarPorPedido(atual.id),
        repositories.formasPagamento.listar(atual.empresaId),
        repositories.auditoria.listar(atual.empresaId, 200),
        repositories.caixa.obterAberto(atual.empresaId).catch(() => null),
        podeVerProducao ? repositories.trabalhos.listarPorPedido(atual.id) : Promise.resolve([]),
        podeGerarTrabalho ? repositories.workflows.listar(atual.empresaId) : Promise.resolve([]),
        podeGerarTrabalho ? repositories.materiais.listar(atual.empresaId) : Promise.resolve([]),
        podeGerarTrabalho ? repositories.servicos.listar(atual.empresaId) : Promise.resolve([]),
      ]);
      setCliente(clienteAtual);
      setRecebimentos(listaRecebimentos);
      setFormasPagamento(listaFormas.filter((forma) => forma.ativo));
      setEventos(listaEventos.filter((evento) => evento.entidade === "pedidos" && evento.entidadeId === atual.id));
      setCaixaAbertoId(caixaAberto?.id ?? null);
      setTrabalhos(listaTrabalhos);
      setWorkflows(listaWorkflows.filter((workflow) => workflow.ativo));
      setMateriais(listaMateriais.filter((material) => material.ativo));
      setServicos(listaServicos.filter((servico) => servico.ativo));
      if (!novoTrabalhoDescricao && atual.itens[0]) {
        setNovoTrabalhoDescricao(atual.itens[0].descricao);
        setNovoTrabalhoQuantidade(String(atual.itens[0].quantidade));
      }
    }
    setCarregando(false);
  }

  useEffect(() => {
    void recarregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, podeAcessar, podeVerProducao, podeGerarTrabalho]);

  const valorRecebido = useMemo(() => recebimentos.reduce((soma, item) => soma + item.valor, 0), [recebimentos]);
  const saldoPendente = pedido ? Math.max(0, pedido.valorTotal - valorRecebido) : 0;

  // Conclusao operacional e SEMPRE derivada, nunca persistida no Pedido: o
  // status comercial (statusEntrega) e o financeiro (recebimentos) sao
  // dimensoes independentes desta. So considerada quando ha ao menos um
  // Trabalho gerado.
  const producaoConcluida = trabalhos.length > 0 && trabalhos.every((trabalho) => SITUACOES_FINALIZADAS.includes(trabalho.situacao));

  if (carregando) return null;

  if (!podeAcessar) {
    return (
      <SurfaceCard className="p-5">
        <p className="text-sm text-(--text-secondary)">Seu papel atual nao tem acesso a pedidos.</p>
      </SurfaceCard>
    );
  }

  if (!pedido) {
    return (
      <SurfaceCard className="p-5">
        <p className="text-sm text-(--text-secondary)">Pedido não encontrado.</p>
        <Link href="/pedidos" className="mt-3 inline-block workspace-button-secondary">
          Voltar
        </Link>
      </SurfaceCard>
    );
  }

  async function handleRegistrarRecebimento() {
    if (!formaPagamentoId) {
      showToast("Selecione a forma de pagamento.", "error");
      return;
    }
    if (!caixaAbertoId) {
      showToast("Nenhum caixa aberto — abra o caixa para registrar recebimentos.", "error");
      return;
    }
    const valor = Number(valorPagamento) || 0;
    if (valor <= 0) {
      showToast("Informe um valor valido.", "error");
      return;
    }
    const forma = formasPagamento.find((item) => item.id === formaPagamentoId);
    const ehDinheiro = forma?.nome.toLowerCase() === "dinheiro";

    try {
      const recebimento = await repositories.recebimentos.criar({
        empresaId: pedido!.empresaId,
        pedidoId: pedido!.id,
        caixaId: caixaAbertoId,
        formaPagamentoId,
        valor,
        valorEntregueDinheiro: ehDinheiro && valorEntregueDinheiro ? Number(valorEntregueDinheiro) : null,
        registradoPorUsuarioId: sessao!.usuario.id,
      });
      await repositories.auditoria.registrar({
        empresaId: pedido!.empresaId,
        usuarioId: sessao!.usuario.id,
        acao: "pedido.recebimento",
        entidade: "pedidos",
        entidadeId: pedido!.id,
        dadosAntes: null,
        dadosDepois: { valor, formaPagamentoId, troco: recebimento.troco },
      });
      showToast(recebimento.troco ? `Recebido. Troco: R$ ${recebimento.troco.toFixed(2)}` : "Recebimento registrado.", "success");
      setFormaPagamentoId("");
      setValorPagamento("");
      setValorEntregueDinheiro("");
      await recarregar();
    } catch (erro) {
      showToast(erro instanceof Error ? erro.message : "Falha ao registrar pagamento.", "error");
    }
  }

  async function handleMarcarConcluido() {
    try {
      await repositories.pedidos.marcarConcluido(pedido!.id);
      await repositories.auditoria.registrar({
        empresaId: pedido!.empresaId,
        usuarioId: sessao!.usuario.id,
        acao: "pedido.concluido",
        entidade: "pedidos",
        entidadeId: pedido!.id,
        dadosAntes: null,
        dadosDepois: null,
      });
      showToast("Pedido concluído.", "success");
      await recarregar();
    } catch (erro) {
      showToast(erro instanceof Error ? erro.message : "Falha ao concluir pedido.", "error");
    }
  }

  async function handleGerarTrabalho() {
    if (!novoTrabalhoWorkflowId) {
      showToast("Selecione o workflow de producao.", "error");
      return;
    }
    if (!novoTrabalhoDescricao.trim()) {
      showToast("Descreva o que sera produzido.", "error");
      return;
    }
    const quantidade = Number(novoTrabalhoQuantidade) || 0;
    if (quantidade <= 0) {
      showToast("Informe uma quantidade valida.", "error");
      return;
    }
    try {
      const trabalho = await repositories.trabalhos.criar({
        empresaId: pedido!.empresaId,
        pedidoId: pedido!.id,
        clienteId: pedido!.clienteId,
        descricao: novoTrabalhoDescricao.trim(),
        quantidade,
        servicoId: novoTrabalhoServicoId || null,
        materialId: novoTrabalhoMaterialId || null,
        acabamentos: null,
        prazo: novoTrabalhoPrazo ? new Date(novoTrabalhoPrazo).toISOString() : null,
        prioridade: novoTrabalhoPrioridade,
        responsavelUsuarioId: null,
        observacoes: null,
        origem: pedido!.origem,
        workflowId: novoTrabalhoWorkflowId,
        formato: novoTrabalhoFormato.trim() || null,
        tipoEquipamentoNecessario: (novoTrabalhoTipoEquipamento as TipoEquipamento) || null,
      });
      showToast(`Trabalho ${trabalho.codigo} gerado.`, "success");
      setNovoTrabalhoWorkflowId("");
      setNovoTrabalhoMaterialId("");
      setNovoTrabalhoServicoId("");
      setNovoTrabalhoFormato("");
      setNovoTrabalhoTipoEquipamento("");
      setNovoTrabalhoPrazo("");
      setNovoTrabalhoPrioridade("normal");
      await recarregar();
    } catch (erro) {
      showToast(erro instanceof Error ? erro.message : "Falha ao gerar trabalho.", "error");
    }
  }

  function nomeForma(formaPagamentoId: string) {
    return formasPagamento.find((forma) => forma.id === formaPagamentoId)?.nome ?? "—";
  }

  return (
    <div className="flex flex-col gap-4">
      <PageIntro
        eyebrow={`Pedido ${pedido.numero} — ${ORIGEM_LABEL[pedido.origem]}`}
        title={cliente?.nome ?? "Consumidor não identificado"}
        description={`Criado em ${new Date(pedido.criadoEm).toLocaleString("pt-BR")}`}
        aside={
          <>
            <StatusPill tone={pedido.statusEntrega === "concluido" ? "success" : "warning"}>{STATUS_ENTREGA_LABEL[pedido.statusEntrega]}</StatusPill>
            {podeVerProducao && trabalhos.length > 0 ? (
              <StatusPill tone={producaoConcluida ? "success" : "accent"}>{producaoConcluida ? "Produção concluída" : "Produção em andamento"}</StatusPill>
            ) : null}
          </>
        }
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href="/pedidos" className="text-xs font-medium text-(--accent-strong) hover:underline">
          ← Voltar para pedidos
        </Link>
        <Link href={`/portal/pedido/${pedido.tokenAcompanhamento}`} target="_blank" className="workspace-button-secondary">
          Ver comprovante público
        </Link>
      </div>

      <SurfaceCard className="p-5">
        <SectionLabel>Itens</SectionLabel>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-(--text-tertiary)">
                <th className="border-b border-(--border) py-2 pr-4">Item</th>
                <th className="border-b border-(--border) py-2 pr-4">Qtd.</th>
                <th className="border-b border-(--border) py-2 pr-4">Unit.</th>
                <th className="border-b border-(--border) py-2 pr-4">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {pedido.itens.map((item) => (
                <tr key={item.id}>
                  <td className="border-b border-(--border) py-3 pr-4 text-(--text-primary)">
                    {item.descricao}
                    {item.acabamentos ? <span className="block text-xs text-(--text-tertiary)">{item.acabamentos}</span> : null}
                  </td>
                  <td className="border-b border-(--border) py-3 pr-4 text-(--text-secondary)">{item.quantidade}</td>
                  <td className="border-b border-(--border) py-3 pr-4 text-(--text-secondary)">R$ {item.precoUnitario.toFixed(2)}</td>
                  <td className="border-b border-(--border) py-3 pr-4 text-(--text-secondary)">R$ {(item.quantidade * item.precoUnitario).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SurfaceCard muted className="p-4">
            <SectionLabel>Valor do pedido</SectionLabel>
            <p className="mt-2 text-lg font-semibold text-(--text-primary)">R$ {pedido.valorTotal.toFixed(2)}</p>
          </SurfaceCard>
          <SurfaceCard muted className="p-4">
            <SectionLabel>Valor recebido</SectionLabel>
            <p className="mt-2 text-lg font-semibold text-(--success)">R$ {valorRecebido.toFixed(2)}</p>
          </SurfaceCard>
          <SurfaceCard muted className="p-4">
            <SectionLabel>Saldo pendente</SectionLabel>
            <p className={`mt-2 text-lg font-semibold ${saldoPendente > 0 ? "text-(--warning)" : "text-(--success)"}`}>R$ {saldoPendente.toFixed(2)}</p>
          </SurfaceCard>
        </div>

        {pedido.statusEntrega === "aguardando_producao" && podeAcessar ? (
          <button type="button" className="mt-4 workspace-button-secondary" onClick={() => void handleMarcarConcluido()}>
            Marcar como concluído
          </button>
        ) : null}
      </SurfaceCard>

      <SurfaceCard className="p-5">
        <SectionLabel>Recebimentos</SectionLabel>
        {recebimentos.length === 0 ? (
          <p className="mt-3 workspace-empty-state">Nenhum recebimento registrado ainda.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-1 text-sm text-(--text-secondary)">
            {recebimentos.map((recebimento) => (
              <li key={recebimento.id} className="flex justify-between border-b border-(--border) py-1">
                <span>
                  {new Date(recebimento.registradoEm).toLocaleDateString("pt-BR")} — {nomeForma(recebimento.formaPagamentoId)}
                </span>
                <span className="font-medium text-(--text-primary)">R$ {recebimento.valor.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        )}

        {saldoPendente > 0 && podeOperarCaixa ? (
          <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-(--border) bg-(--bg-muted) p-4 sm:grid-cols-4">
            <div>
              <label className="workspace-label">Forma de pagamento</label>
              <select className="workspace-select" value={formaPagamentoId} onChange={(event) => setFormaPagamentoId(event.target.value)}>
                <option value="">Selecione...</option>
                {formasPagamento.map((forma) => (
                  <option key={forma.id} value={forma.id}>
                    {forma.nome}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="workspace-label">Valor</label>
              <input type="number" step="0.01" className="workspace-input" value={valorPagamento} onChange={(event) => setValorPagamento(event.target.value)} placeholder={saldoPendente.toFixed(2)} />
            </div>
            {nomeForma(formaPagamentoId).toLowerCase() === "dinheiro" ? (
              <div>
                <label className="workspace-label">Valor entregue (dinheiro)</label>
                <input type="number" step="0.01" className="workspace-input" value={valorEntregueDinheiro} onChange={(event) => setValorEntregueDinheiro(event.target.value)} />
              </div>
            ) : null}
            <div className="flex items-end">
              <button type="button" className="workspace-button-primary" onClick={() => void handleRegistrarRecebimento()}>
                Registrar recebimento
              </button>
            </div>
            {!caixaAbertoId ? <p className="text-xs text-(--danger) sm:col-span-4">Nenhum caixa aberto — abra o caixa para registrar este recebimento.</p> : null}
          </div>
        ) : null}
      </SurfaceCard>

      {podeVerProducao ? (
        <SurfaceCard className="p-5">
          <SectionLabel>Trabalhos (produção)</SectionLabel>
          <p className="mt-1 text-xs text-(--text-tertiary)">
            Um Pedido pode gerar um ou vários Trabalhos — a decomposição não assume 1 item = 1 trabalho.
          </p>

          {trabalhos.length === 0 ? (
            <p className="mt-3 workspace-empty-state">Nenhum Trabalho gerado ainda para este pedido.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {trabalhos.map((trabalho) => (
                <li key={trabalho.id}>
                  <Link
                    href={`/trabalhos/${trabalho.id}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-(--border) px-4 py-3 text-sm hover:bg-(--bg-muted)"
                  >
                    <span className="font-medium text-(--text-primary)">
                      {trabalho.codigo} — {trabalho.descricao}
                    </span>
                    <StatusPill tone={SITUACOES_FINALIZADAS.includes(trabalho.situacao) ? "success" : "accent"}>
                      {SITUACAO_TRABALHO_LABEL[trabalho.situacao]}
                    </StatusPill>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {podeGerarTrabalho && pedido.statusEntrega !== "cancelado" ? (
            <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-(--border) bg-(--bg-muted) p-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="sm:col-span-2 lg:col-span-2">
                <label htmlFor="pedido-novo-trabalho-descricao" className="workspace-label">
                  O que será produzido
                </label>
                <input
                  id="pedido-novo-trabalho-descricao"
                  type="text"
                  className="workspace-input"
                  value={novoTrabalhoDescricao}
                  onChange={(event) => setNovoTrabalhoDescricao(event.target.value)}
                />
              </div>
              <div>
                <label htmlFor="pedido-novo-trabalho-quantidade" className="workspace-label">
                  Quantidade
                </label>
                <input
                  id="pedido-novo-trabalho-quantidade"
                  type="number"
                  min={1}
                  className="workspace-input"
                  value={novoTrabalhoQuantidade}
                  onChange={(event) => setNovoTrabalhoQuantidade(event.target.value)}
                />
              </div>
              <div>
                <label htmlFor="pedido-novo-trabalho-workflow" className="workspace-label">
                  Workflow
                </label>
                <select
                  id="pedido-novo-trabalho-workflow"
                  className="workspace-select"
                  value={novoTrabalhoWorkflowId}
                  onChange={(event) => setNovoTrabalhoWorkflowId(event.target.value)}
                >
                  <option value="">Selecione...</option>
                  {workflows.map((workflow) => (
                    <option key={workflow.id} value={workflow.id}>
                      {workflow.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="pedido-novo-trabalho-prioridade" className="workspace-label">
                  Prioridade
                </label>
                <select
                  id="pedido-novo-trabalho-prioridade"
                  className="workspace-select"
                  value={novoTrabalhoPrioridade}
                  onChange={(event) => setNovoTrabalhoPrioridade(event.target.value as PrioridadeTrabalho)}
                >
                  <option value="normal">Normal</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>
              <div>
                <label htmlFor="pedido-novo-trabalho-prazo" className="workspace-label">
                  Prazo (opcional)
                </label>
                <input
                  id="pedido-novo-trabalho-prazo"
                  type="date"
                  className="workspace-input"
                  value={novoTrabalhoPrazo}
                  onChange={(event) => setNovoTrabalhoPrazo(event.target.value)}
                />
              </div>
              <div>
                <label htmlFor="pedido-novo-trabalho-servico" className="workspace-label">
                  Serviço (opcional — define requisito de arquivo)
                </label>
                <select
                  id="pedido-novo-trabalho-servico"
                  className="workspace-select"
                  value={novoTrabalhoServicoId}
                  onChange={(event) => setNovoTrabalhoServicoId(event.target.value)}
                >
                  <option value="">Nenhum</option>
                  {servicos.map((servico) => (
                    <option key={servico.id} value={servico.id}>
                      {servico.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="pedido-novo-trabalho-material" className="workspace-label">
                  Material (opcional)
                </label>
                <select
                  id="pedido-novo-trabalho-material"
                  className="workspace-select"
                  value={novoTrabalhoMaterialId}
                  onChange={(event) => setNovoTrabalhoMaterialId(event.target.value)}
                >
                  <option value="">Nenhum</option>
                  {materiais.map((material) => (
                    <option key={material.id} value={material.id}>
                      {material.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="pedido-novo-trabalho-formato" className="workspace-label">
                  Formato (opcional)
                </label>
                <input
                  id="pedido-novo-trabalho-formato"
                  type="text"
                  placeholder="Ex.: A3"
                  className="workspace-input"
                  value={novoTrabalhoFormato}
                  onChange={(event) => setNovoTrabalhoFormato(event.target.value)}
                />
              </div>
              <div>
                <label htmlFor="pedido-novo-trabalho-tipo-equipamento" className="workspace-label">
                  Equipamento necessário (opcional)
                </label>
                <select
                  id="pedido-novo-trabalho-tipo-equipamento"
                  className="workspace-select"
                  value={novoTrabalhoTipoEquipamento}
                  onChange={(event) => setNovoTrabalhoTipoEquipamento(event.target.value)}
                >
                  <option value="">Nenhum (workflow só humano)</option>
                  {TIPOS_EQUIPAMENTO.map((tipo) => (
                    <option key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button type="button" id="pedido-gerar-trabalho-botao" className="workspace-button-primary" onClick={() => void handleGerarTrabalho()}>
                  Gerar Trabalho
                </button>
              </div>
            </div>
          ) : null}
        </SurfaceCard>
      ) : null}

      <SurfaceCard className="p-5">
        <SectionLabel>Histórico</SectionLabel>
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
      <ArquivosComerciais empresaId={pedido.empresaId} pedidoId={pedido.id} />
    </div>
  );
}
