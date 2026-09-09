import type { Papel } from "@/lib/domain/entities";

// Matriz de permissoes. Fases futuras (specs 03+) adicionam permissoes de
// dominio (pedidos, estoque, financeiro etc.) sem alterar esta estrutura —
// cada permissao nova entra como uma nova chave abaixo e, no banco (quando
// o Supabase definitivo existir), uma nova linha em papel_permissoes.
export const PERMISSOES = {
  ESTOQUE_GERENCIAR: "estoque_gerenciar",
  ESTOQUE_CONSULTAR: "estoque_consultar",
  COMPRAS_GERENCIAR: "compras_gerenciar",
  // Foundation — administracao da empresa/conta.
  GERENCIAR_EMPRESA: "gerenciar_empresa",
  GERENCIAR_USUARIOS: "gerenciar_usuarios",
  GERENCIAR_WHITELABEL: "gerenciar_whitelabel",
  GERENCIAR_FEATURE_FLAGS: "gerenciar_feature_flags",
  VER_AUDITORIA: "ver_auditoria",

  // SPEC 02 — Cadastros mestres.
  /** CRUD completo de Clientes, Contatos e E-mails. */
  CLIENTES_GERENCIAR: "clientes_gerenciar",
  /** CRUD dos demais cadastros mestres (fornecedores, servicos, materiais, equipamentos, formas de pagamento, workflows). */
  CADASTROS_GERENCIAR: "cadastros_gerenciar",
  /** Leitura de cadastros comerciais/administrativos (fornecedores, formas de pagamento). */
  CADASTROS_COMERCIAIS_VISUALIZAR: "cadastros_comerciais_visualizar",
  /** Leitura de cadastros operacionais (servicos, materiais, equipamentos, workflows) — o minimo que a producao precisa ver. */
  CADASTROS_OPERACIONAIS_VISUALIZAR: "cadastros_operacionais_visualizar",

  // SPEC 03 — Entrada por E-mail e Orcamentos.
  /** CRUD de e-mails recebidos, solicitacoes, orcamentos e leitura de pedidos — atendimento comercial, nao "operacao". */
  SOLICITACOES_GERENCIAR: "solicitacoes_gerenciar",

  // SPEC 04 — Balcao, PDV e Caixa.
  /** Atendimento de balcao: identificar/cadastrar cliente, montar pedido, registrar recebimentos. */
  PDV_OPERAR: "pdv_operar",
  /** Abrir/fechar caixa e lancar entradas/saidas manuais autorizadas — nao inclui recebimentos do PDV (ver PDV_OPERAR). */
  CAIXA_GERENCIAR: "caixa_gerenciar",

  // SPEC 05 — Pedidos, Trabalhos e Kanban.
  /** Gerar Trabalhos, atribuir responsavel, mover/pausar/retomar/cancelar qualquer Trabalho da empresa. */
  PRODUCAO_GERENCIAR: "producao_gerenciar",
  /** Ler Trabalhos/Kanban. Operador tambem executa transicoes, mas so nos Trabalhos em que e responsavel (ver lib/repositories/authorization.ts). */
  PRODUCAO_CONSULTAR: "producao_consultar",

  // SPEC 07 — Arquivos e Arte.
  /** Gerenciamento completo de arquivos: aprovacao tecnica, liberacao para producao, enviar para aprovacao do cliente, nova versao. */
  ARQUIVOS_GERENCIAR: "arquivos_gerenciar",
  /** Ler arquivos/versoes/aprovacoes. Atendente tambem anexa/recebe arquivos e nova versao (excecao pontual, ver lib/repositories/authorization.ts). */
  ARQUIVOS_CONSULTAR: "arquivos_consultar",
} as const;

export type Permissao = (typeof PERMISSOES)[keyof typeof PERMISSOES];

