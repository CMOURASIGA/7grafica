"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { EstoqueTrabalho } from "@/components/estoque-trabalho";
import { motivoArquivoInvalido } from "@/lib/domain/liberacao-arquivo";
import { lerMetadadosArquivo } from "@/lib/domain/ler-metadados-arquivo";
import { PageIntro, SectionLabel, StatusPill, SurfaceCard } from "@/components/ui/workspace-primitives";
import { useToast } from "@/components/ui/toast";
import { useRepositoriosAutorizados as useRepositories, useSessao } from "@/components/providers/session-provider";
import { papelTemPermissao, PERMISSOES } from "@/lib/rbac";
import type {
  AlocacaoEquipamento,
  Arquivo,
  AvaliacaoCompatibilidadeEquipamento,
  Cliente,
  Equipamento,
  EventoAuditoria,
  OrigemArquivo,
  Pedido,
  PrioridadeTrabalho,
  Servico,
  TipoArquivo,
  Trabalho,
} from "@/lib/domain/entities";
import type { VinculoComPerfil } from "@/lib/repositories/types";

const SITUACAO_ARQUIVO_LABEL: Record<Arquivo["situacao"], string> = {
  recebido: "Recebido",
  em_criacao: "Em criação",
  aguardando_aprovacao_cliente: "Aguardando aprovação do cliente",
  alteracao_solicitada: "Alteração solicitada",
  aprovado_cliente: "Aprovado pelo cliente",
  rejeitado_cliente: "Rejeitado pelo cliente",
  substituido: "Substituído",
  cancelado: "Cancelado",
};

const TIPO_ARQUIVO_LABEL: Record<TipoArquivo, string> = { cliente: "Arquivo do cliente", arte: "Arte", producao: "Arquivo de produção" };

