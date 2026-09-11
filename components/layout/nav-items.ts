import { PERMISSOES, type Permissao } from "@/lib/rbac";

export type NavItem = {
  section: string;
  href: string;
  label: string;
  icon: "home" | "settings" | "audit" | "cadastros" | "inbox" | "orcamento" | "pedido" | "pdv" | "caixa" | "kanban";
  /** Quando definido, o item so aparece se o usuario tiver essa permissao na empresa ativa. */
  permissaoRequerida?: Permissao;
};

// Navegacao atual. SPEC 02 adicionou "Cadastros"; SPEC 03 adicionou
// e-mail/orcamentos; SPEC 04 adicionou PDV e Caixa; SPEC 05 adiciona Kanban
// (Trabalhos de producao). Nenhum outro modulo de negocio (estoque,
// financeiro, portal) entra aqui antes da respectiva SPEC.
export const NAV_ITEMS: NavItem[] = [
  { section: "Principal", href: "/", label: "Inicio", icon: "home" },
  { section: "Principal", href: "/relatorios", label: "Relatorios", icon: "home", permissaoRequerida: PERMISSOES.RELATORIOS_CONSULTAR },
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
    section: "Producao",
    href: "/kanban",
    label: "Kanban",
    icon: "kanban",
    permissaoRequerida: PERMISSOES.PRODUCAO_CONSULTAR,
  },
  { section: "Producao", href: "/estoque", label: "Estoque", icon: "cadastros", permissaoRequerida: PERMISSOES.ESTOQUE_CONSULTAR },
  { section: "Producao", href: "/compras", label: "Compras", icon: "pedido", permissaoRequerida: PERMISSOES.COMPRAS_GERENCIAR },
  { section: "Financeiro", href: "/financeiro", label: "Financeiro", icon: "caixa", permissaoRequerida: PERMISSOES.FINANCEIRO_CONSULTAR },
  { section: "Atendimento", href: "/portal-clientes", label: "Portal do cliente", icon: "pedido", permissaoRequerida: PERMISSOES.PORTAL_CLIENTE_GERENCIAR },
  { section: "Producao", href: "/entregas", label: "Entregas", icon: "pedido", permissaoRequerida: PERMISSOES.ENTREGA_CONSULTAR },
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
