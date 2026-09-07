import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getSessaoAtual } from "@/lib/auth/session";
import { hasSupabaseConfig } from "@/lib/env";
import { resolverIdentidadeCanto } from "@/lib/whitelabel";

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const supabaseConfigurado = hasSupabaseConfig();
  const sessao = supabaseConfigurado ? await getSessaoAtual() : null;

  if (supabaseConfigurado && !sessao) {
    redirect("/login");
  }

  const identidade = resolverIdentidadeCanto(sessao?.empresaAtiva ?? null);

  return (
    <AppShell
      identidade={identidade}
      email={sessao?.usuario.email ?? null}
      papel={sessao?.empresaAtiva?.papel ?? null}
      empresaNome={sessao?.empresaAtiva?.nome ?? null}
    >
      {!supabaseConfigurado ? (
        <div className="mb-4 rounded-xl border border-(--warning) bg-(--warning-soft) px-4 py-3 text-sm text-(--warning)">
          Supabase nao configurado neste ambiente — exibindo shell em modo local, sem autenticacao nem dados reais.
        </div>
      ) : null}
      {children}
    </AppShell>
  );
}
