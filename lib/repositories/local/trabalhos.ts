import { motivoArquivoInvalido } from "@/lib/domain/liberacao-arquivo";
import { exigirArquivoDaEtapa } from "./validar-arquivo-etapa";
import { gerarId, gravarColecao, lerColecao } from "@/lib/storage/local-storage-client";
import type { Arquivo, Servico, EtapaWorkflow, EventoAuditoria, Trabalho, Workflow } from "@/lib/domain/entities";
import type { TrabalhoRepository } from "@/lib/repositories/types";

const CHAVE = "trabalhos";
const CHAVE_WORKFLOWS = "workflows";
const CHAVE_ETAPAS = "etapas_workflow";
const CHAVE_AUDITORIA = "eventos_auditoria";
const CHAVE_ARQUIVOS = "arquivos";

function proximoCodigo(empresaId: string): string {
  const existentes = lerColecao<Trabalho>(CHAVE).filter((trabalho) => trabalho.empresaId === empresaId);
  const maiorSequencia = existentes.reduce((maior, trabalho) => {
    const match = /TRAB-(\d+)/.exec(trabalho.codigo);
    return Math.max(maior, match ? Number(match[1]) : 0);
  }, 0);
  return `TRAB-${String(maiorSequencia + 1).padStart(4, "0")}`;
}

function registrarEvento(evento: Omit<EventoAuditoria, "id" | "criadoEm">): void {
  const eventos = lerColecao<EventoAuditoria>(CHAVE_AUDITORIA);
  eventos.push({ ...evento, id: gerarId("evt"), criadoEm: new Date().toISOString() });
  gravarColecao(CHAVE_AUDITORIA, eventos);
}

function obterOuFalhar(id: string): Trabalho {
  const trabalho = lerColecao<Trabalho>(CHAVE).find((item) => item.id === id);
  if (!trabalho) throw new Error(`Trabalho ${id} nao encontrado.`);
  return trabalho;
}

function salvar(atualizado: Trabalho): Trabalho {
  const trabalhos = lerColecao<Trabalho>(CHAVE);
  const indice = trabalhos.findIndex((item) => item.id === atualizado.id);
  if (indice === -1) throw new Error(`Trabalho ${atualizado.id} nao encontrado.`);
  trabalhos[indice] = atualizado;
  gravarColecao(CHAVE, trabalhos);
  return atualizado;
}

/** So permite transicoes de situacao a partir de estados "ativos" (nao terminais/pausados). */
function exigirEmProducao(trabalho: Trabalho, acao: string): void {
  if (trabalho.situacao !== "em_producao" && trabalho.situacao !== "aguardando_producao") {
    throw new Error(`Nao e possivel ${acao}: o Trabalho ${trabalho.codigo} esta com situacao "${trabalho.situacao}".`);
  }
}

