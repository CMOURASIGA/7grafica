"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageIntro, SectionLabel, StatusPill, SurfaceCard } from "@/components/ui/workspace-primitives";
import { useToast } from "@/components/ui/toast";
import { useRepositoriosAutorizados as useRepositories, useSessao } from "@/components/providers/session-provider";
import { papelTemPermissao, PERMISSOES } from "@/lib/rbac";
import type { Cliente, FormaPagamento, OrcamentoItem, Pedido, Servico, StatusEntregaPedido, TipoPessoa } from "@/lib/domain/entities";

function novoItem(): OrcamentoItem {
  return { id: `item-${Math.random().toString(36).slice(2, 10)}`, descricao: "", quantidade: 1, servicoId: null, materialId: null, acabamentos: null, precoUnitario: 0 };
}

type Etapa = "cliente" | "itens" | "pagamento" | "concluido";

export default function PdvPage() {
  const repositories = useRepositories();
  const { sessao } = useSessao();
  const { showToast } = useToast();
  const empresaId = sessao?.empresaAtiva?.id;
  const papel = sessao?.empresaAtiva?.papel ?? null;
  const podeOperar = papel ? papelTemPermissao(papel, PERMISSOES.PDV_OPERAR) : false;

  const [caixaAbertoId, setCaixaAbertoId] = useState<string | null>(null);
  const [verificandoCaixa, setVerificandoCaixa] = useState(true);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [formasPagamento, setFormasPagamento] = useState<FormaPagamento[]>([]);

  const [etapa, setEtapa] = useState<Etapa>("cliente");

  // Cliente
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState<Cliente[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [naoIdentificado, setNaoIdentificado] = useState(false);
  const [cadastrandoNovo, setCadastrandoNovo] = useState(false);
  const [novoCliente, setNovoCliente] = useState({ tipo: "PF" as TipoPessoa, nome: "", documento: "" });

  // Itens
  const [itens, setItens] = useState<OrcamentoItem[]>([novoItem()]);
  const [statusEntrega, setStatusEntrega] = useState<StatusEntregaPedido>("concluido");

  // Pedido criado / pagamento
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [formaPagamentoId, setFormaPagamentoId] = useState("");
  const [valorPagamento, setValorPagamento] = useState("");
  const [valorEntregueDinheiro, setValorEntregueDinheiro] = useState("");
  const [recebimentos, setRecebimentos] = useState<{ formaNome: string; valor: number; troco: number | null }[]>([]);

  useEffect(() => {
    if (!empresaId || !podeOperar) {
      setVerificandoCaixa(false);
      return;
    }
    void Promise.all([repositories.caixa.obterAberto(empresaId), repositories.servicos.listar(empresaId), repositories.formasPagamento.listar(empresaId)]).then(
      ([caixa, listaServicos, listaFormas]) => {
        setCaixaAbertoId(caixa?.id ?? null);
        setServicos(listaServicos.filter((servico) => servico.ativo));
        setFormasPagamento(listaFormas.filter((forma) => forma.ativo));
        setVerificandoCaixa(false);
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId, podeOperar]);

  const valorTotal = useMemo(() => itens.reduce((soma, item) => soma + item.quantidade * item.precoUnitario, 0), [itens]);
  const valorTotalPagamento = recebimentos.reduce((soma, item) => soma + item.valor, 0);
  const saldoPendente = Math.max(0, (pedido?.valorTotal ?? valorTotal) - valorTotalPagamento);

  if (verificandoCaixa) return null;

  if (!empresaId || !podeOperar) {
    return (
      <SurfaceCard className="p-5">
        <p className="text-sm text-(--text-secondary)">Seu papel atual nao tem acesso ao PDV.</p>
      </SurfaceCard>
    );
  }

  if (!caixaAbertoId) {
    return (
      <SurfaceCard className="p-5">
        <p className="text-sm text-(--text-secondary)">
          Nenhum caixa aberto. Peça a um administrador ou gerente para abrir o caixa antes de iniciar um atendimento.
        </p>
        <Link href="/caixa" className="mt-3 inline-block workspace-button-secondary">
          Ir para o Caixa
        </Link>
      </SurfaceCard>
    );
  }

  async function handleBuscar(texto: string) {
    setBusca(texto);
    if (!texto.trim()) {
      setResultados([]);
      return;
    }
    setResultados(await repositories.clientes.buscarRapido(empresaId!, texto));
  }

  async function handleCadastrarNovo() {
    if (!novoCliente.nome.trim()) {
      showToast("Informe o nome do cliente.", "error");
      return;
    }
    const cliente = await repositories.clientes.criar({
      empresaId: empresaId!,
      tipo: novoCliente.tipo,
      nome: novoCliente.nome.trim(),
      documento: novoCliente.documento.trim() || null,
      observacoes: null,
      ativo: true,
    });
    await repositories.auditoria.registrar({
      empresaId: empresaId!,
      usuarioId: sessao!.usuario.id,
      acao: "pdv.cadastrar_cliente",
      entidade: "clientes",
      entidadeId: cliente.id,
      dadosAntes: null,
      dadosDepois: { nome: cliente.nome, origem: "pdv" },
    });
    setClienteSelecionado(cliente);
    setNaoIdentificado(false);
    setCadastrandoNovo(false);
    showToast("Cliente cadastrado.", "success");
    setEtapa("itens");
  }

  function selecionarCliente(cliente: Cliente) {
    setClienteSelecionado(cliente);
    setNaoIdentificado(false);
    setEtapa("itens");
  }

  function seguirSemIdentificar() {
    setClienteSelecionado(null);
    setNaoIdentificado(true);
    setEtapa("itens");
  }

  function atualizarItem(itemId: string, campo: keyof OrcamentoItem, valor: string | number | null) {
    setItens((prev) => prev.map((item) => (item.id === itemId ? { ...item, [campo]: valor } : item)));
  }

  async function handleConfirmarPedido() {
    const itensValidos = itens.filter((item) => item.descricao.trim());
    if (itensValidos.length === 0) {
      showToast("Adicione ao menos um item.", "error");
      return;
    }
    try {
      const novoPedido = await repositories.pedidos.criarAtendimentoBalcao({
        empresaId: empresaId!,
        clienteId: clienteSelecionado?.id ?? null,
        itens: itensValidos,
        valorTotal: itensValidos.reduce((soma, item) => soma + item.quantidade * item.precoUnitario, 0),
        statusEntrega,
      });
      // Marcos do atendimento que aconteceram antes do Pedido existir (identificacao
      // do cliente) sao registrados retroativamente na timeline do proprio pedido —
      // e o unico jeito de manter "atendimento iniciado" e "cliente identificado"
      // visiveis no historico de um pedido especifico.
      await repositories.auditoria.registrar({
        empresaId: empresaId!,
        usuarioId: sessao!.usuario.id,
        acao: "pedido.atendimento_iniciado",
        entidade: "pedidos",
        entidadeId: novoPedido.id,
        dadosAntes: null,
        dadosDepois: null,
      });
      await repositories.auditoria.registrar({
        empresaId: empresaId!,
        usuarioId: sessao!.usuario.id,
        acao: clienteSelecionado ? "pedido.cliente_identificado" : "pedido.cliente_nao_identificado",
        entidade: "pedidos",
        entidadeId: novoPedido.id,
        dadosAntes: null,
        dadosDepois: clienteSelecionado ? { clienteId: clienteSelecionado.id, nome: clienteSelecionado.nome } : null,
      });
      await repositories.auditoria.registrar({
        empresaId: empresaId!,
        usuarioId: sessao!.usuario.id,
        acao: "pedido.criar_balcao",
        entidade: "pedidos",
        entidadeId: novoPedido.id,
        dadosAntes: null,
        dadosDepois: { numero: novoPedido.numero, clienteId: novoPedido.clienteId, valorTotal: novoPedido.valorTotal },
      });
      setPedido(novoPedido);
      setEtapa("pagamento");
    } catch (erro) {
      showToast(erro instanceof Error ? erro.message : "Falha ao confirmar pedido.", "error");
    }
  }

  async function handleRegistrarPagamento() {
    if (!pedido || !formaPagamentoId) {
      showToast("Selecione a forma de pagamento.", "error");
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
        empresaId: empresaId!,
        pedidoId: pedido.id,
        caixaId: caixaAbertoId!,
        formaPagamentoId,
        valor,
        valorEntregueDinheiro: ehDinheiro && valorEntregueDinheiro ? Number(valorEntregueDinheiro) : null,
        registradoPorUsuarioId: sessao!.usuario.id,
      });
      await repositories.auditoria.registrar({
        empresaId: empresaId!,
        usuarioId: sessao!.usuario.id,
        acao: "pedido.recebimento",
        entidade: "pedidos",
        entidadeId: pedido.id,
        dadosAntes: null,
        dadosDepois: { valor, formaPagamentoId, troco: recebimento.troco },
      });
      setRecebimentos((prev) => [...prev, { formaNome: forma?.nome ?? "—", valor, troco: recebimento.troco }]);
      setValorPagamento("");
      setValorEntregueDinheiro("");
      showToast(recebimento.troco ? `Recebido. Troco: R$ ${recebimento.troco.toFixed(2)}` : "Recebimento registrado.", "success");
    } catch (erro) {
      showToast(erro instanceof Error ? erro.message : "Falha ao registrar pagamento.", "error");
    }
  }

  async function handleFinalizarAtendimento() {
    if (!pedido) return;
    await repositories.auditoria.registrar({
      empresaId: empresaId!,
      usuarioId: sessao!.usuario.id,
      acao: "pedido.comprovante_gerado",
      entidade: "pedidos",
      entidadeId: pedido.id,
      dadosAntes: null,
      dadosDepois: { numero: pedido.numero },
    });
    setEtapa("concluido");
  }

  function handleNovoAtendimento() {
    setEtapa("cliente");
    setBusca("");
    setResultados([]);
    setClienteSelecionado(null);
    setNaoIdentificado(false);
    setCadastrandoNovo(false);
    setNovoCliente({ tipo: "PF", nome: "", documento: "" });
    setItens([novoItem()]);
    setStatusEntrega("concluido");
    setPedido(null);
    setFormaPagamentoId("");
    setValorPagamento("");
    setValorEntregueDinheiro("");
    setRecebimentos([]);
  }

  return (
    <div className="flex flex-col gap-4">
      <PageIntro
        eyebrow="Atendimento"
        title="PDV — Novo atendimento"
        description="Balcão: identifique o cliente (ou siga sem identificar), monte o pedido e registre o pagamento — tudo em uma tela."
        aside={<StatusPill tone="success">Caixa aberto</StatusPill>}
      />

      {etapa === "cliente" ? (
        <SurfaceCard className="p-5">
          <SectionLabel>1. Identificar cliente</SectionLabel>
          <div className="mt-3">
            <input
              className="workspace-input"
              placeholder="Buscar por nome, CPF/CNPJ, telefone ou e-mail..."
              value={busca}
              onChange={(event) => void handleBuscar(event.target.value)}
              autoFocus
            />
          </div>

          {resultados.length > 0 ? (
            <ul className="mt-3 flex flex-col gap-1">
              {resultados.map((cliente) => (
                <li key={cliente.id}>
                  <button
                    type="button"
                    className="w-full rounded-lg border border-(--border) px-3 py-2 text-left text-sm hover:border-(--accent)"
                    onClick={() => selecionarCliente(cliente)}
                  >
                    <span className="font-medium text-(--text-primary)">{cliente.nome}</span>
                    {cliente.documento ? <span className="ml-2 text-xs text-(--text-tertiary)">{cliente.documento}</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="workspace-button-secondary" onClick={seguirSemIdentificar}>
              Consumidor nao identificado
            </button>
            <button type="button" className="workspace-button-secondary" onClick={() => setCadastrandoNovo((prev) => !prev)}>
              Cadastrar novo cliente
            </button>
          </div>

          {cadastrandoNovo ? (
            <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-(--border) bg-(--bg-muted) p-3 sm:grid-cols-3">
              <div>
                <label className="workspace-label" htmlFor="pdv-novo-cliente-tipo">
                  Tipo
                </label>
                <select id="pdv-novo-cliente-tipo" className="workspace-select" value={novoCliente.tipo} onChange={(event) => setNovoCliente((prev) => ({ ...prev, tipo: event.target.value as TipoPessoa }))}>
                  <option value="PF">Pessoa fisica</option>
                  <option value="PJ">Pessoa juridica</option>
                </select>
              </div>
              <div>
                <label className="workspace-label" htmlFor="pdv-novo-cliente-nome">
                  Nome
                </label>
                <input id="pdv-novo-cliente-nome" className="workspace-input" value={novoCliente.nome} onChange={(event) => setNovoCliente((prev) => ({ ...prev, nome: event.target.value }))} />
              </div>
              <div>
                <label className="workspace-label" htmlFor="pdv-novo-cliente-documento">
                  Documento
                </label>
                <input id="pdv-novo-cliente-documento" className="workspace-input" value={novoCliente.documento} onChange={(event) => setNovoCliente((prev) => ({ ...prev, documento: event.target.value }))} />
              </div>
              <div className="sm:col-span-3">
                <button type="button" className="workspace-button-primary" onClick={() => void handleCadastrarNovo()}>
                  Cadastrar e continuar
                </button>
              </div>
            </div>
          ) : null}
        </SurfaceCard>
      ) : null}

      {etapa !== "cliente" ? (
        <SurfaceCard className="p-4">
          <p className="text-sm text-(--text-secondary)">
            Cliente: <span className="font-medium text-(--text-primary)">{clienteSelecionado ? clienteSelecionado.nome : naoIdentificado ? "Consumidor nao identificado" : "—"}</span>
          </p>
        </SurfaceCard>
      ) : null}

      {etapa === "itens" ? (
        <SurfaceCard className="p-5">
          <SectionLabel>2. Servicos, quantidade, material e acabamento</SectionLabel>
          <div className="mt-4 flex flex-col gap-3">
            {itens.map((item) => (
              <div key={item.id} className="grid grid-cols-1 gap-2 rounded-xl border border-(--border) p-3 sm:grid-cols-5">
                <div>
                  <label className="workspace-label" htmlFor={`${item.id}-servico`}>
                    Servico
                  </label>
                  <select
                    id={`${item.id}-servico`}
                    className="workspace-select"
                    value={item.servicoId ?? ""}
                    onChange={(event) => {
                      const servico = servicos.find((s) => s.id === event.target.value);
                      atualizarItem(item.id, "servicoId", event.target.value || null);
                      if (servico) {
                        atualizarItem(item.id, "descricao", servico.nome);
                        atualizarItem(item.id, "precoUnitario", servico.precoBase);
                      }
                    }}
                  >
                    <option value="">Selecione...</option>
                    {servicos.map((servico) => (
                      <option key={servico.id} value={servico.id}>
                        {servico.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="workspace-label" htmlFor={`${item.id}-descricao`}>
                    Descricao
                  </label>
                  <input id={`${item.id}-descricao`} className="workspace-input" value={item.descricao} onChange={(event) => atualizarItem(item.id, "descricao", event.target.value)} />
                </div>
                <div>
                  <label className="workspace-label" htmlFor={`${item.id}-quantidade`}>
                    Quantidade
                  </label>
                  <input id={`${item.id}-quantidade`} type="number" min={1} className="workspace-input" value={item.quantidade} onChange={(event) => atualizarItem(item.id, "quantidade", Number(event.target.value) || 1)} />
                </div>
                <div>
                  <label className="workspace-label" htmlFor={`${item.id}-acabamento`}>
                    Acabamento
                  </label>
                  <input id={`${item.id}-acabamento`} className="workspace-input" value={item.acabamentos ?? ""} onChange={(event) => atualizarItem(item.id, "acabamentos", event.target.value)} />
                </div>
                <div>
                  <label className="workspace-label" htmlFor={`${item.id}-preco`}>
                    Preco unit. (R$)
                  </label>
                  <input id={`${item.id}-preco`} type="number" step="0.01" className="workspace-input" value={item.precoUnitario} onChange={(event) => atualizarItem(item.id, "precoUnitario", Number(event.target.value) || 0)} />
                </div>
              </div>
            ))}
            <button type="button" className="workspace-button-secondary self-start" onClick={() => setItens((prev) => [...prev, novoItem()])}>
              + Adicionar servico
            </button>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-xl bg-(--bg-muted) px-4 py-3">
            <span className="text-sm font-semibold text-(--text-secondary)">Valor total</span>
            <span className="text-xl font-semibold text-(--text-primary)">R$ {valorTotal.toFixed(2)}</span>
          </div>

          <div className="mt-4">
            <SectionLabel>3. Este atendimento e...</SectionLabel>
            <div className="mt-2 flex gap-2">
              <button type="button" className={statusEntrega === "concluido" ? "workspace-button-primary" : "workspace-button-secondary"} onClick={() => setStatusEntrega("concluido")}>
                Simples — entregar agora
              </button>
              <button type="button" className={statusEntrega === "aguardando_producao" ? "workspace-button-primary" : "workspace-button-secondary"} onClick={() => setStatusEntrega("aguardando_producao")}>
                Vai para producao
              </button>
            </div>
          </div>

          <button type="button" className="mt-4 workspace-button-primary" onClick={() => void handleConfirmarPedido()}>
            Confirmar pedido
          </button>
        </SurfaceCard>
      ) : null}

      {etapa === "pagamento" && pedido ? (
        <SurfaceCard className="p-5">
          <SectionLabel>4. Registrar pagamento — Pedido {pedido.numero}</SectionLabel>
          <div className="mt-3 grid grid-cols-1 gap-3 rounded-xl bg-(--bg-muted) px-4 py-3 sm:grid-cols-3">
            <div>
              <p className="text-xs text-(--text-tertiary)">Valor do pedido</p>
              <p className="text-lg font-semibold text-(--text-primary)">R$ {pedido.valorTotal.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-(--text-tertiary)">Valor recebido</p>
              <p className="text-lg font-semibold text-(--success)">R$ {valorTotalPagamento.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-(--text-tertiary)">Saldo pendente</p>
              <p className={`text-lg font-semibold ${saldoPendente > 0 ? "text-(--warning)" : "text-(--success)"}`}>R$ {saldoPendente.toFixed(2)}</p>
            </div>
          </div>

          {recebimentos.length > 0 ? (
            <ul className="mt-3 flex flex-col gap-1 text-sm text-(--text-secondary)">
              {recebimentos.map((recebimento, indice) => (
                <li key={indice} className="flex justify-between border-b border-(--border) py-1">
                  <span>{recebimento.formaNome}</span>
                  <span className="font-medium text-(--text-primary)">
                    R$ {recebimento.valor.toFixed(2)}
                    {recebimento.troco ? ` (troco R$ ${recebimento.troco.toFixed(2)})` : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

          {saldoPendente > 0 || recebimentos.length === 0 ? (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
              <div>
                <label className="workspace-label" htmlFor="pdv-forma-pagamento">
                  Forma de pagamento
                </label>
                <select id="pdv-forma-pagamento" className="workspace-select" value={formaPagamentoId} onChange={(event) => setFormaPagamentoId(event.target.value)}>
                  <option value="">Selecione...</option>
                  {formasPagamento.map((forma) => (
                    <option key={forma.id} value={forma.id}>
                      {forma.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="workspace-label" htmlFor="pdv-valor-pagamento">
                  Valor
                </label>
                <input id="pdv-valor-pagamento" type="number" step="0.01" className="workspace-input" value={valorPagamento} onChange={(event) => setValorPagamento(event.target.value)} placeholder={saldoPendente.toFixed(2)} />
              </div>
              {formasPagamento.find((forma) => forma.id === formaPagamentoId)?.nome.toLowerCase() === "dinheiro" ? (
                <div>
                  <label className="workspace-label" htmlFor="pdv-valor-entregue">
                    Valor entregue (dinheiro)
                  </label>
                  <input id="pdv-valor-entregue" type="number" step="0.01" className="workspace-input" value={valorEntregueDinheiro} onChange={(event) => setValorEntregueDinheiro(event.target.value)} />
                </div>
              ) : null}
              <div className="flex items-end">
                <button type="button" className="workspace-button-primary" onClick={() => void handleRegistrarPagamento()}>
                  Registrar pagamento
                </button>
              </div>
            </div>
          ) : null}

          <button type="button" className="mt-4 workspace-button-primary" onClick={() => void handleFinalizarAtendimento()}>
            {saldoPendente > 0 ? "Finalizar com saldo pendente" : "Finalizar atendimento"}
          </button>
        </SurfaceCard>
      ) : null}

      {etapa === "concluido" && pedido ? (
        <SurfaceCard className="p-5 text-center">
          <SectionLabel>Atendimento concluido</SectionLabel>
          <p className="mt-2 text-2xl font-semibold text-(--text-primary)">Pedido {pedido.numero}</p>
          <p className="mt-1 text-sm text-(--text-secondary)">
            {saldoPendente > 0 ? `Saldo pendente de R$ ${saldoPendente.toFixed(2)}` : "Pagamento completo"}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link href={`/pedidos/${pedido.id}`} className="workspace-button-secondary">
              Ver comprovante
            </Link>
            <button type="button" className="workspace-button-primary" onClick={handleNovoAtendimento}>
              Novo atendimento
            </button>
          </div>
        </SurfaceCard>
      ) : null}
    </div>
  );
}