const EXTENSOES_ARQUIVO = ["pdf", "jpg", "png", "ai", "cdr", "psd"];

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
  const podeGerenciarArquivos = papel ? papelTemPermissao(papel, PERMISSOES.ARQUIVOS_GERENCIAR) : false;
  const podeAnexarArquivos = podeGerenciarArquivos || papel === "atendente";

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

  const [arquivos, setArquivos] = useState<Arquivo[]>([]);
  const [servico, setServico] = useState<Servico | null>(null);
  const [comentariosTecnicos, setComentariosTecnicos] = useState<Record<string, string>>({});
  const [mostrarFormularioArquivo, setMostrarFormularioArquivo] = useState(false);
  const [grupoAlvoNovaVersao, setGrupoAlvoNovaVersao] = useState<string | null>(null);
  const [arquivoComentario, setArquivoComentario] = useState("");
  const [arquivoBriefing, setArquivoBriefing] = useState("");
  const [lendoArquivo, setLendoArquivo] = useState(false);
  const [arquivoFormNome, setArquivoFormNome] = useState("");
  const [arquivoFormExtensao, setArquivoFormExtensao] = useState("pdf");
  const [arquivoFormTamanhoKB, setArquivoFormTamanhoKB] = useState("");
  const [arquivoFormPaginas, setArquivoFormPaginas] = useState("");
  const [arquivoFormLarguraMm, setArquivoFormLarguraMm] = useState("");
  const [arquivoFormAlturaMm, setArquivoFormAlturaMm] = useState("");
  const [arquivoFormTipo, setArquivoFormTipo] = useState<TipoArquivo>("cliente");
  const [arquivoFormOrigem, setArquivoFormOrigem] = useState<OrigemArquivo>("upload_interno");

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

      const [pedidoAtual, clienteAtual, listaEventos, listaEquipe, listaAlocacoes, listaEquipamentos, avaliacaoCompatibilidade, listaArquivos, servicoAtual] = await Promise.all([
        repositories.pedidos.obter(atual.pedidoId).catch(() => null),
        atual.clienteId ? repositories.clientes.obter(atual.clienteId).catch(() => null) : Promise.resolve(null),
        papel !== "operador" ? repositories.auditoria.listar(atual.empresaId, 300) : Promise.resolve([]),
        podeGerenciarTudo ? repositories.usuarios.listarPorEmpresa(atual.empresaId) : Promise.resolve([]),
        repositories.alocacoesEquipamento.listarPorTrabalho(atual.id),
        repositories.equipamentos.listar(atual.empresaId),
        usaEquipamento ? repositories.alocacoesEquipamento.avaliarCompatibilidade(atual.id) : Promise.resolve([]),
        repositories.arquivos.listarPorTrabalho(atual.id),
        atual.servicoId ? repositories.servicos.obter(atual.servicoId).catch(() => null) : Promise.resolve(null),
      ]);
      setPedido(pedidoAtual);
      setCliente(clienteAtual);
      setEventos(listaEventos.filter((evento) => (evento.entidade === "trabalho" && evento.entidadeId === atual.id) || (papel !== "operador" && evento.entidade === "arquivo" && listaArquivos.some((arquivo) => arquivo.id === evento.entidadeId))));
      setEquipe(listaEquipe.filter((vinculo) => vinculo.ativo));
      setAlocacoes(listaAlocacoes);
      setEquipamentos(listaEquipamentos);
      setCompatibilidade(avaliacaoCompatibilidade);
      setArquivos(listaArquivos);
      setServico(servicoAtual);
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

  // Agrupa versoes do mesmo arquivo logico e ordena do mais recente para o mais antigo dentro de cada grupo.
  const gruposArquivo = Array.from(new Set(arquivos.map((arquivo) => arquivo.grupoArquivoId))).map((grupoId) => {
    const versoes = arquivos.filter((arquivo) => arquivo.grupoArquivoId === grupoId).sort((a, b) => b.versao - a.versao);
    return { grupoId, atual: versoes[0], historico: versoes.slice(1) };
  });

  function limparFormularioArquivo() {
    setMostrarFormularioArquivo(false);
    setGrupoAlvoNovaVersao(null);
    setArquivoComentario("");
    setArquivoBriefing("");
    setArquivoFormNome("");
    setArquivoFormExtensao("pdf");
    setArquivoFormTamanhoKB("");
    setArquivoFormPaginas("");
    setArquivoFormLarguraMm("");
    setArquivoFormAlturaMm("");
    setArquivoFormTipo("cliente");
    setArquivoFormOrigem("upload_interno");
  }

  function abrirNovaVersao(arquivo: Arquivo) {
    setArquivoComentario("");
    setArquivoBriefing(arquivo.briefing ?? "");
    setGrupoAlvoNovaVersao(arquivo.grupoArquivoId);
    setArquivoFormNome(arquivo.nome);
    setArquivoFormExtensao(arquivo.extensao);
    setArquivoFormTamanhoKB(String(Math.round(arquivo.tamanhoBytes / 1024)));
    setArquivoFormPaginas(arquivo.analise?.paginas != null ? String(arquivo.analise.paginas) : "");
    setArquivoFormLarguraMm(arquivo.analise?.larguraMm != null ? String(arquivo.analise.larguraMm) : "");
    setArquivoFormAlturaMm(arquivo.analise?.alturaMm != null ? String(arquivo.analise.alturaMm) : "");
    setMostrarFormularioArquivo(true);
  }

  async function selecionarArquivo(file: File | undefined) {
    if (!file) return;
    setLendoArquivo(true);
    try {
      const dados = await lerMetadadosArquivo(file);
      setArquivoFormNome(dados.nome); setArquivoFormExtensao(dados.extensao);
      setArquivoFormTamanhoKB(String(dados.tamanhoBytes / 1024));
      setArquivoFormPaginas(dados.paginas == null ? "" : String(dados.paginas));
      setArquivoFormLarguraMm(dados.larguraMm == null ? "" : String(dados.larguraMm));
      setArquivoFormAlturaMm(dados.alturaMm == null ? "" : String(dados.alturaMm));
      showToast("Metadados lidos. O conteúdo não será armazenado.", "success");
    } catch (erro) { showToast(erro instanceof Error ? erro.message : "Falha na leitura.", "error"); }
    finally { setLendoArquivo(false); }
  }

  async function handleSalvarArquivo() {
    if (!arquivoFormNome.trim()) return showToast("Informe o nome do arquivo.", "error");
    const tamanhoBytes = Math.round((Number(arquivoFormTamanhoKB) || 0) * 1024);
    if (tamanhoBytes <= 0) return showToast("Informe um tamanho válido.", "error");
    const metadados = {
      comentarioVersao: arquivoComentario,
      briefing: arquivoBriefing,
      nome: arquivoFormNome.trim(),
      extensao: arquivoFormExtensao,
      mimeType: arquivoFormExtensao === "pdf" ? "application/pdf" : ({ jpg: "image/jpeg", png: "image/png", ai: "application/postscript", psd: "image/vnd.adobe.photoshop" }[arquivoFormExtensao] ?? "application/octet-stream"),
      tamanhoBytes,
      paginas: arquivoFormPaginas ? Number(arquivoFormPaginas) : null,
      larguraMm: arquivoFormLarguraMm ? Number(arquivoFormLarguraMm) : null,
      alturaMm: arquivoFormAlturaMm ? Number(arquivoFormAlturaMm) : null,
    };
    try {
      if (grupoAlvoNovaVersao) {
        const nova = await repositories.arquivos.criarNovaVersao(grupoAlvoNovaVersao, metadados, usuarioId!);
        showToast(`Versão ${nova.versao} recebida (preflight: ${nova.analise?.status ?? "—"}).`, nova.analise?.status === "bloqueio" ? "error" : "success");
      } else {
        const novo = await repositories.arquivos.receber(
          { empresaId: trabalho!.empresaId, solicitacaoId: null, pedidoId: trabalho!.pedidoId, trabalhoId: trabalho!.id, tipo: arquivoFormTipo, origem: arquivoFormOrigem, enviadoPorUsuarioId: usuarioId, ...metadados },
          usuarioId,
        );
        showToast(`Arquivo recebido (preflight: ${novo.analise?.status ?? "—"}).`, novo.analise?.status === "bloqueio" ? "error" : "success");
      }
      limparFormularioArquivo();
      await recarregar();
    } catch (erro) {
      showToast(erro instanceof Error ? erro.message : "Falha ao registrar arquivo.", "error");
    }
  }

  async function handleAprovarTecnicamente(arquivo: Arquivo) {
    try {
      await repositories.arquivos.aprovarTecnicamente(arquivo.id, usuarioId!, comentariosTecnicos[arquivo.id]?.trim() || null);
      showToast("Arquivo aprovado tecnicamente.", "success");
      await recarregar();
    } catch (erro) {
      showToast(erro instanceof Error ? erro.message : "Falha ao aprovar.", "error");
    }
  }

  async function handleRejeitarTecnicamente(arquivo: Arquivo) {
    try {
      await repositories.arquivos.rejeitarTecnicamente(arquivo.id, usuarioId!, comentariosTecnicos[arquivo.id]?.trim() || null);
      showToast("Arquivo rejeitado tecnicamente.", "success");
      await recarregar();
    } catch (erro) {
      showToast(erro instanceof Error ? erro.message : "Falha ao rejeitar.", "error");
    }
  }

  async function handleEnviarParaAprovacaoCliente(arquivo: Arquivo) {
    try {
      const atualizado = await repositories.arquivos.enviarParaAprovacaoCliente(arquivo.id, usuarioId!);
      showToast("Enviado para aprovação do cliente.", "success");
      if (atualizado.tokenAprovacaoPublica) {
        showToast(`Link público: /portal/arte/${atualizado.tokenAprovacaoPublica}`, "success");
      }
      await recarregar();
    } catch (erro) {
      showToast(erro instanceof Error ? erro.message : "Falha ao enviar para aprovação.", "error");
    }
  }

  async function handleLiberarParaProducao(arquivo: Arquivo) {
    try {
      await repositories.trabalhos.liberarArquivoParaProducao(trabalho!.id, arquivo.id, usuarioId!);
      showToast(`${arquivo.nome} (v${arquivo.versao}) liberado para produção.`, "success");
      await recarregar();
    } catch (erro) {
      showToast(erro instanceof Error ? erro.message : "Falha ao liberar para produção.", "error");
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

      <SurfaceCard className="p-5">
        <SectionLabel>Arquivos</SectionLabel>
        <p className="mt-1 text-xs text-(--text-tertiary)">
          Aprovação técnica (atende aos requisitos de produção) e aprovação do cliente (concordou com a arte) são decisões diferentes, sempre
          rastreadas separadamente.
          {servico?.requisitoArquivo ? (
            <>
              {" "}
              Requisito do serviço &quot;{servico.nome}&quot;:{" "}
              {[
                servico.requisitoArquivo.formatoEsperado?.toUpperCase(),
                servico.requisitoArquivo.paginasEsperadas ? `${servico.requisitoArquivo.paginasEsperadas} pág.` : null,
                servico.requisitoArquivo.larguraEsperadaMm && servico.requisitoArquivo.alturaEsperadaMm
                  ? `${servico.requisitoArquivo.larguraEsperadaMm}x${servico.requisitoArquivo.alturaEsperadaMm}mm`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
              .
            </>
          ) : null}
        </p>

        {gruposArquivo.length === 0 ? <p className="mt-3 workspace-empty-state">Nenhum arquivo recebido ainda para este Trabalho.</p> : null}

        <ul className="mt-3 flex flex-col gap-3">
          {gruposArquivo.map(({ grupoId, atual, historico }) => {
            const liberado = trabalho.arquivoLiberadoId === atual.id && !motivoArquivoInvalido(trabalho, atual);
            const podeLiberar =
              podeGerenciarTudo && !liberado && !motivoArquivoInvalido(trabalho, atual);
            return (
              <li key={grupoId} className="min-w-0 break-words rounded-xl border border-(--border) p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-(--text-primary)">
                      {atual.nome} <span className="text-xs text-(--text-tertiary)">v{atual.versao} · {TIPO_ARQUIVO_LABEL[atual.tipo]}</span>
                    </p>
                    <p className="text-xs text-(--text-tertiary)">
                      {(atual.tamanhoBytes / 1024).toFixed(0)} KB · enviado em {new Date(atual.enviadoEm).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {liberado ? <StatusPill tone="success">Liberado para produção</StatusPill> : null}
                    <StatusPill tone={atual.analise?.status === "bloqueio" ? "danger" : atual.analise?.status === "alerta" ? "warning" : "neutral"}>
                      Preflight: {atual.analise?.status ?? "—"}
                    </StatusPill>
                    <StatusPill tone={atual.statusAprovacaoTecnica === "aprovado" ? "success" : atual.statusAprovacaoTecnica === "rejeitado" ? "danger" : "neutral"}>
                      Técnica: {atual.statusAprovacaoTecnica}
                    </StatusPill>
                    <StatusPill tone={atual.situacao === "aprovado_cliente" ? "success" : atual.situacao === "rejeitado_cliente" ? "danger" : "accent"}>
                      {SITUACAO_ARQUIVO_LABEL[atual.situacao]}
                    </StatusPill>
                  </div>
                </div>

                <p className="mt-2 text-xs text-(--text-secondary)">{atual.analise?.resumo} {atual.analise?.paginas ?? "?"} pág. · {atual.analise?.larguraMm ?? "?"} × {atual.analise?.alturaMm ?? "?"} mm · {atual.analise?.orientacao} · {atual.analise?.formatoAproximado}</p>
                {atual.briefing ? <p className="mt-2 text-sm">Briefing: {atual.briefing}</p> : null}
                {atual.comentarioVersao ? <p className="mt-2 text-sm">Comentário da versão: {atual.comentarioVersao}</p> : null}
                <p className="mt-1 text-xs">Responsável: {equipe.find((v) => v.usuarioId === atual.enviadoPorUsuarioId)?.perfil?.nome ?? atual.enviadoPorUsuarioId ?? "Cliente"}</p>
                {trabalho.arquivoLiberadoId === atual.id && !liberado ? <p className="mt-2 text-sm text-(--danger)">Liberação suspensa: {motivoArquivoInvalido(trabalho, atual)}</p> : null}
                {atual.analise && atual.analise.regras.length > 0 ? (
                  <ul className="mt-2 list-disc pl-5 text-xs text-(--text-tertiary)">
                    {atual.analise.regras.map((regra, indice) => (
                      <li key={indice} className={regra.severidade === "bloqueio" ? "text-(--danger)" : undefined}>
                        {regra.mensagem}
                      </li>
                    ))}
                  </ul>
                ) : null}

                {atual.aprovacaoTecnica ? (
                  <p className="mt-2 text-xs text-(--text-tertiary)">
                    Aprovação técnica em {new Date(atual.aprovacaoTecnica.data).toLocaleString("pt-BR")}
                    {atual.aprovacaoTecnica.comentario ? ` — "${atual.aprovacaoTecnica.comentario}"` : ""}
                  </p>
                ) : null}
                {atual.aprovacaoCliente ? (
                  <p className="mt-1 text-xs text-(--text-tertiary)">
                    Cliente {atual.aprovacaoCliente.aprovado ? "aprovou" : "respondeu"} em {new Date(atual.aprovacaoCliente.data).toLocaleString("pt-BR")}
                    {atual.aprovacaoCliente.comentario ? ` — "${atual.aprovacaoCliente.comentario}"` : ""}
                  </p>
                ) : null}
                {atual.tokenAprovacaoPublica && atual.situacao === "aguardando_aprovacao_cliente" ? (
                  <p className="mt-1 text-xs text-(--text-tertiary)">
                    Link público:{" "}
                    <Link href={`/portal/arte/${atual.tokenAprovacaoPublica}`} target="_blank" className="break-all text-(--accent-strong) hover:underline">
                      /portal/arte/{atual.tokenAprovacaoPublica}
                    </Link>
                  </p>
                ) : null}

                {podeGerenciarArquivos && atual.statusAprovacaoTecnica === "pendente" ? (
                  <div className="mt-3 flex flex-wrap items-end gap-2">
                    <input
                      type="text"
                      aria-label="Comentário técnico"
                      placeholder="Comentário técnico (opcional)"
                      className="workspace-input"
                      value={comentariosTecnicos[atual.id] ?? ""}
                      onChange={(event) => setComentariosTecnicos((prev) => ({ ...prev, [atual.id]: event.target.value }))}
                    />
                    <button type="button" id={`arquivo-btn-aprovar-${atual.id}`} className="workspace-button-primary" onClick={() => void handleAprovarTecnicamente(atual)}>
                      Aprovar tecnicamente
                    </button>
                    <button type="button" id={`arquivo-btn-rejeitar-${atual.id}`} className="workspace-button-secondary" onClick={() => void handleRejeitarTecnicamente(atual)}>
                      Rejeitar tecnicamente
                    </button>
                  </div>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-2">
                  {podeAnexarArquivos && !["aguardando_aprovacao_cliente", "aprovado_cliente", "substituido", "cancelado"].includes(atual.situacao) ? (
                    <button
                      type="button"
                      id={`arquivo-btn-enviar-cliente-${atual.id}`}
                      className="workspace-button-secondary"
                      onClick={() => void handleEnviarParaAprovacaoCliente(atual)}
                    >
                      Enviar para aprovação do cliente
                    </button>
                  ) : null}
                  {podeLiberar ? (
                    <button type="button" id={`arquivo-btn-liberar-${atual.id}`} className="workspace-button-primary" onClick={() => void handleLiberarParaProducao(atual)}>
                      Liberar para produção
                    </button>
                  ) : null}
                  {podeAnexarArquivos ? (
                    <button type="button" id={`arquivo-btn-nova-versao-${atual.id}`} className="workspace-button-secondary" onClick={() => abrirNovaVersao(atual)}>
                      Nova versão
                    </button>
                  ) : null}
                </div>

                {historico.length > 0 ? (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs font-medium text-(--text-tertiary)">Histórico de versões ({historico.length})</summary>
                    <ul className="mt-2 flex flex-col gap-1 text-xs text-(--text-secondary)">
                      {historico.map((versaoAntiga) => (
                        <li key={versaoAntiga.id} className="flex flex-wrap justify-between gap-2 border-b border-(--border) py-1">
                          <span>
                            v{versaoAntiga.versao} — {versaoAntiga.nome} ({SITUACAO_ARQUIVO_LABEL[versaoAntiga.situacao]})
                            {trabalho.arquivoLiberadoId === versaoAntiga.id ? " · referência anterior, liberação suspensa" : ""}
                            <br />Preflight: {versaoAntiga.analise?.status} · {versaoAntiga.comentarioVersao}
                            <br />{versaoAntiga.analise?.regras.map((regra) => regra.mensagem).join(" ")}
                          </span>
                          <span className="text-(--text-tertiary)">{new Date(versaoAntiga.enviadoEm).toLocaleString("pt-BR")}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </li>
            );
          })}
        </ul>

        {podeAnexarArquivos ? (
          <div className="mt-4">
            {!mostrarFormularioArquivo ? (
              <button
                type="button"
                id="arquivo-btn-adicionar"
                className="workspace-button-secondary"
                onClick={() => {
                  setGrupoAlvoNovaVersao(null);
                  setMostrarFormularioArquivo(true);
                }}
              >
                Adicionar arquivo
              </button>
            ) : (
              <div className="grid grid-cols-1 gap-3 rounded-xl border border-(--border) bg-(--bg-muted) p-4 sm:grid-cols-2 lg:grid-cols-4">
                <p className="text-xs font-medium text-(--text-tertiary) lg:col-span-4">
                  {grupoAlvoNovaVersao ? "Nova versão. A anterior permanece no histórico." : "Registre os dados do arquivo. O conteúdo deve ser mantido externamente."}
                </p>
                <div className="sm:col-span-2 lg:col-span-4 min-w-0">
                  <label htmlFor="arquivo-local" className="workspace-label">Ler metadados de um arquivo (até 25 MB)</label>
                  <input id="arquivo-local" type="file" accept=".pdf,.jpg,.png,.ai,.cdr,.psd" className="w-full min-w-0 text-sm" disabled={lendoArquivo} onChange={(event) => void selecionarArquivo(event.target.files?.[0])} />
                  <p className="text-xs">{lendoArquivo ? "Lendo arquivo..." : "A leitura preenche os campos abaixo. Nenhum conteúdo é armazenado."}</p>
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="arquivo-briefing" className="workspace-label">Briefing da arte</label>
                  <textarea id="arquivo-briefing" className="workspace-textarea" value={arquivoBriefing} onChange={(event) => setArquivoBriefing(event.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="arquivo-comentario" className="workspace-label">Comentário desta versão</label>
                  <textarea id="arquivo-comentario" className="workspace-textarea" value={arquivoComentario} onChange={(event) => setArquivoComentario(event.target.value)} />
                </div>
                <div>
                  <label htmlFor="arquivo-form-nome" className="workspace-label">
                    Nome do arquivo
                  </label>
                  <input id="arquivo-form-nome" type="text" className="workspace-input" value={arquivoFormNome} onChange={(event) => setArquivoFormNome(event.target.value)} />
                </div>
                <div>
                  <label htmlFor="arquivo-form-extensao" className="workspace-label">
                    Extensão
                  </label>
                  <select id="arquivo-form-extensao" className="workspace-select" value={arquivoFormExtensao} onChange={(event) => setArquivoFormExtensao(event.target.value)}>
                    {EXTENSOES_ARQUIVO.map((extensao) => (
                      <option key={extensao} value={extensao}>
                        {extensao.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="arquivo-form-tamanho" className="workspace-label">
                    Tamanho (KB)
                  </label>
                  <input id="arquivo-form-tamanho" type="number" className="workspace-input" value={arquivoFormTamanhoKB} onChange={(event) => setArquivoFormTamanhoKB(event.target.value)} />
                </div>
                <div>
                  <label htmlFor="arquivo-form-paginas" className="workspace-label">
                    Páginas
                  </label>
                  <input id="arquivo-form-paginas" type="number" className="workspace-input" value={arquivoFormPaginas} onChange={(event) => setArquivoFormPaginas(event.target.value)} />
                </div>
                <div>
                  <label htmlFor="arquivo-form-largura" className="workspace-label">
                    Largura (mm)
                  </label>
                  <input id="arquivo-form-largura" type="number" className="workspace-input" value={arquivoFormLarguraMm} onChange={(event) => setArquivoFormLarguraMm(event.target.value)} />
                </div>
                <div>
                  <label htmlFor="arquivo-form-altura" className="workspace-label">
                    Altura (mm)
                  </label>
                  <input id="arquivo-form-altura" type="number" className="workspace-input" value={arquivoFormAlturaMm} onChange={(event) => setArquivoFormAlturaMm(event.target.value)} />
                </div>
                {!grupoAlvoNovaVersao ? (
                  <>
                    <div>
                      <label htmlFor="arquivo-form-tipo" className="workspace-label">
                        Tipo
                      </label>
                      <select id="arquivo-form-tipo" className="workspace-select" value={arquivoFormTipo} onChange={(event) => setArquivoFormTipo(event.target.value as TipoArquivo)}>
                        <option value="cliente">Arquivo do cliente (arte pronta)</option>
                        <option value="arte">Arte (criação interna)</option>
                        <option value="producao">Arquivo de produção</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="arquivo-form-origem" className="workspace-label">
                        Origem
                      </label>
                      <select id="arquivo-form-origem" className="workspace-select" value={arquivoFormOrigem} onChange={(event) => setArquivoFormOrigem(event.target.value as OrigemArquivo)}>
                        <option value="upload_interno">Upload interno</option>
                        <option value="email">E-mail</option>
                        <option value="portal_cliente">Portal do cliente</option>
                      </select>
                    </div>
                  </>
                ) : null}
                <div className="flex items-end gap-2 lg:col-span-4">
                  <button type="button" id="arquivo-form-btn-salvar" disabled={lendoArquivo} className="workspace-button-primary" onClick={() => void handleSalvarArquivo()}>
                    {grupoAlvoNovaVersao ? "Enviar nova versão" : "Registrar arquivo"}
                  </button>
                  <button type="button" id="arquivo-form-btn-cancelar" className="workspace-button-secondary" onClick={limparFormularioArquivo}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : null}
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
                  <li key={alocacao.id} className="flex flex-wrap justify-between gap-2 border-b border-(--border) py-1">
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
                <li key={evento.id} className="flex flex-wrap justify-between gap-2 border-b border-(--border) py-1">
                  <span>{evento.acao}</span>
                  <span className="text-xs text-(--text-tertiary)">{new Date(evento.criadoEm).toLocaleString("pt-BR")}</span>
                </li>
              ))}
          </ul>
        )}
      </SurfaceCard>
      <EstoqueTrabalho trabalho={trabalho} />
    </div>
  );
}
