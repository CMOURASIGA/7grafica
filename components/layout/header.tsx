"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { useSessao } from "@/components/providers/session-provider";
import { PAPEL_LABEL } from "@/lib/rbac";
import type { Papel } from "@/lib/domain/entities";

const PAGE_TITLES: Record<string, string> = {
  "/": "Inicio",
  "/relatorios": "Relatorios",
  "/cadastros": "Cadastros",
  "/cadastros/clientes": "Clientes",
  "/cadastros/fornecedores": "Fornecedores",
  "/cadastros/servicos": "Servicos",
  "/cadastros/materiais": "Materiais",
  "/cadastros/equipamentos": "Equipamentos",
  "/cadastros/formas-pagamento": "Formas de pagamento",
  "/cadastros/workflows": "Workflows",
  "/pdv": "PDV",
  "/solicitacoes": "Caixa de entrada",
  "/orcamentos": "Orcamentos",
  "/pedidos": "Pedidos",
  "/caixa": "Caixa",
  "/financeiro": "Financeiro",
  "/portal-clientes": "Portal do cliente",
  "/entregas": "Entregas",
  "/configuracoes": "Configuracoes",
  "/auditoria": "Auditoria",
  "/login": "Acesso",
};

type HeaderProps = {
  onToggleMobileNav: () => void;
  mobileNavOpen: boolean;
  email: string | null;
  papel: Papel | null;
  empresaNome: string | null;
};

export function Header({ onToggleMobileNav, mobileNavOpen, email, papel, empresaNome }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { sair } = useSessao();
  const pageTitle =
    PAGE_TITLES[pathname] ??
    Object.entries(PAGE_TITLES)
      .filter(([rota]) => rota !== "/" && pathname.startsWith(rota))
      .sort((a, b) => b[0].length - a[0].length)[0]?.[1] ??
    "Workspace";
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const avatarLabel = (email ?? "7g")
    .split("@")[0]
    .split(/[.\s_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "7G";

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  async function handleSignOut() {
    await sair();
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-4 border-b border-(--border) bg-white/95 px-4 py-2 backdrop-blur md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onToggleMobileNav}
          aria-label={mobileNavOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={mobileNavOpen}
          className="mobile-nav-toggle"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-5 w-5" aria-hidden="true">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="min-w-0">
          <p className="truncate text-[10px] font-black uppercase tracking-[0.2em] text-(--accent)">
            {empresaNome ?? "Workspace"}
          </p>
          <h1 className="truncate text-base font-semibold text-(--text-primary)">{pageTitle}</h1>
        </div>
      </div>
      <div className="flex items-center gap-2 md:gap-3">
        {email ? (
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setUserMenuOpen((open) => !open)}
              className="flex items-center gap-2 rounded-xl px-1.5 py-1 transition hover:bg-(--bg-muted) sm:px-2"
              aria-expanded={userMenuOpen}
              aria-haspopup="menu"
            >
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--brand-highlight) text-xs font-bold text-(--sidebar-deep)">
                {avatarLabel}
              </span>
              <span className="hidden min-w-0 text-left md:block">
                <span className="block max-w-48 truncate text-sm font-semibold text-(--text-primary)">{email}</span>
                <span className="block text-[10px] uppercase tracking-wide text-(--text-tertiary)">
                  {papel ? PAPEL_LABEL[papel] : "Usuario"}
                </span>
              </span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="hidden h-4 w-4 text-(--text-tertiary) md:block" aria-hidden="true">
                <path d="m7 10 5 5 5-5" />
              </svg>
            </button>
            {userMenuOpen ? (
              <div role="menu" className="absolute right-0 top-[calc(100%+10px)] w-64 overflow-hidden rounded-2xl border border-(--border) bg-white shadow-xl">
                <div className="border-b border-(--border) px-4 py-4">
                  <p className="truncate text-sm font-semibold text-(--text-primary)">{email}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-wide text-(--text-tertiary)">
                    {papel ? PAPEL_LABEL[papel] : "Usuario"}
                  </p>
                </div>
                <div className="p-2">
                  <button
                    type="button"
                    onClick={() => void handleSignOut()}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    Sair
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <span className="rounded-full border border-(--border) bg-white px-3 py-1 text-xs text-(--text-secondary)">
            Modo local
          </span>
        )}
      </div>
    </header>
  );
}
