import { PERMISSOES, type Permissao } from "@/lib/rbac";

export type NavItem = {
  section: string;
  href: string;
  label: string;
  icon: "home" | "settings" | "audit" | "cadastros" | "inbox" | "orcamento" | "pedido" | "pdv" | "caixa";
  /** Quando definido, o item so aparece se o usuario tiver essa permissao na empresa ativa. */
  permissaoRequerida?: Permissao;
};

// Navegacao atual. SPEC 02 adicionou "Cadastros"; SPEC 03 adicionou
// e-mail/orcamentos; SPEC 04 adiciona PDV e Caixa. Nenhum outro modulo de
// negocio (kanban, estoque, financeiro, portal) entra aqui antes da
// respectiva SPEC.
export const NAV_ITEMS: NavItem[] = [
  { section: "Principal", href: "/", label: "Inicio", icon: "home" },
  { section: "Principal", href: "/cadastros", label: "Cadastros", icon: "cadastros" },
  {
    section: "Atendimento",
    href: "/pdv",
    label: "PDV",
    icon: "pdv",
    permissaoRequerida: PERMISSOES.PDV_OPERAR,
  },
  {
    section: "Atendimento",
    href: "/solicitacoes",
    label: "Caixa de entrada",
    icon: "inbox",
    permissaoRequerida: PERMISSOES.SOLICITACOES_GERENCIAR,
  },
  {
    section: "Atendimento",
    href: "/orcamentos",
    label: "Orcamentos",
    icon: "orcamento",
    permissaoRequerida: PERMISSOES.SOLICITACOES_GERENCIAR,
  },
  {
    section: "Atendimento",
    href: "/pedidos",
    label: "Pedidos",
    icon: "pedido",
    permissaoRequerida: PERMISSOES.SOLICITACOES_GERENCIAR,
  },
  {
    section: "Atendimento",
    href: "/caixa",
    label: "Caixa",
    icon: "caixa",
    permissaoRequerida: PERMISSOES.CAIXA_GERENCIAR,
  },
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
