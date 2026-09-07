"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageIntro, StatusPill, SurfaceCard } from "@/components/ui/workspace-primitives";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { useRepositoriosAutorizados as useRepositories, useSessao } from "@/components/providers/session-provider";
import { papelTemPermissao, PERMISSOES } from "@/lib/rbac";
import type { Cliente, EmailRecebido, TipoPessoa } from "@/lib/domain/entities";

export default function CaixaDeEntradaPage() {
  const repositories = useRepositories();
  const router = useRouter();
  const { sessao } = useSessao();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const empresaId = sessao?.empresaAtiva?.id;
  const papel = sessao?.empresaAtiva?.papel ?? null;
  const podeAcessar = papel ? papelTemPermissao(papel, PERMISSOES.SOLICITACOES_GERENCIAR) : false;

  const [emails, setEmails] = useState<EmailRecebido[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [vinculandoId, setVinculandoId] = useState<string | null>(null);
  const [clienteEscolhidoId, setClienteEscolhidoId] = useState("");
  const [cadastrandoId, setCadastrandoId] = useState<string | null>(null);
  const [novoCliente, setNovoCliente] = useState({ tipo: "PJ" as TipoPessoa, nome: "", documento: "" });
  const [enviando, setEnviando] = useState(false);

  async function recarregar() {
    if (!empresaId || !podeAcessar) return;
    const [listaEmails, listaClientes] = await Promise.all([
      repositories.emailsRecebidos.listar(empresaId),
      repositories.clientes.listar(empresaId),
    ]);
    setEmails([...listaEmails].sort((a, b) => b.recebidoEm.localeCompare(a.recebidoEm)));
    setClientes(listaClientes);
  }

  useEffect(() => {
    void recarregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId, podeAcessar]);

  if (!empresaId) return null;

  if (!podeAcessar) {
    return (
      <SurfaceCard className="p-5">
        <p className="text-sm text-(--text-secondary)">Seu papel atual nao tem acesso a caixa de entrada.</p>
      </SurfaceCard>
    );
  }

  function nomeCliente(clienteId: string | null) {
    return clientes.find((cliente) => cliente.id === clienteId)?.nome ?? null;
  }

  async function handleVincular(email: EmailRecebido) {
    if (!clienteEscolhidoId) return;
    setEnviando(true);
    try {
      await repositories.emailsRecebidos.atualizar(email.id, {
        clienteId: clienteEscolhidoId,
        status: "vinculado",
      });
      await repositories.auditoria.registrar({
        empresaId: empresaId!,
        usuarioId: sessao!.usuario.id,
        acao: "email_recebido.vincular_cliente",
        entidade: "emails_recebidos",
        entidadeId: email.id,
        dadosAntes: { clienteId: email.clienteId },
        dadosDepois: { clienteId: clienteEscolhidoId },
      });
      showToast("E-mail vinculado ao cliente.", "success");
      setVinculandoId(null);
      setClienteEscolhidoId("");
      await recarregar();
    } catch (erro) {
      showToast(erro instanceof Error ? erro.message : "Falha ao vincular.", "error");
    } finally {
      setEnviando(false);
    }
  }

  async function handleCadastrarNovo(email: EmailRecebido) {
    if (!novoCliente.nome.trim()) {
      showToast("Informe o nome do cliente.", "error");
      return;
    }
    setEnviando(true);
    try {
      const cliente = await repositories.clientes.criar({
        empresaId: empresaId!,
        tipo: novoCliente.tipo,
        nome: novoCliente.nome.trim(),
        documento: novoCliente.documento.trim() || null,
        observacoes: null,
        ativo: true,
      });
      const contato = await repositories.contatos.criar({
        empresaId: empresaId!,
        clienteId: cliente.id,
        nome: novoCliente.nome.trim(),
        cargo: null,
        telefone: null,
        principal: true,
        ativo: true,
      });
      await repositories.emailsContato.criar({
        empresaId: empresaId!,
        contatoId: contato.id,
        email: email.remetente,
        principal: true,
      });
      await repositories.emailsRecebidos.atualizar(email.id, {
        clienteId: cliente.id,
        contatoId: contato.id,
        status: "vinculado",
      });
      await repositories.auditoria.registrar({
        empresaId: empresaId!,
        usuarioId: sessao!.usuario.id,
        acao: "email_recebido.cadastrar_cliente",
        entidade: "clientes",
        entidadeId: cliente.id,
        dadosAntes: null,
        dadosDepois: { nome: cliente.nome, origem: "email_recebido", emailRecebidoId: email.id },
      });
      showToast("Cliente cadastrado e vinculado ao e-mail.", "success");
      setCadastrandoId(null);
      setNovoCliente({ tipo: "PJ", nome: "", documento: "" });
      await recarregar();
    } catch (erro) {
      showToast(erro instanceof Error ? erro.message : "Falha ao cadastrar cliente.", "error");
    } finally {
      setEnviando(false);
    }
  }

  async function handleCriarSolicitacao(email: EmailRecebido) {
    const ok = await confirm({
      title: "Criar solicitacao a partir deste e-mail?",
      description: "A solicitacao fica disponivel para montar um orcamento.",
      confirmLabel: "Criar solicitacao",
    });
    if (!ok) return;

    try {
      const solicitacao = await repositories.solicitacoes.criar({
        empresaId: empresaId!,
        origem: "email",
        emailOrigemId: email.id,
        clienteId: email.clienteId,
        contatoId: email.contatoId,
        assunto: email.assunto,
        descricao: email.corpo,
        status: "nova",
      });
      await repositories.emailsRecebidos.atualizar(email.id, { solicitacaoId: solicitacao.id });
      await repositories.auditoria.registrar({
        empresaId: empresaId!,
        usuarioId: sessao!.usuario.id,
        acao: "solicitacao.criar",
        entidade: "solicitacoes",
        entidadeId: solicitacao.id,
        dadosAntes: null,
        dadosDepois: { emailOrigemId: email.id, clienteId: email.clienteId },
      });
      showToast("Solicitacao criada.", "success");
      router.push(`/solicitacoes/${solicitacao.id}`);
    } catch (erro) {
      showToast(erro instanceof Error ? erro.message : "Falha ao criar solicitacao.", "error");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PageIntro
        eyebrow="Atendimento"
        title="Caixa de entrada"
        description="E-mails recebidos. Identificados automaticamente por e-mail exato entre contatos — sem criar cliente automaticamente."
      />

      {emails.length === 0 ? (
        <SurfaceCard className="p-5">
          <p className="workspace-empty-state">Nenhum e-mail recebido.</p>
        </SurfaceCard>
      ) : (
        <div className="flex flex-col gap-3">
          {emails.map((email) => (
            <SurfaceCard key={email.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-(--text-tertiary)">{new Date(email.recebidoEm).toLocaleString("pt-BR")}</p>
                  <p className="mt-1 font-semibold text-(--text-primary)">{email.assunto}</p>
                  <p className="text-sm text-(--text-secondary)">De: {email.remetente}</p>
                </div>
                <StatusPill tone={email.status === "vinculado" ? "success" : email.status === "ignorado" ? "neutral" : "warning"}>
                  {email.clienteId ? nomeCliente(email.clienteId) ?? "Vinculado" : "Cliente nao identificado"}
                </StatusPill>
              </div>
              <p className="mt-3 text-sm leading-6 text-(--text-secondary)">{email.corpo}</p>
              {email.anexos.length > 0 ? (
                <p className="mt-2 text-xs text-(--text-tertiary)">Anexos: {email.anexos.map((anexo) => anexo.nome).join(", ")}</p>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                {!email.clienteId && vinculandoId !== email.id && cadastrandoId !== email.id ? (
                  <>
                    <button type="button" className="workspace-button-secondary" onClick={() => setVinculandoId(email.id)}>
                      Vincular a cliente existente
                    </button>
                    <button type="button" className="workspace-button-secondary" onClick={() => setCadastrandoId(email.id)}>
                      Cadastrar novo cliente
                    </button>
                  </>
                ) : null}

                {email.clienteId && !email.solicitacaoId ? (
                  <button type="button" className="workspace-button-primary" onClick={() => void handleCriarSolicitacao(email)}>
                    Criar solicitacao
                  </button>
                ) : null}

                {email.solicitacaoId ? (
                  <button type="button" className="workspace-button-secondary" onClick={() => router.push(`/solicitacoes/${email.solicitacaoId}`)}>
                    Ver solicitacao
                  </button>
                ) : null}
              </div>

              {vinculandoId === email.id ? (
                <div className="mt-4 flex flex-wrap items-end gap-2 rounded-xl border border-(--border) bg-(--bg-muted) p-3">
                  <div className="min-w-[240px] flex-1">
                    <label className="workspace-label">Cliente</label>
                    <select className="workspace-select" value={clienteEscolhidoId} onChange={(event) => setClienteEscolhidoId(event.target.value)}>
                      <option value="">Selecione...</option>
                      {clientes.map((cliente) => (
                        <option key={cliente.id} value={cliente.id}>
                          {cliente.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button type="button" disabled={enviando} className="workspace-button-primary" onClick={() => void handleVincular(email)}>
                    Confirmar
                  </button>
                  <button type="button" className="workspace-button-secondary" onClick={() => setVinculandoId(null)}>
                    Cancelar
                  </button>
                </div>
              ) : null}

              {cadastrandoId === email.id ? (
                <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-(--border) bg-(--bg-muted) p-3 sm:grid-cols-3">
                  <div>
                    <label className="workspace-label">Tipo</label>
                    <select
                      className="workspace-select"
                      value={novoCliente.tipo}
                      onChange={(event) => setNovoCliente((prev) => ({ ...prev, tipo: event.target.value as TipoPessoa }))}
                    >
                      <option value="PJ">Pessoa juridica</option>
                      <option value="PF">Pessoa fisica</option>
                    </select>
                  </div>
                  <div>
                    <label className="workspace-label">Nome</label>
                    <input
                      className="workspace-input"
                      value={novoCliente.nome}
                      onChange={(event) => setNovoCliente((prev) => ({ ...prev, nome: event.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="workspace-label">Documento</label>
                    <input
                      className="workspace-input"
                      value={novoCliente.documento}
                      onChange={(event) => setNovoCliente((prev) => ({ ...prev, documento: event.target.value }))}
                    />
                  </div>
                  <div className="flex gap-2 sm:col-span-3">
                    <button type="button" disabled={enviando} className="workspace-button-primary" onClick={() => void handleCadastrarNovo(email)}>
                      Cadastrar e vincular
                    </button>
                    <button type="button" className="workspace-button-secondary" onClick={() => setCadastrandoId(null)}>
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : null}
            </SurfaceCard>
          ))}
        </div>
      )}
    </div>
  );
}
