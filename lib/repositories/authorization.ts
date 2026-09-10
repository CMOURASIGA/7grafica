import { motivoArquivoInvalido } from "@/lib/domain/liberacao-arquivo";
import type { Arquivo, Papel } from "@/lib/domain/entities";
import { PERMISSOES, papelTemPermissao, type Permissao } from "@/lib/rbac";
import type { Repositories } from "@/lib/repositories/types";

/**
 * Lancada quando o papel atual nao tem a permissao exigida por uma operacao
 * de repositorio. Sempre relance/mostre ao usuario (toast) em vez de
 * engolir — e o unico sinal de que uma acao foi bloqueada no nivel de
 * dados, nao so escondida na UI.
 */
export class PermissaoNegadaError extends Error {}

type PermitirSeContexto = {
  papel: Papel;
  usuarioId: string | null;
  metodo: string;
  args: unknown[];
  /** Bundle SEM protecao de RBAC — uso restrito a leituras auxiliares (ex.: checar dono do registro), nunca reexposto a UI. */
  baseRepositories: Repositories;
};

type RegraAcesso = {
  /** Permissao exigida para criar/atualizar/remover. */
  gerenciar: Permissao;
  /** Permissao exigida para listar/obter/buscar. Sem isso, cai para `gerenciar` (quem gerencia tambem le). */
  visualizar?: Permissao;
  /**
   * Excecao pontual por registro (ex.: Operador so movimenta o Trabalho do
   * qual e responsavel). So e consultada quando a checagem por papel acima
   * falhou — nunca substitui a regra geral, apenas abre uma excecao estreita
   * e auditavel.
   */
  permitirSe?: (contexto: PermitirSeContexto) => Promise<boolean> | boolean;
};

/**
 * RBAC dos Cadastros (SPEC 02), aplicado a cada chamada de repositorio —
 * nao apenas escondendo botoes na UI. Repositorios sem entrada aqui
 * (usuarios, empresas, sessao, auditoria, featureFlags) sao Foundation e
 * continuam sob as permissoes administrativas ja checadas nas proprias
 * telas de Configuracoes/Auditoria.
 */
