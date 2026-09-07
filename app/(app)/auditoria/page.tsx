import { PageIntro, SurfaceCard } from "@/components/ui/workspace-primitives";
import { getSessaoAtual } from "@/lib/auth/session";
import { hasSupabaseConfig } from "@/lib/env";
import { papelTemPermissao, PERMISSOES } from "@/lib/rbac";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export default async function AuditoriaPage() {
  if (!hasSupabaseConfig()) {
    return (
      <SurfaceCard className="p-5">
        <p className="text-sm text-(--text-secondary)">Supabase nao configurado neste ambiente.</p>
      </SurfaceCard>
    );
  }

  const sessao = await getSessaoAtual();
  const empresa = sessao?.empresaAtiva;

  if (!sessao || !empresa || !papelTemPermissao(empresa.papel, PERMISSOES.VER_AUDITORIA)) {
    return (
      <SurfaceCard className="p-5">
        <p className="text-sm text-(--text-secondary)">Seu papel atual nao tem acesso a auditoria.</p>
      </SurfaceCard>
    );
  }

  const supabase = await getSupabaseServerClient();
  const { data: eventos } = await supabase!
    .from("eventos_auditoria")
    .select("*")
    .eq("empresa_id", empresa.id)
    .order("criado_em", { ascending: false })
    .limit(50);

  return (
    <div className="flex flex-col gap-4">
      <PageIntro eyebrow="Auditoria" title="Trilha de eventos" description="Registro imutavel das acoes relevantes realizadas nesta empresa." />

      <SurfaceCard className="p-5">
        {!eventos || eventos.length === 0 ? (
          <p className="workspace-empty-state">Nenhum evento registrado ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-(--text-tertiary)">
                  <th className="border-b border-(--border) py-2 pr-4">Quando</th>
                  <th className="border-b border-(--border) py-2 pr-4">Acao</th>
                  <th className="border-b border-(--border) py-2 pr-4">Entidade</th>
                </tr>
              </thead>
              <tbody>
                {eventos.map((evento) => (
                  <tr key={evento.id}>
                    <td className="border-b border-(--border) py-3 pr-4 text-(--text-secondary)">
                      {new Date(evento.criado_em).toLocaleString("pt-BR")}
                    </td>
                    <td className="border-b border-(--border) py-3 pr-4 font-medium text-(--text-primary)">{evento.acao}</td>
                    <td className="border-b border-(--border) py-3 pr-4 text-(--text-secondary)">
                      {evento.entidade}
                      {evento.entidade_id ? ` #${evento.entidade_id}` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SurfaceCard>
    </div>
  );
}