/**
 * Espelha a tabela papel_permissoes (fonte de verdade fica no banco, aplicada
 * via RLS/RPC, quando o Supabase definitivo existir). Mantido aqui tambem
 * para permitir esconder/desabilitar itens de UI no cliente sem esperar um
 * round-trip — mas a UI nunca e a unica linha de defesa: ver
 * lib/repositories/authorization.ts, que aplica esta mesma matriz a cada
 * chamada de repositorio.
 *
 * Matriz de Cadastros (SPEC 02), definida pelo produto:
 * - Admin: administracao completa.
 * - Gerente: administracao operacional dos cadastros, sem alterar
 *   papeis/permissoes administrativas (GERENCIAR_EMPRESA/WHITELABEL/FLAGS
 *   continuam exclusivos do admin).
 * - Atendente: CRUD de Clientes/Contatos e leitura dos demais cadastros.
 * - Operador: leitura dos cadastros necessarios a operacao (servicos,
 *   materiais, equipamentos, workflows) — sem acesso a clientes ou a
 *   cadastros comerciais (fornecedores, formas de pagamento).
 *
 * Matriz de Balcao/PDV/Caixa (SPEC 04):
 * - Admin/Gerente: operacao completa do PDV e do caixa (abrir, fechar,
 *   entradas/saidas manuais).
 * - Atendente: PDV, clientes, pedidos e recebimentos operacionais — nao
 *   abre/fecha caixa nem lanca movimentos manuais.
 * - Operador: nao opera caixa nem altera recebimentos (sem PDV_OPERAR nem
 *   CAIXA_GERENCIAR).
 *
 * Matriz de Producao/Kanban (SPEC 05):
 * - Admin/Gerente: PRODUCAO_GERENCIAR — gera Trabalho a partir de Pedido,
 *   atribui responsavel, move/pausa/retoma/cancela qualquer Trabalho.
 * - Atendente: so PRODUCAO_CONSULTAR — acompanha Pedido/Trabalho/Kanban,
 *   nunca movimenta producao.
 * - Operador: so PRODUCAO_CONSULTAR na matriz de papeis, mas o proxy de
 *   autorizacao (lib/repositories/authorization.ts) concede uma excecao
 *   pontual: mover/concluir/pausar/retomar/registrarPendencia sao permitidos
 *   quando o Trabalho alvo tem esse Operador como responsavel. Atribuir
 *   responsavel e cancelar continuam exclusivos de PRODUCAO_GERENCIAR.
 *
 * Producao e Equipamentos (SPEC 06): reaproveita as MESMAS permissoes acima
 * (nenhuma nova permissao foi criada).
 * - Admin/Gerente (PRODUCAO_GERENCIAR): gerenciam disponibilidade de
 *   equipamentos (CADASTROS_GERENCIAR, ja exclusivo deles), criam alocacoes
 *   e realocam.
 * - Atendente (so PRODUCAO_CONSULTAR): consulta o andamento, nunca aloca ou
 *   movimenta equipamento/producao.
 * - Operador (so PRODUCAO_CONSULTAR na matriz): ganha, via `permitirSe` em
 *   lib/repositories/authorization.ts, a mesma excecao por registro —
 *   iniciar preparo/execucao, pausar, retomar e concluir a alocacao cujo
 *   Trabalho e o responsavel. Nunca cria nem realoca.
 *
 * Arquivos e Arte (SPEC 07):
 * - Admin/Gerente (ARQUIVOS_GERENCIAR): gerenciamento completo — aprovacao
 *   tecnica, enviar para aprovacao do cliente, liberar arquivo para
 *   producao (Trabalho.arquivoLiberadoId), nova versao.
 * - Atendente (so ARQUIVOS_CONSULTAR na matriz, com excecao pontual em
 *   lib/repositories/authorization.ts): "anexar/receber arquivos e
 *   acompanhar aprovacao" — pode `receber`, `criarNovaVersao` e
 *   `enviarParaAprovacaoCliente`, mas NUNCA aprovar/rejeitar tecnicamente
 *   nem liberar para producao (isso e "gerenciamento completo").
 * - Operador (so ARQUIVOS_CONSULTAR): consulta arquivos/versoes/aprovacoes
 *   dos Trabalhos que executa — nunca escreve.
 * A liberacao explicita do arquivo para producao
 * (TrabalhoRepository.liberarArquivoParaProducao) exige PRODUCAO_GERENCIAR
 * (mesma permissao que ja controla escrita em Trabalho — nunca aberta ao
 * Operador, mesmo sendo ele o responsavel).
 */
