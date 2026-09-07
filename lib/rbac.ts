import type { Papel } from "@/lib/domain/entities";

// Matriz de permissoes da Foundation. Fases futuras (specs 02+) adicionam
// permissoes de dominio (pedidos, estoque, financeiro etc.) sem alterar
// esta estrutura — cada permissao nova entra como uma nova chave abaixo e,
// no banco, uma nova linha em papel_permissoes (ver migrations).
export const PERMISSOES = {
  GERENCIAR_EMPRESA: "gerenciar_empresa",
  GERENCIAR_USUARIOS: "gerenciar_usuarios",
  GERENCIAR_WHITELABEL: "gerenciar_whitelabel",
  GERENCIAR_FEATURE_FLAGS: "gerenciar_feature_flags",
  VER_AUDITORIA: "ver_auditoria",
} as const;

export type Permissao = (typeof PERMISSOES)[keyof typeof PERMISSOES];

/**
 * Espelha a tabela papel_permissoes (fonte de verdade fica no banco, aplicada
 * via RLS/RPC). Mantido aqui tambem para permitir esconder/desabilitar itens
 * de UI no cliente sem esperar um round-trip.
 */
export const MATRIZ_PAPEIS: Record<Papel, Permissao[]> = {
  admin: [
    PERMISSOES.GERENCIAR_EMPRESA,
    PERMISSOES.GERENCIAR_USUARIOS,
    PERMISSOES.GERENCIAR_WHITELABEL,
    PERMISSOES.GERENCIAR_FEATURE_FLAGS,
    PERMISSOES.VER_AUDITORIA,
  ],
  gerente: [PERMISSOES.GERENCIAR_USUARIOS, PERMISSOES.VER_AUDITORIA],
  atendente: [],
  operador: [],
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
