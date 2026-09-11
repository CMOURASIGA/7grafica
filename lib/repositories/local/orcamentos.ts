import { gravarColecao, lerColecao } from "@/lib/storage/local-storage-client";
import type { Orcamento } from "@/lib/domain/entities";
import type { OrcamentoRepository } from "@/lib/repositories/types";
import { registrarEmailEnviado } from "@/lib/repositories/local/emails-enviados";

const CHAVE = "orcamentos";

function listarTudo(): Orcamento[] {
  return lerColecao<Orcamento>(CHAVE);
}

function salvarTudo(itens: Orcamento[]): void {
  gravarColecao(CHAVE, itens);
}

/** ORC-0001, ORC-0002... unico por empresa. Reutilizado entre versoes do mesmo orcamento. */
function proximoNumero(empresaId: string): string {
  const existentes = listarTudo().filter((orcamento) => orcamento.empresaId === empresaId);
  const maiorSequencia = existentes.reduce((maior, orcamento) => {
    const match = /ORC-(\d+)/.exec(orcamento.numero);
    const sequencia = match ? Number(match[1]) : 0;
    return Math.max(maior, sequencia);
  }, 0);
  return `ORC-${String(maiorSequencia + 1).padStart(4, "0")}`;
}

function gerarToken(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Fallback (ambientes sem crypto.randomUUID): ainda nao sequencial.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function criarOrcamentoRepositoryLocal(): OrcamentoRepository {
  return {
    async listar(empresaId) {
      return listarTudo().filter((orcamento) => orcamento.empresaId === empresaId);
    },
    async obter(id) {
      return listarTudo().find((orcamento) => orcamento.id === id) ?? null;
    },
    async criar(dados) {
      const novo: Orcamento = {
        ...dados,
        id: `orc-${Math.random().toString(36).slice(2, 10)}`,
        numero: proximoNumero(dados.empresaId),
        orcamentoOrigemId: "", // preenchido logo abaixo com o proprio id (V1 aponta pra si mesma)
        tokenAcompanhamento: gerarToken(),
        status: "rascunho",
        justificativaCliente: null,
        motivoRejeicao: null,
        enviadoEm: null,
        decididoEm: null,
        criadoEm: new Date().toISOString(),
      };
      novo.orcamentoOrigemId = novo.id;
      const itens = listarTudo();
      itens.push(novo);
      salvarTudo(itens);
      return novo;
    },
    async atualizar(id, dados) {
      const itens = listarTudo();
      const indice = itens.findIndex((orcamento) => orcamento.id === id);
      if (indice === -1) throw new Error(`Orcamento ${id} nao encontrado.`);
      const atualizado = { ...itens[indice], ...dados };
      itens[indice] = atualizado;
      salvarTudo(itens);
      return atualizado;
    },
    async remover(id) {
      salvarTudo(listarTudo().filter((orcamento) => orcamento.id !== id));
    },
    async buscarPorToken(token) {
      return listarTudo().find((orcamento) => orcamento.tokenAcompanhamento === token) ?? null;
    },
    async listarPorSolicitacao(solicitacaoId) {
      return listarTudo().filter((orcamento) => orcamento.solicitacaoId === solicitacaoId);
    },
    async enviarPorEmail(orcamentoId, destinatario) {
      const itens = listarTudo();
      const indice = itens.findIndex((orcamento) => orcamento.id === orcamentoId);
      if (indice === -1) throw new Error(`Orcamento ${orcamentoId} nao encontrado.`);

      const agora = new Date().toISOString();
      const atualizado: Orcamento = { ...itens[indice], status: "enviado", enviadoEm: agora };
      itens[indice] = atualizado;
      salvarTudo(itens);

      const link = `/portal/orcamento/${atualizado.tokenAcompanhamento}`;
      registrarEmailEnviado({
        empresaId: atualizado.empresaId,
        orcamentoId: atualizado.id,
        destinatario,
        assunto: `Orcamento ${atualizado.numero} (V${atualizado.versao}) — 7Grafica`,
        corpo: `Seu orcamento esta pronto. Acesse o link para aprovar, pedir ajuste ou recusar: ${link}`,
        link,
        enviadoEm: agora,
      });

      return { orcamento: atualizado, link };
    },
    async criarNovaVersao(orcamentoAnteriorId) {
      const anterior = listarTudo().find((orcamento) => orcamento.id === orcamentoAnteriorId);
      if (!anterior) throw new Error(`Orcamento ${orcamentoAnteriorId} nao encontrado.`);

      const nova: Orcamento = {
        ...anterior,
        id: `orc-${Math.random().toString(36).slice(2, 10)}`,
        versao: anterior.versao + 1,
        numero: anterior.numero,
        orcamentoOrigemId: anterior.orcamentoOrigemId,
        itens: anterior.itens.map((item) => ({ ...item })),
        status: "rascunho",
        tokenAcompanhamento: gerarToken(),
        justificativaCliente: null,
        motivoRejeicao: null,
        enviadoEm: null,
        decididoEm: null,
        criadoEm: new Date().toISOString(),
      };

      const itens = listarTudo();
      itens.push(nova);
      salvarTudo(itens);
      return nova;
    },
    async registrarDecisaoPublica(token, decisao, detalhe) {
      const itens = listarTudo();
      const indice = itens.findIndex((orcamento) => orcamento.tokenAcompanhamento === token);
      if (indice === -1) throw new Error("Orcamento nao encontrado.");
      const atual = itens[indice];
      if (atual.status !== "enviado") {
        throw new Error("Este orcamento nao esta mais aguardando uma decisao.");
      }

      const decididoEm = new Date().toISOString();
      const atualizado: Orcamento = {
        ...atual,
        status: decisao,
        decididoEm,
        justificativaCliente: detalhe?.justificativa ?? null,
        motivoRejeicao: decisao === "rejeitado" ? detalhe?.motivo ?? "outro" : null,
      };
      itens[indice] = atualizado;
      salvarTudo(itens);
      return atualizado;
    },
  };
}
