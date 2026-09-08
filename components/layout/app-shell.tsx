"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import type { Papel } from "@/lib/domain/entities";
import type { IdentidadeCanto } from "@/lib/whitelabel";

export type AppShellProps = {
  children: React.ReactNode;
  identidade: IdentidadeCanto;
  email: string | null;
  papel: Papel | null;
  empresaNome: string | null;
};

export function AppShell({ children, identidade, email, papel, empresaNome }: AppShellProps) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-(--bg-page) md:flex md:items-stretch">
      <Sidebar isMobileOpen={mobileNavOpen} onCloseMobile={() => setMobileNavOpen(false)} identidade={identidade} papel={papel} />
      {/* min-w-0: sem isso, um filho com conteudo largo e nao-encolhivel (ex.:
          o quadro do Kanban, que usa min-w por coluna) forca este item flex a
          crescer pelo seu min-content, "roubando" espaco do Sidebar ate ele
          colapsar para 0px — bug classico de flexbox (flexbug #1). */}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <Header
          onToggleMobileNav={() => setMobileNavOpen((prev) => !prev)}
          mobileNavOpen={mobileNavOpen}
          email={email}
          papel={papel}
          empresaNome={empresaNome}
        />
        <main className="min-w-0 flex-1 overflow-x-hidden p-4 md:p-5">{children}</main>
      </div>
    </div>
  );
}
