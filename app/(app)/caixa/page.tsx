"use client";

import { useEffect, useState } from "react";
import { PageIntro, SectionLabel, StatusPill, SurfaceCard } from "@/components/ui/workspace-primitives";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { useRepositoriosAutorizados as useRepositories, useSessao } from "@/components/providers/session-provider";
import { papelTemPermissao, PERMISSOES } from "@/lib/rbac";
import type { Caixa, MovimentoCaixaManual } from "@/lib/domain/entities";
import type { ResumoCaixa } from "@/lib/repositories/types";

function formatarMoeda(valor: number) {
  return `R$ ${valor.toFixed(2)}`;
}

export default function CaixaPage() {
  const repositories = useRepositories();
  const { sessao } = useSessao();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const empresaId = sessao?.empresaAtiva?.id;
  const papel = sessao?.empresaAtiva?.papel ?? null;
  const podeVisualizar = papel ? papelTemPermissao(papel, PERMISSOES.PDV_OPERAR) : false;
  const podeGerenciar = papel ? papelTemPermissao(papel, PERMISSOES.CAIXA_GERENCIAR) : false;

  const [caixaAberto, setCaixaAberto] = useState<Caixa | null>(null);
  const [historico, setHistorico] = useState<Caixa[]>([]);
  const [resumoAberto, setResumoAberto] = useState<ResumoCaixa | null>(null);
  const [movimentos, setMovimentos] = useState<MovimentoCaixaManual[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [valorAbertura, setValorAbertura] = useState("0");
  const [obsAbertura, setObsAbertura] = useState("");
  const [obsFechamento, setObsFechamento] = useState("");
  const [movimentoTipo, setMovimentoTipo] = useState<"entrada" | "saida">("saida");
  const [movimentoValor, setMovimentoValor] = useState("");
  const [movimentoMotivo, setMovimentoMotivo] = useState("");

  const [resumoSelecionado, setResumoSelecionado] = useState<ResumoCaixa | null>(null);

  async function recarregar() {
    if (!empresaId || !podeVisualizar) {
      setCarregando(false);
      return;
    }
    const [aberto, lista] = await Promise.all([repositories.caixa.obterAberto(empresaId), repositories.caixa.listar(empresaId)]);
    setCaixaAberto(aberto);
    setHistorico(lista);
    if (aberto) {
      const [resumo, listaMovimentos] = await Promise.all([
        repositories.caixa.obterResumo(aberto.id),
        repositories.movimentosCaixaManual.listarPorCaixa(aberto.id).catch(() => []),
      ]);
      setResumoAberto(resumo);
      setMovimentos(listaMovimentos);
    } else {
      setResumoAberto(null);
      setMovimentos([]);
    }
    setCarregando(false);
  }

  useEffect(() => {
    void recarregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId, podeVisualizar]);

  if (carregando) return null;

  if (!empresaId || !podeVisualizar) {
    return (
      <SurfaceCard className="p-5">
        <p className="text-sm text-(--text-secondary)">Seu papel atual nao tem acesso ao caixa.</p>
      </SurfaceCard>
    );
  }

  async function handleAbrir() {
    try {
      const caixa = await repositories.caixa.abrir({
        empresaId: empresaId!,
        usuarioId: sessao!.usuario.id,
        valorAberturaDinheiro: Number(valorAbertura) || 0,
        observacoes: obsAbertura.trim() || null,
      });
      await repositories.auditoria.registrar({
        empresaId: empresaId!,
        usuarioId: sessao!.usuario.id,
        acao: "caixa.abrir",
        entidade: "caixas",
        entidadeId: caixa.id,
        dadosAntes: null,
        dadosDepois: { valorAberturaDinheiro: caixa.valorAberturaDinheiro },
      });
      showToast("Caixa aberto.", "success");
      await recarregar();
    } catch (erro) {
      showToast(erro instanceof Error ? erro.message : "Falha ao abrir caixa.", "error");
    }
  }

  async function handleFechar() {
    if (!caixaAberto) return;
    const ok = await confirm({
      title: "Fechar o caixa?",
      description: "Confira o resumo abaixo antes de confirmar. Depois de fechado, novos recebimentos exigirao abrir um novo caixa.",
      confirmLabel: "Fechar caixa",
      tone: "danger",
    });
    if (!ok) return;

    try {
      await repositories.caixa.fechar(caixaAberto.id, { usuarioId: sessao!.usuario.id, observacoes: obsFechamento.trim() || null });
      await repositories.auditoria.registrar({
        empresaId: empresaId!,
        usuarioId: sessao!.usuario.id,
        acao: "caixa.fechar",
        entidade: "caixas",
        entidadeId: caixaAberto.id,
        dadosAntes: null,
        dadosDepois: { totalRecebido: resumoAberto?.totalRecebido ?? 0 },
      });
      showToast("Caixa fechado.", "success");
      setObsFechamento("");
      await recarregar();
    } catch (erro) {
      showToast(erro instanceof Error ? erro.message : "Falha ao fechar caixa.", "error");
    }
  }

  async function handleMovimento() {
    if (!caixaAberto) return;
    const valor = Number(movimentoValor);
    if (!valor || valor <= 0 || !movimentoMotivo.trim()) {
      showToast("Informe valor e motivo.", "error");
      return;
    }
    try {
      const movimento = await repositories.movimentosCaixaManual.criar({
        empresaId: empresaId!,
        caixaId: caixaAberto.id,
        tipo: movimentoTipo,
        valor,
        motivo: movimentoMotivo.trim(),
        registradoPorUsuarioId: sessao!.usuario.id,
      });
      await repositories.auditoria.registrar({
        empresaId: empresaId!,
        usuarioId: sessao!.usuario.id,
        acao: movimentoTipo === "entrada" ? "caixa.entrada_manual" : "caixa.saida_manual",
        entidade: "movimentos_caixa",
        entidadeId: movimento.id,
        dadosAntes: null,
        dadosDepois: { valor, motivo: movimento.motivo },
      });
      showToast("Movimento registrado.", "success");
      setMovimentoValor("");
      setMovimentoMotivo("");
      await recarregar();
    } catch (erro) {
      showToast(erro instanceof Error ? erro.message : "Falha ao registrar movimento.", "error");
    }
  }

  async function handleVerResumoHistorico(caixa: Caixa) {
    const resumo = await repositories.caixa.obterResumo(caixa.id);
    setResumoSelecionado(resumo);
  }

  return (
    <div className="flex flex-col gap-4">
      <PageIntro
        eyebrow="Atendimento"
        title="Caixa"
        description="Abertura, entradas/saidas manuais autorizadas, recebimentos do PDV e fechamento com resumo por forma de pagamento."
        aside={<StatusPill tone={caixaAberto ? "success" : "neutral"}>{caixaAberto ? "Caixa aberto" : "Caixa fechado"}</StatusPill>}
      />

      {!caixaAberto ? (
        <SurfaceCard className="p-5">
          <SectionLabel>Abrir caixa</SectionLabel>
          {podeGerenciar ? (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="workspace-label" htmlFor="valor-abertura">
                  Valor de abertura (dinheiro)
                </label>
                <input id="valor-abertura" type="number" step="0.01" className="workspace-input" value={valorAbertura} onChange={(event) => setValorAbertura(event.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className="workspace-label" htmlFor="obs-abertura">
                  Observacoes
                </label>
                <input id="obs-abertura" className="workspace-input" value={obsAbertura} onChange={(event) => setObsAbertura(event.target.value)} />
              </div>
              <div className="sm:col-span-3">
                <button type="button" className="workspace-button-primary" onClick={() => void handleAbrir()}>
                  Abrir caixa
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-(--text-secondary)">Peça a um administrador ou gerente para abrir o caixa antes de usar o PDV.</p>
          )}
        </SurfaceCard>
      ) : (
        <>
          <SurfaceCard className="p-5">
            <SectionLabel>Caixa aberto</SectionLabel>
            <p className="mt-2 text-sm text-(--text-secondary)">
              Aberto em {new Date(caixaAberto.abertoEm).toLocaleString("pt-BR")} com {formatarMoeda(caixaAberto.valorAberturaDinheiro)} em dinheiro.
            </p>

            {resumoAberto ? (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <SurfaceCard muted className="p-4">
                  <SectionLabel>Total recebido (periodo)</SectionLabel>
                  <p className="mt-2 text-xl font-semibold text-(--text-primary)">{formatarMoeda(resumoAberto.totalRecebido)}</p>
                </SurfaceCard>
                <SurfaceCard muted className="p-4">
                  <SectionLabel>Saldo em dinheiro (esperado)</SectionLabel>
                  <p className="mt-2 text-xl font-semibold text-(--text-primary)">{formatarMoeda(resumoAberto.saldoDinheiroEsperado)}</p>
                </SurfaceCard>
                <SurfaceCard muted className="p-4">
                  <SectionLabel>Ticket medio</SectionLabel>
                  <p className="mt-2 text-xl font-semibold text-(--text-primary)">{formatarMoeda(resumoAberto.ticketMedio)}</p>
                </SurfaceCard>
              </div>
            ) : null}

            {resumoAberto && resumoAberto.totalPorFormaPagamento.length > 0 ? (
              <div className="mt-4">
                <SectionLabel>Por forma de pagamento</SectionLabel>
                <ul className="mt-2 flex flex-col gap-1 text-sm text-(--text-secondary)">
                  {resumoAberto.totalPorFormaPagamento.map((linha) => (
                    <li key={linha.formaPagamentoId} className="flex justify-between border-b border-(--border) py-1">
                      <span>{linha.nomeFormaPagamento}</span>
                      <span className="font-medium text-(--text-primary)">{formatarMoeda(linha.total)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </SurfaceCard>

          {podeGerenciar ? (
            <SurfaceCard className="p-5">
              <SectionLabel>Entradas e saidas manuais</SectionLabel>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
                <div>
                  <label className="workspace-label" htmlFor="mov-tipo">
                    Tipo
                  </label>
                  <select id="mov-tipo" className="workspace-select" value={movimentoTipo} onChange={(event) => setMovimentoTipo(event.target.value as "entrada" | "saida")}>
                    <option value="saida">Saida</option>
                    <option value="entrada">Entrada</option>
                  </select>
                </div>
                <div>
                  <label className="workspace-label" htmlFor="mov-valor">
                    Valor
                  </label>
                  <input id="mov-valor" type="number" step="0.01" className="workspace-input" value={movimentoValor} onChange={(event) => setMovimentoValor(event.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <label className="workspace-label" htmlFor="mov-motivo">
                    Motivo
                  </label>
                  <input id="mov-motivo" className="workspace-input" value={movimentoMotivo} onChange={(event) => setMovimentoMotivo(event.target.value)} placeholder="Ex.: compra de material de escritorio" />
                </div>
              </div>
              <button type="button" className="mt-3 workspace-button-secondary" onClick={() => void handleMovimento()}>
                Registrar
              </button>

              {movimentos.length > 0 ? (
                <ul className="mt-4 flex flex-col gap-1 text-sm text-(--text-secondary)">
                  {movimentos.map((movimento) => (
                    <li key={movimento.id} className="flex justify-between border-b border-(--border) py-1">
                      <span>
                        {movimento.tipo === "entrada" ? "+ " : "− "}
                        {movimento.motivo}
                      </span>
                      <span className="font-medium text-(--text-primary)">{formatarMoeda(movimento.valor)}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </SurfaceCard>
          ) : null}

          {podeGerenciar ? (
            <SurfaceCard className="p-5">
              <SectionLabel>Fechar caixa</SectionLabel>
              <div className="mt-3">
                <label className="workspace-label" htmlFor="obs-fechamento">
                  Observacoes de fechamento
                </label>
                <textarea id="obs-fechamento" className="workspace-textarea" value={obsFechamento} onChange={(event) => setObsFechamento(event.target.value)} />
              </div>
              <button type="button" className="mt-3 workspace-button-danger" onClick={() => void handleFechar()}>
                Fechar caixa
              </button>
            </SurfaceCard>
          ) : null}
        </>
      )}

      {podeGerenciar && historico.length > 0 ? (
        <SurfaceCard className="p-5">
          <SectionLabel>Historico de caixas</SectionLabel>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-(--text-tertiary)">
                  <th className="border-b border-(--border) py-2 pr-4">Aberto em</th>
                  <th className="border-b border-(--border) py-2 pr-4">Fechado em</th>
                  <th className="border-b border-(--border) py-2 pr-4">Status</th>
                  <th className="border-b border-(--border) py-2 pr-4" />
                </tr>
              </thead>
              <tbody>
                {historico.map((caixa) => (
                  <tr key={caixa.id}>
                    <td className="border-b border-(--border) py-3 pr-4 text-(--text-secondary)">{new Date(caixa.abertoEm).toLocaleString("pt-BR")}</td>
                    <td className="border-b border-(--border) py-3 pr-4 text-(--text-secondary)">{caixa.fechadoEm ? new Date(caixa.fechadoEm).toLocaleString("pt-BR") : "—"}</td>
                    <td className="border-b border-(--border) py-3 pr-4">
                      <StatusPill tone={caixa.status === "aberto" ? "success" : "neutral"}>{caixa.status === "aberto" ? "Aberto" : "Fechado"}</StatusPill>
                    </td>
                    <td className="border-b border-(--border) py-3 pr-4 text-right">
                      <button type="button" className="workspace-button-secondary" onClick={() => void handleVerResumoHistorico(caixa)}>
                        Ver resumo
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {resumoSelecionado ? (
            <div className="mt-4 rounded-xl border border-(--border) bg-(--bg-muted) p-4">
              <p className="text-sm font-semibold text-(--text-primary)">
                Resumo de {new Date(resumoSelecionado.caixa.abertoEm).toLocaleDateString("pt-BR")}
                {resumoSelecionado.caixa.fechadoEm ? ` a ${new Date(resumoSelecionado.caixa.fechadoEm).toLocaleDateString("pt-BR")}` : ""}
              </p>
              <ul className="mt-2 flex flex-col gap-1 text-sm text-(--text-secondary)">
                {resumoSelecionado.totalPorFormaPagamento.map((linha) => (
                  <li key={linha.formaPagamentoId} className="flex justify-between">
                    <span>{linha.nomeFormaPagamento}</span>
                    <span className="font-medium text-(--text-primary)">{formatarMoeda(linha.total)}</span>
                  </li>
                ))}
                <li className="flex justify-between border-t border-(--border) pt-1 font-semibold text-(--text-primary)">
                  <span>Total do periodo</span>
                  <span>{formatarMoeda(resumoSelecionado.totalRecebido)}</span>
                </li>
                <li className="flex justify-between text-xs text-(--text-tertiary)">
                  <span>Ticket medio</span>
                  <span>{formatarMoeda(resumoSelecionado.ticketMedio)}</span>
                </li>
              </ul>
            </div>
          ) : null}
        </SurfaceCard>
      ) : null}
    </div>
  );
}