const REGRAS: Partial<Record<keyof Repositories, RegraAcesso>> = {
  entregas: { gerenciar: PERMISSOES.ENTREGA_GERENCIAR, visualizar: PERMISSOES.ENTREGA_CONSULTAR },
  historicoPedido: { gerenciar: PERMISSOES.ENTREGA_CONSULTAR, visualizar: PERMISSOES.ENTREGA_CONSULTAR },
  portalClienteGestao: { gerenciar: PERMISSOES.PORTAL_CLIENTE_GERENCIAR },
  financeiro: { gerenciar: PERMISSOES.FINANCEIRO_GERENCIAR, visualizar: PERMISSOES.FINANCEIRO_CONSULTAR },
  compras: { gerenciar: PERMISSOES.COMPRAS_GERENCIAR },
  estoque: {
    gerenciar: PERMISSOES.ESTOQUE_GERENCIAR, visualizar: PERMISSOES.ESTOQUE_CONSULTAR,
    permitirSe: async ({ papel, usuarioId, metodo, args, baseRepositories }) => {
      if (papel !== "operador" || !usuarioId || metodo !== "movimentar") return false;
      const dados = args[1] as { trabalhoId?: string; tipo?: string };
      if (!dados?.trabalhoId || !["consumo", "perda"].includes(dados.tipo ?? "")) return false;
      const trabalho = await baseRepositories.trabalhos.obter(dados.trabalhoId);
      return trabalho?.responsavelUsuarioId === usuarioId && trabalho.empresaId === args[0];
    },
  },
  clientes: { gerenciar: PERMISSOES.CLIENTES_GERENCIAR },
  contatos: { gerenciar: PERMISSOES.CLIENTES_GERENCIAR },
  emailsContato: { gerenciar: PERMISSOES.CLIENTES_GERENCIAR },

  fornecedores: { gerenciar: PERMISSOES.CADASTROS_GERENCIAR, visualizar: PERMISSOES.CADASTROS_COMERCIAIS_VISUALIZAR },
  formasPagamento: { gerenciar: PERMISSOES.CADASTROS_GERENCIAR, visualizar: PERMISSOES.CADASTROS_COMERCIAIS_VISUALIZAR },

  categoriasServico: { gerenciar: PERMISSOES.CADASTROS_GERENCIAR, visualizar: PERMISSOES.CADASTROS_OPERACIONAIS_VISUALIZAR },
  servicos: { gerenciar: PERMISSOES.CADASTROS_GERENCIAR, visualizar: PERMISSOES.CADASTROS_OPERACIONAIS_VISUALIZAR },
  unidadesMedida: { gerenciar: PERMISSOES.CADASTROS_GERENCIAR, visualizar: PERMISSOES.CADASTROS_OPERACIONAIS_VISUALIZAR },
  materiais: { gerenciar: PERMISSOES.CADASTROS_GERENCIAR, visualizar: PERMISSOES.CADASTROS_OPERACIONAIS_VISUALIZAR },
  conversoesUnidade: { gerenciar: PERMISSOES.CADASTROS_GERENCIAR, visualizar: PERMISSOES.CADASTROS_OPERACIONAIS_VISUALIZAR },
  equipamentos: { gerenciar: PERMISSOES.CADASTROS_GERENCIAR, visualizar: PERMISSOES.CADASTROS_OPERACIONAIS_VISUALIZAR },
  capacidadesEquipamento: { gerenciar: PERMISSOES.CADASTROS_GERENCIAR, visualizar: PERMISSOES.CADASTROS_OPERACIONAIS_VISUALIZAR },
  workflows: { gerenciar: PERMISSOES.CADASTROS_GERENCIAR, visualizar: PERMISSOES.CADASTROS_OPERACIONAIS_VISUALIZAR },
  etapasWorkflow: { gerenciar: PERMISSOES.CADASTROS_GERENCIAR, visualizar: PERMISSOES.CADASTROS_OPERACIONAIS_VISUALIZAR },

  // SPEC 03 — Entrada por E-mail e Orcamentos. Um unico nivel (como
  // clientes): quem atende (admin/gerente/atendente) le e escreve; operador
  // nao acessa nada disso (nao e "necessario a operacao").
  emailsRecebidos: { gerenciar: PERMISSOES.SOLICITACOES_GERENCIAR },
  solicitacoes: { gerenciar: PERMISSOES.SOLICITACOES_GERENCIAR },
  orcamentos: { gerenciar: PERMISSOES.SOLICITACOES_GERENCIAR },
  emailsEnviados: { gerenciar: PERMISSOES.SOLICITACOES_GERENCIAR },
  pedidos: { gerenciar: PERMISSOES.SOLICITACOES_GERENCIAR },

  // SPEC 04 — Balcao, PDV e Caixa. Caixa pode ser lido por quem opera o PDV
  // (precisa saber se ha caixa aberto), mas so Admin/Gerente abrem, fecham
  // ou lancam movimentos manuais. Recebimentos seguem o mesmo nivel unico
  // do PDV — operador nao encosta.
  caixa: { gerenciar: PERMISSOES.CAIXA_GERENCIAR, visualizar: PERMISSOES.PDV_OPERAR },
  movimentosCaixaManual: { gerenciar: PERMISSOES.CAIXA_GERENCIAR },
  recebimentos: { gerenciar: PERMISSOES.PDV_OPERAR },

  // SPEC 05 — Pedidos, Trabalhos e Kanban. Gerar Trabalho, atribuir
  // responsavel e cancelar sao exclusivos de PRODUCAO_GERENCIAR (admin/
  // gerente). Todos os papeis leem (PRODUCAO_CONSULTAR). O Operador, que na
  // matriz de papeis so tem consulta, ganha aqui uma excecao por registro:
  // mover/concluir/pausar/retomar/registrarPendencia sao permitidos quando
  // ele proprio e o responsavel pelo Trabalho.
  trabalhos: {
    gerenciar: PERMISSOES.PRODUCAO_GERENCIAR,
    visualizar: PERMISSOES.PRODUCAO_CONSULTAR,
    permitirSe: async ({ papel, usuarioId, metodo, args, baseRepositories }) => {
      if (papel !== "operador" || !usuarioId) return false;
      const METODOS_DO_RESPONSAVEL = new Set(["mover", "concluir", "pausar", "retomar", "registrarPendencia"]);
      if (!METODOS_DO_RESPONSAVEL.has(metodo)) return false;
      const trabalhoId = args[0];
      if (typeof trabalhoId !== "string") return false;
      const trabalho = await baseRepositories.trabalhos.obter(trabalhoId);
      return trabalho?.responsavelUsuarioId === usuarioId;
    },
  },

  // SPEC 06 — Producao e Equipamentos. Criar alocacao e realocar exigem
  // PRODUCAO_GERENCIAR (admin/gerente — "gerenciamento de... alocacao e
  // realocacao"). Todos os papeis leem/avaliam compatibilidade
  // (PRODUCAO_CONSULTAR). Operador ganha a mesma excecao por registro do
  // Trabalho: executar (preparar/iniciar/pausar/retomar/concluir) a
  // alocacao cujo Trabalho e o responsavel — nunca criar nem realocar.
  alocacoesEquipamento: {
    gerenciar: PERMISSOES.PRODUCAO_GERENCIAR,
    visualizar: PERMISSOES.PRODUCAO_CONSULTAR,
    permitirSe: async ({ papel, usuarioId, metodo, args, baseRepositories }) => {
      if (papel !== "operador" || !usuarioId) return false;
      const METODOS_DO_RESPONSAVEL = new Set(["iniciarPreparacao", "iniciar", "pausar", "retomar", "concluir"]);
      if (!METODOS_DO_RESPONSAVEL.has(metodo)) return false;
      const alocacaoId = args[0];
      if (typeof alocacaoId !== "string") return false;
      const alocacao = await baseRepositories.alocacoesEquipamento.obter(alocacaoId);
      if (!alocacao) return false;
      const trabalho = await baseRepositories.trabalhos.obter(alocacao.trabalhoId);
      return trabalho?.responsavelUsuarioId === usuarioId;
    },
  },

  // SPEC 07 — Arquivos e Arte. "Gerenciamento completo" (aprovar/rejeitar
  // tecnicamente, enviar para aprovacao do cliente, nova versao) e exclusivo
  // de ARQUIVOS_GERENCIAR (admin/gerente). Todos os papeis leem
  // (ARQUIVOS_CONSULTAR). Atendente ganha uma excecao pontual — "anexar/
  // receber arquivos e acompanhar aprovacao" — mas NUNCA aprova/rejeita
  // tecnicamente. A liberacao para producao vive em `trabalhos` (regra
  // acima), sob PRODUCAO_GERENCIAR — nunca aberta ao Atendente.
  arquivos: {
    gerenciar: PERMISSOES.ARQUIVOS_GERENCIAR,
    visualizar: PERMISSOES.ARQUIVOS_CONSULTAR,
    permitirSe: ({ papel, metodo }) => {
      if (papel !== "atendente") return false;
      const METODOS_DO_ATENDENTE = new Set(["receber", "criarNovaVersao", "enviarParaAprovacaoCliente", "vincularTrabalho"]);
      return METODOS_DO_ATENDENTE.has(metodo);
    },
  },
};

