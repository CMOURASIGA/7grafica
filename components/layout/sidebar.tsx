"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import { PRODUCT_NAME, PRODUCT_SUBTITLE } from "@/lib/brand";
import { papelTemPermissao } from "@/lib/rbac";
import type { IdentidadeCanto } from "@/lib/whitelabel";
import type { Papel } from "@/lib/supabase/types";

type IconName = (typeof NAV_ITEMS)[number]["icon"];

const ICON_PATHS: Record<IconName, React.ReactNode> = {
  home: <path d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1v-8.5Z" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13.6a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V20a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H4a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H10a1.7 1.7 0 0 0 1-1.6V4a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V10c.4.3.9.5 1.6.5H20a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1.1Z" />
    </>
  ),
  audit: (
    <>
      <path d="M9 6h11" />
      <path d="M9 12h11" />
      <path d="M9 18h11" />
      <path d="m3 6 1 1 2-2" />
      <path d="m3 12 1 1 2-2" />
      <path d="m3 18 1 1 2-2" />
    </>
  ),
};

function NavIcon({ name }: { name: IconName }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[18px] w-[18px] shrink-0"
      aria-hidden="true"
    >
      {ICON_PATHS[name]}
    </svg>
  );
}

type SidebarProps = {
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  identidade: IdentidadeCanto;
  papel: Papel | null;
};

export function Sidebar({ isMobileOpen, onCloseMobile, identidade, papel }: SidebarProps) {
  const pathname = usePathname();
  const itensVisiveis = NAV_ITEMS.filter(
    (item) => !item.permissaoRequerida || (papel && papelTemPermissao(papel, item.permissaoRequerida)),
  );
  const sections = Array.from(new Set(itensVisiveis.map((item) => item.section)));

  return (
    <>
      {isMobileOpen ? (
        <button type="button" aria-label="Fechar menu" className="sidebar-backdrop" onClick={onCloseMobile} />
      ) : null}
      <aside
        className={["sidebar-shell overflow-y-auto md:min-h-screen md:self-stretch", isMobileOpen ? "is-open" : ""].join(
          " ",
        )}
      >
        {/* Canto superior esquerdo: identidade do cliente (whitelabel) com
            fallback para Consult Services. Nunca icone isolado, nunca marca 7Commander. */}
        <div className="sidebar-brand-panel relative">
          <div className="sidebar-brand-logo-frame">
            <img src={identidade.logoUrl} alt={identidade.nomeCliente ?? "Consult Services Tecnologia"} className="sidebar-brand-logo" />
          </div>
          <button type="button" onClick={onCloseMobile} className="sidebar-close absolute right-4 top-4 md:hidden" aria-label="Fechar menu">
            ×
          </button>
        </div>
        <div className="sidebar-rail-only sidebar-product">
          <p className="sidebar-product-name">{PRODUCT_NAME}</p>
          <p className="sidebar-product-subtitle">{identidade.whitelabel ? identidade.nomeCliente : PRODUCT_SUBTITLE}</p>
        </div>
        <nav className="relative flex flex-col gap-5 px-3 py-4">
          {sections.map((section) => (
            <div key={section}>
              <p className="sidebar-section-label sidebar-rail-only mb-2 px-2">{section}</p>
              <div className="flex flex-col gap-1">
                {itensVisiveis
                  .filter((item) => item.section === section)
                  .map((item) => {
                    const isActive = item.href === "/" ? pathname === item.href : pathname.startsWith(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={item.label}
                        aria-current={isActive ? "page" : undefined}
                        onClick={onCloseMobile}
                        className={[
                          "sidebar-nav-link flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                          isActive ? "sidebar-nav-link-active shadow-sm" : "",
                        ].join(" ")}
                      >
                        <NavIcon name={item.icon} />
                        <span className="sidebar-rail-only">{item.label}</span>
                      </Link>
                    );
                  })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
