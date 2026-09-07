import type { Papel } from "@/lib/domain/entities";
import { PERMISSOES, papelTemPermissao, type Permissao } from "@/lib/rbac";
import type { Repositories } from "@/lib/repositories/types";

/**
 * Lancada quando o papel atual nao tem a permissao exigida por uma operacao
 * de repositorio. Sempre relance/mostre ao usuario (toast) em vez de
 * engolir — e o unico sinal de que uma acao foi bloqueada no nivel de
 * dados, nao so escondida na UI.
 */
export class PermissaoNegadaError extends Error {}

type RegraAcesso = {
  /** Permissao exigida para criar/atualizar/remover. */
  gerenciar: Permissao;
  /** Permissao exigida para listar/obter/buscar. Sem isso, cai para `gerenciar` (quem gerencia tambem le). */
  visualizar?: Permissao;
};

/**
 * RBAC dos Cadastros (SPEC 02), aplicado a cada chamada de repositorio —
 * nao apenas escondendo botoes na UI. Repositorios sem entrada aqui
 * (usuarios, empresas, sessao, auditoria, featureFlags) sao Foundation e
 * continuam sob as permissoes administrativas ja checadas nas proprias
 * telas de Configuracoes/Auditoria.
 */
const REGRAS: Partial<Record<keyof Repositories, RegraAcesso>> = {
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
  "listarPorCaixa",
  "obterAberto",
  "obterResumo",
]);

function protegerRepositorio<T extends object>(nome: string, alvo: T, regra: RegraAcesso, papel: Papel | null): T {
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
        const permissaoNecessaria = ehEscrita ? regra.gerenciar : regra.visualizar ?? regra.gerenciar;

        if (!papel || !papelTemPermissao(papel, permissaoNecessaria)) {
          throw new PermissaoNegadaError(
            `Seu papel nao tem permissao para ${ehEscrita ? "alterar" : "visualizar"} ${nome}.`,
          );
        }

        return (original as (...a: unknown[]) => unknown).apply(target, args);
      };
    },
  });
}

/**
 * Envolve o bundle de repositorios com a checagem de RBAC dos Cadastros.
 * Chame isto (via useRepositoriosAutorizados, em session-provider.tsx) em
 * vez de usar getRepositories() diretamente em qualquer tela que leia ou
 * escreva cadastros — assim a permissao e validada mesmo se a UI errar ao
 * esconder um botao.
 */
export function protegerRepositories(base: Repositories, papel: Papel | null): Repositories {
  const resultado = { ...base };
  (Object.keys(REGRAS) as Array<keyof Repositories>).forEach((chave) => {
    const regra = REGRAS[chave];
    if (!regra) return;
    resultado[chave] = protegerRepositorio(String(chave), base[chave], regra, papel) as never;
  });
  return resultado;
}
