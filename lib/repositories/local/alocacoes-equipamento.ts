import { gerarId, gravarColecao, lerColecao } from "@/lib/storage/local-storage-client";
import { avaliarCompatibilidade } from "@/lib/domain/compatibilidade-equipamento";
import type { AlocacaoEquipamento, CapacidadeEquipamento, EventoAuditoria, Equipamento, Trabalho } from "@/lib/domain/entities";
import type { AlocacaoEquipamentoRepository } from "@/lib/repositories/types";

const CHAVE = "alocacoes_equipamento";
const CHAVE_TRABALHOS = "trabalhos";
const CHAVE_EQUIPAMENTOS = "equipamentos";
const CHAVE_CAPACIDADES = "capacidades_equipamento";
const CHAVE_AUDITORIA = "eventos_auditoria";

const SITUACOES_ATIVAS: AlocacaoEquipamento["situacao"][] = ["aguardando", "preparacao", "em_execucao", "pausada"];

function registrarEvento(evento: Omit<EventoAuditoria, "id" | "criadoEm">): void {
  const eventos = lerColecao<EventoAuditoria>(CHAVE_AUDITORIA);
  eventos.push({ ...evento, id: gerarId("evt"), criadoEm: new Date().toISOString() });
  gravarColecao(CHAVE_AUDITORIA, eventos);
}

function obterTrabalhoOuFalhar(trabalhoId: string): Trabalho {
  const trabalho = lerColecao<Trabalho>(CHAVE_TRABALHOS).find((item) => item.id === trabalhoId);
  if (!trabalho) throw new Error(`Trabalho ${trabalhoId} nao encontrado.`);
  return trabalho;
}

function obterEquipamentoOuFalhar(equipamentoId: string): Equipamento {
  const equipamento = lerColecao<Equipamento>(CHAVE_EQUIPAMENTOS).find((item) => item.id === equipamentoId);
  if (!equipamento) throw new Error(`Equipamento ${equipamentoId} nao encontrado.`);
  return equipamento;
}

function contarAlocacoesAtivas(equipamentoId: string, ignorarAlocacaoId?: string): number {
  return lerColecao<AlocacaoEquipamento>(CHAVE)
    .filter((alocacao) => alocacao.equipamentoId === equipamentoId && alocacao.id !== ignorarAlocacaoId)
    .filter((alocacao) => SITUACOES_ATIVAS.includes(alocacao.situacao)).length;
}

/** Lança se o equipamento nao puder receber uma NOVA alocacao agora (incompativel, indisponivel ou sem capacidade livre). */
function validarNovaAlocacao(trabalho: Trabalho, equipamento: Equipamento, ignorarAlocacaoId?: string): void {
  if (equipamento.situacao === "indisponivel" || equipamento.situacao === "manutencao") {
    throw new Error(`Equipamento "${equipamento.nome}" está "${equipamento.situacao}" e não pode receber nova alocação.`);
  }
  const capacidade = lerColecao<CapacidadeEquipamento>(CHAVE_CAPACIDADES).find((item) => item.equipamentoId === equipamento.id) ?? null;
  const avaliacao = avaliarCompatibilidade(trabalho, equipamento, capacidade);
  if (!avaliacao.compativel) {
    throw new Error(`Equipamento "${equipamento.nome}" incompatível: ${avaliacao.motivos.map((motivo) => motivo.mensagem).join(" ")}`);
  }
  const ativos = contarAlocacoesAtivas(equipamento.id, ignorarAlocacaoId);
  if (ativos >= equipamento.capacidadeSimultanea) {
    throw new Error(`Equipamento "${equipamento.nome}" já está no limite de capacidade simultânea (${equipamento.capacidadeSimultanea}).`);
  }
}

function obterOuFalhar(id: string): AlocacaoEquipamento {
  const alocacao = lerColecao<AlocacaoEquipamento>(CHAVE).find((item) => item.id === id);
  if (!alocacao) throw new Error(`Alocação ${id} não encontrada.`);
  return alocacao;
}

function salvar(atualizada: AlocacaoEquipamento): AlocacaoEquipamento {
  const alocacoes = lerColecao<AlocacaoEquipamento>(CHAVE);
  const indice = alocacoes.findIndex((item) => item.id === atualizada.id);
  if (indice === -1) throw new Error(`Alocação ${atualizada.id} não encontrada.`);
  alocacoes[indice] = atualizada;
  gravarColecao(CHAVE, alocacoes);
  return atualizada;
}

function exigirAtiva(alocacao: AlocacaoEquipamento, acao: string): void {
  if (!SITUACOES_ATIVAS.includes(alocacao.situacao)) {
    throw new Error(`Não é possível ${acao}: a alocação está com situação "${alocacao.situacao}".`);
  }
}

