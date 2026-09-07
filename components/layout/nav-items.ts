import { PERMISSOES, type Permissao } from "@/lib/rbac";

export type NavItem = {
  section: string;
  href: string;
  label: string;
  icon: "home" | "settings" | "audit" | "cadastros";
  /** Quando definido, o item so aparece se o usuario tiver essa permissao na empresa ativa. */
  permissaoRequerida?: Permissao;
};

// Navegacao atual. SPEC 02 adiciona "Cadastros" — nenhum outro modulo de
// negocio (pedidos, PDV, kanban, estoque, financeiro, portal) entra aqui
// antes da respectiva SPEC.
export const NAV_ITEMS: NavItem[] = [
  { section: "Principal", href: "/", label: "Inicio", icon: "home" },
  { section: "Principal", href: "/cadastros", label: "Cadastros", icon: "cadastros" },
  {
    section: "Sistema",
    href: "/configuracoes",
    label: "Configuracoes",
    icon: "settings",
    permissaoRequerida: PERMISSOES.GERENCIAR_USUARIOS,
  },
  {
    section: "Sistema",
    href: "/auditoria",
    label: "Auditoria",
    icon: "audit",
    permissaoRequerida: PERMISSOES.VER_AUDITORIA,
  },
];
