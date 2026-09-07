"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { useSessao } from "@/components/providers/session-provider";
import { resolverIdentidadeCanto } from "@/lib/whitelabel";

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const { carregando, sessao } = useSessao();
  const router = useRouter();

  useEffect(() => {
    if (!carregando && !sessao) {
      router.replace("/login");
    }
  }, [carregando, sessao, router]);

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-(--bg-page)">
        <p className="text-sm text-(--text-secondary)">Carregando workspace...</p>
      </div>
    );
  }

  if (!sessao) {
    // Redirecionamento em andamento (useEffect acima); evita flash de shell vazio.
    return null;
  }

  const identidade = resolverIdentidadeCanto(sessao.empresaAtiva);

  return (
    <AppShell
      identidade={identidade}
      email={sessao.usuario.email}
      papel={sessao.empresaAtiva?.papel ?? null}
      empresaNome={sessao.empresaAtiva?.nome ?? null}
    >
      {children}
    </AppShell>
  );
}