export const MATRIZ_PAPEIS: Record<Papel, Permissao[]> = {
  admin: [
    PERMISSOES.GERENCIAR_EMPRESA,
    PERMISSOES.GERENCIAR_USUARIOS,
    PERMISSOES.GERENCIAR_WHITELABEL,
    PERMISSOES.GERENCIAR_FEATURE_FLAGS,
    PERMISSOES.VER_AUDITORIA,
    PERMISSOES.CLIENTES_GERENCIAR,
    PERMISSOES.CADASTROS_GERENCIAR,
    PERMISSOES.CADASTROS_COMERCIAIS_VISUALIZAR,
    PERMISSOES.CADASTROS_OPERACIONAIS_VISUALIZAR,
    PERMISSOES.SOLICITACOES_GERENCIAR,
    PERMISSOES.PDV_OPERAR,
    PERMISSOES.CAIXA_GERENCIAR,
    PERMISSOES.PRODUCAO_GERENCIAR,
    PERMISSOES.PRODUCAO_CONSULTAR,
    PERMISSOES.ESTOQUE_GERENCIAR,
    PERMISSOES.COMPRAS_GERENCIAR,
    PERMISSOES.ARQUIVOS_GERENCIAR,
    PERMISSOES.ESTOQUE_CONSULTAR,
    PERMISSOES.ARQUIVOS_CONSULTAR,
  ],
  gerente: [
    PERMISSOES.GERENCIAR_USUARIOS,
    PERMISSOES.VER_AUDITORIA,
    PERMISSOES.CLIENTES_GERENCIAR,
    PERMISSOES.CADASTROS_GERENCIAR,
    PERMISSOES.CADASTROS_COMERCIAIS_VISUALIZAR,
    PERMISSOES.CADASTROS_OPERACIONAIS_VISUALIZAR,
    PERMISSOES.SOLICITACOES_GERENCIAR,
    PERMISSOES.PDV_OPERAR,
    PERMISSOES.CAIXA_GERENCIAR,
    PERMISSOES.PRODUCAO_GERENCIAR,
    PERMISSOES.PRODUCAO_CONSULTAR,
    PERMISSOES.ESTOQUE_GERENCIAR,
    PERMISSOES.COMPRAS_GERENCIAR,
    PERMISSOES.ARQUIVOS_GERENCIAR,
    PERMISSOES.ESTOQUE_CONSULTAR,
    PERMISSOES.ARQUIVOS_CONSULTAR,
  ],
  atendente: [
    PERMISSOES.CLIENTES_GERENCIAR,
    PERMISSOES.CADASTROS_COMERCIAIS_VISUALIZAR,
    PERMISSOES.CADASTROS_OPERACIONAIS_VISUALIZAR,
    PERMISSOES.SOLICITACOES_GERENCIAR,
    PERMISSOES.PDV_OPERAR,
    PERMISSOES.PRODUCAO_CONSULTAR,
    PERMISSOES.ESTOQUE_CONSULTAR,
    PERMISSOES.ARQUIVOS_CONSULTAR,
  ],
  operador: [PERMISSOES.ESTOQUE_CONSULTAR, PERMISSOES.CADASTROS_OPERACIONAIS_VISUALIZAR, PERMISSOES.PRODUCAO_CONSULTAR, PERMISSOES.ARQUIVOS_CONSULTAR],
};

export function papelTemPermissao(papel: Papel, permissao: Permissao): boolean {
  return MATRIZ_PAPEIS[papel]?.includes(permissao) ?? false;
}

export const PAPEL_LABEL: Record<Papel, string> = {
  admin: "Administrador",
  gerente: "Gerente",
  atendente: "Atendente",
  operador: "Operador",
};