/**
 * Metodos de leitura conhecidos — tudo o que NAO estiver nesta lista e
 * tratado como escrita (exige "gerenciar"). Fail-safe de proposito: um
 * metodo novo de repositorio (ex.: enviarPorEmail, criarNovaVersao,
 * registrarDecisaoPublica, criarAPartirDeOrcamentoAprovado) e bloqueado por
 * padrao ate ser explicitamente listado aqui como leitura — nunca o
 * contrario.
 */
const METODOS_LEITURA = new Set([
  "listar",
  "listarMovimentos",
  "listarCustosPagina",
  "listarRecebimentos",
  "listarContasPagar",
  "listarContasReceber",
  "listarDespesas",
  "listarConvites",
  "listarTokensPedido",
  "obterPorPedido",
  "obterResultadoPedido",
  "obterResumo",
  "obter",
  "buscarPorEmail",
  "buscarPorDocumento",
  "buscarPorToken",
  "buscarRapido",
  "listarPorCliente",
  "listarPorContato",
  "listarPorMaterial",
  "listarPorEquipamento",
  "listarPorWorkflow",
  "listarPorSolicitacao",
  "listarPorOrcamento",
  "listarPorPedido",
  "listarPorTrabalho",
  "listarPorCaixa",
  "obterAberto",
  "obterResumo",
  "avaliarCompatibilidade",
  "listarVersoes",
  "buscarPorTokenAprovacaoPublica",
]);

