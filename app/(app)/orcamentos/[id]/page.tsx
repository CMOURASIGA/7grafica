"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageIntro, SectionLabel, StatusPill, SurfaceCard } from "@/components/ui/workspace-primitives";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { useRepositoriosAutorizados as useRepositories, useSessao } from "@/components/providers/session-provider";
import { papelTemPermissao, PERMISSOES } from "@/lib/rbac";
import { MOTIVOS_REJEICAO, MOTIVO_REJEICAO_LABEL, STATUS_ORCAMENTO_LABEL, STATUS_ORCAMENTO_TONE } from "@/lib/orcamentos-ui";
import type { Cliente, EmailContato, MotivoRejeicaoOrcamento, Orcamento, OrcamentoItem, Pedido, Servico } from "@/lib/domain/entities";

function gerarIdItem() {
  return `item-${Math.random().toString(36).slice(2, 10)}`;
}

const ITEM_VAZIO = (): OrcamentoItem => ({
  id: gerarIdItem(),
  descricao: "",
  quantidade: 1,
  servicoId: null,
  materialId: null,
  acabamentos: "",
  precoUnitario: 0,
});

export default function OrcamentoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const repositories = useRepositories();
  const router = useRouter();
  const { sessao } = useSessao();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const empresaId = sessao?.empresaAtiva?.id;
  const papel = sessao?.empresaAtiva?.papel ?? null;
  const podeAcessar = papel ? papelTemPermissao(papel, PERMISSOES.SOLICITACOES_GERENCIAR) : false;

  const [orcamento, setOrcamento] = useState<Orcamento | null>(null);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [emailsCliente, setEmailsCliente] = useState<EmailContato[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [carregando, setCarregando] = useState(true);

  const [itens, setItens] = useState<OrcamentoItem[]>([]);
  const [prazoEntregaDias, setPrazoEntregaDias] = useState("");
  const [validadeAte, setValidadeAte] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [destinatario, setDestinatario] = useState("");
  const [salvando, setSalvando] = useState(false);

  const [motivoRejeicao, setMotivoRejeicao] = useState<MotivoRejeicaoOrcamento>("preco_alto");
  const [justificativa, setJustificativa] = useState("");

  async function recarregar() {
    if (!podeAcessar) {
      setCarregando(false);
      return;
    }
    const atual = await repositories.orcamentos.obter(id);
    setOrcamento(atual);
    if (atual) {
      setItens(atual.itens.length ? atual.itens : [ITEM_VAZIO()]);
      setPrazoEntregaDias(atual.prazoEntregaDias?.toString() ?? "");
      setValidadeAte(atual.validadeAte?.slice(0, 10) ?? "");
      setObservacoes(atual.observacoes ?? "");
      if (atual.clienteId) {
        const [clienteAtual, contatos] = await Promise.all([
          repositories.clientes.obter(atual.clienteId),
          repositories.contatos.listarPorCliente(atual.clienteId),
        ]);
        setCliente(clienteAtual);
        const emailsPorContato = await Promise.all(contatos.map((contato) => repositories.emailsContato.listarPorContato(contato.id)));
        const todosEmails = emailsPorContato.flat();
        setEmailsCliente(todosEmails);
        setDestinatario(todosEmails.find((email) => email.principal)?.email ?? todosEmails[0]?.email ?? "");
      }
      if (empresaId) {
        setServicos(await repositories.servicos.listar(empresaId));
      }
      const pedidos = empresaId ? await repositories.pedidos.listar(empresaId) : [];
      setPedido(pedidos.find((item) => item.orcamentoId === atual.id) ?? null);
    }
    setCarregando(false);
  }

  useEffect(() => {
    void recarregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, podeAcessar]);

  const valorTotal = useMemo(() => itens.reduce((soma, item) => soma + item.quantidade * item.precoUnitario, 0), [itens]);

  if (carregando) return null;

  if (!podeAcessar) {
    return (
      <SurfaceCard className="p-5">
        <p className="text-sm text-(--text-secondary)">Seu papel atual nao tem acesso a orcamentos.</p>
      </SurfaceCard>
    );
  }

  if (!orcamento || !empresaId) {
    return (
      <SurfaceCard className="p-5">
        <p className="text-sm text-(--text-secondary)">Orcamento nao encontrado.</p>
        <Link href="/orcamentos" className="mt-3 inline-block workspace-button-secondary">
          Voltar
        </Link>
      </SurfaceCard>
    );
  }

  const editavel = orcamento.status === "rascunho";

  function atualizarItem(itemId: string, campo: keyof OrcamentoItem, valor: string | number | null) {
    setItens((prev) => prev.map((item) => (item.id === itemId ? { ...item, [campo]: valor } : item)));
  }

  function removerItem(itemId: string) {
    setItens((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== itemId) : prev));
  }

  async function handleSalvar() {
    setSalvando(true);
    try {
      const itensValidos = itens.filter((item) => item.descricao.trim());
      const atualizado = await repositories.orcamentos.atualizar(orcamento!.id, {
        itens: itensValidos,
        prazoEntregaDias: prazoEntregaDias ? Number(prazoEntregaDias) : null,
        validadeAte: validadeAte ? new Date(validadeAte).toISOString() : null,
        observacoes: observacoes.trim() || null,
        valorTotal: itensValidos.reduce((soma, item) => soma + item.quantidade * item.precoUnitario, 0),
      });
      setOrcamento(atualizado);
      showToast("Orcamento salvo.", "success");
    } catch (erro) {
      showToast(erro instanceof Error ? erro.message : "Falha ao salvar.", "error");
    } finally {
      setSalvando(false);
    }
  }

  async function handleEnviar() {
    if (!destinatario.trim()) {
      showToast("Informe o e-mail de destino.", "error");
      return;
    }
    await handleSalvar();
    try {
      const { link } = await repositories.orcamentos.enviarPorEmail(orcamento!.id, destinatario.trim());
      await repositories.solicitacoes.atualizar(orcamento!.solicitacaoId, { status: "em_analise" }).catch(() => undefined);
      await repositories.auditoria.registrar({
        empresaId: empresaId!,
        usuarioId: sessao!.usuario.id,
        acao: "orcamento.enviar",
        entidade: "orcamentos",
        entidadeId: orcamento!.id,
        dadosAntes: null,
        dadosDepois: { destinatario, link },
      });
      showToast(`Orcamento enviado. Link de acompanhamento: ${link}`, "success");
      await recarregar();
    } catch (erro) {
      showToast(erro instanceof Error ? erro.message : "Falha ao enviar.", "error");
    }
  }

  async function handleNovaVersao() {
    try {
      const nova = await repositories.orcamentos.criarNovaVersao(orcamento!.id);
      await repositories.auditoria.registrar({
        empresaId: empresaId!,
        usuarioId: sessao!.usuario.id,
        acao: "orcamento.nova_versao",
        entidade: "orcamentos",
        entidadeId: nova.id,
        dadosAntes: { origemId: orcamento!.id },
        dadosDepois: { numero: nova.numero, versao: nova.versao },
      });
      router.push(`/orcamentos/${nova.id}`);
    } catch (erro) {
      showToast(erro instanceof Error ? erro.message : "Falha ao criar nova versao.", "error");
    }
  }

  async function handleSimularDecisao(decisao: "aprovado" | "alteracao_solicitada" | "rejeitado") {
    const ok = await confirm({
      title: `Simular decisao do cliente: ${decisao === "aprovado" ? "Aprovar" : decisao === "rejeitado" ? "Rejeitar" : "Solicitar alteracao"}?`,
      description: "Isto simula a acao que o cliente tomaria pelo link seguro — use para testar o fluxo sem abrir o link publico.",
      confirmLabel: "Confirmar",
    });
    if (!ok) return;

    try {
      const atualizado = await repositories.orcamentos.registrarDecisaoPublica(orcamento!.tokenAcompanhamento, decisao, {
        justificativa: justificativa.trim() || undefined,
        motivo: decisao === "rejeitado" ? motivoRejeicao : undefined,
      });
      await repositories.auditoria.registrar({
        empresaId: empresaId!,
        usuarioId: sessao!.usuario.id,
        acao: "orcamento.decisao_simulada",
        entidade: "orcamentos",
        entidadeId: orcamento!.id,
        dadosAntes: null,
        dadosDepois: { decisao },
      });
      if (decisao === "aprovado") {
        const novoPedido = await repositories.pedidos.criarAPartirDeOrcamentoAprovado(atualizado.id);
        setPedido(novoPedido);
        await repositories.auditoria.registrar({
          empresaId: empresaId!,
          usuarioId: sessao!.usuario.id,
          acao: "pedido.criar",
          entidade: "pedidos",
          entidadeId: novoPedido.id,
          dadosAntes: null,
          dadosDepois: { orcamentoId: atualizado.id, numero: novoPedido.numero },
        });
      }
      showToast("Decisao registrada.", "success");
      setOrcamento(atualizado);
    } catch (erro) {
      showToast(erro instanceof Error ? erro.message : "Falha ao registrar decisao.", "error");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PageIntro
        eyebrow={`Orcamento ${orcamento.numero} — V${orcamento.versao}`}
        title={cliente?.nome ?? "Cliente nao identificado"}
        description={orcamento.validadeAte ? `Valido ate ${new Date(orcamento.validadeAte).toLocaleDateString("pt-BR")}` : "Sem validade definida"}
        aside={<StatusPill tone={STATUS_ORCAMENTO_TONE[orcamento.status]}>{STATUS_ORCAMENTO_LABEL[orcamento.status]}</StatusPill>}
      />
      <Link href="/orcamentos" className="text-xs font-medium text-(--accent-strong) hover:underline">
        ← Voltar para orcamentos
      </Link>

      <SurfaceCard className="p-5">
        <SectionLabel>Itens</SectionLabel>
        <div className="mt-4 flex flex-col gap-3">
          {itens.map((item) => (
            <div key={item.id} className="grid grid-cols-1 gap-2 rounded-xl border border-(--border) p-3 sm:grid-cols-6">
              <div className="sm:col-span-2">
                <label className="workspace-label" htmlFor={`${item.id}-descricao`}>
                  Descricao
                </label>
                <input
                  id={`${item.id}-descricao`}
                  className="workspace-input"
                  disabled={!editavel}
                  value={item.descricao}
                  onChange={(event) => atualizarItem(item.id, "descricao", event.target.value)}
                />
              </div>
              <div>
                <label className="workspace-label" htmlFor={`${item.id}-servico`}>
                  Servico
                </label>
                <select
                  id={`${item.id}-servico`}
                  className="workspace-select"
                  disabled={!editavel}
                  value={item.servicoId ?? ""}
                  onChange={(event) => {
                    const servico = servicos.find((s) => s.id === event.target.value);
                    atualizarItem(item.id, "servicoId", event.target.value || null);
                    if (servico) atualizarItem(item.id, "precoUnitario", servico.precoBase);
                  }}
                >
                  <option value="">—</option>
                  {servicos.map((servico) => (
                    <option key={servico.id} value={servico.id}>
                      {servico.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="workspace-label" htmlFor={`${item.id}-quantidade`}>
                  Quantidade
                </label>
                <input
                  id={`${item.id}-quantidade`}
                  type="number"
                  min={1}
                  className="workspace-input"
                  disabled={!editavel}
                  value={item.quantidade}
                  onChange={(event) => atualizarItem(item.id, "quantidade", Number(event.target.value) || 1)}
                />
              </div>
              <div>
                <label className="workspace-label" htmlFor={`${item.id}-preco`}>
                  Preco unitario (R$)
                </label>
                <input
                  id={`${item.id}-preco`}
                  type="number"
                  step="0.01"
                  className="workspace-input"
                  disabled={!editavel}
                  value={item.precoUnitario}
                  onChange={(event) => atualizarItem(item.id, "precoUnitario", Number(event.target.value) || 0)}
                />
              </div>
              <div>
                <label className="workspace-label" htmlFor={`${item.id}-acabamentos`}>
                  Acabamentos
                </label>
                <input
                  id={`${item.id}-acabamentos`}
                  className="workspace-input"
                  disabled={!editavel}
                  value={item.acabamentos ?? ""}
                  onChange={(event) => atualizarItem(item.id, "acabamentos", event.target.value)}
                />
              </div>
              {editavel ? (
                <div className="flex items-end sm:col-span-6">
                  <button type="button" className="workspace-button-danger" onClick={() => removerItem(item.id)}>
                    Remover item
                  </button>
                </div>
              ) : null}
            </div>
          ))}
          {editavel ? (
            <button type="button" className="workspace-button-secondary self-start" onClick={() => setItens((prev) => [...prev, ITEM_VAZIO()])}>
              + Adicionar item
            </button>
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="workspace-label" htmlFor="orc-prazo">
              Prazo de entrega (dias)
            </label>
            <input
              id="orc-prazo"
              type="number"
              className="workspace-input"
              disabled={!editavel}
              value={prazoEntregaDias}
              onChange={(event) => setPrazoEntregaDias(event.target.value)}
            />
          </div>
          <div>
            <label className="workspace-label" htmlFor="orc-validade">
              Validade
            </label>
            <input
              id="orc-validade"
              type="date"
              className="workspace-input"
              disabled={!editavel}
              value={validadeAte}
              onChange={(event) => setValidadeAte(event.target.value)}
            />
          </div>
          <div className="sm:col-span-3">
            <label className="workspace-label" htmlFor="orc-observacoes">
              Observacoes
            </label>
            <textarea
              id="orc-observacoes"
              className="workspace-textarea"
              disabled={!editavel}
              value={observacoes}
              onChange={(event) => setObservacoes(event.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-xl bg-(--bg-muted) px-4 py-3">
          <span className="text-sm font-semibold text-(--text-secondary)">Valor total</span>
          <span className="text-xl font-semibold text-(--text-primary)">R$ {valorTotal.toFixed(2)}</span>
        </div>

        {editavel ? (
          <div className="mt-4 flex flex-wrap items-end gap-2">
            <button type="button" disabled={salvando} className="workspace-button-secondary" onClick={() => void handleSalvar()}>
              {salvando ? "Salvando..." : "Salvar rascunho"}
            </button>
            <div className="min-w-[220px] flex-1">
              <label className="workspace-label" htmlFor="orc-destinatario">
                Enviar para
              </label>
              <input
                id="orc-destinatario"
                className="workspace-input"
                value={destinatario}
                onChange={(event) => setDestinatario(event.target.value)}
                placeholder="email@cliente.com"
              />
            </div>
            <button type="button" className="workspace-button-primary" onClick={() => void handleEnviar()}>
              Enviar por e-mail
            </button>
          </div>
        ) : null}
      </SurfaceCard>

      {!editavel ? (
        <SurfaceCard className="p-5">
          <SectionLabel>Historico</SectionLabel>
          <ul className="mt-3 flex flex-col gap-1 text-sm text-(--text-secondary)">
            {orcamento.enviadoEm ? <li>Enviado em {new Date(orcamento.enviadoEm).toLocaleString("pt-BR")}</li> : null}
            {orcamento.decididoEm ? <li>Decisao registrada em {new Date(orcamento.decididoEm).toLocaleString("pt-BR")}</li> : null}
            {orcamento.justificativaCliente ? <li>Justificativa do cliente: {orcamento.justificativaCliente}</li> : null}
            {orcamento.motivoRejeicao ? <li>Motivo da rejeicao: {MOTIVO_REJEICAO_LABEL[orcamento.motivoRejeicao]}</li> : null}
          </ul>
          <p className="mt-3 text-xs text-(--text-tertiary)">
            Link de acompanhamento do cliente:{" "}
            <Link href={`/portal/orcamento/${orcamento.tokenAcompanhamento}`} className="text-(--accent-strong) hover:underline" target="_blank">
              /portal/orcamento/{orcamento.tokenAcompanhamento}
            </Link>
          </p>

          {pedido ? (
            <p className="mt-3 text-sm font-medium text-(--success)">Pedido gerado: {pedido.numero}</p>
          ) : orcamento.status === "alteracao_solicitada" || orcamento.status === "rejeitado" ? (
            <button type="button" className="mt-4 workspace-button-primary" onClick={() => void handleNovaVersao()}>
              Criar nova versao (V{orcamento.versao + 1})
            </button>
          ) : null}
        </SurfaceCard>
      ) : null}

      {orcamento.status === "enviado" ? (
        <SurfaceCard className="p-5">
          <SectionLabel>Simular decisao do cliente</SectionLabel>
          <p className="mt-1 text-xs text-(--text-secondary)">
            Uso interno para testar o fluxo sem abrir o link publico — a mesma decisao pode ser tomada pelo cliente em{" "}
            <Link href={`/portal/orcamento/${orcamento.tokenAcompanhamento}`} className="text-(--accent-strong) hover:underline" target="_blank">
              /portal/orcamento/{orcamento.tokenAcompanhamento}
            </Link>
            .
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="workspace-label">Motivo (se rejeitar)</label>
              <select className="workspace-select" value={motivoRejeicao} onChange={(event) => setMotivoRejeicao(event.target.value as MotivoRejeicaoOrcamento)}>
                {MOTIVOS_REJEICAO.map((motivo) => (
                  <option key={motivo} value={motivo}>
                    {MOTIVO_REJEICAO_LABEL[motivo]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="workspace-label">Justificativa (alteracao/rejeicao)</label>
              <input className="workspace-input" value={justificativa} onChange={(event) => setJustificativa(event.target.value)} />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="workspace-button-primary" onClick={() => void handleSimularDecisao("aprovado")}>
              Aprovar
            </button>
            <button type="button" className="workspace-button-secondary" onClick={() => void handleSimularDecisao("alteracao_solicitada")}>
              Solicitar alteracao
            </button>
            <button type="button" className="workspace-button-danger" onClick={() => void handleSimularDecisao("rejeitado")}>
              Rejeitar
            </button>
          </div>
        </SurfaceCard>
      ) : null}

      {emailsCliente.length === 0 && cliente ? (
        <p className="text-xs text-(--text-tertiary)">Este cliente nao tem e-mail cadastrado — informe o destinatario manualmente para enviar.</p>
      ) : null}
    </div>
  );
}