export function criarTrabalhoRepositoryLocal(): TrabalhoRepository {
  return {
    async listar(empresaId) {
      return lerColecao<Trabalho>(CHAVE).filter((trabalho) => trabalho.empresaId === empresaId);
    },
    async obter(id) {
      return lerColecao<Trabalho>(CHAVE).find((trabalho) => trabalho.id === id) ?? null;
    },
    async listarPorPedido(pedidoId) {
      return lerColecao<Trabalho>(CHAVE).filter((trabalho) => trabalho.pedidoId === pedidoId);
    },
    async criar(dados) {
      const workflow = lerColecao<Workflow>(CHAVE_WORKFLOWS).find((item) => item.id === dados.workflowId);
      if (!workflow) throw new Error(`Workflow ${dados.workflowId} nao encontrado.`);
      const etapas = lerColecao<EtapaWorkflow>(CHAVE_ETAPAS)
        .filter((etapa) => etapa.workflowId === dados.workflowId)
        .sort((a, b) => a.ordem - b.ordem);
      if (etapas.length === 0) {
        throw new Error(`Workflow "${workflow.nome}" nao possui etapas cadastradas.`);
      }

      const novo: Trabalho = {
        id: gerarId("trab"),
        empresaId: dados.empresaId,
        codigo: proximoCodigo(dados.empresaId),
        pedidoId: dados.pedidoId,
        clienteId: dados.clienteId,
        descricao: dados.descricao,
        quantidade: dados.quantidade,
        servicoId: dados.servicoId,
        materialId: dados.materialId,
        acabamentos: dados.acabamentos,
        prazo: dados.prazo,
        prioridade: dados.prioridade,
        situacao: "aguardando_producao",
        responsavelUsuarioId: dados.responsavelUsuarioId,
        observacoes: dados.observacoes,
        origem: dados.origem,
        // Snapshot imutavel: edicoes futuras no cadastro do Workflow/Etapas
        // nunca devem alterar Trabalhos ja criados.
        workflow: {
          workflowId: workflow.id,
          nome: workflow.nome,
          etapas: etapas.map((etapa) => ({
            id: etapa.id,
            ordem: etapa.ordem,
            nome: etapa.nome,
            tipo: etapa.tipo,
            exigeArquivoLiberado: etapa.exigeArquivoLiberado,
          })),
        },
        etapaAtualId: etapas[0].id,
        formato: dados.formato,
        tipoEquipamentoNecessario: dados.tipoEquipamentoNecessario,
        arquivoLiberadoId: null,
        requisitoArquivo: lerColecao<Servico>("servicos").find((item) => item.id === dados.servicoId)?.requisitoArquivo ?? null,
        criadoEm: new Date().toISOString(),
        concluidoEm: null,
      };

      const trabalhos = lerColecao<Trabalho>(CHAVE);
      trabalhos.push(novo);
      gravarColecao(CHAVE, trabalhos);

      registrarEvento({
        empresaId: novo.empresaId,
        usuarioId: dados.responsavelUsuarioId,
        acao: "trabalho_criado",
        entidade: "trabalho",
        entidadeId: novo.id,
        dadosAntes: null,
        dadosDepois: { codigo: novo.codigo, pedidoId: novo.pedidoId, workflow: novo.workflow.nome, etapaAtualId: novo.etapaAtualId },
      });

      return novo;
    },
    async atribuirResponsavel(trabalhoId, usuarioId, responsavelUsuarioId) {
      const trabalho = obterOuFalhar(trabalhoId);
      const anterior = trabalho.responsavelUsuarioId;
      const atualizado = salvar({ ...trabalho, responsavelUsuarioId });
      registrarEvento({
        empresaId: atualizado.empresaId,
        usuarioId,
        acao: "trabalho_responsavel_atribuido",
        entidade: "trabalho",
        entidadeId: atualizado.id,
        dadosAntes: { responsavelUsuarioId: anterior },
        dadosDepois: { responsavelUsuarioId },
      });
      return atualizado;
    },
    async mover(trabalhoId, usuarioId, etapaId, motivo) {
      const trabalho = obterOuFalhar(trabalhoId);
      exigirEmProducao(trabalho, "mover de etapa");

      const etapas = trabalho.workflow.etapas;
      const indiceAtual = etapas.findIndex((etapa) => etapa.id === trabalho.etapaAtualId);
      const indiceDestino = etapas.findIndex((etapa) => etapa.id === etapaId);
      if (indiceDestino === -1) {
        throw new Error("Etapa de destino nao pertence ao workflow deste Trabalho.");
      }
      if (indiceDestino === indiceAtual) {
        return trabalho;
      }

      const avancando = indiceDestino > indiceAtual;
      if (avancando && indiceDestino - indiceAtual > 1) {
        throw new Error("Nao e permitido pular etapas: avance uma etapa por vez.");
      }
      if (!avancando && (!motivo || motivo.trim().length === 0)) {
        throw new Error("Retroceder de etapa exige justificativa.");
      }
      const etapaDestino = etapas[indiceDestino];
      if (avancando) exigirArquivoDaEtapa(trabalho, trabalho.etapaAtualId, usuarioId);
      exigirArquivoDaEtapa(trabalho, etapaDestino.id, usuarioId);

      const etapaAnterior = etapas[indiceAtual];
      const etapaNova = etapas[indiceDestino];
      const situacaoAnterior = trabalho.situacao;
      const situacaoNova = trabalho.situacao === "aguardando_producao" ? "em_producao" : trabalho.situacao;
      const atualizado = salvar({ ...trabalho, etapaAtualId: etapaId, situacao: situacaoNova });

      registrarEvento({
        empresaId: atualizado.empresaId,
        usuarioId,
        acao: avancando ? "trabalho_etapa_avancada" : "trabalho_etapa_retrocedida",
        entidade: "trabalho",
        entidadeId: atualizado.id,
        dadosAntes: { etapaId: etapaAnterior.id, etapaNome: etapaAnterior.nome, situacao: situacaoAnterior },
        dadosDepois: { etapaId: etapaNova.id, etapaNome: etapaNova.nome, situacao: situacaoNova, motivo: motivo ?? null },
      });

      return atualizado;
    },
    async concluir(trabalhoId, usuarioId) {
      const trabalho = obterOuFalhar(trabalhoId);
      exigirEmProducao(trabalho, "concluir");
      const etapas = trabalho.workflow.etapas;
      const ultimaEtapa = etapas[etapas.length - 1];
      if (trabalho.etapaAtualId !== ultimaEtapa.id) {
        throw new Error("So e possivel concluir o Trabalho quando ele estiver na ultima etapa do workflow.");
      }
      exigirArquivoDaEtapa(trabalho, trabalho.etapaAtualId, usuarioId);
      const atualizado = salvar({ ...trabalho, situacao: "concluido", concluidoEm: new Date().toISOString() });
      registrarEvento({
        empresaId: atualizado.empresaId,
        usuarioId,
        acao: "trabalho_concluido",
        entidade: "trabalho",
        entidadeId: atualizado.id,
        dadosAntes: { situacao: trabalho.situacao },
        dadosDepois: { situacao: "concluido" },
      });
      return atualizado;
    },
    async pausar(trabalhoId, usuarioId, motivo) {
      if (!motivo || motivo.trim().length === 0) throw new Error("Pausar um Trabalho exige motivo.");
      const trabalho = obterOuFalhar(trabalhoId);
      exigirEmProducao(trabalho, "pausar");
      const atualizado = salvar({ ...trabalho, situacao: "pausado" });
      registrarEvento({
        empresaId: atualizado.empresaId,
        usuarioId,
        acao: "trabalho_pausado",
        entidade: "trabalho",
        entidadeId: atualizado.id,
        dadosAntes: { situacao: trabalho.situacao },
        dadosDepois: { situacao: "pausado", motivo },
      });
      return atualizado;
    },
    async registrarPendencia(trabalhoId, usuarioId, motivo) {
      if (!motivo || motivo.trim().length === 0) throw new Error("Registrar pendencia exige motivo.");
      const trabalho = obterOuFalhar(trabalhoId);
      exigirEmProducao(trabalho, "registrar pendencia");
      const atualizado = salvar({ ...trabalho, situacao: "com_pendencia" });
      registrarEvento({
        empresaId: atualizado.empresaId,
        usuarioId,
        acao: "trabalho_pendencia_registrada",
        entidade: "trabalho",
        entidadeId: atualizado.id,
        dadosAntes: { situacao: trabalho.situacao },
        dadosDepois: { situacao: "com_pendencia", motivo },
      });
      return atualizado;
    },
    async retomar(trabalhoId, usuarioId) {
      const trabalho = obterOuFalhar(trabalhoId);
      if (trabalho.situacao !== "pausado" && trabalho.situacao !== "com_pendencia") {
        throw new Error(`So e possivel retomar um Trabalho pausado ou com pendencia (situacao atual: "${trabalho.situacao}").`);
      }
      exigirArquivoDaEtapa(trabalho, trabalho.etapaAtualId, usuarioId);
      const atualizado = salvar({ ...trabalho, situacao: "em_producao" });
      registrarEvento({
        empresaId: atualizado.empresaId,
        usuarioId,
        acao: "trabalho_retomado",
        entidade: "trabalho",
        entidadeId: atualizado.id,
        dadosAntes: { situacao: trabalho.situacao },
        dadosDepois: { situacao: "em_producao" },
      });
      return atualizado;
    },
    async cancelar(trabalhoId, usuarioId, motivo) {
      if (!motivo || motivo.trim().length === 0) throw new Error("Cancelar um Trabalho exige motivo.");
      const trabalho = obterOuFalhar(trabalhoId);
      if (trabalho.situacao === "concluido" || trabalho.situacao === "cancelado") {
        throw new Error(`Trabalho ja esta com situacao "${trabalho.situacao}" e nao pode ser cancelado.`);
      }
      const atualizado = salvar({ ...trabalho, situacao: "cancelado" });
      registrarEvento({
        empresaId: atualizado.empresaId,
        usuarioId,
        acao: "trabalho_cancelado",
        entidade: "trabalho",
        entidadeId: atualizado.id,
        dadosAntes: { situacao: trabalho.situacao },
        dadosDepois: { situacao: "cancelado", motivo },
      });
      return atualizado;
    },
    async liberarArquivoParaProducao(trabalhoId, arquivoId, usuarioId) {
      const trabalho = obterOuFalhar(trabalhoId);
      const arquivo = lerColecao<Arquivo>(CHAVE_ARQUIVOS).find((item) => item.id === arquivoId);
      if (!arquivo) throw new Error(`Arquivo ${arquivoId} nao encontrado.`);
      if (trabalho.situacao === "concluido" || trabalho.situacao === "cancelado") throw new Error("Trabalho finalizado não permite substituir o arquivo de produção.");
      const motivo = motivoArquivoInvalido(trabalho, arquivo);
      if (motivo) throw new Error(motivo);
      const anterior = trabalho.arquivoLiberadoId;
      const atualizado = salvar({ ...trabalho, arquivoLiberadoId: arquivoId });
      registrarEvento({
        empresaId: atualizado.empresaId,
        usuarioId,
        acao: "trabalho_arquivo_liberado_producao",
        entidade: "trabalho",
        entidadeId: atualizado.id,
        dadosAntes: { arquivoLiberadoId: anterior },
        dadosDepois: { arquivoLiberadoId: arquivoId, versao: arquivo.versao },
      });
      return atualizado;
    },
  };
}