function protegerRepositorio<T extends object>(
  nome: string,
  alvo: T,
  regra: RegraAcesso,
  papel: Papel | null,
  usuarioId: string | null,
  baseRepositories: Repositories,
  empresaId: string | null,
): T {
  return new Proxy(alvo, {
    get(target, propriedade, receiver) {
      const original = Reflect.get(target, propriedade, receiver);
      if (typeof original !== "function") return original;

      // Assincrono de proposito: todo metodo de repositorio ja e async (ver
      // lib/repositories/types.ts), e lancar dentro de uma função async
      // vira uma Promise rejeitada em vez de uma excecao sincrona — assim
      // `await repositories.x.metodo()` e `.catch()`/`.rejects` no cliente
      // funcionam do mesmo jeito estejam a checagem de permissao presente
      // ou nao.
      return async (...args: unknown[]) => {
        const metodo = String(propriedade);
        const ehEscrita = !METODOS_LEITURA.has(metodo);
        if (nome === "estoque" || nome === "compras" || nome === "financeiro" || nome === "portalClienteGestao" || nome === "entregas" || nome === "historicoPedido") {
          if (empresaId && args[0] !== empresaId) throw new PermissaoNegadaError("Empresa diferente da sessão ativa.");
          if (ehEscrita && usuarioId) args[2] = usuarioId;
        }
        const permissaoNecessaria = ehEscrita ? regra.gerenciar : regra.visualizar ?? regra.gerenciar;

        if (!papel || !papelTemPermissao(papel, permissaoNecessaria)) {
          const excecaoConcedida =
            papel && regra.permitirSe
              ? await regra.permitirSe({ papel, usuarioId, metodo, args, baseRepositories })
              : false;
          if (!excecaoConcedida) {
            throw new PermissaoNegadaError(
              `Seu papel nao tem permissao para ${ehEscrita ? "alterar" : "visualizar"} ${nome}.`,
            );
          }
        }

        const resultado = await (original as (...a: unknown[]) => unknown).apply(target, args);
        if (nome === "arquivos" && papel === "operador" && !ehEscrita) {
          const podeConsultar = async (arquivo: Arquivo): Promise<boolean> => {
            if (!usuarioId || !arquivo.trabalhoId) return false;
            const trabalho = await baseRepositories.trabalhos.obter(arquivo.trabalhoId);
            return Boolean(trabalho && trabalho.responsavelUsuarioId === usuarioId && trabalho.arquivoLiberadoId === arquivo.id && !motivoArquivoInvalido(trabalho, arquivo));
          };
          if (Array.isArray(resultado)) {
            const permitidos = await Promise.all(resultado.map((arquivo: Arquivo) => podeConsultar(arquivo)));
            return resultado.filter((_, index) => permitidos[index]);
          }
          return resultado && await podeConsultar(resultado as Arquivo) ? resultado : null;
        }
        return resultado;
      };
    },
  });
}

/**
 * Envolve o bundle de repositorios com a checagem de RBAC dos Cadastros.
 * Chame isto (via useRepositoriosAutorizados, em session-provider.tsx) em
 * vez de usar getRepositories() diretamente em qualquer tela que leia ou
 * escreva cadastros — assim a permissao e validada mesmo se a UI errar ao
 * esconder um botao. `usuarioId` alimenta excecoes por registro (ver
 * `permitirSe` em REGRAS, ex.: Operador dono do Trabalho).
 */
export function protegerRepositories(base: Repositories, papel: Papel | null, usuarioId: string | null = null, empresaId: string | null = null): Repositories {
  const resultado = { ...base };
  (Object.keys(REGRAS) as Array<keyof Repositories>).forEach((chave) => {
    const regra = REGRAS[chave];
    if (!regra) return;
    resultado[chave] = protegerRepositorio(String(chave), base[chave], regra, papel, usuarioId, base, empresaId) as never;
  });
  return resultado;
}
