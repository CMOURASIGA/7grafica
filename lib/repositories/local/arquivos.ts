import { gerarId, gravarColecao, lerColecao } from "@/lib/storage/local-storage-client";
import { rodarPreflight } from "@/lib/domain/preflight";
import type { Arquivo, EventoAuditoria, Servico, Trabalho } from "@/lib/domain/entities";
import type { ArquivoRepository } from "@/lib/repositories/types";

const CHAVE = "arquivos";
const CHAVE_TRABALHOS = "trabalhos";
const CHAVE_SERVICOS = "servicos";
const CHAVE_AUDITORIA = "eventos_auditoria";

function gerarToken(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}-${Math.random().toString(36).slice(2, 12)}`;
}

function registrarEvento(evento: Omit<EventoAuditoria, "id" | "criadoEm">): void {
  const eventos = lerColecao<EventoAuditoria>(CHAVE_AUDITORIA);
  eventos.push({ ...evento, id: gerarId("evt"), criadoEm: new Date().toISOString() });
  gravarColecao(CHAVE_AUDITORIA, eventos);
}

function obterOuFalhar(id: string): Arquivo {
  const arquivo = lerColecao<Arquivo>(CHAVE).find((item) => item.id === id);
  if (!arquivo) throw new Error(`Arquivo ${id} nao encontrado.`);
  return arquivo;
}

function salvar(atualizado: Arquivo): Arquivo {
  const arquivos = lerColecao<Arquivo>(CHAVE);
  const indice = arquivos.findIndex((item) => item.id === atualizado.id);
  if (indice === -1) throw new Error(`Arquivo ${atualizado.id} nao encontrado.`);
  arquivos[indice] = atualizado;
  gravarColecao(CHAVE, arquivos);
  return atualizado;
}

/** Requisito do Servico do Trabalho dono do arquivo, se houver — usado pelo preflight. */
function obterRequisitoDoTrabalho(trabalhoId: string | null) {
  if (!trabalhoId) return null;
  const trabalho = lerColecao<Trabalho>(CHAVE_TRABALHOS).find((item) => item.id === trabalhoId);
  if (!trabalho?.servicoId) return null;
  const servico = lerColecao<Servico>(CHAVE_SERVICOS).find((item) => item.id === trabalho.servicoId);
  return servico?.requisitoArquivo ?? null;
}

export function criarArquivoRepositoryLocal(): ArquivoRepository {
  return {
    async listar(empresaId) {
      return lerColecao<Arquivo>(CHAVE).filter((arquivo) => arquivo.empresaId === empresaId);
    },
    async obter(id) {
      return lerColecao<Arquivo>(CHAVE).find((arquivo) => arquivo.id === id) ?? null;
    },
    async listarPorTrabalho(trabalhoId) {
      return lerColecao<Arquivo>(CHAVE).filter((arquivo) => arquivo.trabalhoId === trabalhoId);
    },
    async listarPorPedido(pedidoId) {
      return lerColecao<Arquivo>(CHAVE).filter((arquivo) => arquivo.pedidoId === pedidoId);
    },
    async listarPorSolicitacao(solicitacaoId) {
      return lerColecao<Arquivo>(CHAVE).filter((arquivo) => arquivo.solicitacaoId === solicitacaoId);
    },
    async listarVersoes(grupoArquivoId) {
      return lerColecao<Arquivo>(CHAVE)
        .filter((arquivo) => arquivo.grupoArquivoId === grupoArquivoId)
        .sort((a, b) => a.versao - b.versao);
    },
    async buscarPorTokenAprovacaoPublica(token) {
      return lerColecao<Arquivo>(CHAVE).find((arquivo) => arquivo.tokenAprovacaoPublica === token) ?? null;
    },
    async receber(dados, usuarioId) {
      const requisito = obterRequisitoDoTrabalho(dados.trabalhoId);
      const analise = rodarPreflight(dados, requisito);
      const novo: Arquivo = {
        id: gerarId("arq"),
        empresaId: dados.empresaId,
        solicitacaoId: dados.solicitacaoId,
        pedidoId: dados.pedidoId,
        trabalhoId: dados.trabalhoId,
        tipo: dados.tipo,
        nome: dados.nome,
        extensao: dados.extensao,
        mimeType: dados.mimeType,
        tamanhoBytes: dados.tamanhoBytes,
        origem: dados.origem,
        grupoArquivoId: gerarId("grp"),
        versao: 1,
        versaoAnteriorId: null,
        enviadoPorUsuarioId: dados.enviadoPorUsuarioId,
        enviadoEm: new Date().toISOString(),
        situacao: dados.tipo === "arte" && dados.origem === "upload_interno" ? "em_criacao" : "recebido",
        analise,
        statusAprovacaoTecnica: "pendente",
        aprovacaoTecnica: null,
        aprovacaoCliente: null,
        tokenAprovacaoPublica: null,
        criadoEm: new Date().toISOString(),
      };
      const arquivos = lerColecao<Arquivo>(CHAVE);
      arquivos.push(novo);
      gravarColecao(CHAVE, arquivos);

      registrarEvento({
        empresaId: novo.empresaId,
        usuarioId,
        acao: novo.situacao === "em_criacao" ? "arte_criada" : "arquivo_recebido",
        entidade: "arquivo",
        entidadeId: novo.id,
        dadosAntes: null,
        dadosDepois: { nome: novo.nome, tipo: novo.tipo, versao: novo.versao, statusPreflight: analise.status },
      });
      if (analise.regras.length > 0) {
        registrarEvento({
          empresaId: novo.empresaId,
          usuarioId,
          acao: "arquivo_analise_realizada",
          entidade: "arquivo",
          entidadeId: novo.id,
          dadosAntes: null,
          dadosDepois: { status: analise.status, regras: analise.regras },
        });
      }
      return novo;
    },
    async criarNovaVersao(grupoArquivoId, dados, usuarioId) {
      const versaoAnterior = lerColecao<Arquivo>(CHAVE)
        .filter((arquivo) => arquivo.grupoArquivoId === grupoArquivoId)
        .sort((a, b) => b.versao - a.versao)[0];
      if (!versaoAnterior) throw new Error(`Nenhum arquivo encontrado no grupo ${grupoArquivoId}.`);

      const requisito = obterRequisitoDoTrabalho(versaoAnterior.trabalhoId);
      const analise = rodarPreflight(dados, requisito);
      const nova: Arquivo = {
        id: gerarId("arq"),
        empresaId: versaoAnterior.empresaId,
        solicitacaoId: versaoAnterior.solicitacaoId,
        pedidoId: versaoAnterior.pedidoId,
        trabalhoId: versaoAnterior.trabalhoId,
        tipo: versaoAnterior.tipo,
        nome: dados.nome,
        extensao: dados.extensao,
        mimeType: dados.mimeType,
        tamanhoBytes: dados.tamanhoBytes,
        origem: versaoAnterior.origem,
        grupoArquivoId,
        versao: versaoAnterior.versao + 1,
        versaoAnteriorId: versaoAnterior.id,
        enviadoPorUsuarioId: usuarioId,
        enviadoEm: new Date().toISOString(),
        // Nasce sempre "recebido" (pendente de nova analise/aprovacao) — nunca herda decisao da versao anterior.
        situacao: "recebido",
        analise,
        statusAprovacaoTecnica: "pendente",
        aprovacaoTecnica: null,
        aprovacaoCliente: null,
        tokenAprovacaoPublica: null,
        criadoEm: new Date().toISOString(),
      };

      // Nunca sobrescreve: a versao anterior fica marcada "substituido", preservada no historico.
      salvar({ ...versaoAnterior, situacao: "substituido" });

      const arquivos = lerColecao<Arquivo>(CHAVE);
      arquivos.push(nova);
      gravarColecao(CHAVE, arquivos);

      // Se a versao substituida era a liberada para producao de algum Trabalho,
      // essa liberacao NAO segue automaticamente para a nova versao — precisa
      // de uma nova decisao explicita (nunca "o ultimo arquivo enviado").
      registrarEvento({
        empresaId: nova.empresaId,
        usuarioId,
        acao: "arquivo_nova_versao_recebida",
        entidade: "arquivo",
        entidadeId: nova.id,
        dadosAntes: { versaoAnteriorId: versaoAnterior.id, versaoAnterior: versaoAnterior.versao },
        dadosDepois: { versao: nova.versao, statusPreflight: analise.status },
      });
      return nova;
    },
    async reanalisar(arquivoId) {
      const arquivo = obterOuFalhar(arquivoId);
      const requisito = obterRequisitoDoTrabalho(arquivo.trabalhoId);
      const analise = rodarPreflight(
        { nome: arquivo.nome, extensao: arquivo.extensao, mimeType: arquivo.mimeType, tamanhoBytes: arquivo.tamanhoBytes, paginas: arquivo.analise?.paginas ?? null, larguraMm: arquivo.analise?.larguraMm ?? null, alturaMm: arquivo.analise?.alturaMm ?? null },
        requisito,
      );
      return salvar({ ...arquivo, analise });
    },
    async aprovarTecnicamente(arquivoId, usuarioId, comentario) {
      const arquivo = obterOuFalhar(arquivoId);
      if (arquivo.analise?.status === "bloqueio") {
        throw new Error("Não é possível aprovar tecnicamente um arquivo com bloqueio no preflight — receba uma nova versão.");
      }
      const atualizado = salvar({
        ...arquivo,
        statusAprovacaoTecnica: "aprovado",
        aprovacaoTecnica: { usuarioId, data: new Date().toISOString(), comentario },
      });
      registrarEvento({
        empresaId: atualizado.empresaId,
        usuarioId,
        acao: "arquivo_aprovado_tecnicamente",
        entidade: "arquivo",
        entidadeId: atualizado.id,
        dadosAntes: { statusAprovacaoTecnica: arquivo.statusAprovacaoTecnica },
        dadosDepois: { statusAprovacaoTecnica: "aprovado", comentario },
      });
      return atualizado;
    },
    async rejeitarTecnicamente(arquivoId, usuarioId, comentario) {
      const arquivo = obterOuFalhar(arquivoId);
      const atualizado = salvar({
        ...arquivo,
        statusAprovacaoTecnica: "rejeitado",
        aprovacaoTecnica: { usuarioId, data: new Date().toISOString(), comentario },
      });
      registrarEvento({
        empresaId: atualizado.empresaId,
        usuarioId,
        acao: "arquivo_rejeitado_tecnicamente",
        entidade: "arquivo",
        entidadeId: atualizado.id,
        dadosAntes: { statusAprovacaoTecnica: arquivo.statusAprovacaoTecnica },
        dadosDepois: { statusAprovacaoTecnica: "rejeitado", comentario },
      });
      return atualizado;
    },
    async enviarParaAprovacaoCliente(arquivoId, usuarioId) {
      const arquivo = obterOuFalhar(arquivoId);
      const atualizado = salvar({
        ...arquivo,
        situacao: "aguardando_aprovacao_cliente",
        tokenAprovacaoPublica: arquivo.tokenAprovacaoPublica ?? gerarToken(),
      });
      registrarEvento({
        empresaId: atualizado.empresaId,
        usuarioId,
        acao: "arquivo_enviado_para_aprovacao",
        entidade: "arquivo",
        entidadeId: atualizado.id,
        dadosAntes: { situacao: arquivo.situacao },
        dadosDepois: { situacao: "aguardando_aprovacao_cliente" },
      });
      return atualizado;
    },
    async registrarDecisaoPublicaCliente(token, decisao, comentario) {
      const arquivo = lerColecao<Arquivo>(CHAVE).find((item) => item.tokenAprovacaoPublica === token);
      if (!arquivo) throw new Error("Link inválido ou expirado.");
      if (arquivo.situacao !== "aguardando_aprovacao_cliente") {
        throw new Error("Este arquivo não está aguardando decisão do cliente.");
      }
      const novaSituacao =
        decisao === "aprovado" ? "aprovado_cliente" : decisao === "alteracao_solicitada" ? "alteracao_solicitada" : "rejeitado_cliente";
      const atualizado = salvar({
        ...arquivo,
        situacao: novaSituacao,
        aprovacaoCliente: { data: new Date().toISOString(), comentario, aprovado: decisao === "aprovado" },
      });
      registrarEvento({
        empresaId: atualizado.empresaId,
        usuarioId: null,
        acao:
          decisao === "aprovado" ? "arquivo_aprovado_pelo_cliente" : decisao === "alteracao_solicitada" ? "arquivo_alteracao_solicitada" : "arquivo_rejeitado_pelo_cliente",
        entidade: "arquivo",
        entidadeId: atualizado.id,
        dadosAntes: { situacao: arquivo.situacao },
        dadosDepois: { situacao: novaSituacao, comentario },
      });
      return atualizado;
    },
  };
}