export function criarAlocacaoEquipamentoRepositoryLocal(): AlocacaoEquipamentoRepository {
  return {
    async listar(empresaId) {
      return lerColecao<AlocacaoEquipamento>(CHAVE).filter((alocacao) => alocacao.empresaId === empresaId);
    },
    async obter(id) {
      return lerColecao<AlocacaoEquipamento>(CHAVE).find((alocacao) => alocacao.id === id) ?? null;
    },
    async listarPorTrabalho(trabalhoId) {
      return lerColecao<AlocacaoEquipamento>(CHAVE).filter((alocacao) => alocacao.trabalhoId === trabalhoId);
    },
    async listarPorEquipamento(equipamentoId) {
      return lerColecao<AlocacaoEquipamento>(CHAVE).filter((alocacao) => alocacao.equipamentoId === equipamentoId);
    },
    async avaliarCompatibilidade(trabalhoId) {
      const trabalho = obterTrabalhoOuFalhar(trabalhoId);
      const equipamentos = lerColecao<Equipamento>(CHAVE_EQUIPAMENTOS).filter((item) => item.empresaId === trabalho.empresaId && item.ativo);
      const capacidades = lerColecao<CapacidadeEquipamento>(CHAVE_CAPACIDADES);
      return equipamentos.map((equipamento) => {
        const capacidade = capacidades.find((item) => item.equipamentoId === equipamento.id) ?? null;
        return avaliarCompatibilidade(trabalho, equipamento, capacidade);
      });
    },
    async criar(dados, usuarioId) {
      const trabalho = obterTrabalhoOuFalhar(dados.trabalhoId);
      const equipamento = obterEquipamentoOuFalhar(dados.equipamentoId);
      validarNovaAlocacao(trabalho, equipamento);

      const nova: AlocacaoEquipamento = {
        id: gerarId("aloc"),
        empresaId: dados.empresaId,
        trabalhoId: dados.trabalhoId,
        etapaId: dados.etapaId,
        equipamentoId: dados.equipamentoId,
        operadorUsuarioId: dados.operadorUsuarioId,
        situacao: "aguardando",
        inicioPrevisto: dados.inicioPrevisto,
        inicioReal: null,
        terminoReal: null,
        motivoPausa: null,
        motivoRealocacao: null,
        alocacaoAnteriorId: null,
        precisaDecisaoHumana: false,
        criadaPorUsuarioId: usuarioId,
        criadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString(),
      };
      const alocacoes = lerColecao<AlocacaoEquipamento>(CHAVE);
      alocacoes.push(nova);
      gravarColecao(CHAVE, alocacoes);

      registrarEvento({
        empresaId: nova.empresaId,
        usuarioId,
        acao: "alocacao_criada",
        entidade: "alocacao_equipamento",
        entidadeId: nova.id,
        dadosAntes: null,
        dadosDepois: { trabalhoId: nova.trabalhoId, equipamentoId: nova.equipamentoId, etapaId: nova.etapaId },
      });
      return nova;
    },
    async iniciarPreparacao(alocacaoId, usuarioId) {
      const alocacao = obterOuFalhar(alocacaoId);
      exigirAtiva(alocacao, "iniciar preparação");
      const atualizada = salvar({ ...alocacao, situacao: "preparacao", atualizadoEm: new Date().toISOString() });
      registrarEvento({
        empresaId: atualizada.empresaId,
        usuarioId,
        acao: "alocacao_preparacao",
        entidade: "alocacao_equipamento",
        entidadeId: atualizada.id,
        dadosAntes: { situacao: alocacao.situacao },
        dadosDepois: { situacao: "preparacao" },
      });
      return atualizada;
    },
    async iniciar(alocacaoId, usuarioId) {
      const alocacao = obterOuFalhar(alocacaoId);
      exigirAtiva(alocacao, "iniciar execução");
      const atualizada = salvar({
        ...alocacao,
        situacao: "em_execucao",
        inicioReal: alocacao.inicioReal ?? new Date().toISOString(),
        atualizadoEm: new Date().toISOString(),
      });
      // Equipamento passa a "em_uso" enquanto ha execucao ativa.
      const equipamentos = lerColecao<Equipamento>(CHAVE_EQUIPAMENTOS);
      const indiceEquip = equipamentos.findIndex((item) => item.id === alocacao.equipamentoId);
      if (indiceEquip !== -1 && equipamentos[indiceEquip].situacao === "disponivel") {
        equipamentos[indiceEquip] = { ...equipamentos[indiceEquip], situacao: "em_uso" };
        gravarColecao(CHAVE_EQUIPAMENTOS, equipamentos);
      }
      registrarEvento({
        empresaId: atualizada.empresaId,
        usuarioId,
        acao: "alocacao_iniciada",
        entidade: "alocacao_equipamento",
        entidadeId: atualizada.id,
        dadosAntes: { situacao: alocacao.situacao },
        dadosDepois: { situacao: "em_execucao", inicioReal: atualizada.inicioReal },
      });
      return atualizada;
    },
    async pausar(alocacaoId, usuarioId, motivo) {
      if (!motivo || !motivo.trim()) throw new Error("Pausar uma alocação exige motivo.");
      const alocacao = obterOuFalhar(alocacaoId);
      exigirAtiva(alocacao, "pausar");
      const atualizada = salvar({ ...alocacao, situacao: "pausada", motivoPausa: motivo, atualizadoEm: new Date().toISOString() });
      registrarEvento({
        empresaId: atualizada.empresaId,
        usuarioId,
        acao: "alocacao_pausada",
        entidade: "alocacao_equipamento",
        entidadeId: atualizada.id,
        dadosAntes: { situacao: alocacao.situacao },
        dadosDepois: { situacao: "pausada", motivo },
      });
      return atualizada;
    },
    async retomar(alocacaoId, usuarioId) {
      const alocacao = obterOuFalhar(alocacaoId);
      if (alocacao.situacao !== "pausada") {
        throw new Error(`Só é possível retomar uma alocação pausada (situação atual: "${alocacao.situacao}").`);
      }
      const atualizada = salvar({ ...alocacao, situacao: "em_execucao", atualizadoEm: new Date().toISOString() });
      registrarEvento({
        empresaId: atualizada.empresaId,
        usuarioId,
        acao: "alocacao_retomada",
        entidade: "alocacao_equipamento",
        entidadeId: atualizada.id,
        dadosAntes: { situacao: alocacao.situacao },
        dadosDepois: { situacao: "em_execucao" },
      });
      return atualizada;
    },
    async concluir(alocacaoId, usuarioId) {
      const alocacao = obterOuFalhar(alocacaoId);
      exigirAtiva(alocacao, "concluir");
      const atualizada = salvar({
        ...alocacao,
        situacao: "concluida",
        terminoReal: new Date().toISOString(),
        atualizadoEm: new Date().toISOString(),
      });

      // Libera o equipamento se nao houver mais nenhuma alocacao ativa nele.
      if (contarAlocacoesAtivas(alocacao.equipamentoId) === 0) {
        const equipamentos = lerColecao<Equipamento>(CHAVE_EQUIPAMENTOS);
        const indiceEquip = equipamentos.findIndex((item) => item.id === alocacao.equipamentoId);
        if (indiceEquip !== -1 && equipamentos[indiceEquip].situacao === "em_uso") {
          equipamentos[indiceEquip] = { ...equipamentos[indiceEquip], situacao: "disponivel" };
          gravarColecao(CHAVE_EQUIPAMENTOS, equipamentos);
        }
      }

      registrarEvento({
        empresaId: atualizada.empresaId,
        usuarioId,
        acao: "alocacao_concluida",
        entidade: "alocacao_equipamento",
        entidadeId: atualizada.id,
        dadosAntes: { situacao: alocacao.situacao },
        dadosDepois: { situacao: "concluida", terminoReal: atualizada.terminoReal },
      });
      return atualizada;
    },
    async realocar(alocacaoId, usuarioId, novoEquipamentoId, motivo) {
      if (!motivo || !motivo.trim()) throw new Error("Realocar exige motivo.");
      const alocacaoAtual = obterOuFalhar(alocacaoId);
      if (!SITUACOES_ATIVAS.includes(alocacaoAtual.situacao)) {
        throw new Error(`Só é possível realocar uma alocação ativa (situação atual: "${alocacaoAtual.situacao}").`);
      }
      const trabalho = obterTrabalhoOuFalhar(alocacaoAtual.trabalhoId);
      const novoEquipamento = obterEquipamentoOuFalhar(novoEquipamentoId);
      validarNovaAlocacao(trabalho, novoEquipamento);

      // Encerra a alocacao atual preservando o historico — nunca apaga nem move.
      const encerrada = salvar({
        ...alocacaoAtual,
        situacao: "cancelada",
        motivoRealocacao: motivo,
        atualizadoEm: new Date().toISOString(),
      });

      const nova: AlocacaoEquipamento = {
        id: gerarId("aloc"),
        empresaId: alocacaoAtual.empresaId,
        trabalhoId: alocacaoAtual.trabalhoId,
        etapaId: alocacaoAtual.etapaId,
        equipamentoId: novoEquipamentoId,
        operadorUsuarioId: alocacaoAtual.operadorUsuarioId,
        situacao: "aguardando",
        inicioPrevisto: alocacaoAtual.inicioPrevisto,
        inicioReal: null,
        terminoReal: null,
        motivoPausa: null,
        motivoRealocacao: null,
        alocacaoAnteriorId: encerrada.id,
        precisaDecisaoHumana: false,
        criadaPorUsuarioId: usuarioId,
        criadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString(),
      };
      const alocacoes = lerColecao<AlocacaoEquipamento>(CHAVE);
      alocacoes.push(nova);
      gravarColecao(CHAVE, alocacoes);

      registrarEvento({
        empresaId: nova.empresaId,
        usuarioId,
        acao: "alocacao_realocada",
        entidade: "alocacao_equipamento",
        entidadeId: nova.id,
        dadosAntes: { alocacaoAnteriorId: encerrada.id, equipamentoAnteriorId: alocacaoAtual.equipamentoId },
        dadosDepois: { equipamentoId: novoEquipamentoId, motivo },
      });
      return nova;
    },
  };
}
