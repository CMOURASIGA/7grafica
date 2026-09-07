import type { Papel } from "@/lib/domain/entities";

// Matriz de permissoes. Fases futuras (specs 03+) adicionam permissoes de
// dominio (pedidos, estoque, financeiro etc.) sem alterar esta estrutura —
// cada permissao nova entra como uma nova chave abaixo e, no banco (quando
// o Supabase definitivo existir), uma nova linha em papel_permissoes.
export const PERMISSOES = {
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
  ],
  gerente: [
    PERMISSOES.GERENCIAR_USUARIOS,
    PERMISSOES.VER_AUDITORIA,
    PERMISSOES.CLIENTES_GERENCIAR,
    PERMISSOES.CADASTROS_GERENCIAR,
    PERMISSOES.CADASTROS_COMERCIAIS_VISUALIZAR,
    PERMISSOES.CADASTROS_OPERACIONAIS_VISUALIZAR,
    PERMISSOES.SOLICITACOES_GERENCIAR,
  ],
  atendente: [
    PERMISSOES.CLIENTES_GERENCIAR,
    PERMISSOES.CADASTROS_COMERCIAIS_VISUALIZAR,
    PERMISSOES.CADASTROS_OPERACIONAIS_VISUALIZAR,
    PERMISSOES.SOLICITACOES_GERENCIAR,
  ],
  operador: [PERMISSOES.CADASTROS_OPERACIONAIS_VISUALIZAR],
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
