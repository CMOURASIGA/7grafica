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
  throw new Error("Este navegador precisa de HTTPS para gerar o token de aprovação.");
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
  if (trabalho?.requisitoArquivo !== undefined) return trabalho.requisitoArquivo;
  if (!trabalho?.servicoId) return null;
  const servico = lerColecao<Servico>(CHAVE_SERVICOS).find((item) => item.id === trabalho.servicoId);
  return servico?.requisitoArquivo ?? null;
}

function exigirVersaoAtiva(arquivo: Arquivo): void {
  if (["substituido", "cancelado"].includes(arquivo.situacao)) throw new Error("Versão substituída/cancelada não pode ser alterada.");
}

function auditarAnalise(arquivo: Arquivo, usuarioId: string | null): void {
  registrarEvento({ empresaId: arquivo.empresaId, usuarioId, acao: "arquivo_analise_realizada", entidade: "arquivo", entidadeId: arquivo.id,
    dadosAntes: null, dadosDepois: { status: arquivo.analise?.status, regras: arquivo.analise?.regras } });
  if (arquivo.analise?.status !== "ok") registrarEvento({ empresaId: arquivo.empresaId, usuarioId, acao: "arquivo_problema_encontrado", entidade: "arquivo", entidadeId: arquivo.id,
    dadosAntes: null, dadosDepois: { regras: arquivo.analise?.regras } });
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
    async vincularTrabalho(arquivoId, trabalhoId, usuarioId) {
      const arquivo = obterOuFalhar(arquivoId);
      exigirVersaoAtiva(arquivo);
      if (arquivo.trabalhoId) throw new Error("Arquivo já vinculado a um Trabalho.");
      const trabalho = lerColecao<Trabalho>(CHAVE_TRABALHOS).find((item) => item.id === trabalhoId);
      if (!trabalho || trabalho.empresaId !== arquivo.empresaId || (arquivo.pedidoId && arquivo.pedidoId !== trabalho.pedidoId)) throw new Error("Trabalho incompatível com o arquivo.");
      const atualizado = salvar({ ...arquivo, trabalhoId, pedidoId: trabalho.pedidoId, statusAprovacaoTecnica: "pendente", aprovacaoTecnica: null,
        analise: rodarPreflight({ ...arquivo, paginas: arquivo.analise?.paginas ?? null, larguraMm: arquivo.analise?.larguraMm ?? null, alturaMm: arquivo.analise?.alturaMm ?? null }, obterRequisitoDoTrabalho(trabalhoId)) });
      registrarEvento({ empresaId: arquivo.empresaId, usuarioId, acao: "arquivo_vinculado_trabalho", entidade: "arquivo", entidadeId: arquivo.id, dadosAntes: { trabalhoId: null }, dadosDepois: { trabalhoId } });
      auditarAnalise(atualizado, usuarioId);
      return atualizado;
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
      if (!dados.nome.trim()) throw new Error("Informe o nome do arquivo.");
      if (dados.trabalhoId) {
        const trabalho = lerColecao<Trabalho>(CHAVE_TRABALHOS).find((item) => item.id === dados.trabalhoId);
        if (!trabalho || trabalho.empresaId !== dados.empresaId || (dados.pedidoId && trabalho.pedidoId !== dados.pedidoId)) throw new Error("Vínculos do arquivo incompatíveis com o Trabalho.");
      }
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
        referenciaMock: `mock://arquivos/${gerarToken()}`,
        comentarioVersao: dados.comentarioVersao?.trim() || null,
        briefing: dados.briefing?.trim() || null,
        exigeAprovacaoCliente: dados.tipo === "arte" || Boolean(dados.exigeAprovacaoCliente),
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
      auditarAnalise(novo, usuarioId);
      return novo;
    },
    async criarNovaVersao(grupoArquivoId, dados, usuarioId) {
      const versaoAnterior = lerColecao<Arquivo>(CHAVE)
        .filter((arquivo) => arquivo.grupoArquivoId === grupoArquivoId)
        .sort((a, b) => b.versao - a.versao)[0];
      if (!versaoAnterior) throw new Error(`Nenhum arquivo encontrado no grupo ${grupoArquivoId}.`);

      exigirVersaoAtiva(versaoAnterior);
      if (!dados.nome.trim()) throw new Error("Informe o nome do arquivo.");
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
        referenciaMock: `mock://arquivos/${gerarToken()}`,
        comentarioVersao: dados.comentarioVersao?.trim() || null,
        briefing: dados.briefing?.trim() || versaoAnterior.briefing || null,
        exigeAprovacaoCliente: versaoAnterior.tipo === "arte" || Boolean(versaoAnterior.exigeAprovacaoCliente || versaoAnterior.tokenAprovacaoPublica),
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
      auditarAnalise(nova, usuarioId);
      return nova;
    },
    async reanalisar(arquivoId, usuarioId = null) {
      const arquivo = obterOuFalhar(arquivoId);
      exigirVersaoAtiva(arquivo);
      const requisito = obterRequisitoDoTrabalho(arquivo.trabalhoId);
      const analise = rodarPreflight(
        { nome: arquivo.nome, extensao: arquivo.extensao, mimeType: arquivo.mimeType, tamanhoBytes: arquivo.tamanhoBytes, paginas: arquivo.analise?.paginas ?? null, larguraMm: arquivo.analise?.larguraMm ?? null, alturaMm: arquivo.analise?.alturaMm ?? null },
        requisito,
      );
      const atualizado = salvar({ ...arquivo, analise, statusAprovacaoTecnica: "pendente", aprovacaoTecnica: null });
      auditarAnalise(atualizado, usuarioId);
      return atualizado;
    },
    async aprovarTecnicamente(arquivoId, usuarioId, comentario) {
      const arquivo = obterOuFalhar(arquivoId);
      exigirVersaoAtiva(arquivo);
      if (!arquivo.analise || arquivo.analise.status === "bloqueio") {
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
      exigirVersaoAtiva(arquivo);
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
      exigirVersaoAtiva(arquivo);
      const atualizado = salvar({
        ...arquivo,
        situacao: "aguardando_aprovacao_cliente",
        tokenAprovacaoPublica: gerarToken(),
        exigeAprovacaoCliente: true,
        aprovacaoCliente: null,
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
      if (!["aprovado", "alteracao_solicitada", "rejeitado"].includes(decisao)) throw new Error("Decisão inválida.");
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
